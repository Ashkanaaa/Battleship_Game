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

    makeRequest('/login', 'POST', header, body)
        .then(response => {
            if (response.body.token && response.body.refreshToken){
                localStorage.setItem('token', response.body.token) 
                localStorage.setItem('refreshToken', response.body.refreshToken) 
                console.log(response.status)
                window.open('/main-menu', '_blank'); 
            }
            showMessage(response.body.message)
        })
        .catch(error => {
            console.error('Request failed:', error)
        });
})



