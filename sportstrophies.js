const express = require('express');
const path = require('path');
const fs = require('node:fs');
const app = express();
const PORT = 3001;

const registerNftRoute = require("./routes/nft");
const createSubscribeRouter = require("./routes/subscribe.js");

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));

const oneDay = 60 * 60 * 24;
const oneYear = oneDay; // * 365;

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: oneYear * 1000, // Set maximum cache time (in milliseconds)
    // Cache-Control header will be set to: public, max-age=31536000
}));

registerNftRoute(app);
app.use("/subscribe", createSubscribeRouter({
  csvPath: path.join(__dirname, "data", "subscribers.csv"), // опционально
  // pgUrl: process.env.PG_URL,                               // опционально
}));

app.get('/', (req, res) => {res.render('index');});
app.get('/athletes', (req, res) => {res.render('athletes', { title: 'For Athletes' });});
app.get('/organizers', (req, res) => {res.render('organizers', { title: 'For Organizers' });});
app.get('/clubs', (req, res) => {res.render('clubs', { title: 'For Clubs and Stores' });});
app.get('/video', (req, res) => {
    const rawFile = req.query.file; 
    const videoFile = rawFile ? path.basename(rawFile) : null;
    const videoTitle = req.query.title || 'Видео инструкция';
    
    if (!videoFile || videoFile.includes('..')) {
        return res.status(400).send('Error: Invalid file name.');
    }

    res.render('video', { 
        videoFile: videoFile, 
        videoTitle: videoTitle 
    });
});

app.get('/athletes/memo', (req, res) => {
    const fileName = 'Pamyatka_Uchastnika_NFT_Medal.pdf';
    const filePath = path.join(__dirname, 'public', 'docs', fileName); 
    res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending PDF:', err);
            res.status(404).send('File not found or server error.');
        }
    });
});


app.listen(PORT, () => {
    console.log(`The server is running on http://localhost:${PORT}`);
});