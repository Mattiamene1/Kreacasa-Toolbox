const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const { runScript, getYeastarToken, getToken, testYeastar, getPublicIP } = require('./giobby-to-yeastar');
dotenv.config();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Or, configure specific CORS options
app.use(cors({
    origin: 'http://192.168.100.170', // Change this to the domain of your frontend if needed
    methods: ['GET', 'POST'], // Add more methods as needed
    credentials: true
}));

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
            sendLog(`\n[Success]\n ${result}`);
        } catch (error) {
            sendLog(`Error: ${error.message}`);
        } finally {
            console.log = originalConsoleLog; // Restore original console.log
            res.end(); // Close the SSE stream
        }
    })();
});

app.get('/SyncContacts', async (req, res) => {
    try {
        const result = await runScript(); // Array of added contacts
        res.status(200).json({
            message: "Fetched Correctly",
            contactsAdded: result, // Send the added contacts
        });
    } catch (error) {
        console.error("Error adding contacts:", error.message);
        res.status(500).json({ error: "Failed to add contacts" });
    }
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

// Test Yeastar Connection
app.get('/testYeastar', async (req, res) => {
    try {
        const status = await testYeastar();
        res.status(status).send(`Yeastar connection test: [SUCCESS] with status: ${status}`);
    } catch (error) {
        res.status(500).send('Yeastar connection test: [FAILED]');
    }
});

// Verify public IP
app.get('/myIP', async (req, res) => {
    try {
        // Retrieve the public IP
        const publicIP = await getPublicIP();

        // Compare with the environment variable
        if (publicIP === process.env.KREACASA_PUB_IP) {
            res.status(200).send('IP matched: ' + publicIP);
        } else {
            res.status(403).send('You are not in Kreacasa network, your IP is: ' + publicIP );
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
