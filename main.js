const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
// add cors
const cors = require('cors');


// Initialize express

const app = express();
app.use(bodyParser.json());
// add cors
app.use(cors());
const port = 3000;

// Initialize SQLite database
const db = new sqlite3.Database('./mydb.sqlite3', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTable();
    }
});

// Function to create the address table
const createTable = () => {
    db.run('CREATE TABLE IF NOT EXISTS address (id TEXT, address TEXT)', (err) => {
        if (err) {
            console.error(err.message);
        }
    });
};

// Function to create random alphanumeric ID
const createRandomAlphanumeric = (length) => {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Function to add an address
const addAddress = (address, callback) => {
    let id = createRandomAlphanumeric(6);

    const checkIdExists = (id, cb) => {
        db.get(`SELECT id FROM address WHERE id = ?`, [id], (err, row) => {
            if (err) {
                return cb(err);
            }
            cb(null, row != null);
        });
    };

    const tryInsert = () => {
        checkIdExists(id, (err, exists) => {
            if (err) {
                return callback(err);
            }
            if (!exists) {
                db.run(`INSERT INTO address (id, address) VALUES (?, ?)`, [id, address], function(err) {
                    if (err) {
                        return callback(err);
                    }
                    console.log(`Address with ID ${id} added.`);
                    callback(null, id);
                });
            } else {
                id = createRandomAlphanumeric(6);
                tryInsert();
            }
        });
    };

    tryInsert();
};

// Function to get an address
const getAddress = (id, callback) => {
    db.get(`SELECT address FROM address WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return callback(err);
        }
        callback(null, row ? row.address : null);
    });
};

// verifySignedMessage 
function verifySignedMessage(message, signature) {
    const messageBuffer = ethUtil.toBuffer(message);
    const messageHash = ethUtil.hashPersonalMessage(messageBuffer);
    const signatureBuffer = ethUtil.toBuffer(signature);
    const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
  
    const publicKey = ethUtil.ecrecover(
      messageHash,
      signatureParams.v,
      signatureParams.r,
      signatureParams.s
    );
  
    const addressBuffer = ethUtil.publicToAddress(publicKey);
    const address = ethUtil.bufferToHex(addressBuffer);
  
    return address;
  }


// Home route
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// Route to get address
app.get('/getAddress', (req, res) => {
    const id = req.query.id;
    getAddress(id, (err, address) => {
        if (err) {
            res.status(500).send('Error retrieving address');
        } else {
            const response = {
                address: address,
            };
            res.send(response);
        }
    });
});

// Route to add address
app.post('/addAddress', (req, res) => {
    const signature = req.body.signature;

    const message = req.body.message;
    const address = verifySignedMessage(message, signature);
    addAddress(address, (err, id) => {
        if (err) {
            res.status(500).send('Error adding address');
        } else {
            const response = {
                id: id,
                address: address,
            };
            res.send(response);
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
