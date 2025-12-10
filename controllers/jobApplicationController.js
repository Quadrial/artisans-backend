const JobApplication = require('../models/JobApplication');
const Post = require('../models/Post');

// @desc    Submit job application
// @route   POST /api/jobs/:jobId/apply
// @access  Private (Artisan only)
exports.applyForJob = async (req, res) => {
  try {
    const { coverLetter, proposedPrice, estimatedDuration, portfolio } = req.body;
    const jobId = req.params.jobId;

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({
        success: false,
        message: 'Only artisans can apply for jobs',
      });
    }

    // Check if job exists
    const job = await Post.findById(jobId).populate('user');
    if (!job || job.type !== 'job') {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      job: jobId,
      artisan: req.user.id,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }

    // Create application
    const application = await JobApplication.create({
      job: jobId,
      artisan: req.user.id,
      customer: job.user._id,
      coverLetter,
      proposedPrice,
      estimatedDuration,
      portfolio: portfolio || [],
    });

    await application.populate([
      { path: 'artisan', select: 'username email profile' },
      { path: 'job', select: 'title description budget' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get applications for a job (Customer view)
// @route   GET /api/jobs/:jobId/applications
// @access  Private (Job owner only)
exports.getJobApplications = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // Check if job exists and user is the owner
    const job = await Post.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (job.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view applications for this job',
      });
    }

    const applications = await JobApplication.find({ job: jobId, isActive: true })
      .populate('artisan', 'username email profile')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      applications,
      total: applications.length,
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get artisan's applications
// @route   GET /api/jobs/my-applications
// @access  Private (Artisan only)
exports.getMyApplications = async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({
        success: false,
        message: 'Only artisans can view applications',
      });
    }

    const applications = await JobApplication.find({ 
      artisan: req.user.id,
      isActive: true,
    })
      .populate('job')
      .populate('customer', 'username email profile')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update application status (Accept/Reject)
// @route   PUT /api/jobs/applications/:applicationId
// @access  Private (Job owner only)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const applicationId = req.params.applicationId;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const application = await JobApplication.findById(applicationId)
      .populate('job')
      .populate('artisan', 'username email profile')
      .populate('customer', 'username email profile');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Check if user is the job owner
    if (application.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application',
      });
    }

    application.status = status;
    await application.save();

    // Send automatic message when application is accepted
    if (status === 'accepted') {
      try {
        const Message = require('../models/Message');
        const Conversation = require('../models/Conversation');

        // Get or create conversation between customer and artisan
        const conversation = await Conversation.getOrCreate(
          application.customer._id,
          application.artisan._id
        );

        // Create automatic acceptance message
        const customerName = application.customer.profile?.fullName || application.customer.username;
        const jobTitle = application.job.title;
        const proposedPrice = application.proposedPrice;

        const messageContent = `🎉 Great news! ${customerName} has accepted your proposal for "${jobTitle}"!\n\n` +
          `💰 Agreed Price: ₦${proposedPrice}\n` +
          `📋 Job Details: ${application.job.description}\n\n` +
          `You can now start working on this project. Feel free to message ${customerName} if you have any questions!`;

        const message = await Message.create({
          conversation: conversation._id,
          sender: application.customer._id,
          receiver: application.artisan._id,
          content: messageContent,
          type: 'text',
        });

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        
        // Increment unread count for artisan
        const currentUnread = conversation.unreadCount.get(application.artisan._id) || 0;
        conversation.unreadCount.set(application.artisan._id, currentUnread + 1);
        
        await conversation.save();

        // Emit socket event for real-time notification
        const io = req.app.get('io');
        if (io) {
          // Find artisan's socket and send real-time notification
          io.emit('newMessage', {
            conversation: conversation._id,
            sender: application.customer._id,
            receiver: application.artisan._id,
            content: messageContent,
            type: 'text',
            createdAt: new Date(),
            isAutomatic: true
          });
        }

        console.log(`Automatic acceptance message sent to artisan ${application.artisan.username}`);
      } catch (messageError) {
        console.error('Failed to send automatic message:', messageError);
        // Don't fail the application update if message fails
      }
    }

    res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      application,
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Withdraw application
// @route   DELETE /api/jobs/applications/:applicationId
// @access  Private (Artisan only)
exports.withdrawApplication = async (req, res) => {
  try {
    const applicationId = req.params.applicationId;

    const application = await JobApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Check if user is the applicant
    if (application.artisan.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this application',
      });
    }

    application.status = 'withdrawn';
    application.isActive = false;
    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
