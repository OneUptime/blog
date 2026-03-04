# How to Set Up Elastic Beanstalk for Web Application Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Deployment, Web Applications

Description: Get started with AWS Elastic Beanstalk for deploying and managing web applications, covering environment creation, configuration, scaling, and monitoring.

---

AWS Elastic Beanstalk is a Platform-as-a-Service that handles the deployment infrastructure for you. You upload your code, and Beanstalk provisions EC2 instances, load balancers, auto-scaling groups, and more. You still have full control over the underlying resources if you need it, but you don't have to configure them manually.

## What Beanstalk Manages

When you create a Beanstalk environment, it sets up:
- EC2 instances running your application
- An Elastic Load Balancer for traffic distribution
- Auto Scaling group for handling load changes
- CloudWatch monitoring and alarms
- Security groups and networking
- Log management

You only pay for the underlying resources, not for Beanstalk itself.

## Supported Platforms

Beanstalk supports a wide range of platforms:
- Node.js
- Python
- Ruby
- Java (with Tomcat or without)
- .NET on Linux or Windows
- PHP
- Go
- Docker (single and multi-container)

## Installing the EB CLI

The EB CLI makes working with Beanstalk much easier than using the regular AWS CLI.

```bash
# Install the EB CLI via pip
pip3 install awsebcli

# Verify the installation
eb --version
```

## Creating Your First Application

Let's start with creating a Beanstalk application and environment. An application is a logical container, and environments are where your code actually runs (like staging, production).

```bash
# Create the application
aws elasticbeanstalk create-application \
  --application-name my-web-app \
  --description "My web application" \
  --tags Key=Team,Value=engineering

# List available solution stacks (platforms)
aws elasticbeanstalk list-available-solution-stacks \
  --query 'SolutionStacks[?contains(@, `Node.js`)]' \
  --output table
```

## Creating an Environment

Create a web server environment with a load balancer.

```bash
# Create a load-balanced environment
aws elasticbeanstalk create-environment \
  --application-name my-web-app \
  --environment-name my-web-app-prod \
  --solution-stack-name "64bit Amazon Linux 2023 v6.1.0 running Node.js 18" \
  --option-settings '[
    {
      "Namespace": "aws:autoscaling:asg",
      "OptionName": "MinSize",
      "Value": "2"
    },
    {
      "Namespace": "aws:autoscaling:asg",
      "OptionName": "MaxSize",
      "Value": "6"
    },
    {
      "Namespace": "aws:ec2:instances",
      "OptionName": "InstanceTypes",
      "Value": "t3.small,t3.medium"
    },
    {
      "Namespace": "aws:elasticbeanstalk:environment",
      "OptionName": "EnvironmentType",
      "Value": "LoadBalanced"
    },
    {
      "Namespace": "aws:elasticbeanstalk:environment",
      "OptionName": "LoadBalancerType",
      "Value": "application"
    }
  ]'
```

## Using the EB CLI (Easier Approach)

The EB CLI simplifies the workflow significantly.

```bash
# Initialize Beanstalk in your project directory
cd /path/to/your/app
eb init

# This walks you through:
# 1. Select region
# 2. Create or select application
# 3. Select platform
# 4. Set up SSH key pair

# Create an environment
eb create production \
  --instance-type t3.small \
  --min-instances 2 \
  --max-instances 6 \
  --elb-type application
```

## Preparing Your Application

Beanstalk expects your application to follow certain conventions. For Node.js, you need a `package.json` with a start script.

```json
{
  "name": "my-web-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

And your server should listen on the port from the `PORT` environment variable.

```javascript
// server.js - Express app configured for Beanstalk
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Elastic Beanstalk!',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || 'unknown'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Deploying Your Application

Package and deploy your code.

```bash
# Using the EB CLI (from your project directory)
eb deploy

# Or using the AWS CLI - create an application version
aws elasticbeanstalk create-application-version \
  --application-name my-web-app \
  --version-label v1.0.0 \
  --source-bundle S3Bucket=my-deploy-bucket,S3Key=releases/my-web-app-v1.0.0.zip

# Then update the environment to use it
aws elasticbeanstalk update-environment \
  --environment-name my-web-app-prod \
  --version-label v1.0.0
```

## Configuring Environment Variables

Set environment variables for your application.

```bash
# Set environment variables
aws elasticbeanstalk update-environment \
  --environment-name my-web-app-prod \
  --option-settings '[
    {
      "Namespace": "aws:elasticbeanstalk:application:environment",
      "OptionName": "NODE_ENV",
      "Value": "production"
    },
    {
      "Namespace": "aws:elasticbeanstalk:application:environment",
      "OptionName": "DB_HOST",
      "Value": "my-db.abc123.us-east-1.rds.amazonaws.com"
    },
    {
      "Namespace": "aws:elasticbeanstalk:application:environment",
      "OptionName": "DB_NAME",
      "Value": "myapp"
    }
  ]'

# Or with the EB CLI
eb setenv NODE_ENV=production DB_HOST=my-db.abc123.us-east-1.rds.amazonaws.com
```

