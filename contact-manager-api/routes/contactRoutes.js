const express = require('express');
const router = express.Router();
const validateToken = require("../middleware/validationHandler");
router.use (express.json())
const { 
    getContacts,
    createContact,
    getContactById,
    updateContactById,
    deleteContactById } = require('../controllers/contactController');
// @route   GET api/contacts
// @desc    Get all contacts
// @access  Public  
router.use(validateToken);
router.route('/').get(getContacts).post(createContact);
// @route   GET api/contacts/:id
// @desc    Get a single contact by ID
// @access  Public  
router.route('/:id').get(getContactById).put(updateContactById).delete(deleteContactById);
module.exports = router;    