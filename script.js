const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbzlrnNnbag4snxIJBXJRg19elawUOjjfj3ZAxbH81MXf2xtCTrJofoyeups7O4yrupl/exec";
const OFFICE_LAT = -8.1772228; 
const OFFICE_LON = 113.7004709; 
const MAX_DISTANCE = 50; 

const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

// Fungsi khusus untuk Kirim Izin Tanpa Scan Barcode
function kirimIzin() {
    const nama = document.getElementById("namaPegawai").value;
    const mode = document.querySelector('input[name="modeAbsen"]:checked')?.value;
    const alasan = document.getElementById("alasan").value.trim();

    // Cek Hari Libur (Sabtu = 6, Minggu = 0)
    const skrg = new Date();
    const hari = skrg.getDay(); 
    if (hari === 0 || hari === 6) {
        tampilkanStatus("Absensi Ditolak: Sistem tidak dapat diakses pada hari Sabtu dan Minggu.", "gagal");
        return;
    }

    if (!nama) {
        tampilkanStatus("Gagal: Pilih Nama Anda terlebih dahulu!", "gagal");
        return;
    }

    if (mode !== "IZIN_TIDAK_MASUK") {
        tampilkanStatus("Gagal: Pilih opsi 'Izin Tidak Masuk' untuk mengirim izin.", "gagal");
        return;
    }

    if (!alasan) {
        tampilkanStatus("Gagal: Wajib mengisi alasan tidak masuk!", "gagal");
        return;
    }

    prosesKirim(nama, "IZIN TIDAK MASUK", "IZIN TIDAK MASUK", alasan, 0);
}

function onScanSuccess(decodedText) {
    const skrg = new Date();
    const hari = skrg.getDay(); 

    // Blokir Akses Sabtu (6) dan Minggu (0)
    if (hari === 0 || hari === 6) {
        tampilkanStatus("Absensi Ditolak: Hari Sabtu dan Minggu sistem libur.", "gagal");
        return;
    }

    if (decodedText.trim() !== "KEMENHAJ-JEMBER") {
        tampilkanStatus("QR Code Salah! Bukan QR Resmi Kantor.", "gagal");
        return;
    }

    const nama = document.getElementById("namaPegawai").value;
    if (!nama) {
        tampilkanStatus("Gagal: Pilih Nama Anda terlebih dahulu!", "gagal");
        return;
    }

    const mode = document.querySelector('input[name="modeAbsen"]:checked')?.value;
    const alasan = document.getElementById("alasan").value.trim();

    if (mode === "IZIN_TIDAK_MASUK") {
        tampilkanStatus("Untuk 'Izin Tidak Masuk', klik tombol 'Kirim Izin' tanpa scan QR.", "gagal");
        return;
    }

    const jamDecimal = skrg.getHours() + (skrg.getMinutes() / 60);

    // Pengecekan Jam Buka Absen: Masuk (05.00 - 15.00) | Pulang (16.00 - 24.00)
    if (jamDecimal < 5.0 || (jamDecimal >= 15.0 && jamDecimal < 16.0)) {
        tampilkanStatus("Absensi Ditutup! Jam Masuk (05:00 - 15:00) & Jam Pulang (16:00 - 24:00).", "gagal");
        return;
    }

    html5QrcodeScanner.clear();
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

    if (jamDecimal >= 5.0 && jamDecimal < 15.0) { // Sesi Kedatangan
        tipe = "MASUK";
        if (mode === "IZIN_TELAT") {
            ket = "IZIN TELAT";
        } else if (jamDecimal <= 8.5) { // Toleransi s/d 08:30
            ket = "TEPAT WAKTU";
        } else {
            ket = "TELAT";
        }
    } else if (jamDecimal >= 16.0) { // Sesi Kepulangan
        tipe = "PULANG";
        if (jamDecimal > 16.5) {
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
