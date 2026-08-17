const firebaseConfig = {
          apiKey: "AIzaSyDbQDMvSEIVNRMmEkaY1L...",
          authDomain: "dafz99.firebaseapp.com",
          projectId: "dafz99",
          storageBucket: "dafz99.appspot.com",
          messagingSenderId: "42190916488",
          appId: "1:42190916488:web:af8f6b505..."
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        lucide.createIcons();


        const DEFAULT_RULES = `<h4>Rules / Aturan Storan Gmail</h4><ol style="padding-left: 16px; margin-top: 6px;"><li>Gmail Harus Fresh (Baru dibuat).</li><li>Format wajib: email@gmail.com|password (Password wajib: <b>sgsg1122</b>).</li><li>Wajib mengikuti format angka yang ditentukan sebelum @gmail.com.</li></ol>`;
        const DEFAULT_NOTICE_BLUE = "<strong>Wajib akhiri angka 1-100</strong><br>Angka harus tepat sebelum @gmail.com, tanpa huruf/simbol setelahnya.";
        const DEFAULT_NOTICE_YELLOW = "<strong>Password wajib untuk Gmail yang disetor:</strong><br><code style='background: rgba(0,0,0,0.06); padding: 2px 4px; border-radius: 4px;'>sgsg1122</code>";

        let currentUser = null;
        let selectedWallet = "DANA";
        let referralCodeFromUrl = "";
        let clientIpAddress = "192.168.1." + Math.floor(Math.random() * 5 + 1);

        let remoteSettings = {};
        let remoteUsers = [];
        let remoteStoran = [];
        let remoteTarik = [];

        let pendingRegistrationData = null;
        let generatedOtpCode = "";

        window.addEventListener('DOMContentLoaded', () => {
            fetch('https://api.ipify.org?format=json')
                .then(response => response.json())
                .then(data => { if(data.ip) clientIpAddress = data.ip; })
                .catch(() => {});

            const urlParams = new URLSearchParams(window.location.search);
            referralCodeFromUrl = urlParams.get('ref');
            if(referralCodeFromUrl) {
                localStorage.setItem('pending_ref', referralCodeFromUrl);
            }

            db.ref('settings').on('value', (snapshot) => {
                remoteSettings = snapshot.val() || {};
                applySettingsToUI();
            });

            db.ref('users').on('value', (snapshot) => {
                let data = snapshot.val();
                remoteUsers = data ? Object.values(data) : [
                    { name: "Admin Utama", email: "admin", role: "Admin", refCode: "ADMINDAF", bonusReferral: 0, ipAddress: "127.0.0.1" }
                ];
                if(currentUser === 'admin') renderAdminData();
            });

            db.ref('storan').on('value', (snapshot) => {
                let data = snapshot.val();
                remoteStoran = data ? Object.values(data) : [];
                updateStoranUI();
                if(document.getElementById('view-riwayat').classList.contains('active-view')) renderUserRiwayat();
                if(currentUser === 'admin') renderAdminData();
            });

            db.ref('tarik_dana').on('value', (snapshot) => {
                let data = snapshot.val();
                remoteTarik = data ? Object.values(data) : [];
                if(document.getElementById('view-saldo').classList.contains('active-view')) renderTarikRiwayat();
                if(currentUser === 'admin') renderAdminData();
            });

            navigateTo('view-auth');
        });

        // FUNGSI MODAL ALERT KUSTOM YANG TERSTRUKTUR & RAPI
        function showCustomAlert(title, htmlContent) {
            document.getElementById('custom-alert-title').innerText = title;
            document.getElementById('custom-alert-body').innerHTML = htmlContent;
            document.getElementById('custom-alert-modal').classList.add('active');
        }

        function closeCustomAlert() {
            document.getElementById('custom-alert-modal').classList.remove('active');
        }

        

        

        

        

        

        

        function bukaCheckGmailExternal() {
            window.open('https://checkgmail.online', '_blank');
        }

        function applySettingsToUI() {
            let rules = remoteSettings.rules || DEFAULT_RULES;
            let noticeBlue = remoteSettings.noticeBlue || DEFAULT_NOTICE_BLUE;
            let noticeYellow = remoteSettings.noticeYellow || DEFAULT_NOTICE_YELLOW;
            let status = remoteSettings.status || 'buka';
            let harga = remoteSettings.harga || 'Rp4.700';
            let pesan = remoteSettings.pesan || 'Storan sedang ditutup sementara oleh Admin.';
            let linkTele = remoteSettings.linkTele || 'https://t.me/username_saluran';
            let linkWaChannel = remoteSettings.linkWaChannel || 'https://whatsapp.com/channel/xxx';
            let nomorWa = remoteSettings.nomorWa || '6281234567890';

            if(document.getElementById('admin-rules-input')) document.getElementById('admin-rules-input').value = rules;
            if(document.getElementById('admin-notice-blue')) document.getElementById('admin-notice-blue').value = noticeBlue;
            if(document.getElementById('admin-notice-yellow')) document.getElementById('admin-notice-yellow').value = noticeYellow;
            if(document.getElementById('admin-status-storan')) document.getElementById('admin-status-storan').value = status;
            if(document.getElementById('admin-harga')) document.getElementById('admin-harga').value = harga;
            if(document.getElementById('admin-pesan-tutup')) document.getElementById('admin-pesan-tutup').value = pesan;
            if(document.getElementById('admin-link-tele')) document.getElementById('admin-link-tele').value = linkTele;
            if(document.getElementById('admin-link-wa-channel')) document.getElementById('admin-link-wa-channel').value = linkWaChannel;
            if(document.getElementById('admin-nomor-wa')) document.getElementById('admin-nomor-wa').value = nomorWa;

            updateStoranUI();
        }

        function getUsers() { return remoteUsers; }
        function getStoran() { return remoteStoran; }
        function getTarikList() { return remoteTarik; }

        function generateRefCode(name) {
            let clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            return clean.substring(0, 5) + Math.floor(100 + Math.random() * 900);
        }

        function detectNuyul(user, allUsers) {
            let alasan = [];
            const emailName = user.email.split('@')[0];
            
            if (emailName.length > 15 && /^[a-z0-9]+$/.test(emailName) && !/[aeiou]{2,}/.test(emailName)) {
                alasan.push("Email terindikasi generate otomatis");
            }
            
            let isIpDuplicate = false;
            if (user.ipAddress && allUsers) {
                let sameIpCount = allUsers.filter(u => u.ipAddress === user.ipAddress && u.email !== user.email).length;
                if (sameIpCount > 0) {
                    isIpDuplicate = true;
                    alasan.push(`IP Kembar terdeteksi (${user.ipAddress})`);
                }
            }

            return {
                isNuyul: alasan.length > 0,
                isIpGanda: isIpDuplicate,
                alasan: alasan.length > 0 ? alasan.join(", ") : "Normal / Asli"
            };
        }

        function autoCleanDuplicateIpUsers() {
            if(!confirm("Apakah Anda yakin ingin memblokir akun-akun dengan IP kembar/ganda secara otomatis?")) return;
            let users = getUsers();
            let ipCounts = {};
            users.forEach(u => { if (u.ipAddress && u.email !== 'admin') ipCounts[u.ipAddress] = (ipCounts[u.ipAddress] || 0) + 1; });
            let cleanedCount = 0;
            users.forEach(u => {
                if (u.email !== 'admin' && u.ipAddress && ipCounts[u.ipAddress] > 1) {
                    db.ref('users/' + u.email.replace(/[\.\#\$\[\]]/g, '_')).update({ isBanned: true });
                    cleanedCount++;
                }
            });
            showCustomAlert("Pembersihan Selesai", `Sebanyak <b>${cleanedCount}</b> akun berhasil diblokir.`);
        }

        function autoDeleteAllNgasalUsers() {
            if(!confirm("Hapus permanen semua akun nuyul?")) return;
            let users = getUsers();
            let deletedCount = 0;
            users.forEach(u => {
                if (u.email !== 'admin') {
                    let nuyulCheck = detectNuyul(u, users);
                    if (nuyulCheck.isNuyul || nuyulCheck.isIpGanda) {
                        db.ref('users/' + u.email.replace(/[\.\#\$\[\]]/g, '_')).remove();
                        deletedCount++;
                    }
                }
            });
            showCustomAlert("Pembersihan Selesai", `Berhasil menghapus <b>${deletedCount}</b> akun nuyul.`);
        }

        function autoCleanNgasalWithdrawals() {
            if(!confirm("Bersihkan penarikan saldo ngasal?")) return;
            let tarikList = getTarikList();
            let users = getUsers();
            let storanList = getStoran();
            let hargaStr = remoteSettings.harga || 'Rp4.700';
            let hargaNum = parseInt(hargaStr.replace(/[^0-9]/g, '')) || 4700;
            let cleanedCount = 0;

            tarikList.forEach(item => {
                let u = users.find(usr => usr.email === item.user);
                let userStoranDiterima = storanList.filter(s => s.user === item.user && s.status === 'Diterima').length;
                let totalSaldoSah = (userStoranDiterima * hargaNum) + (u ? (u.bonusReferral || 0) : 0);

                if (item.nominal > totalSaldoSah || !item.nomor || item.nomor.length < 9 || (u && u.isBanned)) {
                    db.ref('tarik_dana/' + item.id).remove();
                    cleanedCount++;
                }
            });
            showCustomAlert("Pembersihan Selesai", `Berhasil membersihkan <b>${cleanedCount}</b> data penarikan tidak sah.`);
        }

        function selectWalletProvider(provider) {
            selectedWallet = provider;
            document.querySelectorAll('.provider-btn').forEach(btn => btn.classList.remove('active'));
            if(provider === 'DANA') document.getElementById('btn-wallet-dana').classList.add('active');
            if(provider === 'OVO') document.getElementById('btn-wallet-ovo').classList.add('active');
            if(provider === 'GoPay') document.getElementById('btn-wallet-gopay').classList.add('active');
            document.getElementById('label-nomor-tujuan').innerText = `Nomor Akun ${provider}`;
        }

        function navigateTo(viewId) {
            document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active-view'));
            const targetView = document.getElementById(viewId);
            if (targetView) targetView.classList.add('active-view');

            const header = document.querySelector('.app-header');
            const bottomNav = document.querySelector('.bottom-nav');

            if (viewId === 'view-auth') {
                header.classList.remove('active-nav');
                bottomNav.classList.remove('active-nav');
            } else {
                header.classList.add('active-nav');
                bottomNav.classList.add('active-nav');
            }

            window.scrollTo(0, 0);
            updateStoranUI();
            if (viewId === 'view-riwayat') renderUserRiwayat();
            if (viewId === 'view-saldo') renderTarikRiwayat();
            if (viewId === 'view-profil' || viewId === 'view-referral') {
                renderUserProfilData();
                if (currentUser === 'admin') renderAdminData();
            }
        }

        

        
        

        function renderUserProfilData() {
            const users = getUsers();
            if (currentUser === 'admin') {
                document.getElementById('profil-nama').innerText = "Admin Utama";
                document.getElementById('profil-email').innerText = "admin@system.local";
                document.getElementById('profil-referral-link').value = window.location.origin + window.location.pathname + "?ref=ADMINDAF";
            } else {
                let found = users.find(u => u.email === currentUser);
                if (found) {
                    document.getElementById('profil-nama').innerText = found.name;
                    document.getElementById('profil-email').innerText = found.email;
                    if(!found.refCode) {
                        found.refCode = generateRefCode(found.name);
                        db.ref('users/' + found.email.replace(/[\.\#\$\[\]]/g, '_')).set(found);
                    }
                    document.getElementById('profil-referral-link').value = window.location.origin + window.location.pathname + "?ref=" + found.refCode;
                }
            }
        }

        function copyReferralLink() {
            const copyText = document.getElementById('profil-referral-link');
            copyText.select();
            navigator.clipboard.writeText(copyText.value);
            showCustomAlert("Berhasil", "Link referral berhasil disalin ke clipboard!");
        }

        function saveAdminSettings() {
            let settingsData = {
                status: document.getElementById('admin-status-storan').value,
                harga: document.getElementById('admin-harga').value,
                linkTele: document.getElementById('admin-link-tele').value,
                linkWaChannel: document.getElementById('admin-link-wa-channel').value,
                nomorWa: document.getElementById('admin-nomor-wa').value,
                pesan: document.getElementById('admin-pesan-tutup').value,
                rules: document.getElementById('admin-rules-input').value,
                noticeBlue: document.getElementById('admin-notice-blue').value,
                noticeYellow: document.getElementById('admin-notice-yellow').value
            };
            db.ref('settings').set(settingsData);
        }

        function updateStoranUI() {
            const status = remoteSettings.status || 'buka';
            const harga = remoteSettings.harga || 'Rp4.700';
            const pesan = remoteSettings.pesan || 'Storan ditutup.';
            const linkTele = remoteSettings.linkTele || 'https://t.me/username_saluran';
            const linkWaChannel = remoteSettings.linkWaChannel || 'https://whatsapp.com/channel/xxx';
            const nomorWa = remoteSettings.nomorWa || '6281234567890';

            document.getElementById('header-social-container').innerHTML = `
                <a href="${linkTele}" target="_blank" class="btn-social-header" style="color: #0088cc;"><i data-lucide="send" style="width: 12px; height: 12px;"></i> Tele</a>
                <a href="${linkWaChannel}" target="_blank" class="btn-social-header" style="color: #25d366;"><i data-lucide="message-square" style="width: 12px; height: 12px;"></i> WA</a>
            `;

            document.getElementById('profil-social-container').innerHTML = `
                <a href="${linkTele}" target="_blank" class="btn-primary" style="text-align: center; background: #0088cc; font-size: 0.75rem; padding: 8px;"><i data-lucide="send" style="width: 13px;"></i> Telegram</a>
                <a href="${linkWaChannel}" target="_blank" class="btn-primary" style="text-align: center; background: #25d366; font-size: 0.75rem; padding: 8px;"><i data-lucide="message-square" style="width: 13px;"></i> Channel WA</a>
                <a href="https://wa.me/${nomorWa}" target="_blank" class="btn-primary" style="text-align: center; background: #16a34a; font-size: 0.75rem; padding: 8px;"><i data-lucide="phone" style="width: 13px;"></i> WA Saya</a>
            `;

            document.getElementById('display-harga').innerText = harga;
            if(document.getElementById('dash-harga-card')) document.getElementById('dash-harga-card').innerText = harga;

            document.getElementById('display-rules-content').innerHTML = remoteSettings.rules || DEFAULT_RULES;
            document.getElementById('notice-blue-text').innerHTML = remoteSettings.noticeBlue || DEFAULT_NOTICE_BLUE;
            document.getElementById('notice-yellow-text').innerHTML = remoteSettings.noticeYellow || DEFAULT_NOTICE_YELLOW;

            const alertBox = document.getElementById('storan-status-alert');
            const textareaInput = document.getElementById('setor-input');
            const btnKirim = document.getElementById('btn-kirim-storan');

            if (alertBox) {
                if (status === 'tutup') {
                    alertBox.innerHTML = `<div class="notice-box notice-red"><i data-lucide="alert-circle" style="width: 18px;"></i><div><strong>Storan Ditutup!</strong><br>${pesan}</div></div>`;
                    if (textareaInput) textareaInput.disabled = true;
                    if (btnKirim) { btnKirim.disabled = true; btnKirim.style.opacity = '0.5'; }
                } else {
                    alertBox.innerHTML = `<div class="notice-box notice-yellow"><i data-lucide="check-circle" style="width: 18px;"></i><div><strong>Storan Dibuka</strong><br>Silakan masukkan daftar Gmail sesuai format rules.</div></div>`;
                    if (textareaInput) textareaInput.disabled = false;
                    if (btnKirim) { btnKirim.disabled = false; btnKirim.style.opacity = '1'; }
                }
            }

            const storan = getStoran();
            let myStoran = currentUser === 'admin' ? storan : storan.filter(s => s.user === currentUser);
            let d = myStoran.filter(s => s.status === 'Diterima').length;
            let p = myStoran.filter(s => s.status === 'Pending').length;
            let t = myStoran.filter(s => s.status === 'Ditolak').length;

            if(document.getElementById('stat-diterima')) document.getElementById('stat-diterima').innerText = d;
            if(document.getElementById('stat-pending')) document.getElementById('stat-pending').innerText = p;
            if(document.getElementById('stat-ditolak')) document.getElementById('stat-ditolak').innerText = t;

            let hargaNum = parseInt(harga.replace(/[^0-9]/g, '')) || 4700;
            let totalSaldoStoran = d * hargaNum;
            let totalBonusRef = 0;
            if(currentUser !== 'admin' && currentUser) {
                let users = getUsers();
                let foundUser = users.find(u => u.email === currentUser);
                if(foundUser) totalBonusRef = foundUser.bonusReferral || 0;
            }

            let totalSaldoKeseluruhan = totalSaldoStoran + totalBonusRef;
            const tarikList = getTarikList();
            let myActiveTarik = tarikList.filter(item => item.user === currentUser && (item.status === 'Pending' || item.status === 'Berhasil'));
            let totalTarikDiajukan = myActiveTarik.reduce((sum, item) => sum + item.nominal, 0);
            let saldoRealFinal = Math.max(0, totalSaldoKeseluruhan - totalTarikDiajukan);

            if(document.getElementById('dash-balance')) document.getElementById('dash-balance').innerText = 'Rp' + saldoRealFinal.toLocaleString('id-ID');
            if(document.getElementById('user-saldo-display')) document.getElementById('user-saldo-display').innerText = 'Rp' + saldoRealFinal.toLocaleString('id-ID');

            lucide.createIcons();
        }

        

        function countLines() {
            const text = document.getElementById('setor-input').value.trim();
            const lines = text ? text.split('\n').filter(l => l.trim() !== '') : [];
            document.getElementById('line-count').innerText = lines.length;
        }

        // SISTEM VALIDASI FORMAT DENGAN PERINGATAN TERSTRUKTUR & RAPI (TIDAK MENUMPUK)
        function processSetor() {
            const text = document.getElementById('setor-input').value.trim();
            if (!text) {
                showCustomAlert("Perhatian", "Silakan masukkan daftar Gmail terlebih dahulu!");
                return;
            }
            const lines = text.split('\n').filter(l => l.trim() !== '');
            
            const existingStoran = getStoran();
            let existingEmailsSet = new Set(existingStoran.map(s => s.gmail.split('|')[0].trim().toLowerCase()));

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();

                // 1. Validasi Pemisah |
                if (!line.includes('|')) {
                    let errHtml = `
                        Ditemukan kesalahan pada <b>Baris ke-${i + 1}</b>:<br>
                        <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin: 8px 0; font-family: monospace; color: var(--text-main); font-size: 0.8rem;">${escapeHtml(line)}</div>
                        <p style="margin-top: 6px; font-weight: 600; color: var(--danger);">Penyebab:</p>
                        <ul style="padding-left: 18px; margin-top: 4px; font-size: 0.8rem;">
                            <li>Format pemisah garis vertikal (<b>|</b>) tidak ditemukan.</li>
                        </ul>
                        <p style="margin-top: 8px; font-size: 0.78rem;"><b>Aturan Format:</b> Gunakan format <code style="background:#f1f5f9; padding:2px 4px; border-radius:4px;">email@gmail.com|password</code>.</p>
                    `;
                    showCustomAlert(`Format Salah (Baris ${i + 1})`, errHtml);
                    return;
                }

                let parts = line.split('|');
                let email = parts[0].trim().toLowerCase();
                let password = parts[1].trim();
                let emailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;

                // 2. Validasi Format Email Valid @gmail.com
                if (!emailRegex.test(email) || email.includes('..') || email.startsWith('.')) {
                    let errHtml = `
                        Ditemukan kesalahan pada <b>Baris ke-${i + 1}</b>:<br>
                        <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin: 8px 0; font-family: monospace; color: var(--text-main); font-size: 0.8rem;">${escapeHtml(line)}</div>
                        <p style="margin-top: 6px; font-weight: 600; color: var(--danger);">Penyebab:</p>
                        <ul style="padding-left: 18px; margin-top: 4px; font-size: 0.8rem;">
                            <li>Email tidak valid atau tidak menggunakan domain <b>@gmail.com</b> yang resmi.</li>
                        </ul>
                        <p style="margin-top: 8px; font-size: 0.78rem;">Silakan periksa kembali penulisannya.</p>
                    `;
                    showCustomAlert(`Email Tidak Valid (Baris ${i + 1})`, errHtml);
                    return;
                }

                // 3. Validasi Password Wajib sgsg1122
                if (password !== "sgsg1122") {
                    let errHtml = `
                        Ditemukan kesalahan pada <b>Baris ke-${i + 1}</b>:<br>
                        <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin: 8px 0; font-family: monospace; color: var(--text-main); font-size: 0.8rem;">${escapeHtml(line)}</div>
                        <p style="margin-top: 6px; font-weight: 600; color: var(--danger);">Penyebab:</p>
                        <ul style="padding-left: 18px; margin-top: 4px; font-size: 0.8rem;">
                            <li>Password wajib menggunakan <b>sgsg1122</b> (Anda menulis: <i>${escapeHtml(password)}</i>).</li>
                        </ul>
                        <p style="margin-top: 8px; font-size: 0.78rem;">Ubah password pada baris tersebut menjadi <b>sgsg1122</b>.</p>
                    `;
                    showCustomAlert(`Password Salah (Baris ${i + 1})`, errHtml);
                    return;
                }

                // 4. Validasi Duplikasi Email
                if (existingEmailsSet.has(email)) {
                    let errHtml = `
                        Ditemukan kesalahan pada <b>Baris ke-${i + 1}</b>:<br>
                        <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin: 8px 0; font-family: monospace; color: var(--text-main); font-size: 0.8rem;">${escapeHtml(line)}</div>
                        <p style="margin-top: 6px; font-weight: 600; color: var(--danger);">Penyebab:</p>
                        <ul style="padding-left: 18px; margin-top: 4px; font-size: 0.8rem;">
                            <li>Email <b>${escapeHtml(email)}</b> sudah pernah disetor sebelumnya di dalam sistem.</li>
                        </ul>
                        <p style="margin-top: 8px; font-size: 0.78rem;">Gunakan email fresh yang belum pernah disetor.</p>
                    `;
                    showCustomAlert(`Email Duplikat (Baris ${i + 1})`, errHtml);
                    return;
                }

                existingEmailsSet.add(email);
            }

            // Jika semua lolos validasi rules
            lines.forEach((line, index) => {
                let uniqueId = 'storan_' + Date.now() + '_' + index + '_' + Math.floor(Math.random() * 1000);
                let newStoranItem = {
                    id: uniqueId,
                    user: currentUser || 'user@gmail.com',
                    gmail: line,
                    status: 'Diterima', 
                    time: new Date().toLocaleDateString()
                };
                db.ref('storan/' + uniqueId).set(newStoranItem);
            });

            showCustomAlert("Berhasil Disetor", `Seluruh data (${lines.length} baris) berhasil dikirim dan sesuai dengan rules.`);
            document.getElementById('setor-input').value = '';
            countLines();
            navigateTo('view-riwayat');
        }

        function processTarikDana() {
            const nomor = document.getElementById('user-dana-input').value.trim();
            const nominal = parseInt(document.getElementById('user-nominal-input').value);

            if (!nomor || nomor.length < 9) { showCustomAlert("Peringatan", "Masukkan nomor akun tujuan e-wallet yang valid!"); return; }
            if (!nominal || isNaN(nominal) || nominal < 10000) { showCustomAlert("Peringatan", "Minimal pencairan dana adalah Rp10.000!"); return; }

            const storan = getStoran();
            let myStoran = storan.filter(s => s.user === currentUser);
            let d = myStoran.filter(s => s.status === 'Diterima').length;
            let hargaStr = remoteSettings.harga || 'Rp4.700';
            let hargaNum = parseInt(hargaStr.replace(/[^0-9]/g, '')) || 4700;
            let totalSaldoStoran = d * hargaNum;

            let totalBonusRef = 0;
            let users = getUsers();
            let foundUser = users.find(u => u.email === currentUser);
            if(foundUser) totalBonusRef = foundUser.bonusReferral || 0;

            let totalPendapatanUser = totalSaldoStoran + totalBonusRef;
            const tarikList = getTarikList();
            let myTarik = tarikList.filter(t => t.user === currentUser && (t.status === 'Pending' || t.status === 'Berhasil'));
            let sisaSaldoReal = totalPendapatanUser - myTarik.reduce((sum, item) => sum + item.nominal, 0);

            if (nominal > sisaSaldoReal) {
                showCustomAlert("Penarikan Gagal", `Melebihi saldo pendapatan valid Anda (Sisa: Rp${sisaSaldoReal.toLocaleString('id-ID')}).`);
                return;
            }

            let uniqueId = 'tarik_' + Date.now();
            let nuyulCheck = foundUser ? detectNuyul(foundUser, users) : { isNuyul: false };

            let statusWd = (!nuyulCheck.isNuyul && nominal <= sisaSaldoReal) ? 'Berhasil' : 'Pending';

            db.ref('tarik_dana/' + uniqueId).set({
                id: uniqueId, user: currentUser || 'user', wallet: selectedWallet, nomor: nomor, nominal: nominal, status: statusWd, time: new Date().toLocaleDateString()
            });

            if(statusWd === 'Berhasil') {
                showCustomAlert("Penarikan Berhasil", `Penarikan dana Rp${nominal.toLocaleString('id-ID')} berhasil diverifikasi dan langsung di-ACC.`);
            } else {
                showCustomAlert("Penarikan Pending", `Permintaan penarikan dana Rp${nominal.toLocaleString('id-ID')} diajukan dalam status Pending.`);
            }

            document.getElementById('user-dana-input').value = '';
            document.getElementById('user-nominal-input').value = '';
            renderTarikRiwayat();
        }

        function renderTarikRiwayat() {
            const tarikList = getTarikList();
            let myList = currentUser === 'admin' ? tarikList : tarikList.filter(t => t.user === currentUser);
            const container = document.getElementById('riwayat-penarikan-list');

            if (myList.length === 0) { container.innerHTML = `Belum ada pengajuan penarikan dana.`; return; }

            let html = '';
            myList.slice().reverse().forEach(item => {
                let color = item.status === 'Berhasil' ? 'var(--success)' : (item.status === 'Ditolak' ? 'var(--danger)' : 'var(--warning)');
                html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border);">
                    <div><strong>${item.wallet} (${item.nomor})</strong><br><span>Rp${item.nominal.toLocaleString('id-ID')} • ${item.time}</span></div>
                    <span style="font-weight: 700; color: ${color};">${item.status}</span>
                </div>`;
            });
            container.innerHTML = html;
        }

        function sendSuggestion(text) {
            document.getElementById('chat-input-field').value = text;
            sendUserChatMessage();
        }

        function sendUserChatMessage() {
            const inputField = document.getElementById('chat-input-field');
            const message = inputField.value.trim();
            if (!message) return;

            const box = document.getElementById('chat-messages-box');
            box.innerHTML += `<div class="chat-bubble user">${escapeHtml(message)}</div>`;
            inputField.value = '';
            box.scrollTop = box.scrollHeight;

            setTimeout(() => {
                let aiReply = getAIResponse(message);
                box.innerHTML += `<div class="chat-bubble ai">${aiReply}</div>`;
                box.scrollTop = box.scrollHeight;
                lucide.createIcons();
            }, 600);
        }

        function getAIResponse(msg) {
            let m = msg.toLowerCase();
            if (m.includes('tolak')) return "Jika format tidak sesuai rules atau password bukan 'sgsg1122', sistem akan menampilkan peringatan agar Anda dapat memperbaiki formatnya.";
            if (m.includes('saldo')) return "Minimal penarikan saldo adalah Rp10.000 dan langsung di-ACC otomatis jika ID serta saldo valid.";
            if (m.includes('password')) return "Password wajib diisi menggunakan 'sgsg1122' sesuai ketentuan rules admin.";
            return "Silakan cek menu Rules atau hubungi Admin via tombol Telegram/WhatsApp di menu Profil.";
        }

        function escapeHtml(text) {
            return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        function renderUserRiwayat() {
            const storan = getStoran();
            let myStoran = currentUser === 'admin' ? storan : storan.filter(s => s.user === currentUser);
            const container = document.getElementById('riwayat-list-container');

            if (myStoran.length === 0) {
                container.innerHTML = `<div class="info-box-card" style="text-align: center; color: var(--text-sub); padding: 30px 10px;">Belum ada setoran.</div>`;
                return;
            }

            let groupedByDate = {};
            myStoran.slice().reverse().forEach(item => {
                let tgl = item.time || 'Tanggal Tidak Diketahui';
                if (!groupedByDate[tgl]) groupedByDate[tgl] = [];
                groupedByDate[tgl].push(item);
            });

            let html = '';
            for (let tgl in groupedByDate) {
                let listPerTanggal = groupedByDate[tgl];
                html += `<div class="info-box-card" style="margin-bottom: 16px; border: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <span style="font-weight: 800; font-size: 0.85rem; color: var(--primary);">📅 ${escapeHtml(tgl)}</span>
                        <button class="btn-primary" style="width: auto; padding: 4px 10px; font-size: 0.7rem; background: var(--success);" onclick="copyByDate('${tgl}')">Salin Tanggal Ini</button>
                    </div>
                    <div>`;

                listPerTanggal.forEach(item => {
                    let color = item.status === 'Diterima' ? 'var(--success)' : (item.status === 'Ditolak' ? 'var(--danger)' : 'var(--warning)');
                    html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border);">
                        <div><strong style="font-size: 0.82rem; font-family: monospace;">${escapeHtml(item.gmail)}</strong><br><span style="font-size: 0.68rem; color: var(--text-sub);">User: ${escapeHtml(item.user)}</span></div>
                        <span style="font-size: 0.72rem; font-weight: 700; color: ${color};">${item.status}</span>
                    </div>`;
                });
                html += `</div></div>`;
            }
            container.innerHTML = html;
            lucide.createIcons();
        }

        function copyByDate(targetDate) {
            const storan = getStoran();
            let myStoran = currentUser === 'admin' ? storan : storan.filter(s => s.user === currentUser);
            let filtered = myStoran.filter(item => item.time === targetDate);
            if (filtered.length === 0) return;
            navigator.clipboard.writeText(filtered.map(i => i.gmail).join('\n')).then(() => showCustomAlert("Berhasil Disalin", `Berhasil menyalin ${filtered.length} data tanggal ${targetDate}!`));
        }

        function copyAllRiwayatGmail() {
            const storan = getStoran();
            let myStoran = currentUser === 'admin' ? storan : storan.filter(s => s.user === currentUser);
            if (myStoran.length === 0) return;
            navigator.clipboard.writeText(myStoran.map(i => i.gmail).join('\n')).then(() => showCustomAlert("Berhasil Disalin", "Berhasil menyalin seluruh data Gmail!"));
        }

        function renderAdminData() {
            const users = getUsers();
            document.getElementById('total-user-count').innerText = users.length;

            let userHtml = '';
            users.forEach(u => {
                let isBanned = u.isBanned || false;
                let statusBadge = isBanned ? '<span style="color:var(--danger); font-weight:bold;">(BANNED)</span>' : '<span style="color:var(--success); font-weight:bold;">(Aktif)</span>';
                let nuyulCheck = detectNuyul(u, users);

                userHtml += `<tr class="user-row">
                    <td>${escapeHtml(u.name)} ${statusBadge}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td style="font-family:monospace; font-size:0.7rem;">${escapeHtml(u.ipAddress || '-')}</td>
                    <td><b>Rp${(u.bonusReferral || 0).toLocaleString('id-ID')}</b></td>
                    <td>
                        <button onclick="toggleBanUser('${u.email}', ${!isBanned})" style="background:${isBanned?'var(--success)':'var(--danger)'}; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.65rem; cursor:pointer;">${isBanned?'Unban':'Ban'}</button>
                    </td>
                </tr>`;
            });
            document.getElementById('admin-user-list-body').innerHTML = userHtml;

            const storan = getStoran();
            let storanHtml = '';
            storan.slice().reverse().forEach(item => {
                storanHtml += `<tr>
                    <td>${escapeHtml(item.user)}</td>
                    <td style="font-family:monospace;">${escapeHtml(item.gmail)}</td>
                    <td><b>${item.status}</b></td>
                    <td>
                        <button onclick="updateStoranStatus('${item.id}', 'Diterima')" style="background:var(--success); color:white; border:none; padding:3px 6px; border-radius:4px; font-size:0.65rem;">Terima</button>
                        <button onclick="updateStoranStatus('${item.id}', 'Ditolak')" style="background:var(--danger); color:white; border:none; padding:3px 6px; border-radius:4px; font-size:0.65rem;">Tolak</button>
                    </td>
                </tr>`;
            });
            document.getElementById('admin-storan-list-body').innerHTML = storanHtml;
            lucide.createIcons();
        }

        function filterUser() {
            const keyword = document.getElementById('searchUser').value.toLowerCase();
            document.querySelectorAll('.user-row').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(keyword) ? "" : "none";
            });
        }

        function toggleBanUser(email, banStatus) {
            db.ref('users/' + email.replace(/[\.\#\$\[\]]/g, '_')).update({ isBanned: banStatus });
        }

        function updateStoranStatus(id, newStatus) { db.ref('storan/' + id).update({ status: newStatus }); }
        function appLogout() { currentUser = null; navigateTo('view-auth'); }
