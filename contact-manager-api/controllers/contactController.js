const asyncHandler = require('express-async-handler');
const Contact = require('../models/contactModel');
//@desc Get all contacts
//@route GET /api/contacts
//@access Public
const getContacts = asyncHandler( async(req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const contacts = await Contact.find({user_id: req.user.id})
        .limit(limit)
        .skip(skip);
        res.status(200).json(contacts);
    });
//@desc Create a new contact
//@route POST /api/contacts
//@access Public    
const createContact = asyncHandler (async(req, res) => {
    console.log('Request Body:', req.body);
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
        res.status(400);
        throw new Error('All fields are mandatory!');
    }
    const contact = await Contact.create({ name, email, phone,user_id: req.user.id });

    res.status(200).json({ message: 'Create a new contact from contactController' });
});
//@desc Get a single contact by ID
//@route GET /api/contacts/:id  
//@access Public
const getContactById = asyncHandler(async(req, res) => {
    const contactId = req.params.id;
    const contact = await Contact.findById(contactId);
    if (!contact) {
        res.status(404);
        throw new Error('Contact not found');
    }
    if(contact.user_id.toString() !== req.user.id){
        res.status(403);
        throw new Error('User not authorized to access this contact');
    }   
    res.status(201).json(contact);
});
//@desc Update a contact by ID
//@route PUT /api/contacts/:id    
//@access Public
const updateContactById = asyncHandler(async(req, res) => {
    const contactId = req.params.id;
    
    // First, find the contact
    const contact = await Contact.findById(contactId);
    
    // Check if exists
    if (!contact) {
        res.status(404);
        throw new Error('Contact not found');
    }
    
    // Then check authorization
    if(contact.user_id.toString() !== req.user.id){
        res.status(403);
        throw new Error('User not authorized to update this contact');
    }
    
    // Finally, update
    const updatedContact = await Contact.findByIdAndUpdate(
        contactId, 
        req.body, 
        { new: true }
    );
    
    res.status(200).json(updatedContact); // Return updated contact, not message
});
//@desc Delete a contact by ID
//@route DELETE /api/contacts/:id    
//@access Public    
const deleteContactById = asyncHandler(async(req, res) => {
    const contactId = req.params.id;
    
    // First, find the contact
    const contact = await Contact.findById(contactId);
    
    // Check if exists
    if (!contact) {
        res.status(404);
        throw new Error('Contact not found');
    }
    
    // Then check authorization
    if(contact.user_id.toString() !== req.user.id){
        res.status(403);
        throw new Error('User not authorized to delete this contact');
    }
    
    // Finally, delete
    await Contact.findByIdAndDelete(contactId);
    
    res.status(200).json({ message: 'Contact deleted successfully' });
    // Note: Changed from 204 to 200 because you're returning JSON
});
module.exports = {
    getContacts,
    createContact,
    getContactById,
    updateContactById,
    deleteContactById
};