## Configuring Auto Scaling

Set up scaling policies so your environment handles traffic spikes automatically.

```bash
# Configure scaling based on CPU utilization
aws elasticbeanstalk update-environment \
  --environment-name my-web-app-prod \
  --option-settings '[
    {
      "Namespace": "aws:autoscaling:trigger",
      "OptionName": "MeasureName",
      "Value": "CPUUtilization"
    },
    {
      "Namespace": "aws:autoscaling:trigger",
      "OptionName": "Statistic",
      "Value": "Average"
    },
    {
      "Namespace": "aws:autoscaling:trigger",
      "OptionName": "UpperThreshold",
      "Value": "70"
    },
    {
      "Namespace": "aws:autoscaling:trigger",
      "OptionName": "LowerThreshold",
      "Value": "30"
    },
    {
      "Namespace": "aws:autoscaling:trigger",
      "OptionName": "UpperBreachScaleIncrement",
      "Value": "2"
    },
    {
      "Namespace": "aws:autoscaling:trigger",
      "OptionName": "LowerBreachScaleIncrement",
      "Value": "-1"
    }
  ]'
```

## Using .ebextensions for Custom Configuration

Create a `.ebextensions` directory in your project root with YAML config files. These run during deployment.

```yaml
# .ebextensions/01-packages.config
packages:
  yum:
    git: []
    ImageMagick: []

commands:
  01_install_global_deps:
    command: "npm install -g pm2"

container_commands:
  01_run_migrations:
    command: "npm run migrate"
    leader_only: true
  02_seed_data:
    command: "npm run seed"
    leader_only: true
```

The `leader_only` flag ensures the command runs on only one instance, which is important for database migrations.

## Setting Up HTTPS

Configure HTTPS on the load balancer with an ACM certificate.

```bash
# Configure HTTPS on the Application Load Balancer
aws elasticbeanstalk update-environment \
  --environment-name my-web-app-prod \
  --option-settings '[
    {
      "Namespace": "aws:elbv2:listener:443",
      "OptionName": "ListenerEnabled",
      "Value": "true"
    },
    {
      "Namespace": "aws:elbv2:listener:443",
      "OptionName": "Protocol",
      "Value": "HTTPS"
    },
    {
      "Namespace": "aws:elbv2:listener:443",
      "OptionName": "SSLCertificateArns",
      "Value": "arn:aws:acm:us-east-1:123456789012:certificate/abc123"
    }
  ]'
```

## Monitoring and Logs

Check environment health and logs.

```bash
# Get environment health
aws elasticbeanstalk describe-environment-health \
  --environment-name my-web-app-prod \
  --attribute-names All

# Request logs
aws elasticbeanstalk request-environment-info \
  --environment-name my-web-app-prod \
  --info-type tail

# Retrieve logs (wait a few seconds after requesting)
aws elasticbeanstalk retrieve-environment-info \
  --environment-name my-web-app-prod \
  --info-type tail

# Or with the EB CLI (much easier)
eb health
eb logs
```

## Deployment Strategies

Beanstalk supports several deployment strategies.

```bash
# Configure rolling deployment (updates instances in batches)
aws elasticbeanstalk update-environment \
  --environment-name my-web-app-prod \
  --option-settings '[
    {
      "Namespace": "aws:elasticbeanstalk:command",
      "OptionName": "DeploymentPolicy",
      "Value": "Rolling"
    },
    {
      "Namespace": "aws:elasticbeanstalk:command",
      "OptionName": "BatchSizeType",
      "Value": "Percentage"
    },
    {
      "Namespace": "aws:elasticbeanstalk:command",
      "OptionName": "BatchSize",
      "Value": "25"
    }
  ]'
```

Deployment options:
- **All at once**: Fastest, causes brief downtime
- **Rolling**: Updates in batches, reduced capacity during deployment
- **Rolling with additional batch**: Launches new instances first, maintains full capacity
- **Immutable**: Launches a full new set, swaps when healthy
- **Blue/Green**: Uses separate environments with DNS swap

## Troubleshooting Checklist

1. Environment stuck in "Updating"? Check the events with `eb events` or the console
2. Health is "Severe"? Check application logs for startup errors
3. Deployment failed? Check `.ebextensions` for errors and verify your app starts locally
4. 502 errors? Your app probably isn't running - check it listens on the right port
5. High latency? Check auto-scaling settings and instance types

Elastic Beanstalk gives you production-ready infrastructure without the configuration burden. For a hands-on deployment example, see our guide on [deploying a Node.js app with Elastic Beanstalk](https://oneuptime.com/blog/post/2026-02-12-deploy-nodejs-app-elastic-beanstalk/view).
