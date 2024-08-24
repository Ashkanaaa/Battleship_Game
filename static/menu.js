document.getElementById("statsForm").addEventListener("submit", function(event) {
    event.preventDefault()

    const header = {'Content-Type': 'application/json'}
    const body = JSON.stringify({
        token: localStorage.getItem('token'),
    })
    makeRequest('/stats', HttpMethod.post, header, body)
        .then( () => {
          console.log('Stats request was successful')
        })
        .catch(error => {
            console.error('Request failed:', error)
    })
})