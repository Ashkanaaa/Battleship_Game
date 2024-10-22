function populateTable(data) {
  var player_stats_table = document.getElementById("player-stats");
  var game_stats_table = document.getElementById("game-stats");

  player_stats_table.innerHTML = "";
  game_stats_table.innerHTML = "";


  data.player_stat.forEach((item) => {
    var row = player_stats_table.insertRow();
    row.insertCell(0).textContent = item.total_games;
    row.insertCell(1).textContent = item.wins;
    row.insertCell(2).textContent = item.losses;
  });

  data.game_stats.forEach((item) => {
    var row = game_stats_table.insertRow();
    row.insertCell(0).textContent = item.date;
    row.insertCell(1).textContent = item.game_id;
    row.insertCell(2).textContent = item.result;
    row.insertCell(3).textContent = item.mode;
    row.insertCell(4).textContent = item.opponent;
  });

}

async function request_stats() {
  const header = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  try {
    // Initial request
    let response = await makeRequest("/stats", "POST", header);

    // Check if token needs refreshing
    if (response.status === 401) {
      const tokenRefreshed = await refreshAccessToken();

      if (tokenRefreshed) {
        // Retry the original request with the new token
        header["Authorization"] = `Bearer ${localStorage.getItem("token")}`;
        response = await makeRequest("/stats", "POST", header); 

        // Check for successful response
        if (response.status !== 200) {
          throw new Error(
            `Failed to fetch stats after token refresh: ${response.status}`
          );
        }
      } else {
        console.error("No token returned after refresh");
        return;
      }
    }

    populateTable(response.body.stats);
  } catch (error) {
    console.error("Request failed:", error.message); 
    throw error; 
  }
}

window.onload = request_stats;
