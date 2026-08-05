// ==========================================
// KONEKSI DATABASE & KONFIGURASI LOKASI
// ==========================================
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycby2uoA04qwcy254JqtXuKcJkIRTH2TTyXLPSOt9UU17HgFs7BOXau370A98pDRpKc8L/exec";

// Inisialisasi Kamera Scanner
const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

function onScanSuccess(decodedText, decodedResult) {
    if (decodedText.trim() === "KEMENHAJ-JEMBER") {
        // 1. Ambil Nama Pegawai dari Input HTML
        const nama = document.getElementById("namaPegawai").value.trim();

        // 2. Cek apakah nama sudah diisi
        if (nama === "") {
            tampilkanStatus("Gagal: Isi NAMA LENGKAP Anda terlebih dahulu sebelum scan!", "gagal");
            return;
        }

        // 3. Matikan Kamera
        html5QrcodeScanner.clear();
        tampilkanStatus("QR Valid! Mengirim data ke database...", "sukses");

        // 4. Kirim Data Langsung ke Google Sheets (Bypass GPS Indoor)
        kirimKeGoogleSheets(nama, "DI LOKASI KANTOR (INDOOR)", 0);

    } else {
        tampilkanStatus("QR Code Salah! Bukan QR Resmi Kantor.", "gagal");
    }
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
        tampilkanStatus("ABSEN BERHASIL! Data Anda sudah tersimpan di database.", "sukses");
    })
    .catch((error) => {
        tampilkanStatus("Gagal mengirim data ke server database.", "gagal");
        console.error(error);
    });
}

function tampilkanStatus(pesan, tipe) {
    const statusDiv = document.getElementById("status");
    statusDiv.innerText = pesan;
    statusDiv.style.display = "block";
    statusDiv.className = tipe;
}
