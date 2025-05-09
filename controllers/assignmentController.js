const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const path = require('path');
const { saveFiles } = require('../middleware/multer'); 

exports.createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, maxPoints } = req.body;

    if (!title || !description || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and due date are required'
      });
    }

    // Save the files to disk and get their paths
    const filePaths = saveFiles(req.files, 'assignments');
    
    // Create file objects for database
    const files = req.files.map((file, index) => ({
      filename: path.basename(filePaths[index]),
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: filePaths[index] 
    }));

    const assignment = new Assignment({
      title,
      description,
      dueDate: new Date(dueDate),
      maxPoints: maxPoints || 100,
      files,
      courseId: req.params.CourseId,
      createdBy: req.user.id
    });

    const savedAssignment = await assignment.save();

    await Course.findByIdAndUpdate(
      req.params.CourseId,
      { $push: { assignments: savedAssignment._id } }
    );

    // Return URLs with consistent path structure
    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: {
        ...savedAssignment.toObject(),
        files: savedAssignment.files.map(file => ({
          ...file,
          url: `${req.protocol}://${req.get('host')}${file.path}`
        }))
      }
    });

  } catch (error) {
    console.error('Error creating assignment:', error);

    // No need to manually clean up files on error since they won't be written
    // if there's an exception before that point

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create assignment'
    });
  }
};



// controllers/assignmentController.js
exports.getInstructorAssignments = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Find all courses taught by this instructor
    const courses = await Course.find({ instructor: instructorId });

    // Get all assignments for these courses
    const assignments = await Assignment.find({
      courseId: { $in: courses.map(c => c._id) }
    })
    .populate('course', 'title')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error fetching instructor assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
};


// Get all assignments for a course (instructor only)
exports.getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(courseId)
    const userId = req.user.id;

    // Verify the user is the instructor of this course
    const course = await Course.findOne({
      _id: courseId,
      instructor: userId
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access or course not found'
      });
    }

    // Get assignments with submission counts
    const assignments = await Assignment.find({ courseId })
      .select('title description dueDate maxPoints submissionCount createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
};

// Update an assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;
    const { title, description, dueDate, maxPoints } = req.body;

    // Find the assignment
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Verify the user is the instructor of this course
    const course = await Course.findOne({
      _id: assignment.courseId,
      instructor: userId
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this assignment'
      });
    }

    // Update the assignment
    assignment.title = title;
    assignment.description = description;
    assignment.dueDate = dueDate;
    assignment.maxPoints = maxPoints;

    const updatedAssignment = await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: updatedAssignment
    });

  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment'
    });
  }
};

// Delete an assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    // Find the assignment
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Verify the user is the instructor of this course
    const course = await Course.findOne({
      _id: assignment.courseId,
      instructor: userId
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this assignment'
      });
    }

    // Remove assignment from course
    await Course.findByIdAndUpdate(
      assignment.courseId,
      { $pull: { assignments: assignmentId } }
    );

    // Delete the assignment
    await Assignment.findByIdAndDelete(assignmentId);

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment'
    });
  }
};