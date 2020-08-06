# HAM Dashboard

The HAM dashboard provides key information about the status of our collections and data.

## Requirements

* NodeJS    
* [Harvard Art Museums API key](http://www.harvardartmuseums.org/collections/api)  

## Setup

1. Run `npm install` to install the required packages 

2. Set environment variables  

    + Production: Create a system environment variable named `API_KEY` and set it to your Harvard Art Museums API key  
    + Development: Clone the .env-sample file into a new .env file and set `API_KEY` to your Harvard Art Museums API key

3. Run `npm start`

4. View http://localhost:3000 in your browser  
