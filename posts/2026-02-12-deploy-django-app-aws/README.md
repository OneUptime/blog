# How to Deploy a Django App to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Django, Python, Deployment

Description: A comprehensive guide to deploying a Django application to AWS, covering EC2 with Gunicorn and Nginx, Elastic Beanstalk, ECS Fargate, and production configuration tips.

---

Deploying Django to AWS requires a few more considerations than deploying a simple API. You've got static files, database migrations, WSGI servers, and Django-specific configuration to handle. Let's walk through the deployment options and the Django-specific setup each one needs.

## Preparing Django for Production

Before deploying anywhere, your Django app needs some production hardening.

Update your settings for production use.

```python
# settings/production.py
import os

DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# Database - use RDS
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'myapp'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Static files - serve via S3 or whitenoise
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'true') == 'true'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

Install production dependencies.

```bash
pip install gunicorn psycopg2-binary whitenoise django-storages boto3
```

Add WhiteNoise for static file serving (simpler than S3 for many cases).

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # add after SecurityMiddleware
    # ... rest of middleware
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

Create a `requirements.txt`.

```
Django==5.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
whitenoise==6.6.0
django-storages==1.14
boto3==1.34.0
```

## Option 1: Deploy to EC2

The traditional approach with full control over the server.

### Set Up the EC2 Instance

```bash
# SSH into your EC2 instance
ssh -i my-key.pem ec2-user@your-ec2-ip

# Install system dependencies
sudo yum update -y
sudo yum install -y python3.11 python3.11-pip python3.11-devel gcc nginx

# Create app directory
sudo mkdir -p /opt/myapp
sudo chown ec2-user:ec2-user /opt/myapp
cd /opt/myapp

# Set up a virtual environment
python3.11 -m venv venv
source venv/bin/activate
```

### Deploy the Application

```bash
# Clone your code (or upload via SCP)
git clone https://github.com/your-org/your-django-app.git .
pip install -r requirements.txt

# Set environment variables
export DJANGO_SETTINGS_MODULE=myapp.settings.production
export DJANGO_SECRET_KEY='your-production-secret-key'
export DB_HOST='your-rds-endpoint.amazonaws.com'
export DB_PASSWORD='your-db-password'
export ALLOWED_HOSTS='your-domain.com,your-ec2-ip'

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser (if needed)
python manage.py createsuperuser
```

### Configure Gunicorn

Create a Gunicorn configuration file.

```python
# gunicorn.conf.py
bind = '127.0.0.1:8000'
workers = 3  # (2 * num_cores) + 1
worker_class = 'sync'
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'
loglevel = 'info'
```

Create a systemd service for Gunicorn.

```bash
sudo tee /etc/systemd/system/gunicorn.service > /dev/null << 'EOF'
[Unit]
Description=Gunicorn daemon for Django app
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/opt/myapp
Environment="DJANGO_SETTINGS_MODULE=myapp.settings.production"
Environment="DJANGO_SECRET_KEY=your-secret-key"
Environment="DB_HOST=your-rds-endpoint"
Environment="DB_PASSWORD=your-password"
ExecStart=/opt/myapp/venv/bin/gunicorn myapp.wsgi:application -c gunicorn.conf.py

[Install]
WantedBy=multi-user.target
EOF

sudo mkdir -p /var/log/gunicorn
sudo chown ec2-user:ec2-user /var/log/gunicorn

sudo systemctl start gunicorn
sudo systemctl enable gunicorn
sudo systemctl status gunicorn
```

### Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/django.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    client_max_body_size 10M;

    location /static/ {
        alias /opt/myapp/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /opt/myapp/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx
```

## Option 2: Deploy to Elastic Beanstalk

Elastic Beanstalk handles the infrastructure, so you can focus on your code.

### Project Structure

Create the required EB configuration files.

```
myapp/
  .ebextensions/
    01_packages.config
    02_django.config
  .platform/
    hooks/
      postdeploy/
        01_migrate.sh
  myapp/
    settings/
      __init__.py
      base.py
      production.py
  manage.py
  requirements.txt
  Procfile
```

