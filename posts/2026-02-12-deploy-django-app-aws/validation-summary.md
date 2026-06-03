# Validation Summary: How to Deploy a Django App to AWS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Django
- Python
- AWS EC2
- Amazon RDS for PostgreSQL
- Elastic Beanstalk
- Amazon ECS Fargate
- Amazon ECR
- Gunicorn
- Nginx
- Docker
- WhiteNoise
- django-storages
- Amazon S3 and CloudFront

## Sources Consulted
- Django settings documentation: https://docs.djangoproject.com/en/5.2/ref/settings/
- Django deployment checklist: https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/
- Django static files deployment documentation: https://docs.djangoproject.com/en/5.2/howto/static-files/deployment/
- Django download and supported versions page: https://www.djangoproject.com/download/
- Django 4.0 release notes for removed `SECURE_BROWSER_XSS_FILTER`: https://docs.djangoproject.com/en/dev/releases/4.0/
- WhiteNoise Django documentation: https://whitenoise.readthedocs.io/en/stable/django.html
- django-storages Amazon S3 backend documentation: https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html
- Gunicorn settings documentation: https://docs.gunicorn.org/en/stable/settings.html
- AWS Elastic Beanstalk Python platform documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-python-container.html
- AWS Elastic Beanstalk platform hooks documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html
- AWS EB CLI `eb create` documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-create.html
- AWS CLI `ecs run-task` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html
- AWS CLI `rds create-db-instance` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/

## Issues Found
- The post pinned `Django==5.0`, which is unsupported as of 2026-06-03. Updated the requirements example to Django 5.2 LTS and refreshed the related package pins.
- The production settings snippet referenced `BASE_DIR` without importing the base settings. Added `from .base import *` to match the project structure shown later in the post.
- The production settings used permissive or missing-secret defaults for `ALLOWED_HOSTS` and `SECRET_KEY`. Changed them to required environment variables so production deployments fail fast if those values are missing.
- `SECURE_BROWSER_XSS_FILTER` was included even though Django removed that setting in Django 4.0. Removed it.
- The WhiteNoise example used `STATICFILES_STORAGE`, which is deprecated in Django 4.2 and removed in newer Django versions. Replaced it with the `STORAGES['staticfiles']` configuration recommended by Django and WhiteNoise.
- The Dockerfile suppressed `collectstatic` failures with `2>/dev/null || true`, which could produce an image without static assets. Changed it to run `collectstatic` with explicit build-time environment values and fail on errors.
- The local Docker run command did not provide `ALLOWED_HOSTS`, which is required by the corrected production settings. Added it.
- The Elastic Beanstalk deploy flow set environment variables after creating the environment, even though creation deploys the app. Changed `eb create` to pass required environment variables with `--envvars`.
- The S3 static/media storage example used legacy `STATICFILES_STORAGE` and `DEFAULT_FILE_STORAGE` settings. Replaced them with Django 4.2+ `STORAGES` configuration and the current `storages.backends.s3.S3Storage` backend.
- The RDS command used `--multi-az false`, but the AWS CLI uses boolean flags. Replaced it with `--no-multi-az`.

## Review Notes
- The guide is technically relevant and remains a useful deployment overview after the corrections.
- The ECS service creation step intentionally points to a related Express guide rather than fully specifying task definitions, IAM roles, load balancer listeners, and service configuration. That is acceptable for this post, but a future revision could make the ECS section more self-contained.
- The EC2 examples assume an Amazon Linux environment where the listed package names are available. For other AMIs, package manager and package names may differ.
