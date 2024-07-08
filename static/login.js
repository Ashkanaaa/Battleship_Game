document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault()

    const formData = new FormData(this)
    const username = formData.get("username")
    const password = formData.get("password")
    const header = {'Content-Type': 'application/json'}
    const body = JSON.stringify({
        username: username,
        password: password
    })
    makeRequest('/login', 'POST', header, body)
        .then(data => {
            console.log('Response data:', data.token)
            localStorage.setItem('token', data.token)    
            window.location.href = '/main-menu'
        })
        .catch(error => {
            console.error('Request failed:', error)
        });

/*
    // Make a POST request to the backend to authenticate
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Upon successful authentication, store the token in local storage
        localStorage.setItem('token', data.token);
        console.log(data.token)
     
        window.location.href = '/main-menu';
    })
    .catch(error => {
        console.error('Login failed:', error);
        // Handle login failure (e.g., show error message)
        document.getElementById("errorDiv").innerHTML = '<ul><li id="error">Login failed. Please check your credentials.</li></ul>';
    });
    */
})
