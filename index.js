const PORT = 3000;

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors'); // Import the CORS middleware
const bodyParser = require('body-parser'); // Import the body-parser middleware
const dotenv = require('dotenv'); // Import dotenv to load environment variables

// Configure dotenv to load .env file
dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse incoming request bodies as JSON
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.json("Hello, welcome to my website.");
});

app.get('/fests', async function (req, res) {
    try {
        // Access the URL from environment variables
        const festUrl = process.env.FEST_URL;
        const response = await axios.get(festUrl);
        const html = response.data;
        const $ = cheerio.load(html);

        // Array to store promises for fetching event data
        const eventDataPromises = [];

        // Extracting event data from the main page
        $('table:contains(tr) tr:not(:first-child)').each((index, element) => {
            const tds = $(element).find('td');
            const eventUrl = $(element).attr('onclick');

            // Extracting URL for detailed event info
            const modifiedEventurl = eventUrl ? eventUrl.replace("window.open('..", '').replace("' );", '') : '';
            const mainUrl = process.env.MAIN_URL + modifiedEventurl;

            // Push promise to fetch event data into the array
            eventDataPromises.push(
                axios.get(mainUrl)
                    .then(response => {
                        const html1 = response.data;
                        const $1 = cheerio.load(html1);
                        const registerLink = $1('a:contains("Register now")').attr('href');
                        return {
                            startDate: $(tds[0]).text().trim(),
                            festName: $(tds[1]).text().trim().replace(" View More", ""),
                            FestType: $(tds[2]).text().trim(),
                            CollegeName: $(tds[3]).text().trim(),
                            city: $(tds[4]).text().trim(),
                            registerLink: registerLink || 'No link available'
                        };
                    })
                    .catch(err => {
                        // Handle individual request errors
                        console.error(err);
                        return {
                            startDate: $(tds[0]).text().trim(),
                            festName: $(tds[1]).text().trim().replace(" View More", ""),
                            FestType: $(tds[2]).text().trim(),
                            CollegeName: $(tds[3]).text().trim(),
                            city: $(tds[4]).text().trim(),
                            registerLink: 'Error fetching link'
                        };
                    })
            );
        });

        // Wait for all promises to resolve
        const eventData = await Promise.all(eventDataPromises);
        
        // Send response with all event data
        res.json({
            status: 'success',
            data: eventData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
