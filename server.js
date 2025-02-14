const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const { runScript, getYeastarToken, getToken, testYeastar, getPublicIP, fetchGiobbyOrder, getSpedizioneValueOrder, fetchGiobbyInvoice,  } = require('./giobby-to-yeastar');
dotenv.config();

// Configure CORS to allow requests from your frontend domain
app.use(cors({
    origin: 'http://192.168.100.170:3000' // Allow requests only from this origin
}));

app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');                                                                 // Allow requests from any origin
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');                                  // Allow these HTTP methods
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');    // Allow these headers
   
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");                                             // HTTP 1.1.
    res.header("Pragma", "no-cache");                                                                               // HTTP 1.0.
    res.header("Expires", "0");                                                                                     // Proxies.

    next();
});

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
        res.status(500).json({ error: "Failed to add contacts\n" + error.message });
    }
});

// Endpoint to get the current token
app.get('/currentToken', async (req, res) => {
    try {
        // Check if token is already available
        let currentToken = getToken(); // Retrieve token from the module
        if (currentToken === 'default') {
            console.log("Fetching new token...");
            currentToken = await getYeastarToken(); // Fetch a new token
            console.log("Token fetched successfully:", currentToken);
            token = currentToken;
            console.log("Global token value: " + currentToken);
        }

        res.status(200).json({ token: currentToken });
    } catch (error) {
        console.error("Error fetching Yeastar token:", error.message);
        res.status(500).json({ error: "Failed to retrieve token\n" + error.message });
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

// Get order info
app.get('/order/:id/', async (req, res) => {
    const id = req.params.id;
    try {
        const order = await fetchGiobbyOrder(id);
        if (order.error) {
            res.status(404).json({ error: order.error });
        } else {
            res.status(200).json(order);
        }
    } catch (error) {
        console.error("Error fetching order:", error.message);
        res.status(500).json({ error: "An error occurred while fetching the order." });
    }
});

app.get('/order/:id/costoSpedizione', async (req, res) => {
    const id = req.params.id;
    try {
        const order = await fetchGiobbyOrder(id);
        const price = await getSpedizioneValueOrder(order);
        if (order.error) {
            res.status(404).json({ error: order.error });
        } else if (order.status === "404"){
            res.status(404).json({ message: "Order Not Found"})
        }else {
            res.status(200).json(price);
        }
    } catch (error) {
        console.error("Error fetching order:", error.message);
        res.status(500).json({ error: "An error occurred while fetching the order." });
    }
});

app.get('/invoice/:id/costoSpedizione', async (req, res) => {
    const id = req.params.id;
    try {
        const invoice = await fetchGiobbyInvoice(id);
        console.log("Fetched ID " + id);
        const price = await getSpedizioneValueOrder(invoice);
        console.log("Price " + price);
        if (invoice.error) {
            res.status(404).json({ error: invoice.error });
        } else if (invoice.status === "404"){
            res.status(404).json({ message: "Invoice Not Found"})
        }else {
            res.status(200).json(price);
        }
    } catch (error) {
        console.error("Error fetching invoice:", error.message);
        res.status(500).json({ error: "An error occurred while fetching the invoice." });
    }
});

// // Execute Script To Export From Giobby DB of BI
// app.post('/execute', (req, res) => {
//     const { command } = req.body; // Command to be executed remotely (sanitize and validate input as needed)

//     if (!command) {
//         return res.status(400).json({ message: 'Command is required' });
//     }

//     // Get credentials and IP address from environment variables
//     const vmIp = process.env.VMIP;
//     const vmUsername = process.env.VMUSERNAME;
//     const vmPassword = process.env.VMPASSWORD;

//     if (!vmIp || !vmUsername || !vmPassword) {
//         return res.status(500).json({ message: 'Missing environment variables for VM connection' });
//     }

//     // Construct PowerShell command for remote execution using environment variables
//     const remoteCommand = `powershell -Command "Invoke-Command -ComputerName ${vmIp} -ScriptBlock {${command}} -Credential (New-Object System.Management.Automation.PSCredential('${vmUsername}', (ConvertTo-SecureString '${vmPassword}' -AsPlainText -Force)))"`;

//     // Execute the command
//     exec(remoteCommand, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`exec error: ${error}`);
//             return res.status(500).json({ message: `Execution failed: ${stderr}` });
//         }
//         res.json({ message: `Command executed successfully: ${stdout}` });
//     });
// });

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
