# Validation Summary: How to Use Multer for File Uploads in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Multer
- multipart/form-data
- JavaScript
- HTML forms

## Sources Consulted
- Express.js Multer middleware documentation: https://expressjs.com/en/resources/middleware/multer/
- Multer storage engine documentation: https://github.com/expressjs/multer/blob/main/StorageEngine.md
- Multer error codes source: https://github.com/expressjs/multer/blob/main/lib/multer-error.js

## Issues Found
- The Disk Storage `filename` example called `cb()` twice in the same execution path: once with `file.originalname` and once with a generated unique filename. Multer expects the storage callback to be invoked once, so I commented out the original-name alternative to keep only one active callback.
- The cleanup example checked only `req.file` before unlinking `req.file.path`. Multer memory storage files do not have a `path` property, so I changed the guard to `req.file?.path`.

## Review Notes
- The examples use current Multer APIs documented for Multer 2.2.0, including `single`, `array`, `fields`, `any`, `none`, `diskStorage`, `memoryStorage`, `fileFilter`, `limits`, and `multer.MulterError`.
- MIME type and extension checks are useful examples, but production systems should treat client-provided filenames and MIME types as advisory and validate file content where security matters.
- Multer's official documentation warns that memory storage can exhaust memory when handling large files or many files quickly, so cloud-upload workflows should keep strict size and count limits.
