const Notification = require('../models/Notification');

const createNotification = async ({ userId = null, title, type, link = '' }) => {
  try {
    const notification = new Notification({ userId, title, type, link });
    await notification.save();
  } catch (err) {
    console.error('Error creating notification:', err.message);
  }
};

module.exports = createNotification;
