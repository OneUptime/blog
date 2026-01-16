# How to Install and Configure Jenkins on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Jenkins, CI/CD, DevOps, Automation, Tutorial

Description: Complete guide to installing Jenkins CI/CD server on Ubuntu for automated builds, tests, and deployments.

---

Jenkins is the leading open-source automation server for continuous integration and continuous delivery (CI/CD). It supports building, deploying, and automating software development workflows. This guide covers Jenkins installation and configuration on Ubuntu.

## Features

- Pipeline as Code
- Extensive plugin ecosystem
- Distributed builds
- Easy configuration
- Integration with all major tools

## Prerequisites

- Ubuntu 20.04 or later
- At least 2GB RAM (4GB recommended)
- Java 11 or 17
- Root or sudo access

## Install Java

```bash
# Update system
sudo apt update

# Install Java 17
sudo apt install openjdk-17-jdk -y

# Verify installation
java -version
```

## Install Jenkins

### Add Jenkins Repository

```bash
# Add Jenkins GPG key
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null

# Add repository
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install Jenkins
sudo apt update
sudo apt install jenkins -y
```

### Start Jenkins

```bash
# Start and enable service
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Check status
sudo systemctl status jenkins
```

## Initial Setup

### Get Initial Admin Password

```bash
# Get unlock password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### Complete Setup Wizard

1. Access Jenkins: `http://your_server_ip:8080`
2. Enter admin password
3. Install suggested plugins (or select specific)
4. Create admin user
5. Configure Jenkins URL

## Configure Jenkins

### System Configuration

Navigate to: Manage Jenkins → System

Key settings:
- Jenkins URL
- System Admin email
- Environment variables

### Security Configuration

Navigate to: Manage Jenkins → Security

```
# Recommended settings:
- Enable CSRF Protection
- Disable CLI remoting
- Enable agent → controller access control
```

### Global Tool Configuration

Navigate to: Manage Jenkins → Tools

Configure:
- JDK installations
- Git installations
- Maven/Gradle
- Node.js

## Create First Pipeline

### Freestyle Project

1. New Item → Freestyle project
2. Configure:
   - Source Code Management: Git
   - Build Triggers: Poll SCM / GitHub webhook
   - Build Steps: Shell commands

### Pipeline Project (Recommended)

