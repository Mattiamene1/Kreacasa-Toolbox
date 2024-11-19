# Synch-Giobby-Yeastar
Synchronizing Giobby Contacts with Yeastar

# Requirements

## Python Dotenv
```pip install python-dotenv```

# Step
## 1 Retrieve Client ID
Ask to Giobby Support the client ID

## 2 POST request to get the Token
Using a tool such as Postman do an HTML POST request.
Save the result in .env file with the variable name: GIOBBY_API_KEY = "PutYourAccessToken"

### URL: https://authqa.giobby.com/auth/realms/api-server/protocol/openid-connect/token
Use the following params:
- grant_type : password                 (Do not modify)
- client_id : ClientIDProvidedByGiobby
- username : giobby
- cid : sb-testenvironment
- password : test1234

## 3 Decode the JWT token
Run Python Script *decodeJWT.py* in this repository, using the ACCESS TOKEN retrieved from the response of the POST request (saved into the .env file)

## 4 Try the APIs
Example:
GET request from: https://qa.giobby.com/GiobbyApi00551/v1/contacts