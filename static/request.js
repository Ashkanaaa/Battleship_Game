const HttpMethod = {
    post: 'POST',
    get: 'GET'
}

function makeRequest(url, method, header, body){
    return fetch(url, {
        method: method,
        headers: header,
        body: body
    })
    .then(response => {
        return response.json();
    })
    .catch(error => {
        console.error('Request failed:', error);
        throw error;
    });
}
