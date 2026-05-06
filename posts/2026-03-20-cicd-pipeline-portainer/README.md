# How to Deploy a Complete CI/CD Pipeline with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, CI/CD, DevOps, Jenkins, Gitea, Pipeline

Description: Build a complete self-hosted CI/CD pipeline with Gitea, Jenkins, and Portainer webhooks for automated build, test, and deployment workflows.

## Introduction

A complete CI/CD pipeline automates the journey from code commit to production deployment. This guide builds an entirely self-hosted pipeline using Gitea (Git hosting), Jenkins (CI/CD), a Docker registry, and Portainer webhooks for deployments - no reliance on GitHub Actions or external services.

## Architecture

```text
Developer → Gitea (Git) → Jenkins (Build/Test) → Registry → Portainer (Deploy)
```

## Step 1: Deploy the CI/CD Infrastructure Stack

```yaml
# docker-compose.yml - Self-hosted CI/CD Stack

networks:
  cicd_network:
    driver: bridge

volumes:
  gitea_data:
  gitea_db:
  jenkins_home:
  jenkins_docker_certs:
  registry_data:

services:
  # Gitea - Self-hosted Git
  gitea_db:
    image: postgres:15-alpine
    container_name: gitea_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=gitea
      - POSTGRES_USER=gitea
      - POSTGRES_PASSWORD=gitea_db_password
    volumes:
      - gitea_db:/var/lib/postgresql/data
    networks:
      - cicd_network

  gitea:
    image: gitea/gitea:latest
    container_name: gitea
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "222:22"    # Git SSH
    environment:
      - GITEA__database__DB_TYPE=postgres
      - GITEA__database__HOST=gitea_db:5432
      - GITEA__database__NAME=gitea
      - GITEA__database__USER=gitea
      - GITEA__database__PASSWD=gitea_db_password
      - GITEA__server__DOMAIN=git.yourdomain.com
      - GITEA__server__ROOT_URL=https://git.yourdomain.com/
      - GITEA__server__SSH_DOMAIN=git.yourdomain.com
      - GITEA__service__DISABLE_REGISTRATION=false
    volumes:
      - gitea_data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    networks:
      - cicd_network
    depends_on:
      - gitea_db

  # Docker daemon for Jenkins builds
  docker:
    image: docker:dind
    container_name: jenkins_docker
    restart: unless-stopped
    privileged: true
    environment:
      - DOCKER_TLS_CERTDIR=/certs
    command: --storage-driver=overlay2 --insecure-registry registry.yourdomain.com:5000
    volumes:
      - jenkins_docker_certs:/certs/client
      - jenkins_home:/var/jenkins_home
    networks:
      - cicd_network

  # Jenkins CI/CD
  jenkins:
    build:
      context: ./jenkins
    container_name: jenkins
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "50000:50000"    # Jenkins agents
    environment:
      - JENKINS_OPTS=--prefix=/jenkins
      - DOCKER_HOST=tcp://docker:2376
      - DOCKER_CERT_PATH=/certs/client
      - DOCKER_TLS_VERIFY=1
    volumes:
      - jenkins_home:/var/jenkins_home
      - jenkins_docker_certs:/certs/client:ro
    networks:
      - cicd_network
    depends_on:
      - docker

  # Private Docker Registry
  registry:
    image: registry:2
    container_name: docker_registry
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY=/data
      - REGISTRY_HTTP_SECRET=registry_http_secret
    volumes:
      - registry_data:/data
    networks:
      - cicd_network

  # Registry UI
  registry_ui:
    image: joxit/docker-registry-ui:latest
    container_name: registry_ui
    restart: unless-stopped
    ports:
      - "8888:80"
    environment:
      - REGISTRY_URL=http://registry:5000
      - REGISTRY_TITLE=My Docker Registry
    networks:
      - cicd_network
    depends_on:
      - registry
```

Create a custom Jenkins image so the Docker CLI is available inside Jenkins:

```dockerfile
# jenkins/Dockerfile
FROM jenkins/jenkins:lts-jdk21

USER root
RUN apt-get update && apt-get install -y lsb-release ca-certificates curl && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get install -y docker-ce-cli && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
USER jenkins
```

Use a registry hostname that both Jenkins and the Portainer-managed Docker environment can resolve. If you keep the registry on plain HTTP, configure that hostname as an insecure registry on each Docker daemon or front it with TLS.

## Step 2: Configure Jenkins Pipeline

Install Jenkins plugins:
- Docker Pipeline
- Git
- Gitea
- Pipeline: Multibranch
- Credentials
- Mailer
- Blue Ocean (optional)

Create the Jenkins job as a **Multibranch Pipeline** so the branch conditions below resolve correctly.

