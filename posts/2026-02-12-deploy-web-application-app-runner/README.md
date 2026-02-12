# How to Deploy a Web Application with App Runner

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, App Runner, Web Development, Containers, Deployment

Description: A hands-on tutorial for deploying a complete web application to AWS App Runner, covering image builds, configuration, custom domains, and production best practices.

---

Deploying a web application shouldn't take all day. With AWS App Runner, you can go from a container image to a production-ready URL with HTTPS, auto-scaling, and rolling deployments in about 10 minutes. This tutorial walks through a complete deployment from start to finish.

We'll deploy a Node.js web application, but the steps work the same for any language or framework that runs in a container.

## Preparing Your Application

Your application needs two things to work with App Runner: it should listen on a configurable port, and it should have a health check endpoint.

Here's a minimal Express.js application:

```javascript
// server.js
const express = require('express');
const app = express();

// Use the PORT env variable (App Runner sets this)
const port = process.env.PORT || 8080;

// Health check endpoint for App Runner
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Your application routes
app.get('/', (req, res) => {
  res.send('Hello from App Runner!');
});

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Your API is working',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

And a Dockerfile to containerize it:

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# App Runner will set the PORT env variable
EXPOSE 8080

# Use a non-root user for security
USER node

CMD ["node", "server.js"]
```

## Building and Pushing to ECR

App Runner pulls images from ECR (or builds from source code). Let's push our image to ECR:

```bash
# Create an ECR repository
aws ecr create-repository \
  --repository-name my-webapp \
  --image-scanning-configuration scanOnPush=true

# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build the image
docker build -t my-webapp:v1.0.0 .

# Tag for ECR
docker tag my-webapp:v1.0.0 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-webapp:v1.0.0
docker tag my-webapp:v1.0.0 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-webapp:latest

# Push both tags
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-webapp:v1.0.0
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-webapp:latest
```

## Setting Up the IAM Access Role

App Runner needs an IAM role to pull images from ECR:

```bash
# Create the trust policy
cat > trust-policy.json << 'TRUSTEOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
TRUSTEOF

# Create the role
aws iam create-role \
  --role-name AppRunnerECRAccess \
  --assume-role-policy-document file://trust-policy.json

# Attach the ECR read policy
aws iam attach-role-policy \
  --role-name AppRunnerECRAccess \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

If your application needs to access other AWS services (S3, DynamoDB, SQS), create a separate instance role:

```bash
# Create an instance role for the application
cat > instance-trust-policy.json << 'INSTANCEEOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "tasks.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
INSTANCEEOF

aws iam create-role \
  --role-name AppRunnerInstanceRole \
  --assume-role-policy-document file://instance-trust-policy.json

# Add permissions your app needs
aws iam put-role-policy \
  --role-name AppRunnerInstanceRole \
  --policy-name S3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject"],
        "Resource": "arn:aws:s3:::my-webapp-assets/*"
      }
    ]
  }'
```

## Creating the App Runner Service

Now let's create the service with all the production settings:

```bash
# Create the auto-scaling configuration
aws apprunner create-auto-scaling-configuration \
  --auto-scaling-configuration-name webapp-scaling \
  --max-concurrency 80 \
  --min-size 2 \
  --max-size 10

# Create the App Runner service
aws apprunner create-service \
  --service-name my-webapp \
  --source-configuration '{
    "imageRepository": {
      "imageIdentifier": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-webapp:latest",
      "imageConfiguration": {
        "port": "8080",
        "runtimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "LOG_LEVEL": "info"
        },
        "runtimeEnvironmentSecrets": {
          "DATABASE_URL": "arn:aws:secretsmanager:us-east-1:123456789012:secret:webapp/db-url",
          "SESSION_SECRET": "arn:aws:ssm:us-east-1:123456789012:parameter/webapp/session-secret"
        },
        "startCommand": "node server.js"
      },
      "imageRepositoryType": "ECR"
    },
    "autoDeploymentsEnabled": true,
    "authenticationConfiguration": {
      "accessRoleArn": "arn:aws:iam::123456789012:role/AppRunnerECRAccess"
    }
  }' \
  --instance-configuration '{
    "cpu": "1024",
    "memory": "2048",
    "instanceRoleArn": "arn:aws:iam::123456789012:role/AppRunnerInstanceRole"
  }' \
  --health-check-configuration '{
    "protocol": "HTTP",
    "path": "/health",
    "interval": 10,
    "timeout": 5,
    "healthyThreshold": 1,
    "unhealthyThreshold": 5
  }' \
  --auto-scaling-configuration-arn "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/webapp-scaling/1/abc123"
