# How to Deploy a Python App with Elastic Beanstalk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Python, Deployment, Cloud

Description: Learn how to deploy a Python application to AWS Elastic Beanstalk from scratch, covering project setup, configuration files, database connections, and production best practices.

---

If you've ever spent a weekend wrestling with EC2 instances, security groups, and load balancers just to get a Flask app running in production, Elastic Beanstalk is going to feel like a breath of fresh air. It handles the infrastructure so you can focus on shipping code.

This guide walks through deploying a Python application to Elastic Beanstalk - from initial setup all the way to a production-ready deployment. We'll cover Flask and Django, since those are what most teams reach for.

## Prerequisites

Before we start, make sure you have:

- An AWS account with appropriate permissions
- The AWS CLI installed and configured
- The EB CLI installed (`pip install awsebcli`)
- Python 3.9 or later
- A working Python web application

## Setting Up Your Project Structure

Elastic Beanstalk expects a specific project layout. Here's what a typical Flask project looks like.

```
my-flask-app/
├── application.py
├── requirements.txt
├── .ebextensions/
│   └── python.config
└── .ebignore
```

The key thing to note is the entry point. Elastic Beanstalk looks for `application.py` by default, and it expects your WSGI application object to be named `application`. Not `app`, not `server` - `application`.

Here's a minimal Flask setup that works out of the box.

```python
# application.py - Entry point for Elastic Beanstalk
from flask import Flask

application = Flask(__name__)

@application.route('/')
def index():
    return {'status': 'healthy', 'message': 'Hello from Elastic Beanstalk'}

@application.route('/api/users')
def get_users():
    # Your actual application logic here
    return {'users': []}

if __name__ == '__main__':
    application.run(debug=True)
```

If you're using Django, the WSGI file already exists. You just need to make sure the application variable is exposed properly.

```python
# For Django projects, update wsgi.py
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
application = get_wsgi_application()
```

## Creating the Requirements File

Your `requirements.txt` needs to list every dependency. Elastic Beanstalk runs `pip install -r requirements.txt` during deployment.

```txt
# requirements.txt - Pin your versions for reproducible builds
Flask==3.0.0
gunicorn==21.2.0
boto3==1.29.0
psycopg2-binary==2.9.9
```

Always pin your versions. Unpinned dependencies are a deployment time bomb - everything works today, breaks tomorrow when a package pushes a breaking update.

## Configuring the EB Environment

The `.ebextensions` directory holds configuration files that customize your environment. Create a config file for Python-specific settings.

```yaml
# .ebextensions/python.config - Python platform configuration
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: application:application
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: static
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 4
  aws:autoscaling:trigger:
    MeasureName: CPUUtilization
    UpperThreshold: 70
    LowerThreshold: 30
```

The `WSGIPath` setting tells Elastic Beanstalk where to find your WSGI callable. The format is `module:callable`, so `application:application` means "import the `application` object from the `application` module."

## Initializing and Deploying

With your project structured correctly, it's time to initialize the EB environment.

```bash
# Initialize your Elastic Beanstalk application
eb init -p python-3.11 my-flask-app --region us-east-1

# Create an environment and deploy
eb create production-env --instance-type t3.small

# Check the status of your deployment
eb status
```

The `eb create` command does a lot behind the scenes. It provisions an EC2 instance, sets up a load balancer, configures security groups, and deploys your code. First deployment usually takes 5-7 minutes.

## Connecting to a Database

Most real applications need a database. You can either create an RDS instance through Elastic Beanstalk or connect to an existing one. I'd recommend creating the database separately - if you ever terminate the EB environment, you don't want your database going with it.

Set connection details as environment variables.

```bash
# Set database environment variables
eb setenv DB_HOST=mydb.abc123.us-east-1.rds.amazonaws.com \
         DB_NAME=myapp \
         DB_USER=admin \
         DB_PASSWORD=your-secure-password \
         DB_PORT=5432
```

Then read those in your application.

```python
# config.py - Database configuration from environment variables
import os

class Config:
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_NAME = os.environ.get('DB_NAME', 'myapp')
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_PORT = os.environ.get('DB_PORT', '5432')

    @property
    def database_url(self):
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
```

For more on managing environment variables, check out our guide on [configuring Elastic Beanstalk environment variables](https://oneuptime.com/blog/post/configure-elastic-beanstalk-environment-variables/view).

## Running Database Migrations

You can run migrations automatically during deployment using container commands.

```yaml
# .ebextensions/migrations.config - Run migrations on deploy
container_commands:
  01_migrate:
    command: "python manage.py db upgrade"
    leader_only: true
```

The `leader_only: true` flag ensures migrations run on only one instance during a multi-instance deployment. Without this, you'd have multiple instances trying to run migrations simultaneously, which never ends well.

## Deploying Updates

Once your environment is running, subsequent deployments are simple.

```bash
# Deploy the latest version of your code
eb deploy

# Deploy with a specific version label
eb deploy --label v1.2.3

# Open your application in a browser
eb open
```

## Setting Up Logging

Elastic Beanstalk captures logs from your application, but you should configure proper logging in your code too.

```python
# logging_config.py - Production logging setup
import logging
import sys

def configure_logging():
    # Write logs to stdout so EB can capture them
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    return logger
```

To retrieve logs from your running environment, use the EB CLI.

```bash
# Fetch the last 100 lines of logs
eb logs --all

# Tail logs in real-time
eb logs --stream
```

For production monitoring, you'll want something more robust. Setting up [application monitoring with OneUptime](https://oneuptime.com/blog/post/set-up-aws-resilience-hub-for-application-resilience/view) gives you alerting, dashboards, and incident management beyond what CloudWatch alone provides.

## Using a Procfile for Custom Commands

If you need more control over how your application starts, use a `Procfile`.

```
# Procfile - Custom startup command
web: gunicorn --bind :8000 --workers 3 --threads 2 application:application
```

Gunicorn is the recommended WSGI server for production. The worker and thread counts depend on your instance type - a good starting point is `(2 * CPU cores) + 1` workers.

## Common Pitfalls

There are a few things that trip people up regularly:

**Port binding**: Don't hardcode a port. Elastic Beanstalk sets the `PORT` environment variable, and your app needs to listen on it (or let the reverse proxy handle it, which is the default behavior with Gunicorn).

**Large deployments**: If your deployment package exceeds 512 MB, you'll hit issues. Use `.ebignore` to exclude test files, documentation, and anything else that doesn't need to be on the server.

```
# .ebignore - Files to exclude from deployment
.git
__pycache__
*.pyc
tests/
docs/
.env
node_modules/
```

**Health checks**: Elastic Beanstalk pings your application's root URL to determine health. Make sure `/` returns a 200 status code, or configure a custom health check path.

```yaml
# .ebextensions/healthcheck.config
option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health
```

## Cleaning Up

When you're done testing, tear down the environment to avoid charges.

```bash
# Terminate the environment (keeps the application)
eb terminate production-env

# Delete everything including the application
eb terminate --all
```

## Wrapping Up

Elastic Beanstalk removes the tedious parts of deployment without taking away control. You still have SSH access to your instances, you can customize the Nginx configuration, and you can hook into any part of the deployment lifecycle.

For Python apps specifically, the combination of a proper `requirements.txt`, a well-structured `.ebextensions` directory, and a Procfile gives you everything you need. Start simple, then add complexity as your application demands it.

If you're looking to deploy containerized Python applications instead, take a look at our guide on [deploying Docker apps with Elastic Beanstalk](https://oneuptime.com/blog/post/deploy-docker-app-with-elastic-beanstalk/view) for a container-based approach.
