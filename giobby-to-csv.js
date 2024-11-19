require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load API key from .env
const GIOBBY_API_KEY = process.env.GIOBBY_API_KEY;
const token = process.env.YEASTAR_API_KEY;
const url = `https://192.168.100.177:8088/api/v2.0.0/companycontacts/add?token=${token}`;

// What i want to receive from Giobby
const contactCustom = [
    {
        firstname: 'Mattia',
        lastname: 'Meneghin',
        company: 'Mediaworld',
        businessnum: '3483424030',
        mobile: '3401398232',
        mobile2: '3474240567',
        street: 'Via Postumia Ovest, 42',
        city: 'San Biagio di Callalta',
        state: "Veneto",
        country: "IT"
    },
    {
        firstname: 'Elena',
        lastname: 'Marcon',
        company: 'Zalando',
        businessnum: '340155666',
        mobile: '3435669987',
        mobile2: '3400000000',
        street: 'Via Rossi, 78/A',
        city: 'Maniago',
        state: "Friuli Venezia Giulia",
        country: "IT"
    }
];

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
            console.log("Contacts fetched successfully from Giobby.");
            console.log(prepeareConstant(response.data.contacts));

            return prepeareConstant(response.data.contacts); // Assuming Giobby API returns contacts array

        } else {
            console.error(`Error fetching contacts: ${response.status} - ${response.statusText}`);
            return [];
        }
    } catch (error) {
        console.error(`An error occurred while making the API request: ${error.message}`);
        return [];
    }
}

// Give the new contacts list, the actual contact list into Yeastar, the url. ADD into Yeastar if not exists
async function saveContactsToYeastar(newContacts, yeastarContacts, url) {
    
    newContacts.forEach(contact => {

        if(notExists(contact, yeastarContacts)){                         // If the same mobile or mobile2 or phone is not used yet, then push it into the Yeastar

            pushToYeastar(contact, url)
                .then((response) => {
                    console.log('Contact added successfully:', response);
                })
                .catch((error) => {
                    console.error('Failed to add contact:', error.message);
                });
        }

    });
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
    const headers = [ "firstname", "lastname", "company", "email", "businessnum", "mobile", "mobile2", "homenum", "street", "city", "state", "country" ];

    const csvRows = [];
    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows based on API response from Giobby
    contacts.forEach(contact => {
        const row = [
            contact.name || "",
            contact.lastName || "",
            contact.company || "",
            contact.email || "",
            contact.phone1 || "",  // Work Number
            contact.mobile || "",
            "", // Mobile 2 (if available)
            "", // Home (if available)
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

function notExists(newContact, allContacts) {
    return !allContacts.some(contact => 
        contact.mobile === newContact.mobile || 
        contact.mobile2 === newContact.mobile2 || 
        contact.businessnum === newContact.businessnum
    );
}

async function pushToYeastar(contact, url){
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
    };

    // Create an httpsAgent to disable SSL verification for this request only
    const agent = new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates
    });

    try {
        const response = await axios.post(url, contact, { headers, httpsAgent: agent });
        return response.data; // Return the response data for further processing.
    } catch (error) {
        console.error('Error adding contact:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function retrieveYeastarContactsList() {
    const yeastarQueryURL = `https://192.168.100.177:8088/api/v2.0.0/companycontacts/query?token=${token}`;
    
    // Create an httpsAgent to disable SSL verification for this request only
    const agent = new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates
    });

    try {
        const response = await axios.post(
            yeastarQueryURL,
            { id: "all" }, // Payload
            {
                httpsAgent: agent, // Disable SSL verification for this request
            }
        );

        //console.log("Full API Response:", JSON.stringify(response.data, null, 2));

        // Extract the companycontacts array or use an empty array if undefined
        const contacts = response.data.companycontacts || [];

        if (!Array.isArray(contacts)) {
            throw new Error("Invalid response format: expected an array of contacts.");
        }

        // Transform the contacts to the desired format
        const formattedContacts = contacts.map(contact => ({
            firstname: contact.firstname || '',
            lastname: contact.lastname || '',
            company: contact.company || '',
            businessnum: contact.businessnum || '',
            mobile: contact.mobile || '',
            mobile2: contact.mobile2 || '',
            address: contact.address || '',
            city: contact.city || '',
            state: contact.state || '',
            country: contact.country || ''
        }));

        return formattedContacts; // Return the transformed contacts
    } catch (error) {
        if (error.response) {
            console.error("API Response Error:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
        throw error; // Re-throw the error for the caller to handle
    }
}

function prepeareConstant(giobbyResponse) {
    // Initialize an empty array to hold the transformed data
    const readyForYeastar = giobbyResponse.map(item => {
        // Check if the type is a private person or a company and structure the data accordingly
        let formattedItem = {
            firstname: item.name || '',
            lastname: item.lastName || '',
            company: item.type === 'COMPANY' ? item.name : '',  // For companies, name will be the company name
            businessnum: item.phone1 || '',  // Assuming phone1 as the business number
            mobile: item.mobile || '',  // Mobile number
            mobile2: item.phone2 || '',  // Second mobile or phone number
            street: item.address || '',  // Street address
            city: item.city || '',  // City
            state: item.state || '',  // State
            country: item.country || ''  // Country
        };

        // Return the formatted object for this item
        return formattedItem;
    });

    return readyForYeastar;
}

// Main function
(async function main() {

    const contacts = await fetchGiobbyContacts();                                   // Get all the Giobby Contacts
    const yeastarContacts = await retrieveYeastarContactsList();                    // Get all the Yeastar Contacts

    if (contacts.length > 0) {
        //saveContactsToCsv(contacts);
        //saveContactsToCsv(contactCustom);
        //saveContactsToYeastar(contactCustom, yeastarContacts, url);             // contactCustom [LIST], yeastarContacts[LIST]
        //saveContactsToYeastar(contacts, yeastarContacts, url);                  // contacts [LIST]: All Giobby contacts
    }
})();