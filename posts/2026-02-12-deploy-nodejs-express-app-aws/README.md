# How to Deploy a Node.js Express App to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Node.js, Express, Deployment

Description: A complete guide to deploying a Node.js Express application to AWS, covering EC2, Elastic Beanstalk, ECS with Fargate, and Lambda with API Gateway deployment options.

---

There are multiple ways to deploy an Express app to AWS, and the right choice depends on your needs. EC2 gives you full control, Elastic Beanstalk handles infrastructure for you, ECS/Fargate runs containers, and Lambda lets you go serverless. Let's walk through each option with practical steps.

## Preparing Your Express App

Before deploying anywhere, make sure your app is production-ready.

Your app should listen on a configurable port and have a health check endpoint.

```javascript
// app.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint (required by most AWS services)
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'Hello from Express on AWS' });
});

app.get('/api/users', (req, res) => {
    res.json([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
    ]);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
```

Make sure your `package.json` has the right start script.

```json
{
  "name": "express-aws-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node app.js",
    "dev": "node --watch app.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

## Option 1: Deploy to EC2

EC2 gives you a virtual server where you have complete control. It's the most hands-on option.

### Launch and Configure EC2

First, launch an EC2 instance with Amazon Linux 2023 and SSH into it.

```bash
# SSH into your EC2 instance
ssh -i my-key.pem ec2-user@your-ec2-public-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

### Deploy Your Code

```bash
# On the EC2 instance
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Option A: Clone from git
git clone https://github.com/your-org/your-app.git .
npm install --production

# Option B: Upload with SCP (from your local machine)
# scp -i my-key.pem -r ./app/* ec2-user@your-ec2-ip:/home/ec2-user/app/
```

### Run with PM2 (Process Manager)

PM2 keeps your app running and restarts it if it crashes.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the app
cd /home/ec2-user/app
PORT=3000 pm2 start app.js --name "express-app"

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Useful PM2 commands
pm2 status        # check status
pm2 logs          # view logs
pm2 restart all   # restart
pm2 monit         # monitor resources
```

### Set Up Nginx as Reverse Proxy

Nginx handles SSL, static files, and proxies requests to your Express app.

```bash
sudo yum install -y nginx

sudo tee /etc/nginx/conf.d/express.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo systemctl start nginx
sudo systemctl enable nginx
```

## Option 2: Deploy to Elastic Beanstalk

Elastic Beanstalk handles provisioning, load balancing, scaling, and monitoring for you.

### Install the EB CLI and Deploy

```bash
# Install EB CLI
pip install awsebcli

# Initialize in your project directory
cd your-express-app
eb init

# Select your region, platform (Node.js), and options
# Then create an environment
eb create express-production

# Deploy updates
eb deploy

# Open in browser
eb open

# Check logs
eb logs

# SSH into the instance
eb ssh
```

### Elastic Beanstalk Configuration

Create a `.ebextensions` directory for custom configuration.

```yaml
# .ebextensions/nodecommand.config
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
```

Add a `Procfile` to specify how to start your app.

```
# Procfile
web: npm start
```

## Option 3: Deploy with ECS and Fargate

Fargate runs your Docker containers without managing servers.

### Create a Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "app.js"]
```

### Build and Push to ECR

```bash
# Create an ECR repository
aws ecr create-repository --repository-name express-app

# Get the login command
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t express-app .
docker tag express-app:latest \
    123456789012.dkr.ecr.us-east-1.amazonaws.com/express-app:latest

# Push to ECR
docker push \
    123456789012.dkr.ecr.us-east-1.amazonaws.com/express-app:latest
```

### Create ECS Task Definition

```json
{
  "family": "express-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "express-app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/express-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/express-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

```bash
# Register the task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create a cluster
aws ecs create-cluster --cluster-name express-cluster

# Create a service
aws ecs create-service \
    --cluster express-cluster \
    --service-name express-service \
    --task-definition express-app \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration \
    "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Option 4: Deploy as Lambda with API Gateway

For serverless Express, use the `serverless-http` adapter.

```bash
npm install serverless-http
```

Wrap your Express app for Lambda.

```javascript
// lambda.js
import serverless from 'serverless-http';
import app from './app.js';

export const handler = serverless(app);
```

Create a SAM template for deployment.

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    MemorySize: 256

Resources:
  ExpressFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda.handler
      Events:
        ProxyApi:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
        RootApi:
          Type: HttpApi
          Properties:
            Path: /
            Method: ANY

Outputs:
  ApiUrl:
    Value: !Sub "https://${ServerlessHttpApi}.execute-api.${AWS::Region}.amazonaws.com"
```

Deploy with SAM CLI.

```bash
sam build
sam deploy --guided
```

## Which Option Should You Choose?

| Factor | EC2 | Elastic Beanstalk | ECS/Fargate | Lambda |
|--------|-----|-------------------|-------------|--------|
| Control | Full | Medium | High | Low |
| Maintenance | High | Low | Medium | None |
| Scaling | Manual | Automatic | Automatic | Automatic |
| Cost (low traffic) | $$$ | $$ | $$ | $ |
| Cost (high traffic) | $$ | $$ | $$ | $$$ |
| Cold starts | None | None | None | Yes |
| WebSockets | Yes | Yes | Yes | Limited |

## Best Practices for All Options

- **Always include a health check endpoint.** Every AWS service uses health checks to manage your application.
- **Use environment variables** for configuration. Never hardcode secrets, database URLs, or API keys.
- **Set up logging properly.** Use CloudWatch for centralized log management.
- **Enable HTTPS.** Use ACM (AWS Certificate Manager) for free SSL certificates with ALB or CloudFront.
- **Monitor your application.** Set up CloudWatch alarms for error rates, latency, and resource utilization.

For monitoring your deployed Express app, having proper observability in place is critical. Check out the OneUptime blog for more on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-12-manage-ec2-instances-boto3/view). And if you're deploying a Django app instead, see the [Django deployment guide](https://oneuptime.com/blog/post/2026-02-12-deploy-django-app-aws/view).
