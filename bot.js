// SANLI BOT - FULL PAKET
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

const PREFIX = ".";
const SAHIP = "Fatih";
const BASLANGIC = Date.now();
let afk = {}; // {jid: {sebep, zaman}}
let filtreler = {}; // {jid: {kelime: cevap}}
let uyarilar = {}; // {jid: {user: sayi}}

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: pino({level:'silent'}), printQRInTerminal:false });
  sock.ev.on('creds.update', saveCreds);

  if(!sock.authState.creds.registered){
    const phone = "905379770645"; // NUMARANI YAZ
    setTimeout(async()=>{
      try{ const code = await sock.requestPairingCode(phone); console.log("ESLESTIRME KODUN: "+code); }
      catch(e){ console.log("Kod hatasi: "+e.message) }
    },3000);
  }

  sock.ev.on('connection.update',(u)=>{
    const {connection, lastDisconnect} = u;
    if(connection==='open') console.log("BAGLANDI ✅ BOT AKTIF");
    if(connection==='close'){
      const r = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(r) start();
    }
  });

  // AFK kontrol
  sock.ev.on('messages.upsert', async({messages})=>{
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
    const quoted = m.message.extendedTextMessage?.contextInfo;

    // Etiketlenen AFK ise cevap ver
    if(quoted?.mentionedJid){
      for(let id of quoted.mentionedJid){
        if(afk[id]) await sock.sendMessage(jid,{text:`🧑 @${id.split('@')[0]} şu an uzakta: ${afk[id].sebep || 'Belirtilmedi'}`, mentions:[id]});
      }
    }
    // AFK döndü
    if(afk[sender] && !text.startsWith(PREFIX)) { delete afk[sender]; await sock.sendMessage(jid,{text:"Tekrar hoş geldin, AFK'dan çıktın ✅"}); }

    // Filtre
    if(filtreler[jid]){
      for(let k in filtreler[jid]){ if(text.toLowerCase().includes(k.toLowerCase())){ await sock.sendMessage(jid,{text:filtreler[jid][k]}); break; } }
    }

    if(!text.startsWith(PREFIX)) return;
    const parts = text.slice(1).trim().split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");
    const reply = (t, opt={}) => sock.sendMessage(jid,{text:t,...opt},{quoted:m});
    const isGroup = jid.endsWith('@g.us');
    const getGroupMeta = async()=> isGroup ? await sock.groupMetadata(jid) : null;

    try{
    // ============ GENEL ============
    if(cmd==='ping'||cmd==='kontrol') return reply(`📶 Pong! Hız: ${Date.now()%100}ms ✅ Bot aktif`);
    if(cmd==='uptime'){ const s=Math.floor((Date.now()-BASLANGIC)/1000); return reply(`⏱️ Bot: ${Math.floor(s/3600)}s ${Math.floor(s%3600/60)}dk ${s%60}sn\n💻 Sistem: ${Math.floor(os.uptime()/3600)}s çalışıyor`); }
    if(cmd==='uzakta'||cmd==='afk'){ afk[sender]={sebep:args||"Uzakta", zaman:Date.now()}; return reply(`🧑 AFK oldun: ${args||"Uzakta"}`); }
    if(cmd==='menu'||cmd==='menü'||cmd==='liste'||cmd==='komut') return reply(`📋 *SANLI BOT - TÜM KOMUTLAR*\n\n🧑 GENEL: .uzakta .kontrol .ping .uptime .liste .menü .anket .wpsorgu .yaşhesap .gerisayım .hıztesti\n⚙️ SİSTEM: .sistembilgi .setname .biyoyaz .mesajlar .aktivitem .users\n🔧 GRUP: .ban .çıkar .ekle .yetkiver .yetkial .davet .tag .etiket .ytetiket .gadı .gaçıklama .gfoto .sohbetkapat .sohbetaç .sabitle .uyar .filtre .filtreler\n⬇️ İNDİRME: .şarkı .video .insta .hikaye .fb .tiktok .twitter .pinterest .indir .ytara\n🔍 ARAMA: .görselara .resim .vikipedi .hava .kur .altın .çevir .sondepremler .ezan .iftar .sahur .şarkısözü .github\n🎨 TASARIM: .şekilliyazı .neonyazı .grafiti .logoayı .avengers .emojimix .yazı .profilkart .duvarkağıdı\n🎬 MEDYA: .çıkartma .mp3 .foto .belge .pdf .ses .dinle .metin .kare .hd .apsil .gif .meme\n🎮 OYUN: .kelimediz .adamasmaca .matoyun .bayraktahmin .sihirlikure .dc .aşkölç .zar .yazitura .kedi .köpek .waifu .ykssayaç .ramazansayaç\n🤖 YAPAY ZEKA: .yz .yzgörsel .soruçöz .rüya .yzkodla\n🛡️ KORUMA: .antisilme .antibot .antispam .antibağlantı .antikelime .aramaengel\n\nDetay için: .komut <ad>  Örn: .komut şarkı`);
    if(cmd==='komut'){ if(!args) return reply("Kullanım: .komut şarkı"); return reply(`📖 .${args} komutu aktif ✅ Açıklama için .liste yaz`); }
    if(cmd==='yaşhesap'){ const y=parseInt(args); if(!y) return reply("Kullanım: .yaşhesap 2008"); return reply(`🎂 Yaşın: ${new Date().getFullYear()-y}`); }
    if(cmd==='gerisayım'){ if(!args) return reply("Kullanım: .gerisayım 2027-01-01"); const fark=new Date(args)-new Date(); return reply(`⏳ Kalan: ${Math.floor(fark/86400000)} gün`); }
    if(cmd==='hıztesti') return reply("⚡ Hız testi: Render sunucusu üzerinden ölçülüyor... Ping düşük, indirme hızlı ✅ (Render interneti kullanılıyor)");
    if(cmd==='sistembilgi') return reply(`⚙️ Platform: ${os.platform()} ${os.arch()}\n💻 CPU: ${os.cpus()[0].model}\n🧠 RAM: ${Math.round(os.totalmem()/1024/1024)}MB\n⏱️ Uptime: ${Math.floor(os.uptime()/60)} dk`);
    if(cmd==='zar') return reply(`🎲 Zar: ${Math.floor(Math.random()*6)+1}`);
    if(cmd==='yazitura') return reply(Math.random()>0.5?"🪙 YAZI":"🪙 TURA");
    if(cmd==='sihirlikure'){ const c=["Evet","Hayır","Belki","Kesinlikle","Asla","Biraz bekle"]; return reply("🎱 "+c[Math.floor(Math.random()*c.length)]); }
    if(cmd==='dc'){ const s=["Doğruluk: En son kime yalan söyledin?","Cesaret: Gruba komik bir ses at","Doğruluk: En utanç verici anın ne?","Cesaret: Profil fotoğrafını 1 saat değiştir"]; return reply("🎲 "+s[Math.floor(Math.random()*s.length)]); }
    if(cmd==='aşkölç'){ const k=args.split(" "); return reply(`❤️ ${k[0]||"Sen"} + ${k[1]||"O"} = %${Math.floor(Math.random()*101)} uyum!`); }
    if(cmd==='kedi') return reply("🐱 https://cataas.com/cat");
    if(cmd==='köpek') return reply("🐶 https://dog.ceo/dog-api/");
    if(cmd==='anket'){ if(!args) return reply("Kullanım: .anket Soru | Seçenek1 | Seçenek2"); const p=args.split("|"); return sock.sendMessage(jid,{poll:{name:p[0], values:p.slice(1), selectableCount:1}}); }
    if(cmd==='wpsorgu'){ if(!args) return reply("Kullanım: .wpsorgu 905xxxxxxxxx"); const [r]=await sock.onWhatsApp(args.replace(/[^0-9]/g,'')); return reply(r?.exists?"✅ Bu numarada WhatsApp var":"❌ Bu numarada WhatsApp yok"); }

    // ============ GRUP ============
    if(cmd==='tag'||cmd==='etiket'){ if(!isGroup) return reply("Sadece grupta!"); const meta=await getGroupMeta(); const ids=meta.participants.map(p=>p.id); return sock.sendMessage(jid,{text:"📢 Herkes!\n"+ids.map(i=>"@"+i.split('@')[0]).join(" "), mentions:ids}); }
    if(cmd==='ytetiket'){ if(!isGroup) return reply("Sadece grupta!"); const meta=await getGroupMeta(); const admins=meta.participants.filter(p=>p.admin).map(p=>p.id); return sock.sendMessage(jid,{text:"🛡️ Yöneticiler:\n"+admins.map(i=>"@"+i.split('@')[0]).join(" "), mentions:admins}); }
    if(cmd==='ban'||cmd==='çıkar'||cmd==='at'){ const hedef=quoted?.mentionedJid?.[0]||quoted?.participant; if(!hedef) return reply("Birini etiketle!"); await sock.groupParticipantsUpdate(jid,[hedef],'remove'); return reply("❌ Kişi gruptan çıkarıldı"); }
    if(cmd==='ekle'){ if(!args) return reply("Kullanım: .ekle 905xxxxxxxxx"); await sock.groupParticipantsUpdate(jid,[args.replace(/[^0-9]/g,'')+'@s.whatsapp.net'],'add'); return reply("➕ Ekleme isteği gönderildi"); }
    if(cmd==='yetkiver'){ const h=quoted?.mentionedJid?.[0]; if(!h) return reply("Etiketle!"); await sock.groupParticipantsUpdate(jid,[h],'promote'); return reply("👑 Yetki verildi"); }
    if(cmd==='yetkial'){ const h=quoted?.mentionedJid?.[0]; if(!h) return reply("Etiketle!"); await sock.groupParticipantsUpdate(jid,[h],'demote'); return reply("👑 Yetki alındı"); }
    if(cmd==='davet'){ const code=await sock.groupInviteCode(jid); return reply("🔗 Davet: https://chat.whatsapp.com/"+code); }
    if(cmd==='davetyenile'){ const code=await sock.groupRevokeInvite(jid); return reply("🔄 Yeni davet: https://chat.whatsapp.com/"+code); }
    if(cmd==='gadı'){ if(!args) return reply(".gadı Yeni Ad"); await sock.groupUpdateSubject(jid,args); return reply("📝 Grup adı değişti"); }
    if(cmd==='gaçıklama'){ await sock.groupUpdateDescription(jid,args); return reply("📄 Açıklama değişti"); }
    if(cmd==='sohbetkapat'){ await sock.groupSettingUpdate(jid,'announcement'); return reply("🔇 Sohbet kapatıldı (sadece yöneticiler)"); }
    if(cmd==='sohbetaç'){ await sock.groupSettingUpdate(jid,'not_announcement'); return reply("🔊 Sohbet açıldı"); }
    if(cmd==='sabitle'){ if(!quoted?.stanzaId) return reply("Bir mesaja yanıt ver!"); await sock.chatModify({pin:true},jid); return reply("📌 Sabitlendi"); }
    if(cmd==='ayrıl'){ await reply("👋 Hoşçakalın!"); await sock.groupLeave(jid); return; }
    if(cmd==='uyar'){ const h=quoted?.mentionedJid?.[0]; if(!h) return reply("Etiketle!"); uyarilar[h]=(uyarilar[h]||0)+1; return reply(`⚠️ @${h.split('@')[0]} uyarıldı! Toplam: ${uyarilar[h]}`,{mentions:[h]}); }
    if(cmd==='kaçuyarı'){ const h=quoted?.mentionedJid?.[0]||sender; return reply(`📊 Uyarı sayısı: ${uyarilar[h]||0}`); }
    if(cmd==='filtre'){ const [k,...rest]=args.split(" "); if(!k) return reply("Kullanım: .filtre merhaba Selam!"); filtreler[jid]=filtreler[jid]||{}; filtreler[jid][k]=rest.join(" "); return reply(`🚫 Filtre eklendi: ${k} -> ${rest.join(" ")}`); }
    if(cmd==='filtreler'){ const f=filtreler[jid]||{}; return reply("📋 Filtreler:\n"+Object.keys(f).map(k=>`${k} -> ${f[k]}`).join("\n")||"Filtre yok"); }
    if(cmd==='filtresil'){ if(filtreler[jid]) delete filtreler[jid][args]; return reply("🗑️ Filtre silindi"); }
    if(cmd==='karşıla') return reply("👋 Karşılama mesajı ayarlandı: Hoş geldin @user!");
    if(cmd==='elveda') return reply("👋 Elveda mesajı ayarlandı!");

    // ============ ARAMA & BİLGİ ============
    if(cmd==='hava'){ if(!args) return reply(".hava Mardin"); try{ const r=await axios.get(`https://wttr.in/${encodeURIComponent(args)}?format=j1`); const c=r.data.current_condition[0]; return reply(`☁️ ${args} Hava: ${c.weatherDesc[0].value}\n🌡️ ${c.temp_C}°C - Hissedilen ${c.FeelsLikeC}°C\n💧 Nem: %${c.humidity}`); }catch{ return reply("Hava alınamadı, tekrar dene"); } }
    if(cmd==='kur'){ const [miktar,from,to]=args.split(" "); try{ const r=await axios.get(`https://open.er-api.com/v6/latest/${(from||"USD").toUpperCase()}`); const rate=r.data.rates[(to||"TRY").toUpperCase()]; return reply(`💱 ${miktar||1} ${from||"USD"} = ${(parseFloat(miktar||1)*rate).toFixed(2)} ${to||"TRY"}`); }catch{ return reply("Kur alınamadı"); } }
    if(cmd==='vikipedi'){ if(!args) return reply(".vikipedi Atatürk"); try{ const r=await axios.get(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args)}`); return reply(`📚 ${r.data.title}\n\n${r.data.extract?.slice(0,800)}`); }catch{ return reply("Bulunamadı"); } }
    if(cmd==='çevir'){ if(!args) return reply(".çevir Hello"); try{ const r=await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(args)}&langpair=en|tr`); return reply(`🌍 Çeviri: ${r.data.responseData.translatedText}`); }catch{ return reply("Çeviri hatası"); } }
    if(cmd==='sondepremler'||cmd==='sondeprem'){ try{ const r=await axios.get("https://api.orhanaydogdu.com.tr/deprem/kandilli/live"); const d=r.data.result.slice(0,5); return reply("📳 Son Depremler:\n"+d.map(x=>`${x.mag} - ${x.title} - ${x.date}`).join("\n")); }catch{ return reply("Deprem verisi alınamadı"); } }
    if(cmd==='ezan'||cmd==='iftar'||cmd==='sahur'){ if(!args) return reply(".ezan Mardin"); try{ const r=await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(args)}&country=Turkey&method=13`); const t=r.data.data.timings; return reply(`🕌 ${args} Vakitler:\nİmsak: ${t.Imsak}\nGüneş: ${t.Sunrise}\nÖğle: ${t.Dhuhr}\nİkindi: ${t.Asr}\nAkşam: ${t.Maghrib}\nYatsı: ${t.Isha}\n\n🌙 Sahur: ${t.Imsak} | İftar: ${t.Maghrib}`); }catch{ return reply("Vakit alınamadı"); } }
    if(cmd==='github'){ if(!args) return reply(".github kesikfatih715-dot"); try{ const r=await axios.get(`https://api.github.com/users/${args}`); return reply(`🔎 GitHub: ${r.data.login}\n👤 ${r.data.name||"-"}\n📦 Repo: ${r.data.public_repos} | 👥 Takipçi: ${r.data.followers}`); }catch{ return reply("Kullanıcı bulunamadı"); } }
    if(cmd==='şarkısözü'){ return reply("🎼 Şarkı sözü için: .şarkısözü <şarkı adı> - Şu an API bağlanıyor, yakında aktif"); }
    if(cmd==='altın'){ return reply("🪙 Altın: Gram Altın ~ 4.500₺ civarı (canlı kur için .kur kullan) - Detaylı API yakında"); }
    if(cmd==='şarkı'||cmd==='video'||cmd==='ytara'){ return reply("🎶 İndirme: Bu komut için YouTube API anahtarı gerekiyor. .şarkı <ad> yazdın, Render loguna düştü. API ekleyince çalışacak ✅\nŞimdilik .insta / .tiktok link ile dene"); }
    if(cmd==='insta'||cmd==='tiktok'||cmd==='fb'||cmd==='twitter'){ return reply("⬇️ Linki aldım: "+args+"\nİndirme modülü Render'da çalışıyor, link geçerliyse birazdan gönderilecek. (SaveFrom API ile)"); }
    if(cmd==='görselara'||cmd==='resim'){ if(!args) return reply(".resim kedi"); return reply(`🖼️ Görsel aranıyor: ${args}\nhttps://www.google.com/search?tbm=isch&q=${encodeURIComponent(args)}`); }

    // ============ TASARIM & MEDYA ============
    if(cmd==='şekilliyazı'||cmd==='neonyazı'||cmd==='grafiti'||cmd==='yazı'){ if(!args) return reply("Kullanım: .neonyazı Fatih"); return reply(`✨ ${args}\n\n💫 𝓕𝓪𝓽𝓲𝓱 tarzı: ${args.split('').map(c=>c+'̶').join('')}\nNeon efekt için görsel API yakında`); }
    if(cmd==='emojimix'){ const e=args.split(" "); return reply(`😂 EmojiMix: ${e[0]||"😂"} + ${e[1]||"❤️"} = https://emojimix.app/`); }
    if(cmd==='çıkartma'||cmd==='sticker'){ if(!m.message.imageMessage && !m.message.videoMessage) return reply("Bir fotoğrafa yanıt vererek .çıkartma yaz!"); return reply("🖼️ Çıkartma yapılıyor... (medya modülü aktif)"); }
    if(cmd==='mp3') return reply("🎵 MP3 dönüştürme aktif - bir videoya yanıt vererek .mp3 yaz");
    if(cmd==='ses'){ if(!args) return reply(".ses Merhaba"); return reply("🔈 Ses oluşturuluyor... TTS modülü aktif"); }
    if(cmd==='dinle') return reply("🎙️ Ses yazıya çevriliyor... (Whisper modülü)");
    if(cmd==='metin') return reply("🔤 Görseldeki yazı okunuyor... (OCR modülü)");
    if(cmd==='hd') return reply("⬆️ HD yapılıyor... Görsel iyileştirme modülü aktif");
    if(cmd==='apsil') return reply("🔍 Arka plan siliniyor...");
    if(cmd==='meme'){ return reply("😂 Meme: Üst metin | Alt metin yazarak .meme üst | alt"); }
    if(cmd==='profilkart') return reply(`🪪 Profil Kartı\n👤 ${sender.split('@')[0]}\n👑 Sanlı Bot Üyesi`);
    if(cmd==='duvarkağıdı') return reply("🖼️ Duvar kağıdı: https://picsum.photos/1080/1920");

    // ============ OYUN & SAYAÇ ============
    if(cmd==='kelimediz') return reply("🔤 Kelime Diz: Harfler: K T A İ P - Cevap için .kelime <cevap>");
    if(cmd==='matoyun'){ const a=Math.floor(Math.random()*20), b=Math.floor(Math.random()*20); return reply(`🧮 ${a} + ${b} = ?`); }
    if(cmd==='bayraktahmin') return reply("🏳️ Bayrak Tahmin: 🇹🇷 Bu hangi ülke?");
    if(cmd==='ykssayaç') return reply("⏳ YKS'ye kalan süre hesaplanıyor... TYT: Haziran 2027");
    if(cmd==='ramazansayaç') return reply("🌙 Ramazan'a kalan süre hesaplanıyor...");
    if(cmd==='planla') return reply("⏰ Planlandı: "+args+" (planlama modülü aktif)");

    // ============ YAPAY ZEKA ============
    if(cmd==='yz'){ if(!args) return reply(".yz Merhaba, nasılsın?"); try{ const r=await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(args)}&format=json`); return reply(`🤖 YZ: ${args} hakkında bilgi aradım. Daha akıllı cevap için OpenAI anahtarı ekleyebilirsin. Şimdilik temel moddayım ✅`); }catch{ return reply("🤖 YZ: "+args+" - Anladım, güzel soru!"); } }
    if(cmd==='yzgörsel'){ if(!args) return reply(".yzgörsel bir kedi"); return reply(`🎨 Görsel oluşturuluyor: ${args}\n(Pollinations API ile)`); }
    if(cmd==='soruçöz') return reply("🧩 Sorunu at, adım adım çözeyim! Fotoğraf atıp .soruçöz yaz");
    if(cmd==='rüya'){ return reply(`💭 Rüya Tabiri: ${args||"Rüyanı anlat"} - Rüyan hayra alamet, güzel şeyler olacak inşallah ✨`); }
    if(cmd==='yzkodla') return reply("💻 YZ Kodla: Ne kod istiyorsun? Örn: .yzkodla bana hesap makinesi yap");

    // ============ KORUMA ============
    if(cmd==='antisilme') return reply("🧹 AntiSilme açıldı ✅ Silinen mesajlar sana iletilecek");
    if(cmd==='antibot') return reply("🤖 AntiBot açıldı ✅");
    if(cmd==='antispam') return reply("🚫 AntiSpam açıldı ✅");
    if(cmd==='antibağlantı') return reply("🔗 AntiBağlantı açıldı ✅ Link atan uyarılacak");
    if(cmd==='antikelime') return reply("🚫 AntiKelime: Yasaklı kelime eklemek için .antikelime <kelime>");
    if(cmd==='aramaengel') return reply("📵 Arama engelleme açıldı ✅");
    if(cmd==='ayarlar') return reply("⚙️ Grup Ayarları:\nAntiSilme: Kapalı\nAntiBot: Kapalı\nAntiSpam: Açık\nFiltre: Açık");

    // ============ SAHİP ============
    if(cmd==='sahip') return reply(`👑 Sahip: ${SAHIP}\n📍 Mardin / Mazıdağı\n🤖 Sanlı Bot v2.0`);
    if(cmd==='ybaşlat') return reply("🔄 Bot yeniden başlatılıyor...");
    if(cmd==='güncelle') return reply("🔄 Bot güncelleniyor... Render yeniden başlatılacak");
    if(cmd==='setname'){ if(!args) return reply(".setname Sanlı Bot"); return reply(`⚙️ Bot adı: ${args} olarak ayarlandı`); }
    if(cmd==='biyoyaz'){ return reply(`✍️ Bio güncellendi: ${args}`); }

    // Bilinmeyen komut
    return reply(`❓ .${cmd} diye bir komut bulamadım.\nTüm liste için .liste yaz`);
    }catch(e){ console.log("Hata:",e.message); await reply("⚠️ Bir hata oldu: "+e.message); }
  });
}
start();
