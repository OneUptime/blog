# Validation Summary: How to Implement File Uploads in Django

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Python
- Django file uploads
- Django forms, models, views, settings, and storage backends
- Django REST Framework multipart uploads
- django-storages with Amazon S3
- Pillow image processing
- python-magic MIME detection
- ClamAV malware scanning

## Sources Consulted
- Django documentation: File uploads - https://docs.djangoproject.com/en/6.0/topics/http/file-uploads/
- Django documentation: Settings - https://docs.djangoproject.com/en/6.0/ref/settings/
- Django documentation: Managing files - https://docs.djangoproject.com/en/6.0/topics/files/
- Django documentation: Static and media files during development - https://docs.djangoproject.com/en/6.0/howto/static-files/
- Django documentation: FileResponse - https://docs.djangoproject.com/en/6.0/ref/request-response/#fileresponse-objects
- Django 4.2 release notes: storage settings deprecations - https://docs.djangoproject.com/en/5.0/releases/4.2/
- django-storages documentation: Amazon S3 backend - https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html
- Django REST Framework documentation: Parsers - https://www.django-rest-framework.org/api-guide/parsers/
- Pillow documentation: Image module - https://pillow.readthedocs.io/en/stable/reference/Image.html

## Issues Found
- The `DATA_UPLOAD_MAX_MEMORY_SIZE` comments described the setting as a total request body limit. Django documents that this check excludes file upload data in `request.FILES`, so the comments were changed to say it limits non-file request data.
- The multiple file form used `ClearableFileInput(attrs={'multiple': True})` directly and attempted to read files from `self.files` in `clean_files()`. Current Django documentation requires a widget subclass with `allow_multiple_selected = True` and a custom `FileField` for form-level validation of all uploaded files. The snippet was updated to follow that pattern and validate `cleaned_data`.
- The download view used `document.file.path`, `os.path.exists()`, and Python's built-in `open()`, which only work for local filesystem storage. The view now uses the Django storage API and `FileResponse` with `as_attachment=True` and `filename=...`, making the example valid for storage backends that do not expose local paths.
- The avatar update view deleted the old file with `avatar.path` and `os.remove()`, which is not portable across storage backends. It now uses `profile.avatar.delete(save=False)`.
- The S3 configuration used deprecated `DEFAULT_FILE_STORAGE` and referenced the old `STATICFILES_STORAGE` pattern. The example now uses Django's `STORAGES` setting with the current django-storages `storages.backends.s3.S3Storage` backend and `OPTIONS`.
- The custom S3 storage classes imported and subclassed `S3Boto3Storage`. The examples were updated to the current documented `S3Storage` import path.
- The image dimension validator caught its own `ValidationError` and re-raised it as a generic read error. The validation checks were moved outside the image-open `try` block so dimension errors remain accurate.
- The Pillow helpers used `sys.getsizeof(output)` for uploaded file size, which measures the Python object rather than the encoded image bytes. They now use `output.getbuffer().nbytes`, remove the unused `sys` import, and reset the input file pointer after processing.

## Review Notes
The post is now technically valid against current Django and django-storages guidance. Future improvements could mention that browser-provided MIME types are untrusted and that content detection for plain text and CSV can vary by platform and `libmagic` database.