```

Wait for the service to be created:

```bash
# Check the service status
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/my-webapp/abc123 \
  --query "Service.{status:Status, url:ServiceUrl}"
```

Once the status is `RUNNING`, your application is live at the `ServiceUrl`.

## Adding a Custom Domain

The auto-generated URL works, but you'll want a custom domain for production:

```bash
# Associate your custom domain
aws apprunner associate-custom-domain \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/my-webapp/abc123 \
  --domain-name app.mycompany.com

# Check the DNS validation records you need to add
aws apprunner describe-custom-domains \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/my-webapp/abc123 \
  --query "CustomDomains[*].{domain:DomainName, status:Status, records:CertificateValidationRecords}"
```

Add the CNAME records to your DNS provider, and App Runner will validate the domain and provision an SSL certificate. This usually takes 10-30 minutes.

## Connecting to a Database

Most web applications need a database. If your RDS instance is in a VPC, you need a VPC connector:

```bash
# Create a VPC connector for database access
aws apprunner create-vpc-connector \
  --vpc-connector-name webapp-vpc \
  --subnets subnet-abc123 subnet-def456 \
  --security-groups sg-db-access

# Update the service to use the VPC connector
aws apprunner update-service \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/my-webapp/abc123 \
  --network-configuration '{
    "egressConfiguration": {
      "egressType": "VPC",
      "vpcConnectorArn": "arn:aws:apprunner:us-east-1:123456789012:vpcconnector/webapp-vpc/1/abc123"
    }
  }'
```

Make sure the VPC connector's security group is allowed to connect to your database's security group on the database port.

## Setting Up a CI/CD Pipeline

With auto-deployments enabled, your pipeline just needs to build and push. Here's a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to App Runner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        env:
          REGISTRY: ${{ steps.ecr-login.outputs.registry }}
          REPOSITORY: my-webapp
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $REGISTRY/$REPOSITORY:$IMAGE_TAG .
          docker tag $REGISTRY/$REPOSITORY:$IMAGE_TAG $REGISTRY/$REPOSITORY:latest
          docker push $REGISTRY/$REPOSITORY:$IMAGE_TAG
          docker push $REGISTRY/$REPOSITORY:latest
```

When the `latest` tag is updated in ECR, App Runner automatically starts a new deployment. The whole process from push to live takes about 3-5 minutes.

## Monitoring and Observability

App Runner provides basic monitoring through CloudWatch:

```bash
# View request metrics
aws cloudwatch get-metric-statistics \
  --namespace "AWS/AppRunner" \
  --metric-name "2xxStatusResponses" \
  --dimensions Name=ServiceName,Value=my-webapp \
  --start-time "$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 300 \
  --statistics Sum
```

Available metrics include:
- `2xxStatusResponses`, `4xxStatusResponses`, `5xxStatusResponses`
- `RequestLatency`
- `ActiveInstances`
- `RequestCount`

For application logs, App Runner streams stdout/stderr to CloudWatch Logs automatically. You'll find them in the `/aws/apprunner/{service-name}/{service-id}/application` log group.

## Production Checklist

Before going live, verify:

- [ ] Health check endpoint is fast and reliable
- [ ] Environment variables and secrets are configured
- [ ] Auto-scaling limits are appropriate (min for availability, max for cost)
- [ ] Custom domain is set up with SSL
- [ ] VPC connector is configured if accessing private resources
- [ ] Instance role has the minimum required permissions
- [ ] CI/CD pipeline is tested end-to-end
- [ ] CloudWatch alarms are set for error rates and latency
- [ ] Application logs are flowing to CloudWatch

## Wrapping Up

App Runner makes deploying web applications remarkably simple. Push your container, configure the basics, and you've got a production-ready service. The auto-scaling handles traffic spikes, rolling deployments prevent downtime, and automatic TLS keeps things secure.

For more deployment options, check out our guide on [setting up App Runner with GitHub](https://oneuptime.com/blog/post/app-runner-with-github/view) for source-based deployments, or [App Runner with ECR](https://oneuptime.com/blog/post/app-runner-with-ecr/view) for more ECR-specific workflows.