```yaml
# .ebextensions/01_packages.config
packages:
  yum:
    python3.11-devel: []
    gcc: []
```

```yaml
# .ebextensions/02_django.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: myapp.settings.production
  aws:elasticbeanstalk:container:python:
    WSGIPath: myapp.wsgi:application
```

```bash
# .platform/hooks/postdeploy/01_migrate.sh
#!/bin/bash
source /var/app/venv/*/bin/activate
cd /var/app/current
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

Make the hook executable.

```bash
chmod +x .platform/hooks/postdeploy/01_migrate.sh
```

Create a Procfile.

```
# Procfile
web: gunicorn myapp.wsgi:application --bind :8000 --workers 3
```

### Deploy

```bash
# Initialize and deploy
eb init -p python-3.11 my-django-app
eb create django-production
eb deploy

# Set environment variables
eb setenv \
    DJANGO_SECRET_KEY='your-secret-key' \
    DB_HOST='your-rds-endpoint' \
    DB_PASSWORD='your-password' \
    ALLOWED_HOSTS='.elasticbeanstalk.com'

# Check status
eb status
eb logs
eb open
```

## Option 3: Deploy with ECS Fargate

Containerized deployment with Docker.

### Create the Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1

CMD ["gunicorn", "myapp.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120"]
```

Add a health check view.

```python
# views.py
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        'status': 'healthy',
        'version': '1.0.0'
    })

# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check),
    # ... other urls
]
```

### Build, Push, and Deploy

```bash
# Build the image
docker build -t django-app .

# Test locally
docker run -p 8000:8000 \
    -e DJANGO_SECRET_KEY=test-key \
    -e DJANGO_SETTINGS_MODULE=myapp.settings.production \
    -e DB_HOST=host.docker.internal \
    django-app

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com

docker tag django-app:latest \
    123456789012.dkr.ecr.us-east-1.amazonaws.com/django-app:latest
docker push \
    123456789012.dkr.ecr.us-east-1.amazonaws.com/django-app:latest
```

Create an ECS service with the same approach shown in the [Express deployment guide](https://oneuptime.com/blog/post/2026-02-12-deploy-nodejs-express-app-aws/view), adjusting the container port and image name.

## Running Migrations in ECS

Migrations need to run once before the new containers start serving traffic. Use an ECS task to run them.

```bash
# Create a one-off task for migrations
aws ecs run-task \
    --cluster django-cluster \
    --task-definition django-migrate \
    --launch-type FARGATE \
    --network-configuration \
    "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
    --overrides '{
        "containerOverrides": [{
            "name": "django-app",
            "command": ["python", "manage.py", "migrate", "--noinput"]
        }]
    }'
```

## Serving Static Files from S3

For production, serve static files from S3 with CloudFront.

```python
# settings/production.py
INSTALLED_APPS += ['storages']

AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.environ.get('AWS_REGION', 'us-east-1')
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

# Static files
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'

# Media files
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
```

Then collect static files to S3.

```bash
python manage.py collectstatic --noinput
```

## Database Setup with RDS

Create an RDS PostgreSQL instance for your Django app.

```bash
aws rds create-db-instance \
    --db-instance-identifier django-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password 'your-strong-password' \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxx \
    --db-name myapp \
    --backup-retention-period 7 \
    --multi-az false
```

## Best Practices

- **Always run collectstatic** as part of your deployment pipeline. Missing static files are a common deployment issue.
- **Run migrations as a separate step**, not during container startup. This prevents multiple containers from running migrations simultaneously.
- **Use environment variables** for all secrets and configuration. Never commit secrets to version control.
- **Set up RDS with automated backups** and test restore procedures regularly.
- **Use a CDN (CloudFront)** for static and media files. It reduces load on your application servers and improves response times.
- **Monitor your Django app** with proper logging and health checks. Keep an eye on response times, error rates, and database connection pool usage.

For monitoring your deployed Django application, integrate with a monitoring solution that can track both application metrics and infrastructure health. And for handling static files efficiently through S3, refer to the [Boto3 S3 upload guide](https://oneuptime.com/blog/post/2026-02-12-upload-files-s3-boto3/view).
