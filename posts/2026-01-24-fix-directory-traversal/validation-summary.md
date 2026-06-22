# Validation Summary: How to Fix 'Directory Traversal' Vulnerabilities

## Status
validated

## Post Type
Security tutorial / implementation guide

## Technologies Covered
- Directory traversal / path traversal security
- Python Flask
- Python pathlib and regular expressions
- Node.js path module
- Express.js
- express-validator
- PHP readfile
- Go net/http and path/filepath
- Dockerfile container isolation
- pytest

## Sources Consulted
- OWASP Path Traversal: https://owasp.org/www-community/attacks/Path_Traversal
- Python pathlib documentation: https://docs.python.org/3/library/pathlib.html
- Flask API documentation for sending files: https://flask.palletsprojects.com/en/stable/api/
- Werkzeug safe_join documentation: https://werkzeug.palletsprojects.com/en/stable/utils/
- Node.js path documentation: https://nodejs.org/api/path.html
- Express response API, res.sendFile: https://expressjs.com/en/5x/api/response/
- express-validator documentation: https://express-validator.github.io/docs/
- PHP readfile manual: https://www.php.net/manual/en/function.readfile.php
- Go net/http ServeFile documentation: https://pkg.go.dev/net/http
- Go path/filepath documentation: https://pkg.go.dev/path/filepath
- Go blog on traversal-resistant file APIs: https://go.dev/blog/osroot
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/

## Issues Found
- The Python secure example used `str(requested_path).startswith(str(UPLOAD_DIR))`, which can incorrectly allow sibling paths such as `/var/www/uploads_evil`. Changed it to `requested_path.is_relative_to(UPLOAD_DIR)` after resolving the path.
- The Python secure example imported `os` but no longer used it. Removed the unused import.
- The Node.js secure example validated only the normalized path string and did not resolve symlinks. A symlink inside the upload directory could point outside it. Added `fs.realpath()` checks for both the upload directory and requested file before serving.
- The Go secure example used `filepath.Abs` and a string prefix check, which does not resolve symlinks and can miss some filesystem escape cases. Updated it to reject non-local input with `filepath.IsLocal`, resolve symlinks with `filepath.EvalSymlinks`, and compare with `filepath.Rel`.
- The Go secure example could panic if `os.Stat` returned an error other than `os.IsNotExist`, because `info` could be nil before calling `info.IsDir()`. Added explicit non-ENOENT error handling.
- The Python filename validation helper passed possible `None` input to `re.match`, which would raise `TypeError` when the query parameter was missing. Changed it to return false for empty or missing values.
- The database-ID example used `current_user` without importing it. Added `from flask_login import current_user`.
- The "Using realpath before validation" mistake conflicted with the post's correct advice to resolve before comparing paths. Renamed it to "Using realpath without validation" and clarified the comment.

## Review Notes
- The corrected examples are accurate for current APIs. The Go sample uses `filepath.IsLocal`, which is available in modern Go releases beginning with Go 1.20.
- The Flask ecosystem also provides `send_from_directory` / Werkzeug `safe_join` for this use case; the post's explicit `pathlib` approach is acceptable after the containment fix.
