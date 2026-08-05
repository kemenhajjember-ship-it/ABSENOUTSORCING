// ==========================================
// KONEKSI DATABASE & KONFIGURASI LOKASI
// ==========================================
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbwD0hL6ZscAx09m-va7ED96VjpmmnAZVjFOHDzGA3NI806zqchMKwEtcMU-W0cEn6Jp/exec";

// Koordinat Target Kantor
const OFFICE_LAT = -8.1772228; 
const OFFICE_LON = 113.7004709; 
const MAX_DISTANCE = 50; // Toleransi radius dalam meter (misal 100 meter)

// Inisialisasi Kamera Scanner
const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

function onScanSuccess(decodedText, decodedResult) {
    if (decodedText.trim() === "KEMENHAJ-JEMBER") {
        // 1. Ambil & Cek Nama Pegawai
        const nama = document.getElementById("namaPegawai").value.trim();
        if (nama === "") {
            tampilkanStatus("Gagal: Isi NAMA LENGKAP Anda terlebih dahulu sebelum scan!", "gagal");
            return;
        }

        // 2. Matikan Kamera
        html5QrcodeScanner.clear();
        tampilkanStatus("QR Valid! Memeriksa posisi GPS Anda...", "sukses");

        // 3. Minta Akses GPS (Optimized untuk Indoor)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => prosesAbsen(position, nama),
                onErrorGPS,
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
            );
        } else {
            tampilkanStatus("GPS tidak didukung di browser/HP ini.", "gagal");
        }

    } else {
        tampilkanStatus("QR Code Salah! Bukan QR Resmi Kantor.", "gagal");
    }
}

function prosesAbsen(position, namaPegawai) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;

    // Hitung jarak user ke titik kantor
    const jarak = hitungJarakMeter(userLat, userLon, OFFICE_LAT, OFFICE_LON);
    const jarakBulat = Math.round(jarak);

    let statusAbsen = "";
    if (jarak <= MAX_DISTANCE) {
        statusAbsen = "DI LOKASI KANTOR";
        tampilkanStatus(`ABSEN BERHASIL! Anda berada di area kantor (${jarakBulat}m). Menyimpan...`, "sukses");
    } else {
        statusAbsen = "DI LUAR KANTOR (GAGAL)";
        tampilkanStatus(`ABSEN DITOLAK: Anda di luar area kantor (${jarakBulat}m dari lokasi)!`, "gagal");
    }

    // Kirim Hasil ke Google Sheets
    kirimKeGoogleSheets(namaPegawai, statusAbsen, jarakBulat);
}

function kirimKeGoogleSheets(namaPegawai, statusAbsen, jarakMeter) {
    const dataKirim = {
        nama: namaPegawai,
        status: statusAbsen,
        jarak: jarakMeter
    };

    fetch(URL_WEB_APP, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dataKirim)
    })
    .then(() => {
        if (!statusAbsen.includes("GAGAL")) {
            tampilkanStatus(`Absen Selesai: Data berhasil tersimpan di Google Sheets!`, "sukses");
        }
    })
    .catch((error) => {
        tampilkanStatus("Gagal mengirim data ke server database.", "gagal");
        console.error(error);
    });
}

function onErrorGPS(error) {
    tampilkanStatus("Gagal mendeteksi lokasi. Pastikan GPS HP Aktif dan Izin Lokasi di-Allow.", "gagal");
}

function tampilkanStatus(pesan, tipe) {
    const statusDiv = document.getElementById("status");
    statusDiv.innerText = pesan;
    statusDiv.style.display = "block";
    statusDiv.className = tipe;
}

// Rumus Haversine Perhitungan Jarak Jangkauan GPS
function hitungJarakMeter(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
