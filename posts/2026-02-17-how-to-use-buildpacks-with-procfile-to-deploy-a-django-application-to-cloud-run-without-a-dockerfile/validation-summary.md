# Validation Summary: How to Use Buildpacks with Procfile to Deploy a Django App to Cloud Run Without

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud Buildpacks
- Google Cloud Build
- Cloud Run Jobs
- Cloud SQL for PostgreSQL
- Django
- Python
- Gunicorn
- WhiteNoise
- django-environ
- Pack CLI

## Sources Consulted
- Google Cloud Buildpacks Python documentation: https://cloud.google.com/docs/buildpacks/python
- Google Cloud Buildpacks overview: https://cloud.google.com/docs/buildpacks/overview
- Google Cloud Run source deployment documentation: https://cloud.google.com/run/docs/deploying-source-code
- Google Cloud Run Jobs documentation: https://cloud.google.com/run/docs/create-jobs
- Google Cloud SDK reference for `gcloud run jobs create`: https://cloud.google.com/sdk/gcloud/reference/run/jobs/create
- Google Cloud SQL for PostgreSQL Cloud Run connection documentation: https://cloud.google.com/sql/docs/postgres/connect-run
- Google Cloud Django on Cloud Run guide: https://cloud.google.com/python/django/run
- Django 5.0 static files documentation: https://docs.djangoproject.com/en/5.0/ref/contrib/staticfiles/
- Django settings documentation for `STORAGES`: https://docs.djangoproject.com/en/5.0/ref/settings/
- WhiteNoise Django documentation: https://whitenoise.readthedocs.io/en/stable/django.html
- Gunicorn running documentation: https://docs.gunicorn.org/en/stable/run.html
- django-environ supported types documentation: https://django-environ.readthedocs.io/en/stable/types.html

## Issues Found
- The post used `runtime.txt` to pin Python. Google Cloud Buildpacks currently document `.python-version` or `GOOGLE_PYTHON_VERSION` for Python version selection, so the project tree, section heading, example file content, and conclusion were updated to use `.python-version`.
- The local Pack CLI example used `GOOGLE_RUNTIME_VERSION`. For Python builds, the current documented environment variable is `GOOGLE_PYTHON_VERSION`, so the command was updated.
- The Django settings omitted `django.contrib.staticfiles`, which is required for `collectstatic` and staticfiles storage configuration. It was added to `INSTALLED_APPS`.
- The Django 5 settings used `STATICFILES_STORAGE`. Django 4.2 and later use the `STORAGES` setting, and WhiteNoise documents the `STORAGES["staticfiles"]` backend. The sample was updated to use `STORAGES`.
- The post claimed Cloud Run lacks a built-in way to run one-off commands, but Cloud Run Jobs are the built-in mechanism for this workflow. The wording was narrowed to Cloud Run services and normal service deployments.
- The Cloud Build example ran `collectstatic` after the image was built, which does not place WhiteNoise static files into the already-built image. That step was removed from the migration workflow.
- The static files section recommended `bin/post_compile`, which is not documented for Google Cloud Buildpacks. It was replaced with a Procfile-based `collectstatic` startup command for the local-filesystem WhiteNoise approach shown in the post.
- The Cloud SQL deploy command set `--set-env-vars` twice and used a placeholder `DATABASE_URL` that did not match the following socket-based Django settings. The command was updated to set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `INSTANCE_UNIX_SOCKET` in one environment variable flag.

## Review Notes
The post is technically valid after the corrections. For a larger production deployment, static files are often better pushed to Cloud Storage or another asset store instead of being collected on every Cloud Run instance startup, but the corrected WhiteNoise approach is workable for the no-Dockerfile tutorial path.
