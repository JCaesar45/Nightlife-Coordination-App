// models/Venue.js
const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema({
  yelpId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  imageUrl: String,
  url: String,
  rating: Number,
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String
  },
  phone: String,
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Virtual for attendee count
VenueSchema.virtual('attendeeCount').get(function() {
  return this.attendees.length;
});

// Ensure virtuals are included in JSON
VenueSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Venue', VenueSchema);
