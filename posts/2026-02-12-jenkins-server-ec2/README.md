# How to Set Up a Jenkins Server on EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Jenkins, CI/CD, DevOps

Description: Complete guide to setting up a Jenkins CI/CD server on EC2 with proper security, plugins, pipeline configuration, and production-ready hardening.

---

Jenkins remains one of the most popular CI/CD tools, and running it on EC2 gives you full control over your build environment. Unlike managed CI/CD services, a self-hosted Jenkins server lets you customize everything - from build agents to plugins to security configurations.

Let's set up a production-ready Jenkins server on EC2 from scratch.

## Sizing Your Jenkins Instance

Jenkins is memory-hungry, especially when running multiple builds simultaneously. The controller (master) needs enough resources to manage jobs, serve the web UI, and coordinate agents.

Recommended instance sizes:

| Team Size | Instance Type | Specs | Monthly Cost |
|-----------|-------------|-------|-------------|
| Small (1-5 devs) | t3.medium | 2 vCPU, 4 GB RAM | ~$30 |
| Medium (5-20 devs) | t3.xlarge | 4 vCPU, 16 GB RAM | ~$121 |
| Large (20+ devs) | m5.2xlarge | 8 vCPU, 32 GB RAM | ~$280 |

Use at least a 50 GB gp3 EBS volume for the Jenkins home directory. Build artifacts and workspace files add up fast.

## Installing Jenkins

SSH into your instance and install Jenkins with Java.

Install Java and Jenkins on Amazon Linux 2023:

```bash
# Install Java 17
sudo yum install -y java-17-amazon-corretto-devel

# Verify Java installation
java -version

# Add the Jenkins repo
sudo wget -O /etc/yum.repos.d/jenkins.repo \
  https://pkg.jenkins.io/redhat-stable/jenkins.repo

# Import the Jenkins GPG key
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Jenkins
sudo yum install -y jenkins

# Start and enable Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Check status
sudo systemctl status jenkins
```

Jenkins runs on port 8080 by default. Make sure your security group allows access:

```bash
# Allow port 8080 for Jenkins web UI
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 8080 --cidr 0.0.0.0/0
```

## Initial Setup

Get the initial admin password and complete the setup wizard.

Retrieve the initial password:

```bash
# Get the initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Open `http://YOUR_INSTANCE_IP:8080` in your browser, enter the password, and follow the setup wizard. Choose "Install suggested plugins" for a good starting set.

Create your first admin user when prompted - don't keep using the initial admin password.

## Putting Jenkins Behind Nginx

Running Jenkins directly on port 8080 without HTTPS isn't suitable for production. Set up Nginx as a reverse proxy with SSL.

Install and configure Nginx for Jenkins:

```bash
# Install Nginx
sudo yum install -y nginx

# Create Jenkins proxy configuration
sudo cat > /etc/nginx/conf.d/jenkins.conf << 'EOF'
upstream jenkins {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name jenkins.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jenkins.example.com;

    ssl_certificate /etc/letsencrypt/live/jenkins.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jenkins.example.com/privkey.pem;

    # Required for Jenkins websocket agents
    location / {
        proxy_pass http://jenkins;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # Large file uploads for artifact storage
        client_max_body_size 100M;
        proxy_request_buffering off;
    }
}
EOF

# Install Certbot and get SSL certificate
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jenkins.example.com

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Update Jenkins to know about the proxy. Edit `/etc/sysconfig/jenkins` (or the systemd override):

```bash
# Tell Jenkins it's behind a reverse proxy
sudo mkdir -p /etc/systemd/system/jenkins.service.d
sudo cat > /etc/systemd/system/jenkins.service.d/override.conf << 'EOF'
[Service]
Environment="JENKINS_OPTS=--httpListenAddress=127.0.0.1"
EOF

