// ==========================================
// KONFIGURASI LOKASI KANTOR (KEMENHAJ JEMBER)
// ==========================================
const KANTOR_LAT = -8.1812; 
const KANTOR_LON = 113.6826;
const RADIUS_MAKSIMAL = 50; // Jarak maksimal dalam satuan meter

// Inisialisasi Kamera Scanner
const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

function onScanSuccess(decodedText, decodedResult) {
    // Validasi isi teks QR Code
    if (decodedText.trim() === "KEMENHAJ-JEMBER") {
        html5QrcodeScanner.clear(); // Matikan kamera setelah QR cocok
        tampilkanStatus("QR Valid! Sedang memeriksa lokasi GPS Anda...", "sukses");
        
        // Cek apakah HP mendukung GPS
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(prosesAbsen, onErrorGPS, { enableHighAccuracy: true });
        } else {
            tampilkanStatus("GPS tidak didukung di HP ini.", "gagal");
        }
    } else {
        tampilkanStatus("QR Code Salah! Bukan QR Resmi Kantor.", "gagal");
    }
}

function prosesAbsen(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    
    // Hitung jarak antara pegawai dan kantor dengan rumus Haversine
    const jarak = hitungJarakMeter(userLat, userLon, KANTOR_LAT, KANTOR_LON);
    const nama = document.getElementById("namaPegawai").value.trim();
    
    if (nama === "") {
        tampilkanStatus("Gagal: Isi NAMA LENGKAP Anda terlebih dahulu sebelum scan!", "gagal");
        return;
    }

    if (jarak <= RADIUS_MAKSIMAL) {
        tampilkanStatus(`ABSEN BERHASIL! Anda berada di lokasi kantor (${Math.round(jarak)}m).`, "sukses");
        // CATATAN: Di sini nanti bisa disambungkan ke API database eksternal
        console.log(`Absen Sukses: ${nama}, Jarak: ${Math.round(jarak)}m`);
    } else {
        tampilkanStatus(`ABSEN GAGAL: Anda berada di luar radius kantor (${Math.round(jarak)}m)!`, "gagal");
        console.log(`Absen Gagal: ${nama}, Jarak: ${Math.round(jarak)}m`);
    }
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

// Fungsi Matematika Haversine Formula untuk Hitung Jarak Koordinat
function hitungJarakMeter(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius bumi dalam meter
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