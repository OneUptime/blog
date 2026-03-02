# How to Install and Configure Jenkins on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Jenkins, CI/CD, DevOps

Description: Install Jenkins on Ubuntu Server, configure it securely, set up a reverse proxy with Nginx, and create your first pipeline for continuous integration and delivery.

---

Jenkins is one of the most widely deployed CI/CD systems, largely because of its plugin ecosystem and flexibility. Running Jenkins on your own Ubuntu server gives you full control over build environments, secrets, and resource allocation. This guide covers installation, initial configuration, securing Jenkins behind Nginx, and building a basic pipeline.

## Prerequisites

- Ubuntu 22.04 or 24.04 server
- At least 2GB RAM (4GB+ recommended for busy instances)
- Java 17 or 21 (required by Jenkins LTS)
- A domain name or IP address for accessing the Jenkins UI

## Installing Java

Jenkins requires Java. The LTS versions of Jenkins (which is what you want for production) run on Java 17 or 21.

```bash
# Update package lists
sudo apt update

# Install OpenJDK 21 (recommended for Jenkins LTS 2.x)
sudo apt install -y openjdk-21-jdk

# Verify installation
java -version
# Should output: openjdk version "21.x.x" ...

# Set JAVA_HOME if needed
echo "export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))" | sudo tee -a /etc/environment
source /etc/environment
```

## Installing Jenkins

Jenkins maintains its own apt repository with the LTS (Long Term Support) release.

```bash
# Add Jenkins GPG key
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

# Add the Jenkins apt repository
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# Update and install Jenkins
sudo apt update
sudo apt install -y jenkins

# Start Jenkins and enable it to run at boot
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Check that Jenkins started successfully
sudo systemctl status jenkins
```

Jenkins listens on port 8080 by default. You can verify it's running:

```bash
# Check if port 8080 is listening
sudo ss -tlpn | grep 8080

# View the initial admin password (needed for first-time setup)
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

## Initial Jenkins Setup

Open `http://your-server-ip:8080` in a browser. Jenkins will ask for the initial admin password you retrieved above.

After entering the password, Jenkins offers to install suggested plugins or let you choose. For most setups, the suggested plugins are a good starting point. Then create your admin user.

## Changing the Jenkins Port

If 8080 conflicts with something else, change it before setting up the reverse proxy:

```bash
# Edit Jenkins default configuration
sudo nano /etc/default/jenkins

# Find and change the HTTP_PORT line
# HTTP_PORT=8080
# Change to:
# HTTP_PORT=8090

# For systemd-based Jenkins, edit the service override
sudo systemctl edit jenkins
```

Add to the override file:
```ini
[Service]
Environment="JENKINS_PORT=8090"
```

```bash
# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart jenkins
```

## Setting Up Nginx as a Reverse Proxy

Exposing Jenkins directly on port 8080 is fine for internal networks, but for anything internet-facing you want Nginx in front with HTTPS.

```bash
# Install Nginx
sudo apt install -y nginx

# Create Jenkins site configuration
sudo nano /etc/nginx/sites-available/jenkins
```

```nginx
# Nginx reverse proxy configuration for Jenkins
upstream jenkins {
    keepalive 32;
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name jenkins.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jenkins.example.com;

    # SSL certificate paths (use certbot/Let's Encrypt or your own certs)
    ssl_certificate     /etc/letsencrypt/live/jenkins.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jenkins.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Allow large file uploads (for build artifacts)
    client_max_body_size 100m;

    location / {
        proxy_pass         http://jenkins;
        proxy_redirect     default;

        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Required for Jenkins WebSocket agents
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";

        # Increase timeouts for long-running builds
        proxy_connect_timeout 90s;
        proxy_send_timeout    90s;
        proxy_read_timeout    90s;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/jenkins /etc/nginx/sites-enabled/

# Test the configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

If you're using Let's Encrypt for SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jenkins.example.com
```

## Configuring Jenkins for Reverse Proxy

After putting Jenkins behind Nginx, tell Jenkins its public URL so links in the UI and webhooks work correctly:

1. Go to **Manage Jenkins > System**
2. Under **Jenkins URL**, set it to `https://jenkins.example.com/`
3. Save

Or configure it via the Jenkins CLI:

```bash
# Download Jenkins CLI jar
wget http://localhost:8080/jnlpJars/jenkins-cli.jar

# Set the Jenkins URL via groovy script
java -jar jenkins-cli.jar -s http://localhost:8080/ -auth admin:your-token groovy = << EOF
import jenkins.model.*
def env = Jenkins.getInstance().getRootUrl()
Jenkins.getInstance().setRootUrl("https://jenkins.example.com/")
Jenkins.getInstance().save()
EOF
```

