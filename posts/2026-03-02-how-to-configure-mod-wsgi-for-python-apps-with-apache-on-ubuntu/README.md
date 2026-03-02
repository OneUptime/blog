# How to Configure mod_wsgi for Python Apps with Apache on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, Apache, mod_wsgi, Django

Description: Configure Apache's mod_wsgi module on Ubuntu to serve Python WSGI applications including Django and Flask, with virtual environment support and daemon mode.

---

While Gunicorn with Nginx is a popular deployment stack for Python web applications, mod_wsgi remains a solid choice, particularly in environments where Apache is already the standard web server. mod_wsgi integrates Python directly into Apache and offers daemon mode, which runs the Python application in separate processes independent of Apache's worker processes.

## Understanding mod_wsgi Modes

mod_wsgi operates in two modes:

**Embedded mode**: Python runs inside each Apache worker process. Simple to configure but couples Python's memory usage to Apache's.

**Daemon mode**: Python runs in separate, dedicated processes. Recommended for production because you can restart the Python processes without touching Apache, and you can run Python as a different user.

This guide focuses on daemon mode, which is the better option for most deployments.

## Installation

Install Apache and mod_wsgi:

```bash
sudo apt update
sudo apt install apache2 libapache2-mod-wsgi-py3 -y

# Enable required modules
sudo a2enmod wsgi
sudo a2enmod headers
sudo a2enmod ssl  # For HTTPS

# Verify mod_wsgi is loaded
apache2ctl -M | grep wsgi
```

Note: `libapache2-mod-wsgi-py3` is for Python 3. The older `libapache2-mod-wsgi` is Python 2 only and should not be used for new deployments.

## Setting Up a Python Application

Create a sample Django or Flask application:

```bash
# Create project directory
sudo mkdir -p /var/www/myapp
cd /var/www/myapp

# Create virtual environment
sudo python3 -m venv venv
sudo /var/www/myapp/venv/bin/pip install django gunicorn

# Create a simple Django project
sudo /var/www/myapp/venv/bin/django-admin startproject myproject /var/www/myapp

# Set up static files directory
sudo mkdir -p /var/www/myapp/staticfiles
sudo mkdir -p /var/www/myapp/media

# Set permissions
sudo chown -R www-data:www-data /var/www/myapp
```

The WSGI entry point for a Django project is at `myproject/wsgi.py`:

```python
# /var/www/myapp/myproject/wsgi.py
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
application = get_wsgi_application()
```

For a Flask application, create a wsgi.py:

```python
# /var/www/myapp/wsgi.py
import sys
import os

# Add the application directory to Python path
sys.path.insert(0, '/var/www/myapp')

# Set environment variables before importing the app
os.environ['FLASK_ENV'] = 'production'

from app import application  # import the WSGI application object
```

## Basic Apache Virtual Host Configuration

Create the Apache virtual host configuration:

```bash
sudo nano /etc/apache2/sites-available/myapp.conf
```

```apache
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Document root (serves static files directly)
    DocumentRoot /var/www/myapp

    # WSGIDaemonProcess: configure the Python daemon processes
    # python-home: path to the virtual environment
    # python-path: path to the application (for imports to work)
    # processes: number of Python worker processes
    # threads: threads per process
    # display-name: how the process shows in 'ps' output
    WSGIDaemonProcess myapp \
        python-home=/var/www/myapp/venv \
        python-path=/var/www/myapp \
        processes=4 \
        threads=2 \
        display-name=%{GROUP} \
        user=www-data \
        group=www-data

    # Assign requests to the daemon process group
    WSGIProcessGroup myapp

    # Map the URL path to the WSGI script
    WSGIScriptAlias / /var/www/myapp/myproject/wsgi.py

    # Allow Apache to serve the WSGI script
    <Directory /var/www/myapp/myproject>
        <Files wsgi.py>
            Require all granted
        </Files>
    </Directory>

    # Serve static files directly from Apache (much more efficient)
    Alias /static/ /var/www/myapp/staticfiles/
    <Directory /var/www/myapp/staticfiles>
        Require all granted
        Options -Indexes
    </Directory>

    # Serve media uploads directly
    Alias /media/ /var/www/myapp/media/
    <Directory /var/www/myapp/media>
        Require all granted
        Options -Indexes
    </Directory>

    # Main application directory permissions
    <Directory /var/www/myapp>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    # Log files
    ErrorLog ${APACHE_LOG_DIR}/myapp-error.log
    CustomLog ${APACHE_LOG_DIR}/myapp-access.log combined

</VirtualHost>
```

