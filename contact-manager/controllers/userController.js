const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
//@desc Register a new user
//@route POST /api/user/register
//@access Public
const registerUser = asyncHandler(async(req,res)=>{
     console.log('Request Body:', req.body);
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400);
            throw new Error('All fields are mandatory!');
        }
        //hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        console.log('Hashed Password:', hashedPassword);
        const userExist = await User.findOne({ email });
        if (userExist) {
            res.status(400);
            throw new Error('User already exists');
        }
            const user = await User.create({ name, email, password:hashedPassword });
            if(user) {
                res.status(201).json({ _id: user.id, name: user.name, email: user.email });
            }
            else {
                res.status(400);
                throw new Error('User data is not valid');
            }
        });
//@desc Register a new user
//@route POST /api/users/login
//@access Public
const loginUser = asyncHandler(async(req,res)=>{
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error('All fields are mandatory!');
    } 
    let accessToken  = null;
    const user = await User.findOne({ email });
    if(user && (await bcrypt.compare(password, user.password))) {
        accessToken = jwt.sign({
            user: {
                name: user.name,
                email: user.email, 
                id: user.id 
        }
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE

     } )
    }
    else {
        res.status(401);
        throw new Error('Email or password is not valid');
    }
    res.json({accessToken});
});
//@desc fetch current user
//@route POST /api/users/current
//@access Private
const currentUser = asyncHandler(async(req,res)=>{
    res.json({message:"Current user fetched successfully"});
});

module.exports = { registerUser, loginUser, currentUser };
