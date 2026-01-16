# How to Install and Configure SonarQube on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SonarQube, Code Quality, DevOps, Security, Tutorial

Description: Complete guide to installing SonarQube on Ubuntu for continuous code quality and security analysis.

---

SonarQube is an open-source platform for continuous inspection of code quality. It performs automatic reviews with static analysis to detect bugs, code smells, and security vulnerabilities. This guide covers SonarQube installation and configuration on Ubuntu.

## Features

- Static code analysis
- Security vulnerability detection
- Code smell identification
- Technical debt tracking
- Quality gate enforcement
- CI/CD integration

## Prerequisites

- Ubuntu 20.04 or later
- At least 4GB RAM (8GB recommended)
- Java 17
- PostgreSQL
- Root or sudo access

## System Requirements

```bash
# Configure kernel parameters
sudo nano /etc/sysctl.conf
```

```
vm.max_map_count=524288
fs.file-max=131072
```

```bash
# Apply changes
sudo sysctl -p

# Configure limits
sudo nano /etc/security/limits.conf
```

```
sonarqube   -   nofile   131072
sonarqube   -   nproc    8192
```

## Install Java

```bash
# Install Java 17
sudo apt update
sudo apt install openjdk-17-jdk -y

# Verify
java -version
```

## Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
CREATE USER sonarqube WITH ENCRYPTED PASSWORD 'YourStrongPassword';
CREATE DATABASE sonarqube OWNER sonarqube;
GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;
\q
```

## Install SonarQube

### Download and Extract

```bash
# Download SonarQube
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.3.0.82913.zip

# Extract
sudo apt install unzip -y
sudo unzip sonarqube-*.zip
sudo mv sonarqube-* sonarqube

# Create user
sudo useradd -r -s /bin/false sonarqube

# Set ownership
sudo chown -R sonarqube:sonarqube /opt/sonarqube
```

### Configure SonarQube

```bash
sudo nano /opt/sonarqube/conf/sonar.properties
```

```properties
# Database configuration
sonar.jdbc.username=sonarqube
sonar.jdbc.password=YourStrongPassword
sonar.jdbc.url=jdbc:postgresql://localhost:5432/sonarqube

# Web server
sonar.web.host=0.0.0.0
sonar.web.port=9000
sonar.web.context=/

# Elasticsearch
sonar.search.host=127.0.0.1
sonar.search.port=9001

# Logging
sonar.log.level=INFO
sonar.path.logs=/opt/sonarqube/logs
```

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/sonarqube.service
```

```ini
[Unit]
Description=SonarQube service
After=syslog.target network.target

[Service]
Type=forking
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
User=sonarqube
Group=sonarqube
Restart=always
LimitNOFILE=131072
LimitNPROC=8192

[Install]
WantedBy=multi-user.target
```

### Start SonarQube

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl start sonarqube
sudo systemctl enable sonarqube

# Check status
sudo systemctl status sonarqube

# Check logs
sudo tail -f /opt/sonarqube/logs/sonar.log
```

## Initial Setup

1. Access: `http://your_server_ip:9000`
2. Login with default credentials:
   - Username: admin
   - Password: admin
3. Change password when prompted

## Configure Projects

### Create Project

1. Administration → Projects → Create Project
2. Enter project details:
   - Project key: my-project
   - Display name: My Project

### Generate Token

1. My Account → Security → Generate Tokens
2. Name: ci-scanner
3. Copy and save the token

## SonarScanner Configuration

### Install SonarScanner

```bash
# Download SonarScanner
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip

# Extract
sudo unzip sonar-scanner-*.zip
sudo mv sonar-scanner-* sonar-scanner

# Add to PATH
echo 'export PATH=$PATH:/opt/sonar-scanner/bin' | sudo tee /etc/profile.d/sonar-scanner.sh
source /etc/profile.d/sonar-scanner.sh

# Verify
sonar-scanner --version
```

### Configure Scanner

```bash
sudo nano /opt/sonar-scanner/conf/sonar-scanner.properties
```

```properties
sonar.host.url=http://localhost:9000
sonar.sourceEncoding=UTF-8
```

### Project Configuration

Create `sonar-project.properties` in project root:

```properties
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.projectVersion=1.0

sonar.sources=src
sonar.tests=tests
sonar.sourceEncoding=UTF-8

# Language-specific settings
sonar.language=java
sonar.java.binaries=target/classes

# Exclusions
sonar.exclusions=**/node_modules/**,**/vendor/**
sonar.test.exclusions=**/test/**
```

### Run Analysis

```bash
# Run scanner
cd /path/to/project
sonar-scanner \
  -Dsonar.login=your-token \
  -Dsonar.host.url=http://localhost:9000
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/sonar.yml
name: SonarQube Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: Quality Gate Check
        uses: sonarsource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                            -Dsonar.projectKey=my-project \
                            -Dsonar.sources=src
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }
}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
sonarqube-check:
  image:
    name: sonarsource/sonar-scanner-cli:latest
    entrypoint: [""]
  variables:
    SONAR_USER_HOME: "${CI_PROJECT_DIR}/.sonar"
    GIT_DEPTH: "0"
  cache:
    key: "${CI_JOB_NAME}"
    paths:
      - .sonar/cache
  script:
    - sonar-scanner
        -Dsonar.projectKey=$CI_PROJECT_PATH_SLUG
        -Dsonar.host.url=$SONAR_HOST_URL
        -Dsonar.login=$SONAR_TOKEN
  allow_failure: true
  only:
    - merge_requests
    - main
```

## Quality Gates

### Create Quality Gate

1. Quality Gates → Create
2. Name: My Quality Gate
3. Add Conditions:
   - Coverage < 80%: Error
   - Bugs > 0: Error
   - Code Smells > 10: Warning
   - Security Hotspots > 0: Warning

### Assign to Project

1. Project Settings → Quality Gate
2. Select quality gate

## Quality Profiles

### Create Custom Profile

1. Quality Profiles → Create
2. Language: Java
3. Name: My Java Profile
4. Inherit: Sonar way

### Customize Rules

1. Rules → Search and filter
2. Select rules to activate/deactivate
3. Bulk change to profile

## Webhooks

### Configure Webhook

1. Project Settings → Webhooks → Create
2. Name: Jenkins Webhook
3. URL: http://jenkins:8080/sonarqube-webhook/
4. Secret: (optional)

## Security

### LDAP Integration

```properties
# sonar.properties
sonar.security.realm=LDAP
ldap.url=ldap://ldap.example.com:389
ldap.bindDn=cn=admin,dc=example,dc=com
ldap.bindPassword=secret
ldap.user.baseDn=ou=users,dc=example,dc=com
ldap.user.request=(&(objectClass=person)(sAMAccountName={login}))
```

### HTTPS with Nginx

```nginx
server {
    listen 443 ssl;
    server_name sonar.example.com;

    ssl_certificate /etc/ssl/certs/sonar.crt;
    ssl_certificate_key /etc/ssl/private/sonar.key;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup and Restore

### Backup

```bash
# Backup database
sudo -u postgres pg_dump sonarqube > sonarqube_backup.sql

# Backup configuration
tar -czf sonarqube_config.tar.gz /opt/sonarqube/conf

# Backup plugins
tar -czf sonarqube_plugins.tar.gz /opt/sonarqube/extensions/plugins
```

### Restore

```bash
# Restore database
sudo -u postgres psql sonarqube < sonarqube_backup.sql

# Restore configuration and plugins
tar -xzf sonarqube_config.tar.gz -C /
tar -xzf sonarqube_plugins.tar.gz -C /
```

## Troubleshooting

### Check Logs

```bash
# Application logs
sudo tail -f /opt/sonarqube/logs/sonar.log

# Web logs
sudo tail -f /opt/sonarqube/logs/web.log

# Elasticsearch logs
sudo tail -f /opt/sonarqube/logs/es.log
```

### Common Issues

```bash
# Elasticsearch won't start
# Check vm.max_map_count
sysctl vm.max_map_count

# Out of memory
# Edit wrapper.conf
sudo nano /opt/sonarqube/conf/wrapper.conf
# wrapper.java.maxmemory=4096

# Database connection issues
# Check PostgreSQL is running
sudo systemctl status postgresql

# Permission denied
sudo chown -R sonarqube:sonarqube /opt/sonarqube
```

---

SonarQube is essential for maintaining code quality and security in modern development workflows. Integration with CI/CD pipelines ensures continuous quality monitoring. For comprehensive monitoring of your SonarQube server, consider using OneUptime for uptime and performance tracking.