Enable the site and restart Apache:

```bash
sudo a2ensite myapp.conf
sudo a2dissite 000-default.conf  # Disable default site if needed
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Advanced Daemon Configuration

Tune the daemon process settings based on your application's needs:

```apache
# High-traffic configuration
WSGIDaemonProcess myapp-prod \
    python-home=/var/www/myapp/venv \
    python-path=/var/www/myapp \
    processes=8 \
    threads=4 \
    request-timeout=30 \
    inactivity-timeout=60 \
    maximum-requests=1000 \
    stack-size=524288 \
    queue-timeout=45 \
    socket-timeout=60 \
    display-name=wsgi-myapp \
    user=www-data \
    group=www-data
```

Key daemon parameters explained:
- `processes`: Number of Python worker processes. Scale with CPU cores.
- `threads`: Threads per process. Increase for I/O-bound applications.
- `maximum-requests`: Restart workers after this many requests (prevents memory leaks).
- `request-timeout`: Kill requests that take longer than this.
- `inactivity-timeout`: Restart idle processes after this many seconds.

## Environment Variables in mod_wsgi

Passing environment variables to the WSGI application:

```apache
# Set environment variables for the daemon process
WSGIDaemonProcess myapp \
    python-home=/var/www/myapp/venv \
    python-path=/var/www/myapp \
    processes=4 \
    threads=2

# Pass environment variables to the process
SetEnv DJANGO_SETTINGS_MODULE myproject.settings.production
SetEnv SECRET_KEY "your-secret-key-here"
SetEnv DATABASE_URL "postgresql://user:pass@localhost/mydb"
```

Or load them from a file to keep secrets out of Apache configs:

```apache
# Source environment file
PassEnv DATABASE_URL
PassEnv SECRET_KEY
```

And set them in `/etc/environment` or the Apache systemd service override.

## Django-Specific Configuration

For Django, collect static files before the first deploy:

```bash
cd /var/www/myapp
sudo /var/www/myapp/venv/bin/python manage.py collectstatic --no-input
sudo /var/www/myapp/venv/bin/python manage.py migrate
sudo chown -R www-data:www-data /var/www/myapp/staticfiles
sudo chown -R www-data:www-data /var/www/myapp/media
```

In Django's `settings.py`, ensure these are configured:

```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = '/var/www/myapp/staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = '/var/www/myapp/media'

# For production
DEBUG = False
ALLOWED_HOSTS = ['example.com', 'www.example.com']
```

## Adding SSL

```apache
<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # Use the same daemon process as HTTP (no need to create a new one)
    WSGIProcessGroup myapp
    WSGIScriptAlias / /var/www/myapp/myproject/wsgi.py

    # Tell Django the connection is HTTPS
    RequestHeader set X-Forwarded-Proto "https"

    # ... same static/media aliases as HTTP block
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName example.com
    Redirect permanent / https://example.com/
</VirtualHost>
```

## Restarting the WSGI Application

Touching the wsgi.py file triggers a restart of the daemon processes without restarting Apache:

```bash
# Gracefully restart WSGI processes after deploying new code
sudo touch /var/www/myapp/myproject/wsgi.py

# Or use the mod_wsgi-express approach if available
# sudo service apache2 graceful

# Check Apache is still responding after restart
curl -I http://example.com/
```

## Troubleshooting

Common issues and their causes:

```bash
# Check Apache error logs
sudo tail -f /var/log/apache2/myapp-error.log

# Check if mod_wsgi is loaded
apache2ctl -M | grep wsgi

# Test WSGI script syntax directly
sudo -u www-data /var/www/myapp/venv/bin/python /var/www/myapp/myproject/wsgi.py

# Check virtual environment is correct
/var/www/myapp/venv/bin/python -c "import django; print(django.__version__)"

# Verify file permissions
ls -la /var/www/myapp/myproject/wsgi.py
# Should be readable by www-data
```

Common errors:

- **403 Forbidden**: Check `Require all granted` in the directory block and file permissions.
- **500 Internal Server Error**: Python exception in the application. Check error logs.
- **ModuleNotFoundError**: The python-path is incorrect, or the virtual environment is not set correctly.
- **ImportError for wsgi**: The WSGIScriptAlias path is wrong.

mod_wsgi daemon mode provides a stable, performant deployment for Python web applications and integrates naturally into Apache-based infrastructure without requiring an additional process manager.
