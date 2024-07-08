function makeRequest(url, method, header, body){
    return fetch(url, {
        method: method,
        headers: header,
        body: body
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .catch(error => {
        console.error('Request failed:', error);
        // Optionally handle the error here or rethrow it
        throw error;
    });
}