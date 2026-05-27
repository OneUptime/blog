# Validation Summary: How to Use App Engine Handlers in app.yaml to Serve Static Files Without App

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google App Engine standard environment
- App Engine `app.yaml` handlers
- Static file serving
- HTTP caching headers
- MIME types
- Python 3 runtime
- Cloud Storage and Cloud CDN

## Sources Consulted
- Google Cloud App Engine app.yaml reference: https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- Google Cloud App Engine storing and serving static files: https://docs.cloud.google.com/appengine/docs/standard/serving-static-files
- Google Cloud App Engine request handling limits: https://docs.cloud.google.com/appengine/docs/standard/how-requests-are-handled
- Google Cloud App Engine Python 3 runtime environment: https://cloud.google.com/appengine/docs/standard/python3/runtime
- Google Cloud Storage quotas and limits: https://cloud.google.com/storage/quotas

## Issues Found
- Replaced unsupported "edge servers" / "CDN-like infrastructure" wording with the documented behavior that static files are uploaded and handled separately, and served directly by App Engine infrastructure.
- Fixed the HTML static file handler example. The original `static_files: build/\1.html` referenced `\1` without a capture group in the `url` pattern; the example now captures the full HTML filename and maps it with `static_files: build/\1`.
- Updated the fully static Python example to include an `entrypoint`, because App Engine static handlers require either an `entrypoint` or at least one `script: auto` handler to deploy successfully.
- Replaced the Flask-only minimal app with a dependency-free WSGI callable, and added a note that explicitly configured Gunicorn must be present in `requirements.txt`.
- Corrected App Engine limits. The post now states the documented 32 MB static file limit, 10,000 total application/static files, 1,000 files per directory, and code/static data billing after the first 1 GB instead of presenting 1 GB or 500 MB as hard deployment limits.
- Corrected the Cloud Storage comparison. Cloud Storage has a 5 TiB object size limit, not "no file size limit."
- Removed the unsupported claim that current `app.yaml` files can have up to 100 URL handlers.

## Review Notes
The post is technically relevant and the remaining examples match the current App Engine standard environment documentation for static handlers, cache headers, MIME types, HTTPS redirects, handler order, and Python 3 runtime behavior.
