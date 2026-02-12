# How to Deploy a Flask App to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Flask, Python, Deployment, Elastic Beanstalk

Description: A complete guide to deploying Flask applications on AWS using Elastic Beanstalk, EC2, and containerized approaches with practical code examples.

---

Flask is one of the most popular Python web frameworks, and AWS offers several solid paths for getting your Flask app into production. Whether you're running a small API or a full-blown web application, there's an AWS service that fits your needs. In this post, we'll walk through the most common deployment strategies and give you everything you need to get your Flask app live.

## Prerequisites

Before you start, make sure you have:

- An AWS account with appropriate permissions
- Python 3.9+ installed locally
- The AWS CLI configured with your credentials
- A working Flask application

If you don't have a Flask app ready, here's a minimal one to work with.

This creates a basic Flask app with a health check endpoint and a hello route:

```python
# application.py
from flask import Flask, jsonify

application = Flask(__name__)

@application.route('/')
def home():
    return jsonify({"message": "Hello from Flask on AWS!"})

@application.route('/health')
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    application.run(debug=True, host='0.0.0.0', port=5000)
```

Note that we're using `application` as the variable name instead of `app`. This matters for Elastic Beanstalk, which expects that naming convention by default.

## Option 1: AWS Elastic Beanstalk

Elastic Beanstalk is the easiest way to deploy a Flask app on AWS. It handles provisioning, load balancing, scaling, and monitoring for you.

### Step 1: Set Up Your Project Structure

Your project should look something like this:

```
my-flask-app/
  application.py
  requirements.txt
  .ebextensions/
    python.config
```

Your requirements file lists all the Python dependencies:

```txt
# requirements.txt
flask==3.0.0
gunicorn==21.2.0
```

### Step 2: Configure Elastic Beanstalk

Create a configuration file that tells EB how to run your app:

```yaml
# .ebextensions/python.config
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: application:application
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: static
```

### Step 3: Initialize and Deploy

Install the EB CLI and deploy your application:

```bash
# Install the Elastic Beanstalk CLI
pip install awsebcli

# Initialize the EB application
eb init -p python-3.11 my-flask-app --region us-east-1

# Create an environment and deploy
eb create flask-production-env

# Open the app in your browser
eb open
```

That's it. Elastic Beanstalk will create an EC2 instance, set up a load balancer, and deploy your code. When you need to push updates, just run `eb deploy`.

### Scaling Configuration

If you expect traffic spikes, configure auto-scaling with an `.ebextensions` file:

```yaml
# .ebextensions/autoscaling.config
option_settings:
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 10
  aws:autoscaling:trigger:
    MeasureName: CPUUtilization
    Statistic: Average
    Unit: Percent
    UpperThreshold: 70
    LowerThreshold: 30
```

## Option 2: Docker on ECS

For more control over your deployment, containerizing your Flask app and running it on ECS (Elastic Container Service) is a great option.

First, create a Dockerfile:

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "application:application"]
```

Build and push your image to ECR (Elastic Container Registry):

```bash
# Create an ECR repository
aws ecr create-repository --repository-name my-flask-app --region us-east-1

# Get the login command and authenticate Docker
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build your Docker image
docker build -t my-flask-app .

# Tag the image for ECR
docker tag my-flask-app:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-flask-app:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-flask-app:latest
```

Then create an ECS task definition. This JSON defines how ECS should run your container:

```json
{
  "family": "flask-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "flask-app",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-flask-app:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/flask-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Option 3: AWS Lambda with Serverless

If your Flask app handles API requests and you want to minimize costs, running on Lambda is worth considering. You'll need the `serverless-wsgi` package.

Install the required packages:

```bash
pip install serverless-wsgi
npm install -g serverless
```

Create a serverless configuration file:

```yaml
# serverless.yml
service: flask-api

provider:
  name: aws
  runtime: python3.11
  region: us-east-1
  memorySize: 256
  timeout: 30

functions:
  app:
    handler: wsgi_handler.handler
    events:
      - httpApi: '*'

plugins:
  - serverless-wsgi
  - serverless-python-requirements

custom:
  wsgi:
    app: application.application
  pythonRequirements:
    dockerizePip: true
```

Deploy with a single command:

```bash
serverless deploy
```

## Production Best Practices

Regardless of which deployment method you choose, there are a few things you should always set up.

### Environment Variables

Never hardcode secrets. Use AWS Systems Manager Parameter Store or Secrets Manager:

```python
# config.py
import boto3
import os

def get_secret(key):
    if os.environ.get('FLASK_ENV') == 'development':
        return os.environ.get(key)

    ssm = boto3.client('ssm', region_name='us-east-1')
    response = ssm.get_parameter(Name=f'/flask-app/{key}', WithDecryption=True)
    return response['Parameter']['Value']

DATABASE_URL = get_secret('DATABASE_URL')
SECRET_KEY = get_secret('SECRET_KEY')
```

### Health Checks and Monitoring

Set up proper health checks and connect them to CloudWatch. If you're using OneUptime for monitoring, you can point external health checks at your `/health` endpoint to get alerted when things go wrong. Check out our guide on [setting up AWS monitoring](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) for more details.

### Logging

Configure structured logging so CloudWatch can parse your logs effectively:

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        return json.dumps(log_entry)

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
application.logger.addHandler(handler)
application.logger.setLevel(logging.INFO)
```

### Database Connectivity

If your Flask app uses a database, RDS is the natural choice on AWS. Here's how to configure SQLAlchemy to connect:

```python
# Using SQLAlchemy with RDS
from flask_sqlalchemy import SQLAlchemy

application.config['SQLALCHEMY_DATABASE_URI'] = (
    f"postgresql://{get_secret('DB_USER')}:{get_secret('DB_PASS')}"
    f"@{get_secret('DB_HOST')}:5432/{get_secret('DB_NAME')}"
)
application.config['SQLALCHEMY_POOL_SIZE'] = 10
application.config['SQLALCHEMY_POOL_RECYCLE'] = 3600

db = SQLAlchemy(application)
```

## Which Approach Should You Pick?

It depends on your situation. Elastic Beanstalk is perfect if you want to get deployed fast without thinking about infrastructure. ECS gives you more control and works well if you're already using containers. Lambda makes sense for lightweight APIs where you want to pay only for what you use.

For most teams starting out, I'd recommend Elastic Beanstalk. You can always migrate to ECS later as your needs grow. The important thing is getting your app in front of users quickly and iterating from there.

Whatever path you choose, don't skip monitoring. AWS CloudWatch gives you basic metrics out of the box, but pairing it with a tool like [OneUptime](https://oneuptime.com/blog/post/aws-monitoring-tools-comparison/view) will give you much better visibility into what's actually happening in production.
