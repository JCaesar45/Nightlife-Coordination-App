// routes/venues.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Venue = require('../models/Venue');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/auth');

// Search venues via Yelp API
router.get('/search', async (req, res) => {
  try {
    const { location, term = 'bars', offset = 0 } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location required' });
    }

    const headers = {
      Authorization: `Bearer ${process.env.YELP_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const yelpResponse = await axios.get('https://api.yelp.com/v3/businesses/search', {
      headers,
      params: {
        location,
        term,
        categories: 'bars,nightlife',
        limit: 20,
        offset: parseInt(offset),
        sort_by: 'best_match'
      }
    });

    // Get local attendee counts for these venues
    const yelpIds = yelpResponse.data.businesses.map(b => b.id);
    const localVenues = await Venue.find({ yelpId: { $in: yelpIds } })
      .populate('attendees', 'username displayName');

    // Merge Yelp data with local attendance data
    const venues = yelpResponse.data.businesses.map(business => {
      const localData = localVenues.find(v => v.yelpId === business.id) || { attendees: [] };
      const userGoing = req.user ? localData.attendees.some(a => a._id.toString() === req.user._id.toString()) : false;
      
      return {
        id: business.id,
        name: business.name,
        imageUrl: business.image_url,
        url: business.url,
        rating: business.rating,
        reviewCount: business.review_count,
        price: business.price,
        phone: business.display_phone,
        location: {
          address: business.location.address1,
          city: business.location.city,
          state: business.location.state,
          zipCode: business.location.zip_code
        },
        coordinates: business.coordinates,
        attendeeCount: localData.attendees.length,
        attendees: localData.attendees.slice(0, 5).map(a => a.displayName), // Limit to 5 names
        isGoing: userGoing
      };
    });

    res.json({
      venues,
      total: yelpResponse.data.total,
      searchParams: { location, term }
    });

  } catch (err) {
    console.error('Yelp API Error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Failed to fetch venues',
      details: err.response?.data?.error?.description || err.message
    });
  }
});

// Toggle attendance
router.post('/:yelpId/attend', ensureAuth, async (req, res) => {
  try {
    const { yelpId } = req.params;
    const userId = req.user._id;

    let venue = await Venue.findOne({ yelpId });
    
    if (!venue) {
      // Create venue entry if doesn't exist locally
      // Fetch details from Yelp first to get name
      try {
        const headers = {
          Authorization: `Bearer ${process.env.YELP_API_KEY}`
        };
        const yelpRes = await axios.get(`https://api.yelp.com/v3/businesses/${yelpId}`, { headers });
        
        venue = new Venue({
          yelpId,
          name: yelpRes.data.name,
          imageUrl: yelpRes.data.image_url,
          url: yelpRes.data.url,
          rating: yelpRes.data.rating,
          location: {
            address: yelpRes.data.location.address1,
            city: yelpRes.data.location.city,
            state: yelpRes.data.location.state,
            zipCode: yelpRes.data.location.zip_code
          },
          phone: yelpRes.data.display_phone,
          attendees: []
        });
      } catch (yelpErr) {
        return res.status(404).json({ error: 'Venue not found on Yelp' });
      }
    }

    const isAttending = venue.attendees.includes(userId);

    if (isAttending) {
      // Remove user
      venue.attendees.pull(userId);
      await venue.save();
      
      // Update user record
      await User.findByIdAndUpdate(userId, { $pull: { goingTo: venue._id } });
      
      res.json({ 
        attending: false, 
        attendeeCount: venue.attendees.length,
        venueId: venue._id
      });
    } else {
      // Add user
      venue.attendees.push(userId);
      venue.lastUpdated = new Date();
      await venue.save();
      
      // Update user record
      await User.findByIdAndUpdate(userId, { $addToSet: { goingTo: venue._id } });
      
      res.json({ 
        attending: true, 
        attendeeCount: venue.attendees.length,
        venueId: venue._id
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// Get user's attending venues
router.get('/my-venues', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('goingTo');
    res.json(user.goingTo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

module.exports = router;
