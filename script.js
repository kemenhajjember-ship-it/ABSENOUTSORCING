const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbwD0hL6ZscAx09m-va7ED96VjpmmnAZVjFOHDzGA3NI806zqchMKwEtcMU-W0cEn6Jp/exec";
const OFFICE_LAT = -8.1772228; 
const OFFICE_LON = 113.7004709; 
const MAX_DISTANCE = 50; 

const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

// Fitur Suara Perempuan
function bicara(teks) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(teks);
        utterance.lang = 'id-ID';
        utterance.rate = 0.9;
        
        let voices = window.speechSynthesis.getVoices();
        let femaleVoice = voices.find(v => v.lang.includes('id') && (v.name.includes('Indonesian') || v.name.includes('Gadis') || v.name.includes('Google') || v.name.includes('Natural')));
        if (femaleVoice) utterance.voice = femaleVoice;
        
        window.speechSynthesis.speak(utterance);
    }
}

function onScanSuccess(decodedText) {
    if (decodedText.trim() !== "KEMENHAJ-JEMBER") {
        tampilkanStatus("QR Code Salah! Bukan QR Resmi Kantor.", "gagal");
        return;
    }

    const nama = document.getElementById("namaPegawai").value;
    if (!nama) {
        tampilkanStatus("Gagal: Pilih Nama Anda terlebih dahulu!", "gagal");
        return;
    }

    const mode = document.querySelector('input[name="modeAbsen"]:checked').value;
    const alasan = document.getElementById("alasan").value.trim();

    html5QrcodeScanner.clear();

    // Mode Izin Tidak Masuk -> Bypass GPS
    if (mode === "IZIN_TIDAK_MASUK") {
        prosesKirim(nama, "IZIN TIDAK MASUK", "IZIN TIDAK MASUK", alasan, 0);
        return;
    }

    // Pengecekan Jam Buka Absen (Masuk 08.30, Buka 07.30 | Pulang 16.30, Buka 16.00)
    const skrg = new Date();
    const jamDecimal = skrg.getHours() + (skrg.getMinutes() / 60);

   if (jamDecimal < 5.0) { // Sebelum 05:00
        tampilkanStatus("Absen Kedatangan Belum Dibuka! (Buka jam 05:00)", "gagal");
        return;
    }

    tampilkanStatus("QR Valid! Memeriksa Lokasi GPS...", "sukses");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => verifikasiGPSDanKirim(pos, nama, mode, alasan, jamDecimal),
            () => tampilkanStatus("Gagal mendeteksi lokasi. Pastikan GPS Aktif.", "gagal"),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
    } else {
        tampilkanStatus("GPS tidak didukung di browser ini.", "gagal");
    }
}

function verifikasiGPSDanKirim(pos, nama, mode, alasan, jamDecimal) {
    const jarak = Math.round(hitungJarakMeter(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LON));

    if (jarak > MAX_DISTANCE) {
        tampilkanStatus(`ABSEN DITOLAK: Anda di luar area kantor (${jarak}m)!`, "gagal");
        return;
    }

    let tipe = "";
    let ket = "";

    // Tentukan Masuk vs Pulang berdasarkan jam
    if (jamDecimal < 16.0) { // Kedatangan
        tipe = "MASUK";
        if (mode === "IZIN_TELAT") {
            ket = "IZIN TELAT";
        } else if (jamDecimal <= 8.5) { // 08:30
            ket = "TEPAT WAKTU";
        } else {
            ket = "TELAT";
        }
    } else { // Kepulangan (setelah 16:00)
        tipe = "PULANG";
        if (jamDecimal > 16.5) { // Lewat 16:30
            ket = "LEMBUR";
        } else {
            ket = "PULANG NORMAL";
        }
    }

    prosesKirim(nama, tipe, ket, alasan, jarak);
}

function prosesKirim(nama, tipe, ket, alasan, jarak) {
    const payload = { nama: nama, tipe: tipe, keterangan: ket, alasan: alasan, jarak: jarak };

    fetch(URL_WEB_APP, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(() => {
        let msgAudio = "";
        if (tipe === "MASUK" || tipe === "IZIN TELAT" || tipe === "IZIN TIDAK MASUK") {
            msgAudio = "absen sukses, semoga harimu lancar, amin yarobbal alamin";
        } else {
            msgAudio = "terima kasih kerja sama nya, semoga pekerjaan hari ini berkah, amin yarobbal alamin";
        }
        
        bicara(msgAudio);
        tampilkanStatus(`Absen Berhasil Disimpan! (${ket})`, "sukses");
    })
    .catch(() => tampilkanStatus("Gagal terhubung ke database.", "gagal"));
}

function tampilkanStatus(pesan, tipe) {
    const statusDiv = document.getElementById("status");
    statusDiv.innerText = pesan;
    statusDiv.style.display = "block";
    statusDiv.className = tipe;
}

function hitungJarakMeter(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
