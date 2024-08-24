document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault()

    const formData = new FormData(this)
    const username = formData.get('username')
    const password = formData.get('password')
    const header = {'Content-Type': 'application/json'}
    const body = JSON.stringify({
        username: username,
        password: password
    })

    document.getElementById('loginForm').reset();

    makeRequest('/login', HttpMethod.post, header, body)
        .then(data => {
            if (data.token){
                localStorage.setItem('token', data.token) 
                window.open('/main-menu', '_blank'); 
            }
            showMessage(data.message)
        })
        .catch(error => {
            console.error('Request failed:', error)
        });
})

function showMessage(message) {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.color = 'red';
    }
}

