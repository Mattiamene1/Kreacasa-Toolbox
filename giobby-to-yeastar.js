require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const fetch = require('node-fetch');

module.exports = {
    runScript,      // Export the main script function
    getYeastarToken,
    testYeastar,
    getPublicIP,
    getToken,       // Expose the token getter
    setToken,       // Expose the token setter (optional, for external updates)
};

async function runScript() {
    try {
        let token = await getYeastarToken();
        const contacts = await fetchGiobbyContacts();
        const yeastarContacts = await retrieveYeastarContactsList();

        if (contacts.length > 0) {
            const contactsAdded = await saveContactsToYeastar(contacts, yeastarContacts);
            if(contactsAdded != undefined){        // If there is at least 1 contact to add
                contactsAdded.forEach(contact => {
                    console.log("Aggiunto " + contact.firstname + " " + contact.lastname);
                });
                //console.log(contactsAdded.length);
                return contactsAdded;
            }
        }
        return null;


    } catch (error) {
        console.error("Error running the script:", error);
        throw new Error("Script execution failed: " + error.message);
    }
}

// Load API key from .env
const GIOBBY_API_KEY = process.env.GIOBBY_API_KEY;

let token = "default";

// Getter for the token
function getToken() { return token; }

// Setter for the token
function setToken(newToken) { token = newToken; }

// Function to fetch a new token
async function getYeastarToken() {
    console.log("\n=> STEP 1 - Get Yeastar Token");

    const endpoint = `http://192.168.100.177/api/v2.0.0/login`;
    const payload = {
        username: "api",
        password: process.env.YEASTAR_PWD_MD5,
        port: "8260",
        version: "2.0.0",
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.status === "Success" && data.token) {
            setToken(data.token); // Update the module's token
            console.log('===> Got the Yeastar token succesfully');
            return data.token;
        } else {
            throw new Error("Failed to retrieve token: " + JSON.stringify(data));
        }
    } catch (error) {
        console.error("Error fetching token:", error);
        throw error;
    }
}

// STEP 2 - Function to fetch contacts from Giobby
async function fetchGiobbyContacts() {
    console.log("\n=> STEP 2 - Get all Giobby contacts");
    const giobbyApiUrl = "https://qa.giobby.com/GiobbyApi00551/v1/contacts";

    try {
        const response = await axios.get(giobbyApiUrl, {
            headers: {
                Authorization: `Bearer ${GIOBBY_API_KEY}`
            }
        });

        if (response.status === 200) {
            console.log("===> Contacts fetched successfully from Giobby.");
            //console.log('\n=== GIOBBY CONTACTS ===\n');
            //console.log(prepeareConstant(response.data.contacts));
            return prepeareConstant(response.data.contacts); // Assuming Giobby API returns contacts array

        } else {
            console.error(`===> Error fetching contacts: ${response.status} - ${response.statusText}`);
            return [];
        }
    } catch (error) {
        console.error(`===> An error occurred while making the API request: ${error.message}`);
        return [];
    }
}

// STEP 3 - Retrieve all Yeastar contacts
async function retrieveYeastarContactsList() {
    console.log("\n=> STEP 3 - Get all Yeastar contacts");
    const yeastarQueryURL = `https://192.168.100.177:8088/api/v2.0.0/companycontacts/query?token=${token}`;
    
    // Create an httpsAgent to disable SSL verification for this request only
    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    try {
        const response = await axios.post(
            yeastarQueryURL,
            { id: "all" }, // Payload
            {
                httpsAgent: agent, // Disable SSL verification for this request
            }
        );

        //console.log("Yeastar Response GET:", JSON.stringify(response.data, null, 2));

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
            businessnum: onlyNumber(contact.businessnum) || '',
            mobile: onlyNumber(contact.mobile) || '',
            mobile2: onlyNumber(contact.mobile2) || '',
            address: contact.address || '',
            city: contact.city || '',
            state: contact.state || '',
            country: contact.country || ''
        }));
        console.log('===> Contacts fetched succesfully from Yeastar');
        //console.log('\n === YEASTAR CONTACTS === \n', formattedContacts);
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

