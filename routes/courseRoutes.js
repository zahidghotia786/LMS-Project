const express = require("express");
const { 
  createCourse, 
  getInstructorCourses, 
  getCourseById,
  getInstructorCoursesById,
  getAllCourses,
  updateCourseStatus
} = require("../controllers/courseController");
const multer = require("multer");
const { authMiddleware, restrictTo } = require("../middleware/authMiddleware");
const { createReview, getCourseReviews, getRatingStats, getInstructorReviews, allInstructorReviews } = require("../controllers/reviewController");

const router = express.Router();

// Configure storage with filename handling
const storage = multer.memoryStorage();

// File filter for valid file types
const fileFilter = (req, file, cb) => {
  const fieldname = file.fieldname;

  if (fieldname === "pdfFiles" && file.mimetype === "application/pdf") {
    return cb(null, true);
  }

  if (fieldname === "certificateFile" && /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype)) {
    return cb(null, true);
  }

  if (fieldname === "bannerImage" && /^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
    return cb(null, true);
  }

  // ✅ Allow any chapterVideos[n]
  if (/^chapterVideos\[\d+\]$/.test(fieldname) && /^video\/(mp4|webm|quicktime|ogg)$/.test(file.mimetype)) {
    return cb(null, true);
  }

  // ❌ If none match
  cb(new Error(`Invalid file type for ${file.fieldname}`), false);
};


// Configure multer with limits and filters
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    files: 20,
    fieldSize: 10 * 1024 * 1024, // 10 MB limit for text fields
    // fileSize: 500 * 1024 * 1024 // optional per-file limit
  },
});


const handleUploads = [
  upload.any(),
  (req, res, next) => {
    try {
      req.files.forEach((file, i) => {
        console.log(`[${i}] ${file.fieldname} (${file.mimetype}) - ${file.originalname}`);
      });

      const chapterVideos = {};  // This will store the uploaded files
      req.files.forEach((file) => {
        const match = file.fieldname.match(/^chapterVideos\[(\d+)\]$/);
        if (match) {
          const index = parseInt(match[1], 10);
          chapterVideos[index] = file;
        }
      });

      // ✅ Parse the chapters from the request body
      let chapters = req.body.chapters;

      // Handle both stringified and parsed form of chapters
      if (typeof chapters === "string") {
        try {
          chapters = JSON.parse(chapters);
        } catch (e) {
          console.warn("❌ Failed to parse req.body.chapters");
          chapters = [];
        }
      }

      if (!Array.isArray(chapters)) chapters = [];

      // ✅ Attach video to each chapter and save the duration from chapterVideos
      chapters.forEach((chapter, index) => {

        // Ensure the chapter has a video if there's a corresponding file
        const videoData = req.body.chapterVideos[index];
        if (videoData) {
          const videoFile = chapterVideos[index]; // Corresponding uploaded video file
          const duration = videoData.duration || 0; // Duration from chapterVideos data
          const title = videoData.title || videoFile.originalname; // Title from chapterVideos data or file name


          // Add the video to the chapter
          chapter.video = {
            file: videoFile, // Attach the file to the video
            duration: Number(duration),  // Ensure duration is a number
            title: title,  // Assign the correct title
          };
        }
      });

      req.body.chapters = chapters;


      next();
    } catch (error) {
      console.error("Middleware error:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  },
];


// Course creation route with complete file handling
router.post(
  "/create-course",
  authMiddleware,
  restrictTo("instructor"),
  ...handleUploads,
  createCourse
);

// Get instructor courses route
router.get("/instructor-courses", authMiddleware, restrictTo("instructor"), getInstructorCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses/:courseId/reviews' , authMiddleware , createReview )
router.get("/reviews/:courseId" , getCourseReviews)
router.get("/reviews/:courseId/stats", getRatingStats)
router.get("/instructor/:instructorId/course" , getInstructorCoursesById)
router.get('/allcourses' , getAllCourses)
router.get("/instructor/reviews", authMiddleware, restrictTo("instructor"), getInstructorReviews )
router.put("/courses/:courseId/status", authMiddleware, restrictTo("admin"), updateCourseStatus )
router.get("/admin/all-instructor-reviews", authMiddleware, restrictTo("admin"), allInstructorReviews )


module.exports = router;