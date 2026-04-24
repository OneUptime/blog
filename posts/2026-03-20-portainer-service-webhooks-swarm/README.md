# How to Set Up Service Webhooks in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Webhook, CI/CD, DevOps

Description: Learn how to configure Portainer service webhooks on Docker Swarm to enable automated image updates triggered by CI/CD pipelines.

## Introduction

Portainer service webhooks provide an HTTP endpoint that, when called, triggers an image update for a Swarm service. This enables a push-based deployment model where your CI/CD pipeline builds a new image and then tells Portainer to update the service - without needing to store Portainer credentials in your CI system. This guide covers setting up and using service webhooks.

## Prerequisites

- Portainer CE or BE managing a non-Edge Docker Swarm environment
- A Swarm service to update
- A CI/CD system (GitHub Actions, GitLab CI, Jenkins, etc.)

## Step 1: Enable the Service Webhook

1. Navigate to **Services** in Portainer
2. Click on the service you want to configure
3. Click **Edit this service** or find the **Webhooks** section
4. Enable **Service webhook**
5. Copy the generated webhook URL

The URL looks like:

```text
https://portainer.example.com:9443/api/webhooks/abc123def456...
```

## Step 2: Test the Webhook

Test the webhook with curl to verify it works:

```bash
# Trigger a service update via webhook
# Add --insecure only if Portainer is using a self-signed certificate.

curl -X POST \
  "https://portainer.example.com:9443/api/webhooks/abc123def456"

# Expected: HTTP 204 No Content
# Portainer asks Swarm to redeploy the service using the current image tag
```

## Step 3: Integrate with GitHub Actions

Add the webhook call to your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Log in to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            myorg/myapp:latest
            myorg/myapp:${{ github.sha }}

      - name: Trigger Portainer service update
        run: |
          curl -X POST \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}" \
            --fail \
            --max-time 30
```

Store the webhook URL as a GitHub secret (`PORTAINER_WEBHOOK_URL`).

## Step 4: Integrate with GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  image: docker:24.0.5-cli
  services:
    - docker:24.0.5-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" -u "$CI_REGISTRY_USER" --password-stdin
    - docker build -t "$CI_REGISTRY_IMAGE:latest" -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" .
    - docker push "$CI_REGISTRY_IMAGE:latest"
    - docker push "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - |
      curl -X POST "$PORTAINER_WEBHOOK_URL" \
        --fail \
        --max-time 30
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

For this example, the GitLab Runner must be configured to run Docker-in-Docker in privileged mode.

## Step 5: Integrate with Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                        docker build -t myorg/myapp:${BUILD_NUMBER} .
                        docker tag myorg/myapp:${BUILD_NUMBER} myorg/myapp:latest
                        docker push myorg/myapp:${BUILD_NUMBER}
                        docker push myorg/myapp:latest
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'portainer-webhook', variable: 'WEBHOOK_URL')]) {
                    sh '''
                        curl -X POST "${WEBHOOK_URL}" \
                          --fail \
                          --max-time 30
                    '''
                }
            }
        }
    }
}
```

## Step 6: Understand the Webhook Behavior

When the webhook is called:

1. Portainer receives the POST request
2. Portainer inspects the service and prepares a Docker Swarm service update using the service's image tag
3. Portainer enables a forced service update and asks Swarm to query the registry for the current digest of that tag
4. Swarm redeploys the service tasks, reusing a cached image or pulling it from the registry when needed

### Force Update

Service webhooks already trigger a forced service update. In practice, that means the webhook recreates tasks even when the image tag still resolves to the same digest.

## Step 7: Secure the Webhook

The webhook URL is a secret - anyone with the URL can trigger a deployment. Protect it:

1. **Store as a CI/CD secret** - Never hardcode in your pipeline files
2. **Restrict network access** - Use firewall rules to limit which IPs can reach Portainer's API
3. **Rotate webhooks** - Regenerate the webhook URL periodically or after team members leave
4. **Use HTTPS only** - Never expose Portainer over plain HTTP

## Monitoring Webhook-Triggered Deployments

After a webhook triggers a deployment, monitor in Portainer:

1. Go to **Services** and find the service
2. Check the **Tasks** list for new tasks starting
3. Verify tasks reach **Running** state
4. Check **Logs** for any startup errors

## Conclusion

Portainer service webhooks bridge the gap between your CI/CD pipelines and your Swarm cluster. By triggering image updates via webhook, you achieve automated continuous deployment without sharing Portainer credentials with your build systems. This approach scales well across multiple services and can easily integrate with any CI/CD platform that can make HTTP requests.
