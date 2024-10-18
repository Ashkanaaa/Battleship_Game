const HttpMethod = {
    post: 'POST',
    get: 'GET'
}

async function makeRequest(url, method, header, body = JSON.stringify({})) {
    try {
        const response = await fetch(url, {
            method: method,
            headers: header,
            body: body
        });

        // Return an object containing both the parsed JSON and the response status
        const data = await response.json();
        return {
            body: data,
            status: response.status
        };
    } catch (error) {
        console.error('Request failed:', error);
        throw error; // Re-throw the error after logging
    }
}


// Function to refresh the access token
async function refreshAccessToken() {
    console.log('SECOND STEP')
    const header = {
        'Authorization': `Bearer ${localStorage.getItem('refreshToken')}`,  
        'Content-Type': 'application/json'
    };
    const body = {}

    try {
        const response = await makeRequest('/token/refresh', 'POST', header, JSON.stringify(body));
        
        if (response.body.token && response.body.refreshToken) {
            // Store the new access token in local storage
            localStorage.setItem('token', response.body.token);
            localStorage.setItem('refreshToken', response.body.refreshToken);
            console.log('Refresj')
            console.log(response.body.refreshToken)
            return true; // Return true for a successful refresh
        } else {
            throw new Error('Failed to refresh access token');
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false; // Return false if refresh fails
    }
}

function showMessage(message) {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.color = 'red';
    }
}
