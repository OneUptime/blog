# Validation Summary: How to Run LibreOffice in Docker for Document Conversion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- LibreOffice command-line document conversion
- Ubuntu APT packages
- Flask
- Werkzeug
- Gunicorn
- Bash
- curl

## Sources Consulted
- LibreOffice command-line help from `libreoffice --headless --convert-to pdf --help`, covering `--headless`, `--convert-to`, `--outdir`, `--norestore`, and `-env:UserInstallation`.
- Docker CLI check with `docker manifest inspect libreoffice/libreoffice:latest`, which confirmed the referenced image is not publicly pullable without authentication.
- Docker Compose documentation: https://docs.docker.com/compose/compose-file/
- Flask file upload documentation, including `secure_filename`: https://flask.palletsprojects.com/en/stable/patterns/fileuploads/
- Flask `send_file` API documentation: https://flask.palletsprojects.com/en/stable/api/
- Werkzeug `secure_filename` documentation: https://werkzeug.palletsprojects.com/en/stable/utils/
- Gunicorn settings documentation for `--bind`, `--workers`, and `--timeout`: https://docs.gunicorn.org/en/stable/settings.html
- Ubuntu package metadata checked with `apt-cache policy` for LibreOffice and font packages.
- PyPI package metadata for Flask and Gunicorn: https://pypi.org/project/Flask/ and https://pypi.org/project/gunicorn/

## Issues Found
- The quick-start command used `libreoffice/libreoffice:latest`, but `docker manifest inspect libreoffice/libreoffice:latest` returned an authentication/access error, so the image is not a reliable public quick-start image. I changed the quick start to use the local `lo-converter` image built from the post's Dockerfile.
- The post used the `lo-converter` image in later commands without showing how to build that tag. I added `docker build -t lo-converter .`.
- The Flask upload example saved `file.filename` directly. Flask and Werkzeug documentation recommend `secure_filename` before using user-supplied filenames on a filesystem path. I added `secure_filename`, rejected empty sanitized names, and used the sanitized name for saving and output lookup.
- Concurrent Gunicorn workers could invoke LibreOffice with the same default user profile. LibreOffice's command-line help documents `-env:UserInstallation` for setting a non-default profile path, so I added a temporary per-conversion profile directory.
- The Compose snippets used a top-level `version: "3.8"` field. Current Docker Compose documentation no longer requires that field, so I removed it.
- The requirements pinned older Flask and Gunicorn versions. I updated them to current PyPI versions while keeping the same APIs used by the article.

## Review Notes
The examples are technically valid after the fixes, but production conversion services should also consider stricter upload size limits, MIME/content validation, macro handling, queue-based back pressure, and container resource limits.