1. New Item → Pipeline
2. Configure Pipeline script:

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/user/repo.git'
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
        }

        stage('Deploy') {
            steps {
                sh 'npm run deploy'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Build successful!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
```

## Jenkinsfile (Pipeline as Code)

### Basic Jenkinsfile

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'myapp'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh '''
                    echo "Building version ${DOCKER_TAG}"
                    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                '''
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                }
            }
        }

        stage('Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                    '''
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sshagent(['deploy-key']) {
                    sh '''
                        ssh user@server "docker pull ${DOCKER_IMAGE}:${DOCKER_TAG}"
                        ssh user@server "docker-compose up -d"
                    '''
                }
            }
        }
    }

    post {
        always {
            junit '**/test-results/*.xml'
            archiveArtifacts artifacts: 'dist/**', allowEmptyArchive: true
        }
        success {
            slackSend color: 'good', message: "Build ${env.BUILD_NUMBER} succeeded"
        }
        failure {
            slackSend color: 'danger', message: "Build ${env.BUILD_NUMBER} failed"
        }
    }
}
```

## Essential Plugins

### Install Plugins

Navigate to: Manage Jenkins → Plugins → Available plugins

Recommended plugins:
- Pipeline
- Git / GitHub
- Docker Pipeline
- Credentials
- Blue Ocean
- Email Extension
- Slack Notification
- SSH Agent
- JUnit
- Cobertura (code coverage)

### Install via CLI

```bash
# Install plugin via CLI
java -jar jenkins-cli.jar -s http://localhost:8080/ -auth admin:password install-plugin git

# List installed plugins
java -jar jenkins-cli.jar -s http://localhost:8080/ -auth admin:password list-plugins
```

## Credentials Management

### Add Credentials

Navigate to: Manage Jenkins → Credentials → System → Global credentials

Types:
- Username with password
- SSH Username with private key
- Secret text
- Secret file
- Certificate

### Use in Pipeline

```groovy
// Username/password
withCredentials([usernamePassword(
    credentialsId: 'my-creds',
    usernameVariable: 'USER',
    passwordVariable: 'PASS'
)]) {
    sh 'echo $USER'
}

// SSH key
sshagent(['ssh-key-id']) {
    sh 'ssh user@server "command"'
}

// Secret text
withCredentials([string(
    credentialsId: 'api-token',
    variable: 'TOKEN'
)]) {
    sh 'curl -H "Authorization: Bearer $TOKEN" ...'
}
```

## Distributed Builds (Agents)

### Configure Agent

1. Manage Jenkins → Nodes → New Node
2. Configure:
   - Name: build-agent-1
   - Type: Permanent Agent
   - Remote root directory: /home/jenkins
   - Labels: linux docker
   - Launch method: SSH

### Agent via Docker

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }
    stages {
        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }
    }
}
```

### Kubernetes Agent

```groovy
pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  containers:
                  - name: build
                    image: node:18
                    command:
                    - sleep
                    args:
                    - infinity
            '''
        }
    }
    stages {
        stage('Build') {
            steps {
                container('build') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }
    }
}
```

## Webhooks

### GitHub Webhook

1. Jenkins: Configure job → Build Triggers → GitHub hook trigger
2. GitHub: Repository Settings → Webhooks → Add webhook
   - Payload URL: http://jenkins.example.com/github-webhook/
   - Content type: application/json
   - Events: Push, Pull request

### Generic Webhook

```groovy
pipeline {
    triggers {
        GenericTrigger(
            genericVariables: [
                [key: 'ref', value: '$.ref']
            ],
            causeString: 'Triggered by webhook',
            token: 'my-token',
            printContributedVariables: true
        )
    }
    stages {
        // ...
    }
}
```

## Blue Ocean

Modern Jenkins UI with pipeline visualization:

1. Install Blue Ocean plugin
2. Access: http://jenkins.example.com/blue

Features:
- Visual pipeline editor
- Pipeline visualization
- GitHub/Bitbucket integration

## Backup and Restore

### Backup Jenkins

```bash
# Stop Jenkins
sudo systemctl stop jenkins

# Backup JENKINS_HOME
sudo tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz /var/lib/jenkins

# Start Jenkins
sudo systemctl start jenkins
```

### Critical Files to Backup

```
/var/lib/jenkins/
├── config.xml              # Main config
├── credentials.xml         # Credentials
├── jobs/                   # All jobs
├── nodes/                  # Agent configs
├── plugins/                # Installed plugins
├── secrets/                # Encryption keys
└── users/                  # User configs
```

## Security Best Practices

### Enable HTTPS

```bash
# Generate keystore
keytool -genkey -keyalg RSA -alias jenkins -keystore /var/lib/jenkins/jenkins.jks

# Configure Jenkins startup
# /etc/default/jenkins
JENKINS_ARGS="--httpPort=-1 --httpsPort=8443 --httpsKeyStore=/var/lib/jenkins/jenkins.jks --httpsKeyStorePassword=yourpassword"
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name jenkins.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name jenkins.example.com;

    ssl_certificate /etc/letsencrypt/live/jenkins.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jenkins.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}
```

## Troubleshooting

### Check Logs

```bash
# Jenkins log
sudo tail -f /var/log/jenkins/jenkins.log

# Or via systemd
sudo journalctl -u jenkins -f
```

### Common Issues

```bash
# Out of memory
# Edit /etc/default/jenkins
JAVA_ARGS="-Xmx2048m"

# Plugin issues
# Access safe mode
http://jenkins:8080/safeRestart

# Reset admin password
sudo systemctl stop jenkins
sudo rm /var/lib/jenkins/config.xml
sudo systemctl start jenkins
```

### Health Check

```bash
# Check service
sudo systemctl status jenkins

# API health check
curl http://localhost:8080/api/json
```

---

Jenkins provides powerful CI/CD automation with extensive customization options. Its plugin ecosystem supports virtually any tool or workflow. For comprehensive monitoring of your Jenkins server and build status, consider using OneUptime for uptime tracking and alerting.
