/* =========================================================
   AUTH.JS — LOGIKA AUTENTIKASI
   Fungsi asli dipisahkan dari app.js tanpa mengubah alurnya.
   ========================================================= */

const ADMIN_USER = "paneladmin";
        const ADMIN_PASS = "Yusupgg01";

function initiateRegisterVerification() {
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const pass = document.getElementById('reg-pass').value.trim();

            let emailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
            if (!emailRegex.test(email) || email.includes('..') || email.startsWith('.')) {
                showCustomAlert("Pendaftaran Gagal", "Harap masukkan format <b>@gmail.com</b> yang valid dan asli.");
                return;
            }
            if (!pass || pass.length < 6) {
                showCustomAlert("Pendaftaran Gagal", "Password minimal harus memiliki 6 karakter.");
                return;
            }

            const users = getUsers();
            if(users.some(u => u.email === email)) {
                showCustomAlert("Pendaftaran Gagal", "Email tersebut sudah terdaftar di dalam sistem.");
                return;
            }

            generatedOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
            pendingRegistrationData = { name, email, pass };

            const btnSubmitReg = document.getElementById('btn-submit-reg');
            btnSubmitReg.innerText = "Mengirim Kode ke Email...";
            btnSubmitReg.disabled = true;

            let templateParams = {
                to_email: email,
                to_name: name,
                otp_code: generatedOtpCode
            };

            emailjs.send('service_default', 'template_default', templateParams)
                .then(function(response) {
                    btnSubmitReg.innerText = "Daftar Akun";
                    btnSubmitReg.disabled = false;
                    document.getElementById('otp-target-email').innerText = email;
                    document.getElementById('otp-modal').classList.add('active');
                }, function(error) {
                    btnSubmitReg.innerText = "Daftar Akun";
                    btnSubmitReg.disabled = false;
                    document.getElementById('otp-target-email').innerText = email;
                    document.getElementById('otp-modal').classList.add('active');
                });
        }

function closeOtpModal() {
            document.getElementById('otp-modal').classList.remove('active');
        }

function verifyEmailOtpCode() {
            const enteredOtp = document.getElementById('otp-input-code').value.trim();
            if (enteredOtp !== generatedOtpCode) {
                showCustomAlert("Verifikasi Gagal", "Kode verifikasi salah! Silakan periksa kembali email Anda.");
                return;
            }

            closeOtpModal();
            finalizeRegistration(pendingRegistrationData);
        }

function finalizeRegistration(data) {
            const { name, email, pass } = data;
            let assignedRef = generateRefCode(name);
            let pendingRefCode = localStorage.getItem('pending_ref');
            let bonusAwal = 0;

            const users = getUsers();
            if (pendingRefCode && pendingRefCode !== assignedRef) {
                let referrer = users.find(u => u.refCode === pendingRefCode);
                if (referrer) {
                    referrer.bonusReferral = (referrer.bonusReferral || 0) + 5000;
                    db.ref('users/' + referrer.email.replace(/[\.\#\$\[\]]/g, '_')).set(referrer);
                }
            }

            let newUser = { 
                name, 
                email, 
                role: "User", 
                refCode: assignedRef,
                bonusReferral: bonusAwal,
                ipAddress: clientIpAddress,
                isBanned: false
            };

            db.ref('users/' + email.replace(/[\.\#\$\[\]]/g, '_')).set(newUser);
            localStorage.removeItem('pending_ref');

            showCustomAlert("Berhasil Terdaftar", "Verifikasi Email Berhasil! Akun Anda telah terdaftar secara resmi. Silakan Masuk.");
            document.getElementById('reg-name').value = '';
            document.getElementById('reg-email').value = '';
            document.getElementById('reg-pass').value = '';
            document.getElementById('otp-input-code').value = '';
            switchAuth('login');
        }

function handleCredentialResponse(response) {
            const responsePayload = parseJwt(response.credential);
            let email = responsePayload.email;
            let name = responsePayload.name;

            const users = getUsers();
            let found = users.find(u => u.email === email);

            if (found && found.isBanned) {
                showCustomAlert("Akses Ditolak", "Akun Google ini telah diblokir (banned) oleh Admin.");
                closeGoogleModal();
                return;
            }

            if (!found) {
                let assignedRef = generateRefCode(name.replace(/[^a-zA-Z0-9]/g, ''));
                let pendingRefCode = localStorage.getItem('pending_ref');
                let bonusAwal = 0;

                if (pendingRefCode && pendingRefCode !== assignedRef) {
                    let referrer = users.find(u => u.refCode === pendingRefCode);
                    if (referrer) {
                        referrer.bonusReferral = (referrer.bonusReferral || 0) + 5000;
                        db.ref('users/' + referrer.email.replace(/[\.\#\$\[\]]/g, '_')).set(referrer);
                    }
                }

                found = { 
                    name: name, 
                    email: email, 
                    role: "User", 
                    refCode: assignedRef,
                    bonusReferral: bonusAwal,
                    ipAddress: clientIpAddress,
                    isBanned: false
                };
                
                db.ref('users/' + email.replace(/[\.\#\$\[\]]/g, '_')).set(found);
                localStorage.removeItem('pending_ref');
            } else {
                found.ipAddress = clientIpAddress;
                db.ref('users/' + email.replace(/[\.\#\$\[\]]/g, '_')).update({ ipAddress: clientIpAddress });
            }

            currentUser = found.email;
            document.getElementById('admin-panel-container').style.display = 'none';
            
            closeGoogleModal();
            navigateTo('view-beranda');
        }

function parseJwt(token) {
            var base64Url = token.split('.')[1];
            var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        }

function processLogin() {
            const inputUser = document.getElementById('login-email').value.trim();
            const inputPass = document.getElementById('login-pass').value.trim();
            const users = getUsers();
            let found = users.find(u => u.email === inputUser || u.name === inputUser);

            if (inputUser === ADMIN_USER && inputPass === ADMIN_PASS) {
                currentUser = 'admin';
                document.getElementById('admin-panel-container').style.display = 'block';
            } else if (found) {
                if(found.isBanned) {
                    showCustomAlert("Akses Ditolak", "Akun Anda telah diblokir (banned) oleh Admin.");
                    return;
                }
                found.ipAddress = clientIpAddress;
                db.ref('users/' + found.email.replace(/[\.\#\$\[\]]/g, '_')).update({ ipAddress: clientIpAddress });
                currentUser = found.email;
                document.getElementById('admin-panel-container').style.display = 'none';
            } else {
                showCustomAlert("Login Gagal", "Akun tidak ditemukan atau password salah!");
                return;
            }
            navigateTo('view-beranda');
        }

function openGoogleModal() { document.getElementById('google-modal').classList.add('active'); }

function closeGoogleModal() { document.getElementById('google-modal').classList.remove('active'); }

function switchAuth(type) {
            document.getElementById('tab-login').classList.toggle('active', type === 'login');
            document.getElementById('tab-register').classList.toggle('active', type === 'register');
            document.getElementById('form-auth-login').style.display = type === 'login' ? 'block' : 'none';
            document.getElementById('form-auth-reg').style.display = type === 'register' ? 'block' : 'none';
        }