## Creating Your First Pipeline

Jenkins Pipelines define CI/CD workflows as code. Create a `Jenkinsfile` in your repository:

```groovy
// Jenkinsfile - defines the CI/CD pipeline
pipeline {
    // Run on any available agent
    agent any

    // Environment variables available to all stages
    environment {
        APP_NAME = 'myapp'
        DOCKER_REGISTRY = 'registry.example.com'
    }

    stages {
        stage('Checkout') {
            steps {
                // Check out source code
                checkout scm
                echo "Building commit: ${env.GIT_COMMIT}"
            }
        }

        stage('Build') {
            steps {
                // Install dependencies and build
                sh '''
                    npm ci
                    npm run build
                '''
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
            post {
                // Archive test results regardless of test outcome
                always {
                    junit 'test-results/*.xml'
                }
            }
        }

        stage('Docker Build') {
            when {
                // Only build Docker image on main branch
                branch 'main'
            }
            steps {
                sh """
                    docker build -t ${DOCKER_REGISTRY}/${APP_NAME}:${env.BUILD_NUMBER} .
                    docker tag ${DOCKER_REGISTRY}/${APP_NAME}:${env.BUILD_NUMBER} \
                               ${DOCKER_REGISTRY}/${APP_NAME}:latest
                """
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                // Use stored credentials for Docker registry
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo $DOCKER_PASS | docker login ${DOCKER_REGISTRY} -u $DOCKER_USER --password-stdin
                        docker push ${DOCKER_REGISTRY}/${APP_NAME}:${env.BUILD_NUMBER}
                        docker push ${DOCKER_REGISTRY}/${APP_NAME}:latest
                    """
                }
            }
        }
    }

    post {
        // Send notification on completion
        success {
            echo "Build successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        failure {
            echo "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            // Add email or Slack notification here
        }
        always {
            // Clean up workspace after build
            cleanWs()
        }
    }
}
```

## Managing Jenkins Credentials

Store secrets in Jenkins rather than in your Jenkinsfiles:

1. Go to **Manage Jenkins > Credentials > System > Global credentials**
2. Click **Add Credentials**
3. Choose the credential type (Username/Password, Secret text, SSH key, etc.)
4. Give it an ID that matches what your Jenkinsfile references

For SSH keys used in builds:

```bash
# Generate a deploy key for Jenkins
ssh-keygen -t ed25519 -C "jenkins@yourdomain.com" -f jenkins_deploy_key -N ""

# Add the public key to your Git repository's deploy keys
cat jenkins_deploy_key.pub

# Add the private key as a Jenkins credential (type: SSH Username with private key)
# ID: github-deploy-key
cat jenkins_deploy_key
```

## Security Hardening

A few important security settings for production Jenkins:

```bash
# Disable Jenkins CLI over remoting (security best practice)
# In Manage Jenkins > Security > Disable CLI
# Or add this to Jenkins system properties:
sudo nano /etc/default/jenkins
# Add: JAVA_ARGS="-Djenkins.CLI.disabled=true"

# Restrict access to the Jenkins agent port (50000) from the internet
sudo ufw allow from 10.0.0.0/8 to any port 50000
sudo ufw deny 50000
```

In **Manage Jenkins > Security**:
- Enable CSRF Protection
- Set up Matrix-based security or Role-based access (with the Role Strategy Plugin)
- Disable agent to master file access if not needed

## Maintenance and Updates

```bash
# Update Jenkins
sudo apt update && sudo apt upgrade jenkins

# Backup Jenkins home directory before updates
sudo tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz /var/lib/jenkins/

# View Jenkins logs
sudo journalctl -u jenkins -f

# Check Jenkins disk usage (builds accumulate over time)
sudo du -sh /var/lib/jenkins/builds/
```

Configure build retention in each job to prevent disk runaway - typically keep the last 10-30 builds or 30 days of builds, whichever is less.

## Summary

Jenkins on Ubuntu Server is a capable, flexible CI/CD platform. The key steps are: install Java and Jenkins from the official repository, put Nginx in front for SSL termination, configure Jenkins with its correct public URL, and define pipelines as code with Jenkinsfiles. Store all secrets as Jenkins credentials rather than in pipeline files, and plan build retention policies early to avoid filling your disk.
