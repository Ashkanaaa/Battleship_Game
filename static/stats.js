function populateTable(data) {
  var game_stats_table = document.getElementById("game-stats");
  var player_stats_table = document.getElementById("player-stats");

  // Clear existing rows
  game_stats_table.innerHTML = "";
  player_stats_table.innerHTML = "";

  //Populate table with new data
  data.gameStats.forEach((item) => {
    var row = game_stats_table.insertRow();
    row.insertCell(0).textContent = item.id;
    row.insertCell(1).textContent = item.date;
    row.insertCell(2).textContent = item.result;
    row.insertCell(3).textContent = item.mode;
    row.insertCell(4).textContent = item.opponent_username;
  });
  data.playerStats.forEach((item) => {
    var row = player_stats_table.insertRow();
    row.insertCell(0).textContent = item.id;
    row.insertCell(1).textContent = item.date;
    row.insertCell(2).textContent = item.result;
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
        response = await makeRequest("/stats", "POST", header); // Reuse the same variable

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

    // Populate table with stats data
    populateTable(response.body.stats);
  } catch (error) {
    console.error("Request failed:", error.message); // Log the error message
    throw error; // Re-throw the error if needed
  }
}

window.onload = request_stats;
