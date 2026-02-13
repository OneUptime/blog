# How to Deploy a Node.js App with Elastic Beanstalk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Node.js, Deployment

Description: Deploy a Node.js web application to AWS Elastic Beanstalk with step-by-step instructions covering project setup, configuration, database connection, and CI/CD.

---

Deploying a Node.js application to Elastic Beanstalk is one of the fastest ways to get a production-ready setup on AWS. You get load balancing, auto-scaling, health monitoring, and zero-downtime deployments out of the box. Let's walk through the entire process from a fresh Node.js project to a running production deployment.

## Project Setup

Start with a standard Express application. Here's the project structure.

```
my-node-app/
  .ebextensions/
    01-nodecommand.config
  .platform/
    nginx/
      conf.d/
        proxy.conf
  server.js
  package.json
  .ebignore
  Procfile
```

Create the application file.

```javascript
// server.js - Production-ready Express application
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Trust the load balancer proxy
app.set('trust proxy', 1);

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'My Node.js App',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: process.memoryUsage(),
  });
});

// Example API endpoint
app.get('/api/users', async (req, res) => {
  try {
    // Your business logic here
    res.json({ users: [], count: 0 });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
```

And the package.json.

```json
{
  "name": "my-node-app",
  "version": "1.0.0",
  "description": "Node.js app deployed on Elastic Beanstalk",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "migrate": "node scripts/migrate.js"
  },
  "dependencies": {
    "compression": "^1.7.4",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.0"
  },
  "engines": {
    "node": "18.x"
  }
}
```

## The Procfile

The Procfile tells Beanstalk how to start your application.

```
web: node server.js
```

## Configuration Files

Create `.ebextensions` for Beanstalk-specific configuration.

```yaml
# .ebextensions/01-nodecommand.config
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
```

## Custom Nginx Configuration

Beanstalk uses Nginx as a reverse proxy. Customize it for better performance.

```nginx
# .platform/nginx/conf.d/proxy.conf
client_max_body_size 20M;

proxy_buffers 8 16k;
proxy_buffer_size 32k;

# Increase timeouts for slow API calls
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# Gzip compression
gzip on;
gzip_comp_level 4;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

## The .ebignore File

Like .gitignore but for Beanstalk deployments. Exclude files that shouldn't be uploaded.

```
# .ebignore
node_modules/
.git/
.env
.env.local
*.test.js
__tests__/
coverage/
.vscode/
.idea/
*.md
```

## Initializing and Deploying

Now let's deploy. Install the EB CLI if you haven't already, then initialize and create the environment.

```bash
# Initialize the Beanstalk project
cd /path/to/my-node-app
eb init --platform "Node.js 18" --region us-east-1 my-node-app

# Create a production environment
eb create production \
  --instance-type t3.small \
  --min-instances 2 \
  --max-instances 6 \
  --elb-type application \
  --envvars NODE_ENV=production,APP_VERSION=1.0.0

# Wait for the environment to be ready (this takes a few minutes)
eb status
```

## Connecting to a Database

Most Node.js apps need a database. You can have Beanstalk create an RDS instance for you, or connect to an existing one.

To create an RDS instance with the environment (good for development):

```bash
# Add RDS to the Beanstalk environment
aws elasticbeanstalk update-environment \
  --environment-name production \
  --option-settings '[
    {
      "Namespace": "aws:rds:dbinstance",
      "OptionName": "DBEngine",
      "Value": "postgres"
    },
    {
      "Namespace": "aws:rds:dbinstance",
      "OptionName": "DBInstanceClass",
      "Value": "db.t3.micro"
    },
    {
      "Namespace": "aws:rds:dbinstance",
      "OptionName": "DBAllocatedStorage",
      "Value": "20"
    },
    {
      "Namespace": "aws:rds:dbinstance",
      "OptionName": "DBPassword",
      "Value": "YourStr0ngP@ssword!"
    }
  ]'
```

Beanstalk exposes database connection details as environment variables. Use them in your app.

```javascript
// database.js - Connect to the RDS instance Beanstalk created
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.RDS_HOSTNAME,
  port: process.env.RDS_PORT || 5432,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

module.exports = pool;
```

For production, it's better to create the RDS instance separately so it doesn't get deleted if you terminate the Beanstalk environment. In that case, just pass the connection details as environment variables.

```bash
# Set database environment variables
eb setenv \
  DB_HOST=my-production-db.abc123.us-east-1.rds.amazonaws.com \
  DB_PORT=5432 \
  DB_USER=appuser \
  DB_PASSWORD=secretpassword \
  DB_NAME=myapp
```

## Setting Up HTTPS

Get an SSL certificate from ACM and configure it on the load balancer.

```bash
# Request a certificate (if you don't have one)
aws acm request-certificate \
  --domain-name app.example.com \
  --validation-method DNS \
  --region us-east-1

# Configure HTTPS on the environment
eb config production
```

This opens an editor. Add the HTTPS listener configuration. Or use the CLI.

```bash
# Add HTTPS listener to the ALB
aws elasticbeanstalk update-environment \
  --environment-name production \
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
      "Value": "arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id"
    }
  ]'
```

## Deployment Strategies

Configure rolling deployments for zero-downtime updates.

```yaml
# .ebextensions/02-deployment.config
option_settings:
  aws:elasticbeanstalk:command:
    DeploymentPolicy: RollingWithAdditionalBatch
    BatchSizeType: Percentage
    BatchSize: 50
  aws:autoscaling:updatepolicy:rollingupdate:
    RollingUpdateEnabled: true
    MaxBatchSize: 1
    MinInstancesInService: 1
```

Deploy updates.

```bash
# Deploy the current code
eb deploy production

# Deploy a specific version
eb deploy production --version v1.1.0

# Watch the deployment progress
eb events -f
```

## Setting Up CI/CD

Automate deployments with GitHub Actions.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Elastic Beanstalk
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Create deployment package
        run: zip -r deploy.zip . -x "*.git*" "node_modules/*" "*.test.js" "__tests__/*"

      - name: Deploy to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v22
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: my-node-app
          environment_name: production
          version_label: ${{ github.sha }}
          region: us-east-1
          deployment_package: deploy.zip
```

## Monitoring and Debugging

Keep an eye on your deployment.

```bash
# View environment health
eb health

# Stream logs in real-time
eb logs --stream

# SSH into an instance for debugging
eb ssh

# Open the application in the browser
eb open
```

## Common Issues and Fixes

If your deployment fails, check these common problems.

```bash
# View recent events for error messages
eb events --follow

# Get full logs for debugging
eb logs --all

# Check the environment's health status
eb health --refresh
```

**Port mismatch**: Make sure your app listens on `process.env.PORT`, which Beanstalk sets to 8080 by default.

**npm install failures**: Check that your `package.json` has the correct `engines` field and all dependencies are listed.

**Memory issues**: If your app crashes with OOM errors, upgrade the instance type or optimize your code.

## Troubleshooting Checklist

1. App won't start? Check it listens on `process.env.PORT` (default 8080)
2. Deployment fails? Look at `eb events` for specific error messages
3. Health check failing? Verify your `/health` endpoint returns 200
4. npm install fails? Check `engines` field in package.json
5. Environment degraded? Check `eb logs` for application errors
6. Slow deployments? Switch to rolling deployment with additional batch

Elastic Beanstalk takes the infrastructure work out of deploying Node.js apps. Once your pipeline is set up, deployments are a simple `git push`. For the broader Beanstalk setup, see our guide on [setting up Elastic Beanstalk for web applications](https://oneuptime.com/blog/post/2026-02-12-setup-elastic-beanstalk-web-application-deployment/view).