// STEP 4 - Give the new contacts list, the actual contact list into Yeastar, the url. ADD into Yeastar if not exists
async function saveContactsToYeastar(newContacts, yeastarContacts) {
    console.log("\n=> STEP 4 - Push to Yeastar if not exists");
    let addedContacts = []; // Array to store successfully added contacts

    for (const contact of newContacts) {
        if (!contactExists(contact, yeastarContacts)) {
            try {
                const response = await pushToYeastar(contact);
                if (response.status === 'Success') {
                    console.log(`\n===> Contact [${contact.firstname} ${contact.lastname}] \n=====> Added successfully:`, response);
                    addedContacts.push(contact); // Add to the added contacts array
                } else {
                    console.log(`===> Contact [${contact.firstname} ${contact.lastname}] \n=====> NOT added:`, response);
                    if(response.errno === '10140'){
                        console.log(`Verify the payload.\nVerify these fields: ${response.errordata} in Giobby of ${contact.firstname} ${contact.lastname}`);
                    }
                }
            } catch (error) {
                console.error('Failed to add contact:', error.message);
            }
        }
    }

    if (addedContacts.length > 0) {
        console.log(`===> ${addedContacts.length} contacts added to Yeastar`);
    } else {
        console.log('===> No contacts added to Yeastar');
    }

    return addedContacts; // Return the array of added contacts
}

// Used in step 4.1
function contactExists(newContact, allContacts) {
    const res = allContacts.some(contact => 
        contact.mobile === newContact.mobile || 
        contact.mobile2 === newContact.mobile2 || 
        contact.businessnum === newContact.businessnum
    );
    return res;
}

// Used in step 4.2
async function pushToYeastar(contact){
    const url = `https://192.168.100.177:8088/api/v2.0.0/companycontacts/add?token=${token}`;
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
    };
    
    const agent = new https.Agent({     // Create an httpsAgent to disable SSL verification for this request only
        rejectUnauthorized: false       // Allow self-signed certificates
    });

    try {
        const response = await axios.post(url, contact, { headers, httpsAgent: agent });
        if(response.status === 200 && contact != null){
            if(response.data.status === 'Success'){
                console.log(contact.firstname + ' ' + contact.lastName + ' successfully added');
            }else if(response.data.status === 'Failed'){
                console.log(contact.firstname + ' ' + contact.lastName + ' Failed added');
                console.log("Error: " + response.data.errno);
            }
        }else{
            console.log("contact is null");
        }
        return response.data; // Return the response data for further processing.
    } catch (error) {
        console.error('Error adding contact:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Model the result
function prepeareConstant(giobbyResponse) {
    // Initialize an empty array to hold the transformed data
    const readyForYeastar = giobbyResponse.map(item => {
        // Check if the type is a private person or a company and structure the data accordingly
        let formattedItem = {
            firstname: item.name || ' ',
            lastname: item.lastName || ' ',
            company: item.type === 'COMPANY' ? item.name : '',  // For companies, name will be the company name
            businessnum: onlyNumber(item.phone1) || '',  // Assuming phone1 as the business number
            mobile: onlyNumber(item.mobile) || '',  // Mobile number
            mobile2: onlyNumber(item.phone2) || '',  // Second mobile or phone number
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

// Get Public IP
async function getPublicIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch (error) {
        console.error('Error fetching public IP:', error);
        throw new Error('Unable to retrieve public IP');
    }
}

// In Mobile or phone keep only number chars
function onlyNumber(input) {
    return input.replace(/\D/g, '');
}

async function testYeastar(token) {
    console.log("Testing Yeastar Connection");
    const yeastarQueryURL = `https://192.168.100.177:8088/api/v2.0.0/companycontacts/query?token=${token}`;

    // Create an httpsAgent to disable SSL verification for this request only
    const agent = new https.Agent({ rejectUnauthorized: false });

    try {
        const response = await axios.post(
            yeastarQueryURL,
            { id: "all" }, // Payload
            { httpsAgent: agent } // Disable SSL verification for this request
        );

        console.log("Response Status:", response.status);
        return response.status; // Return the HTTP status
    } catch (error) {
        if (error.response) {
            // If the error contains a response, log the HTTP status and error data
            console.error("API Error:", error.response.status, error.response.data);
            return error.response.status; // Return the HTTP status for error handling
        } else {
            // Handle other errors (e.g., network errors)
            console.error("Error:", error.message);
            throw error; // Re-throw for the caller to handle
        }
    }
}
