document.getElementById('roomForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(this)
    const submitter = event.submitter
    const header = {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,  // Correct format
      'Content-Type': 'application/json'
    }
    const body = {}
    
    if (submitter.name === 'join') {
        console.log("Join Room button clicked");
        const code = formData.get('code');
        if (!code){
          alert("Room ID is required to join a room.");
          return;
        }
        body.code = code
    }
    makeRequest('/room', HttpMethod.post, header, JSON.stringify(body))
    .then(response => {
      if (response.body.redirect) {
        console.log('redirect')
        window.open(response.body.redirect); ;
      }
      if(response.body.message){
        console.log('MESSSAGEW')
        console.log(response.body.message)
        showMessage(response.body.message)
      }
    })
    .catch(error => {
      console.error('Request failed:', error)
    });
});