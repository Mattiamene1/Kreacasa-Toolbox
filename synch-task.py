from dotenv import load_dotenv
import os
import requests
import csv

# Load .env file
load_dotenv()

# Access API keys
GIOBBY_API_KEY = os.getenv("GIOBBY_API_KEY")

# Function to fetch contacts from Giobby
def fetch_giobby_contacts():
    giobby_api_url = "https://qa.giobby.com/GiobbyApi00551/api/contact/getAllContacts"
    headers = {
        "Authorization": f"Bearer {GIOBBY_API_KEY}"
    }
    response = requests.get(giobby_api_url, headers=headers)
    if response.status_code == 200:
        print("Contacts fetched successfully.")
        return response.json()  # Returns a list of contacts
    else:
        print(f"Error fetching Giobby contacts: {response.status_code} - {response.text}")
        return []

# Function to save contacts to a CSV file
def save_contacts_to_csv(contacts, filename="giobby_contacts.csv"):
    # Define the CSV column headers (adjust based on Giobby contact fields)
    headers = ["FirstName", "LastName", "Company", "PhoneNumber", "Email"]
    
    # Open the CSV file for writing
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        
        # Write the header row
        writer.writeheader()
        
        # Write each contact as a row
        for contact in contacts:
            writer.writerow({
                "FirstName": contact.get("FirstName", ""),
                "LastName": contact.get("LastName", ""),
                "Company": contact.get("Company", ""),
                "PhoneNumber": contact.get("PhoneNumber", ""),
                "Email": contact.get("Email", "")
            })
    
    print(f"Contacts saved to {filename}")

# Main function to fetch and save contacts
def main():
    contacts = fetch_giobby_contacts()
    if contacts:
        save_contacts_to_csv(contacts)

# Run the script
if __name__ == "__main__":
    main()