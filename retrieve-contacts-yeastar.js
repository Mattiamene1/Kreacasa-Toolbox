require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Set up base variables
const base_url = "https://192.168.100.177:8088";
const api_path = "/api/v2.0.0/";
const token = process.env.YEASTAR_API_KEY;
const queryContactsURL = `${base_url}${api_path}companycontacts/query?token=${token}`;

// Define the CSV output file path
const exportFolder = path.join(__dirname, 'export');
const csvFilePath = path.join(exportFolder, 'contacts.csv');

// Ensure the export directory exists
if (!fs.existsSync(exportFolder)) {
    fs.mkdirSync(exportFolder);
}

// Function to convert JSON to CSV
function jsonToCsv(jsonData) {
    if (!jsonData || jsonData.length === 0) {
        throw new Error("No data available to convert to CSV.");
    }
    const headers = Object.keys(jsonData[0]);
    const csvRows = [
        headers.join(','), // Add headers
        ...jsonData.map(row => headers.map(header => `"${row[header] || ''}"`).join(',')) // Add rows
    ];
    return csvRows.join('\n');
}

// Fetch contacts and write to CSV
axios.post(
    queryContactsURL,
    { id: "all" }, // Payload
    { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) } // Allow self-signed certificates
)
    .then(response => {
        console.log("Full API Response:", JSON.stringify(response.data, null, 2));
        
        // Correct path to access companycontacts array
        const data = response.data.companycontacts || []; 

        if (!Array.isArray(data)) {
            throw new Error("Invalid response format, expected an array of contacts.");
        }
        
        const csvData = jsonToCsv(data);
        fs.writeFileSync(csvFilePath, csvData, 'utf8');
        console.log(`Contacts have been saved to ${csvFilePath}`);
    })
    .catch(error => {
        if (error.response) {
            console.error("API Response Error:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
    });
