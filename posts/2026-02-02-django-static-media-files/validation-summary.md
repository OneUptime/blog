# Validation Summary: How to Handle Static and Media Files in Django

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django (settings.py, models.FileField/ImageField, forms.ModelForm, templates, management commands, tests)
- Python (Pillow/PIL for image processing, BytesIO, uuid)
- WhiteNoise (CompressedManifestStaticFilesStorage / CompressedStaticFilesStorage)
- Nginx (reverse-proxy / static asset serving)
- django-storages (S3Boto3Storage, GoogleCloudStorage)
- Amazon S3
- Google Cloud Storage

## Sources Consulted
- Django docs — Managing static files: https://docs.djangoproject.com/en/5.2/howto/static-files/
- Django docs — File uploads: https://docs.djangoproject.com/en/5.2/topics/http/file-uploads/
- Django docs — FILES storage / STORAGES setting: https://docs.djangoproject.com/en/5.2/ref/settings/#storages
- Django 4.2 release notes (STORAGES introduced, old settings deprecated): https://docs.djangoproject.com/en/5.2/releases/4.2/
- Django 5.1 release notes (STATICFILES_STORAGE / DEFAULT_FILE_STORAGE removed): https://docs.djangoproject.com/en/5.2/releases/5.1/
- WhiteNoise docs — Django integration: https://whitenoise.readthedocs.io/en/latest/django.html
- django-storages docs — S3 backend: https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html
- django-storages docs — GCS backend: https://django-storages.readthedocs.io/en/latest/backends/gcloud.html
- Pillow docs — Image.Resampling.LANCZOS: https://pillow.readthedocs.io/en/stable/handbook/concepts.html#filters
- Nginx docs — alias / expires / gzip directives: https://nginx.org/en/docs/

## Issues Found
1. **Use of removed `STATICFILES_STORAGE` and `DEFAULT_FILE_STORAGE` settings.** The post repeatedly configured storage via `STATICFILES_STORAGE` and `DEFAULT_FILE_STORAGE`, but these settings were deprecated in Django 4.2 (April 2023) and **removed in Django 5.1 (August 2024)**. For a Feb 2026 tutorial the code would fail on any current Django (5.1+, including the 5.2 LTS). Fixed by converting all five occurrences to use the unified `STORAGES` dict:
   - WhiteNoise section (Production Configuration)
   - Amazon S3 Configuration section
   - Separate Storage Backends section
   - Google Cloud Storage Configuration section
   - Performance Optimization section
2. **Incorrect comment about `CompressedStaticFilesStorage`.** The post described `whitenoise.storage.CompressedStaticFilesStorage` as "manifest storage without compression", but per the WhiteNoise docs it is the opposite: compression (gzip/brotli) **without** the hashed manifest. The compressed-and-manifested variant is `CompressedManifestStaticFilesStorage`. Corrected the comment to "compression without the hashed manifest".

## Review Notes
- The `S3Boto3Storage` class (`storages.backends.s3boto3.S3Boto3Storage`) used in the post remains valid in current django-storages, though newer versions also expose `storages.backends.s3.S3Storage` as the preferred alias. Either works; left as-is to match the author's choice.
- `default_acl = 'public-read'` works only when the S3 bucket has ACLs enabled. Newer S3 buckets default to `BucketOwnerEnforced` (ACLs disabled), in which case ACL settings will be rejected and bucket policies should be used instead. Not strictly incorrect, but worth being aware of when following this guide on a fresh bucket.
- `AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'` resolves correctly for us-east-1 buckets and via S3's path/virtual-host routing for others, but `{bucket}.s3.{region}.amazonaws.com` is the region-explicit form and avoids redirects. Acceptable for a tutorial.
- In `utils.py`, `sys.getsizeof(output)` is used as the `size` argument for `InMemoryUploadedFile`. `sys.getsizeof` returns the Python object's memory footprint, not the byte length of the file contents — `len(output.getvalue())` or `output.getbuffer().nbytes` is more accurate. In practice Django re-reads via `chunks()` (which calls `seek(0)`), so the inaccurate size rarely causes runtime issues. Left as-is since the code still works.
- The Photo model's `save()` resizes `self.image` then passes the resized in-memory file to `create_thumbnail()`. This works because `FieldFile.chunks()` calls `seek(0)` before reading, so the buffer position consumed by Pillow is reset on save. Not an error; just a subtle behavior worth flagging.
- WhiteNoise middleware ordering (immediately after `SecurityMiddleware`) and the Nginx `alias`/`expires`/`gzip_types` directives are all correct.
