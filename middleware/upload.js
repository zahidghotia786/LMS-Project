const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure uploads/profileImages exists
const uploadPath = path.join(__dirname, '../public/uploads/profileImages');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage }); // 👈 This upload, properly assigned
module.exports = upload;