sudo systemctl daemon-reload
sudo systemctl restart jenkins
```

## Essential Plugins

Install these plugins for a solid CI/CD foundation. Go to Manage Jenkins > Plugins > Available:

- **Pipeline** - Declarative and scripted pipeline support
- **Git** - Git SCM integration
- **GitHub Branch Source** - GitHub integration
- **Blue Ocean** - Modern pipeline visualization
- **Docker Pipeline** - Build and use Docker containers in pipelines
- **Credentials Binding** - Securely use credentials in builds
- **Slack Notification** - Send build notifications to Slack
- **AWS Steps** - AWS SDK integration for pipelines

You can also install plugins from the CLI:

```bash
# Install plugins via Jenkins CLI
java -jar /var/lib/jenkins/jenkins-cli.jar -s http://localhost:8080/ \
  install-plugin pipeline-stage-view docker-workflow git \
  -deploy -restart
```

## Creating Your First Pipeline

Jenkins Pipelines as Code (Jenkinsfile) is the modern way to define CI/CD workflows.

Create a Jenkinsfile in your project repository:

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        APP_NAME = 'my-application'
        DOCKER_REGISTRY = '123456789012.dkr.ecr.us-east-1.amazonaws.com'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
            post {
                always {
                    junit 'test-results/*.xml'
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    docker.build("${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}")
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh '''
                    aws ecr get-login-password --region us-east-1 | \
                    docker login --username AWS --password-stdin ${DOCKER_REGISTRY}
                    docker push ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        failure {
            slackSend channel: '#builds',
                      color: 'danger',
                      message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        success {
            slackSend channel: '#builds',
                      color: 'good',
                      message: "Build successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
```

## Docker for Build Isolation

Install Docker on the Jenkins server so pipelines can use Docker containers for build isolation.

Set up Docker for Jenkins:

```bash
# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Add the jenkins user to the docker group
sudo usermod -aG docker jenkins

# Restart Jenkins to pick up the group change
sudo systemctl restart jenkins
```

## Backup Strategy

Jenkins stores all its configuration, jobs, and build history in the Jenkins home directory. Back it up regularly.

Create an automated backup script:

```bash
#!/bin/bash
# /usr/local/bin/backup-jenkins.sh
JENKINS_HOME="/var/lib/jenkins"
BACKUP_DIR="/var/backups/jenkins"
DATE=$(date +%Y%m%d)
S3_BUCKET="s3://my-jenkins-backups"

mkdir -p $BACKUP_DIR

# Stop Jenkins briefly for a consistent backup
sudo systemctl stop jenkins

# Backup essential directories (skip workspace and build artifacts)
tar -czf $BACKUP_DIR/jenkins_$DATE.tar.gz \
  --exclude='workspace' \
  --exclude='builds/*/archive' \
  --exclude='.cache' \
  -C $JENKINS_HOME .

# Start Jenkins back up
sudo systemctl start jenkins

# Upload to S3
aws s3 cp $BACKUP_DIR/jenkins_$DATE.tar.gz $S3_BUCKET/

# Clean up local backups older than 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

## Security Hardening

Jenkins security is critical since it has access to your source code and deployment credentials.

Key security settings:

```bash
# Disable Jenkins CLI over remoting (security risk)
# In Manage Jenkins > Security > enable "Disable CLI over Remoting"

# Configure CSRF protection (enabled by default in modern Jenkins)
# In Manage Jenkins > Security > CSRF Protection

# Use the Matrix Authorization Strategy plugin for granular permissions
```

Additional security measures:

- Never expose Jenkins directly to the internet without authentication
- Use IAM roles on the EC2 instance instead of storing AWS keys in Jenkins
- Rotate credentials regularly using the Credentials plugin
- Enable audit logging to track who did what
- Keep Jenkins and plugins updated - security patches are frequent

## Monitoring Jenkins

Monitor Jenkins health, build queue length, and executor utilization.

Check Jenkins health from the CLI:

```bash
# Check if Jenkins is healthy
curl -s http://localhost:8080/api/json?tree=mode

# Get queue information
curl -s http://localhost:8080/queue/api/json | python3 -m json.tool

# Get executor status
curl -s http://localhost:8080/computer/api/json
```

For broader infrastructure monitoring including Jenkins, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view).

## Wrapping Up

A self-hosted Jenkins server on EC2 gives you unlimited flexibility for your CI/CD pipelines. The key components are: a properly sized instance, Nginx with SSL in front, Docker for build isolation, automated backups, and solid security configuration. Start with the basics, add plugins as you need them, and keep everything behind a reverse proxy with proper authentication.
