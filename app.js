// register.html handle karne ke liye listener
document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('registerForm');
    
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('regName').value;
            const phone = document.getElementById('regPhone').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            try {
                const response = await fetch('http://localhost:5000/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, phone, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Account successfully created!');
                    window.location.href = 'login.html'; // Login page par redirect kar dega
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Backend server se connection fail ho gaya.');
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('registerForm');
    
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('regName').value;
            const phone = document.getElementById('regPhone').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            try {
                const response = await fetch('http://localhost:5000/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, phone, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Account successfully created!');
                    window.location.href = 'login.html';
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Backend server se connection fail ho gaya.');
            }
        });
    }
});

// Login Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                alert('Login Successful!');
                window.location.href = 'index.html'; // Direct home page par redirect kar dega
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Server se connect nahi ho pa raha hai.');
        }
    });
}
 