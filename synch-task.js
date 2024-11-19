require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load API key from .env
const GIOBBY_API_KEY = process.env.GIOBBY_API_KEY;

// Function to fetch contacts from Giobby
async function fetchGiobbyContacts() {
    const giobbyApiUrl = "https://qa.giobby.com/GiobbyApi00551/v1/contacts";

    try {
        const response = await axios.get(giobbyApiUrl, {
            headers: {
                Authorization: `Bearer ${GIOBBY_API_KEY}`
            }
        });

        if (response.status === 200) {
            console.log("Contacts fetched successfully.");
            return response.data.contacts; // Assuming Giobby API returns contacts array
        } else {
            console.error(`Error fetching contacts: ${response.status} - ${response.statusText}`);
            return [];
        }
    } catch (error) {
        console.error(`An error occurred while making the API request: ${error.message}`);
        return [];
    }
}

// Function to save contacts to a CSV file
function saveContactsToCsv(contacts) {
    // Create "export" directory if it doesn't exist
    const exportDir = path.join(__dirname, 'export');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
        console.log(`Directory created: ${exportDir}`);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    const filename = path.join(exportDir, `contacts_${timestamp}.csv`);

    // Define the CSV column headers based on your provided format
    const headers = [
        "First Name", "Last Name", "Company", "Email", "Work Number", 
        "Work Number 2", "Mobile", "Mobile 2", "Home", "Home 2", 
        "Work Fax", "Home Fax", "Other", "ZIP Code", "Street", 
        "City", "State", "Country"
    ];

    const csvRows = [];
    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows based on API response
    contacts.forEach(contact => {
        const row = [
            contact.name || "",
            contact.lastName || "",
            contact.name || "", // Assuming "name" is company name
            contact.email || "",
            contact.phone1 || "",  // Work Number
            contact.phone2 || "",  // Work Number 2
            contact.mobile || "",
            "", // Mobile 2 (if available)
            "", // Home (if available)
            "", // Home 2 (if available)
            contact.fax || "",  // Work Fax
            "", // Home Fax (if available)
            "", // Other (if available)
            contact.postalCode || "",  // ZIP Code
            contact.address || "",  // Street
            contact.city || "",
            contact.state || "",
            contact.country || ""
        ];
        csvRows.push(row.join(','));
    });

    // Write to CSV file
    fs.writeFileSync(filename, csvRows.join('\n'), 'utf-8');

    // Log the file path
    console.log(`Contacts saved to file: ${filename}`);
}

// Main function
(async function main() {
    if (!GIOBBY_API_KEY) {
        console.error("Error: GIOBBY_API_KEY is not set in the .env file.");
        return;
    }

    const contacts = await fetchGiobbyContacts();
    if (contacts.length > 0) {
        saveContactsToCsv(contacts);
    }
})();
