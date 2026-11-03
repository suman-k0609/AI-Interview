import multer from 'multer';

// Use memory storage so we can directly parse the PDF buffer without keeping leftover files on disk
const storage = multer.memoryStorage();

// Accept only PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF resume files are supported!'), false);
  }
};

export const uploadResume = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  },
  fileFilter
});
