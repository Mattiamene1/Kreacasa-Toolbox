const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const { runScript, getYeastarToken, getToken } = require('./giobby-to-yeastar'); // Import token utilities
dotenv.config();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to stream logs
app.get('/stream-logs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message) => {
        if (typeof message === 'object') {
            // Stringify objects for proper display
            res.write(`data: ${JSON.stringify(message, null, 2)}\n\n`);
        } else {
            res.write(`data: ${message}\n\n`); // Send plain text for non-objects
        }
    };

    // Override console.log temporarily for streaming logs
    const originalConsoleLog = console.log;
    console.log = (message) => {
        sendLog(message); // Stream logs to the client
    };

    // Run the script when this endpoint is hit
    (async () => {
        try {
            sendLog('Starting the script...');
            const result = await runScript();
            sendLog(`Success: ${result}`);
        } catch (error) {
            sendLog(`Error: ${error.message}`);
        } finally {
            console.log = originalConsoleLog; // Restore original console.log
            res.end(); // Close the SSE stream
        }
    })();
});

// Endpoint to get the current token
app.get('/current-token', async (req, res) => {
    try {
        // Check if token is already available
        let currentToken = getToken(); // Retrieve token from the module
        if (!currentToken) {
            console.log("Fetching new token...");
            currentToken = await getYeastarToken(); // Fetch a new token
            console.log("Token fetched successfully:", currentToken);
        }

        res.json({ token: currentToken });
    } catch (error) {
        console.error("Error fetching Yeastar token:", error.message);
        res.status(500).json({ error: "Failed to retrieve token" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
