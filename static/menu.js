const HttpMethod = {
    post: 'POST',
    get: 'GET'
}
document.getElementById("statsForm").addEventListener("submit", function(event) {
    event.preventDefault()

    const header = {'Content-Type': 'application/json'}
    const body = JSON.stringify({
        token: localStorage.getItem('token'),
    })
    makeRequest('/stats', HttpMethod.post, header, body)
        .then(data => {
            console.log('Response data:', data.token)
            localStorage.setItem('token', data.token)    
            window.location.href = '/main-menu'
        })
        .catch(error => {
            console.error('Request failed:', error)
        })
})