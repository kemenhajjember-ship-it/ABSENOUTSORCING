// ==========================================
// KONEKSI DATABASE & KONFIGURASI LOKASI
// ==========================================
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycby2uoA04qwcy254JqtXuKcJkIRTH2TTyXLPSOt9UU17HgFs7BOXau370A98pDRpKc8L/exec"; // <-- GANTI PAKE URL YANG LO SALIN TADI!

// Koordinat Target (Ganti dengan koordinat lo saat ini)
const OFFICE_LAT = -8.1772228; // Jalur Latitude lama lo
const OFFICE_LON = 113.7004709; // Jalur Longitude lama lo
const MAX_DISTANCE = 500; // Jarak toleransi dalam meter (misal 50 meter)
// Inisialisasi Kamera Scanner

const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

function onScanSuccess(decodedText, decodedResult) {
   if (decodedText.trim() === "KEMENHAJ-JEMBER") {
        html5QrcodeScanner.clear();
        tampilkanStatus("QR Valid! Mengirim data...", "sukses");
        
        // Langsung bypass ke proses kirim data tanpa nunggu GPS
        kirimDataKeGoogleSheets();
    } else {
        tampilkanStatus("QR Code Salah!", "gagal");
    }
}

function prosesAbsen(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    
    const jarak = hitungJarakMeter(userLat, userLon, KANTOR_LAT, KANTOR_LON);
    const nama = document.getElementById("namaPegawai").value.trim();
    
    if (nama === "") {
        tampilkanStatus("Gagal: Isi NAMA LENGKAP Anda terlebih dahulu sebelum scan!", "gagal");
        return;
    }

    let statusAbsen = "";
    if (jarak <= RADIUS_MAKSIMAL) {
        statusAbsen = "DI LOKASI KANTOR";
        tampilkanStatus(`ABSEN BERHASIL! Anda berada di lokasi kantor (${Math.round(jarak)}m). Menyimpan data...`, "sukses");
    } else {
        statusAbsen = "DI LUAR KANTOR (GAGAL)";
        tampilkanStatus(`ABSEN GAGAL: Anda berada di luar radius kantor (${Math.round(jarak)}m)! Menyimpan data...`, "gagal");
    }

    // KIRIM DATA KE GOOGLE SHEETS
    kirimKeGoogleSheets(nama, statusAbsen, Math.round(jarak));
}

function kirimKeGoogleSheets(namaPegawai, statusAbsen, jarakMeter) {
    const dataKirim = {
        nama: namaPegawai,
        status: statusAbsen,
        jarak: jarakMeter
    };

    fetch(URL_WEB_APP, {
        method: "POST",
        mode: "no-cors", // Mode aman untuk lintas domain Google
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dataKirim)
    })
    .then(() => {
        tampilkanStatus(statusAbsen.includes("GAGAL") ? `Absen selesai dicatat: Anda Ditolak (Luar Radius)` : `Absen selesai dicatat: Sukses Masuk!`, statusAbsen.includes("GAGAL") ? "gagal" : "sukses");
    })
    .catch((error) => {
        tampilkanStatus("Gagal mengirim data ke server database.", "gagal");
        console.error(error);
    });
}

function onErrorGPS(error) {
    tampilkanStatus("Gagal mendeteksi lokasi. Pastikan GPS HP Aktif dan beri izin lokasi.", "gagal");
}

function tampilkanStatus(pesan, tipe) {
    const statusDiv = document.getElementById("status");
    statusDiv.innerText = pesan;
    statusDiv.style.display = "block";
    statusDiv.className = tipe;
}

function hitungJarakMeter(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
