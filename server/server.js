'use strict';

//import express
const express = require('express');
const userDao = require('./entities_dao/user_dao');
const morgan = require('morgan'); // logging middleware
const jwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const jwtSecret = '8778252EE28C45D9EE0ECD1A43324BBDC86677D2BCE308D2A9543599C8FF3E86';
const expireTime = 300; //seconds
// Authorization error
const authErrorObj = { errors: [{ 'param': 'Server', 'msg': 'Authorization error' }] };

//create application
const app = express();
const PORT = 3001; 

// Set-up logging
app.use(morgan('tiny'));

// Process body content
app.use(express.json());

// Authentication endpoint
app.post('/api/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    userDao.getUser(username)
        .then((user) => {
            if (user === undefined) {
                res.status(404).send({
                    errors: [{ 'param': 'Server', 'msg': 'Invalid username' }]
                });
            } else {
                if (!userDao.checkPassword(user, password)) {
                    res.status(401).send({
                        errors: [{ 'param': 'Server', 'msg': 'Wrong password' }]
                    });
                } else {
                    //AUTHENTICATION SUCCESS
                    const token = jsonwebtoken.sign({ user: user.id }, jwtSecret, { expiresIn: expireTime });
                    res.cookie('token', token, { httpOnly: true, sameSite: true, maxAge: 1000 * expireTime });
                    res.json({ id: user.id, name: user.name });
                }
            }
        }).catch(

            // Delay response when wrong user/pass is sent to avoid fast guessing attempts
            (err) => {
                new Promise((resolve) => { setTimeout(resolve, 1000) }).then(() => res.status(401).json(authErrorObj))
            }
        );
});


app.use(cookieParser());

app.post('/api/logout', (req, res) => {
    res.clearCookie('token').end();
});

// WRITE HERE functions that do NOT need authentication!

// For the rest of the code, all APIs require authentication
app.use(
    jwt({
        secret: jwtSecret,
        getToken: req => req.cookies.token
    })
);

// To return a better object in case of errors
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json(authErrorObj);
    }
});

// AUTHENTICATED REST API endpoints

//activate server
app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}/`));