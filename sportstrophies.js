const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const oneDay = 60 * 60 * 24;
const oneYear = oneDay; // * 365;

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: oneYear * 1000, // Set maximum cache time (in milliseconds)
    // Cache-Control header will be set to: public, max-age=31536000
}));

app.get('/', (req, res) => {res.render('index');});

app.get('/athletes', (req, res) => {
    res.render('athletes', { title: 'For Athletes' });
});

app.get('/organizers', (req, res) => {
    res.render('organizers', { title: 'For Organizers' });
});

app.get('/clubs', (req, res) => {
    res.render('clubs', { title: 'For Clubs and Stores' });
});


app.listen(PORT, () => {
    console.log(`The server is running on http://localhost:${PORT}`);
});