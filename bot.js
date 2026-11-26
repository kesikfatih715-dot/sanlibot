const fs=require('fs');
const http=require('http');
const os=require('os');
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason}=require('@whiskeysockets/baileys');
const qrcode=require('qrcode-terminal');
const BOT_ADI="ŞANLIBOT";
let botBilgi={ram:"0 MB",grupSayisi:0,bugunMesaj:0,bildirimler:[]};
function ramHesapla(){const m=process.memoryUsage();botBilgi.ram=Math.round(m.heapUsed/1024/1024)+" MB";return botBilgi.ram}
setInterval(ramHesapla,5000);
function komutCalistir(gelenMesaj,gonderen){
if(!gelenMesaj.startsWith('.'))return null;
let parca=gelenMesaj.slice(1).split(' ');let komut=parca[0].toLowerCase();let arg=parca.slice(1).join(' ');
botBilgi.bugunMesaj++;
if(komut==='ping')return `🏓 Pong! ${BOT_ADI} çalışıyor`;
if(komut==='kontrol')return `✅ ${BOT_ADI} çalışıyor\nRAM: ${ramHesapla()}\nBugün Mesaj: ${botBilgi.bugunMesaj}`;
if(komut==='uptime')return `⏱️ Çalışma: ${Math.floor(process.uptime()/60)} dakika`;
if(komut==='liste'||komut==='menü')return `📋 *${BOT_ADI}*\n.ping\n.kontrol\n.uptime\n.liste\n.anket\n.yaşhesap\n.şekilliyazı\n.bildir\n.tekrar\n.yz\n.rüya\n.aşkölç\n.matoyun\n.sihirlikure\n.dc\n.kelimediz\n.adamasmaca\n.bayraktahmin`;
if(komut==='yaşhesap'){let y=parseInt(arg);if(!y)return "Kullanım: .yaşhesap 2008";return `🎂 Yaşın: ${2026-y}`}
if(komut==='şekilliyazı')return `🖋️ ${arg.split('').join('✦')}`;
if(komut==='tekrar')return `🔁 ${arg}`;
if(komut==='anket'){let s=arg.split(',');return `📊 *ANKET*\n${s.map((x,i)=>`${i+1}. ${x}`).join('\n')}`}
if(komut==='bildir'){botBilgi.bildirimler.push({kim:gonderen,mesaj:arg,zaman:new Date().toLocaleString('tr-TR')});return `📣 Bildirimin panele düştü kanka, Fatih görecek: ${arg}`}
if(komut==='matoyun'){let a=Math.floor(Math.random()*10),b=Math.floor(Math.random()*10);return `🧮 Kaç eder? ${a} + ${b} = ?`}
if(komut==='aşkölç')return `❤️ Aşk Ölçer: ${arg} için uyum %${Math.floor(Math.random()*100)}`;
if(komut==='sihirlikure')return `🎱 Sihirli Küre: ${arg} -> Evet, kesinlikle!`;
if(komut==='dc')return `🎲 Doğruluk mu Cesaret mi? Cesaret: En son mesajını sesli oku!`;
if(komut==='kelimediz')return `🔤 Harfleri diz: P A M U K -> Cevap için .kelime pamuk yaz`;
if(komut==='adamasmaca')return `🪢 Adam Asmaca başladı! Kelime: _ _ _ _ _`;
if(komut==='bayraktahmin')return `🏳️ Bayrak Tahmin: 🇹🇷 Bu hangi ülke?`;
if(komut==='yz')return `🤖 ${BOT_ADI} AI: ${arg} - Mantıklı görünüyor kanka.`;
if(komut==='rüya')return `💭 Rüya Tabiri: ${arg} rüyası hayra yorulur.`;
if(komut==='sistembilgi')return `⚙️ OS: ${os.platform()}\nRAM Toplam: ${Math.round(os.totalmem()/1024/1024)} MB`;
return `❓ Bilinmeyen komut: ${komut}\n.liste yaz`;
}
async function baslat(){
const {state,saveCreds}=await useMultiFileAuthState('auth');
const sock=makeWASocket({auth:state,printQRInTerminal:true});
sock.ev.on('creds.update',saveCreds);
sock.ev.on('connection.update',async(u)=>{
const {connection,lastDisconnect,qr}=u;
if(qr){console.log("QR KOD GELDI, LOGLARDAN OKUT");qrcode.generate(qr,{small:true})}
if(connection==='close'){let r=lastDisconnect?.error?.output?.statusCode;if(r!==DisconnectReason.loggedOut)baslat();else console.log("Çıkış yapıldı")}
if(connection==='open')console.log("BOT BAGLANDI ✅");
});
if(!sock.authState.creds.registered){
let numara=process.env.PHONE||"";
if(numara){setTimeout(async()=>{let kod=await sock.requestPairingCode(numara);console.log("ESLESTIRME KODUN: "+kod)},3000)}
}
sock.ev.on('messages.upsert',async({messages})=>{
for(let m of messages){
if(!m.message||m.key.fromMe)continue;
let metin=m.message.conversation||m.message.extendedTextMessage?.text||"";
if(!metin)return;
let cevap=komutCalistir(metin,m.key.remoteJid);
if(cevap){await sock.sendMessage(m.key.remoteJid,{text:cevap},{quoted:m})}
}
});
}
baslat();
const server=http.createServer((req,res)=>{
res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
res.end(`<h1>${BOT_ADI} Paneli</h1><p>RAM: ${ramHesapla()}</p><p>Bugün Mesaj: ${botBilgi.bugunMesaj}</p><h2>Bildirimler</h2>${botBilgi.bildirimler.map((b,i)=>`<div><b>${i+1}. ${b.kim}:</b> ${b.mesaj}</div>`).join('')||"Yok"}`);
});
server.listen(process.env.PORT||3000,()=>console.log("Panel acik"));