```groovy
// Jenkinsfile - Complete CI/CD pipeline
pipeline {
    agent any

    environment {
        // Docker registry
        REGISTRY = "registry.yourdomain.com:5000"
        IMAGE_NAME = "${REGISTRY}/myapp/api"

        // Portainer deployment settings
        PORTAINER_WEBHOOK_URL = credentials('portainer-webhook-url')
        PORTAINER_API_KEY = credentials('portainer-api-key')
        PORTAINER_URL = "https://portainer.yourdomain.com"
        PORTAINER_STACK_ID = "1"
        PORTAINER_ENDPOINT_ID = "1"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHORT_COMMIT = sh(
                        script: 'git rev-parse --short=8 HEAD',
                        returnStdout: true
                    ).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHORT_COMMIT}"
                }
            }
        }

        stage('Test') {
            steps {
                sh '''
                    docker run --rm \
                        -v "$PWD":/app \
                        -w /app \
                        python:3.12-slim \
                        sh -c "pip install -q -r requirements-test.txt && pytest tests/ -v"
                '''
            }
        }

        stage('Build') {
            steps {
                script {
                    docker.build("${IMAGE_NAME}:${IMAGE_TAG}", "--no-cache .")
                    docker.build("${IMAGE_NAME}:latest", ".")
                }
            }
        }

        stage('Push') {
            steps {
                script {
                    docker.withRegistry("http://${REGISTRY}") {
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push()
                        docker.image("${IMAGE_NAME}:latest").push()
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh '''
                    curl -X POST \
                        "${PORTAINER_WEBHOOK_URL}?IMAGE_TAG=${IMAGE_TAG}"
                '''
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            steps {
                sh '''
                    curl -X PUT \
                        -H "X-API-Key: ${PORTAINER_API_KEY}" \
                        -H "Content-Type: application/json" \
                        "${PORTAINER_URL}/api/stacks/${PORTAINER_STACK_ID}/git/redeploy?endpointId=${PORTAINER_ENDPOINT_ID}" \
                        -d "{\"Prune\": false, \"RepullImageAndRedeploy\": true, \"Env\": [{\"name\": \"IMAGE_TAG\", \"value\": \"${IMAGE_TAG}\"}]}"
                '''
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully: ${IMAGE_TAG}"
        }
        failure {
            // Send notification
            mail(
                to: 'dev@yourdomain.com',
                subject: "Pipeline FAILED: ${JOB_NAME} #${BUILD_NUMBER}",
                body: "Build failed. Check: ${BUILD_URL}"
            )
        }
    }
}
```

## Step 3: Configure Gitea to Trigger Jenkins

1. In Jenkins: **Manage Jenkins** > **Configure System** > **Gitea Servers**
2. Add your Gitea URL and a Gitea personal access token
3. Enable **manage hooks** so Jenkins can create repository webhooks automatically
4. Create the repository job as a **Multibranch Pipeline** or **Organization Folder** backed by Gitea

## Step 4: Portainer Webhook Setup

1. In Portainer: Navigate to your Git-based stack
2. Click **Edit** and open the **GitOps updates** section
3. Select **Webhook** as the update mechanism
4. If Jenkins is deploying new image tags without changing the Git commit, enable **Force redeployment**
5. Reference an environment variable in the stack, for example `image: registry.yourdomain.com:5000/myapp/api:${IMAGE_TAG:-latest}`
6. Copy the full webhook URL
7. Store it as a Jenkins secret text credential

## Step 5: Multi-Environment Stack Updates via API

```bash
#!/bin/bash
# deploy-to-portainer.sh

PORTAINER_URL="$1"
API_KEY="$2"
STACK_ID="$3"
ENDPOINT_ID="$4"
IMAGE_TAG="$5"

# Get current stack info
STACK=$(curl -s \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/stacks/$STACK_ID")

# Update image tag in environment variables
NEW_ENV=$(echo "$STACK" | jq --arg tag "$IMAGE_TAG" \
    '.Env // [] | map(if .name == "IMAGE_TAG" then .value = $tag else . end)')

if ! echo "$NEW_ENV" | jq -e 'map(select(.name == "IMAGE_TAG")) | length > 0' >/dev/null; then
    NEW_ENV=$(echo "$NEW_ENV" | jq --arg tag "$IMAGE_TAG" \
        '. + [{"name":"IMAGE_TAG","value":$tag}]')
fi

# Pull and redeploy the Git-based stack
curl -X PUT \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/stacks/$STACK_ID/git/redeploy?endpointId=$ENDPOINT_ID" \
    -d "$(jq -n --argjson env "$NEW_ENV" \
        '{Prune: false, RepullImageAndRedeploy: true, Env: $env}')"
```

## Conclusion

Your self-hosted CI/CD pipeline now automates the entire software delivery process. Gitea hosts your code, Jenkins builds, tests, and packages it, the private registry stores your Docker images, and Portainer webhooks trigger deployments. This stack runs on your own infrastructure, keeping your source code, build artifacts, and deployment workflow under your control. Portainer sits at the center of the deployment stage, making it easy to track what version is running in each environment.
