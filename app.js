const express = require('express');
const AWS = require('aws-sdk');
const { Client } = require('pg');

const app = express();
const port = 3000;

const secretsManager = new AWS.SecretsManager({
    region: process.env.AWS_REGION
});

const getSecretValue = async (secretName) => {
    try {
        const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        if ('SecretString' in data) {
            return JSON.parse(data.SecretString);
        } else {
            let buff = Buffer.from(data.SecretBinary, 'base64');
            return JSON.parse(buff.toString('ascii'));
        }
    } catch (err) {
        console.error(err);
        return null;
    }
};

app.get('/secret/:name', async (req, res) => {
    const secretName = req.params.name;
    const secretValue = await getSecretValue(secretName);

    if (secretValue) {
        res.send(`The value of the secret ${secretName} is: ${JSON.stringify(secretValue)}`);
    } else {
        res.status(500).send('Failed to retrieve the secret value');
    }
});

app.get('/db-connect', async (req, res) => {
    const secretName = process.env.DB_SECRET_NAME;
    const secretValue = await getSecretValue(secretName);

    if (secretValue) {
        const client = new Client({
            host: secretValue.host,
            port: secretValue.port,
            user: secretValue.username,
            password: secretValue.password,
            database: secretValue.database,
        });

        try {
            await client.connect();
            const result = await client.query('SELECT NOW()');
            await client.end();
            res.send(`Database connected successfully: ${result.rows[0].now}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('Failed to connect to the database');
        }
    } else {
        res.status(500).send('Failed to retrieve the database credentials');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
