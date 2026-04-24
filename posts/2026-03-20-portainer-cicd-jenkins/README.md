# How to Set Up CI/CD with Portainer and Jenkins - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, CI/CD, Jenkins, Docker, Automation

Description: Learn how to integrate Jenkins with Portainer to build a complete CI/CD pipeline that builds, tests, and deploys Docker containers automatically using Jenkinsfiles and the Portainer API.

## Introduction

Jenkins is one of the most widely used CI/CD platforms. Integrating it with Portainer enables automated container deployments after successful builds. This guide covers creating a Jenkinsfile pipeline that builds Docker images and deploys them to Portainer using webhooks and the REST API.

## Prerequisites

- Jenkins server with Docker access
- Portainer CE or BE with a Docker environment (Step 3 uses Portainer BE stack webhooks)
- Jenkins plugins: Docker Pipeline, Credentials Binding
- Container registry (Docker Hub, private registry)

## Step 1: Install Required Jenkins Plugins

In Jenkins → **Manage Jenkins** → **Plugin Manager**, install:
- **Docker Pipeline**: Enables Docker build/push steps
- **Credentials Binding Plugin**: Inject secrets into builds
- **HTTP Request Plugin** (optional): For API calls

## Step 2: Add Credentials to Jenkins

In Jenkins → **Manage Jenkins** → **Credentials** → **Global** → **Add Credentials**:

| ID | Type | Value |
|----|------|-------|
| `portainer-webhook-url` | Secret text | Your Portainer BE stack webhook URL |
| `portainer-api-key` | Secret text | Portainer API access token |
| `registry-credentials` | Username/Password | Registry username & token |

## Step 3: Basic Jenkinsfile (Webhook Deploy, Portainer BE)

```groovy
// Jenkinsfile - Basic CI/CD with Portainer webhook
pipeline {
    agent any

    environment {
        REGISTRY = "registry.example.com"
        IMAGE_NAME = "${REGISTRY}/myapp"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh 'npm ci && npm test'
            }
        }

        stage('Build Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'registry-credentials',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_PASS'
                )]) {
                    sh """
                        docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                        docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest

                        echo "${REGISTRY_PASS}" | docker login ${REGISTRY} -u ${REGISTRY_USER} --password-stdin
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                    """
                }
            }
        }

        stage('Deploy to Portainer') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([string(
                    credentialsId: 'portainer-webhook-url',
                    variable: 'PORTAINER_WEBHOOK_URL'
                )]) {
                    sh """
                        echo "Triggering Portainer deployment..."
                        HTTP_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" -X POST "\${PORTAINER_WEBHOOK_URL}")

                        if [ "\${HTTP_STATUS}" = "200" ] || [ "\${HTTP_STATUS}" = "204" ]; then
                            echo "Deployment triggered successfully!"
                        else
                            echo "Deployment trigger failed: HTTP \${HTTP_STATUS}"
                            exit 1
                        fi
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded! Image ${IMAGE_NAME}:${IMAGE_TAG} deployed."
        }
        failure {
            echo "Pipeline failed. Check logs for details."
        }
        always {
            sh 'docker rmi ${IMAGE_NAME}:${IMAGE_TAG} || true'
        }
    }
}
```

## Step 4: Advanced Jenkinsfile (API-Based Deploy for File-Based Stacks)

```groovy
// Jenkinsfile - Advanced deployment using Portainer API for a file-based stack
pipeline {
    agent {
        docker {
            image 'alpine:3.19'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        PORTAINER_URL = "https://portainer.example.com"
        ENDPOINT_ID = "1"
        STACK_NAME = "my-app"
    }

    stages {
        stage('Setup') {
            steps {
                sh 'apk add --no-cache curl jq docker-cli'
                script {
                    env.IMAGE_TAG = env.GIT_COMMIT.take(8)
                }
            }
        }

        stage('Build and Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'registry-credentials',
                    usernameVariable: 'REG_USER',
                    passwordVariable: 'REG_PASS'
                )]) {
                    sh """
                        echo "${REG_PASS}" | docker login registry.example.com -u ${REG_USER} --password-stdin
                        docker build -t registry.example.com/myapp:${IMAGE_TAG} .
                        docker push registry.example.com/myapp:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                withCredentials([string(
                    credentialsId: 'portainer-api-key',
                    variable: 'PORTAINER_API_KEY'
                )]) {
                    sh """
                        # Find the stack ID
                        STACK_ID=\$(curl -sf -H "X-API-Key: ${PORTAINER_API_KEY}" \
                            "${PORTAINER_URL}/api/stacks" | \
                            jq -r --arg n "${STACK_NAME}" '.[] | select(.Name == \$n) | .Id')

                        if [ -z "\${STACK_ID}" ] || [ "\${STACK_ID}" = "null" ]; then
                            echo "Stack not found: ${STACK_NAME}"
                            exit 1
                        fi

                        echo "Deploying stack \${STACK_ID} with tag ${IMAGE_TAG}"

                        # Get current stack file
                        COMPOSE=\$(curl -sf -H "X-API-Key: ${PORTAINER_API_KEY}" \
                            "${PORTAINER_URL}/api/stacks/\${STACK_ID}/file" | \
                            jq -r '.StackFileContent')

                        # Update the stack
                        curl -sf -X PUT \
                            -H "X-API-Key: ${PORTAINER_API_KEY}" \
                            -H "Content-Type: application/json" \
                            "${PORTAINER_URL}/api/stacks/\${STACK_ID}?endpointId=${ENDPOINT_ID}" \
                            -d "{
                                \\"StackFileContent\\": \$(echo "\$COMPOSE" | jq -Rs .),
                                \\"Env\\": [{\\"name\\": \\"IMAGE_TAG\\", \\"value\\": \\"${IMAGE_TAG}\\"}],
                                \\"RepullImageAndRedeploy\\": true
                            }"

                        echo "Deployment complete: ${IMAGE_TAG}"
                    """
                }
            }
        }

        stage('Verify') {
            when { branch 'main' }
            steps {
                sh """
                    echo "Waiting for deployment..."
                    sleep 30

                    MAX_RETRIES=6
                    for i in \$(seq 1 \$MAX_RETRIES); do
                        if curl -sf "https://myapp.example.com/health" > /dev/null; then
                            echo "Health check passed!"
                            exit 0
                        fi
                        echo "Attempt \$i/\$MAX_RETRIES - retrying in 15s..."
                        sleep 15
                    done
                    echo "Health check failed!"
                    exit 1
                """
            }
        }
    }
}
```

## Step 5: Using Jenkins Shared Libraries

Create a reusable shared library for Portainer file-based stack deployments:

```groovy
// vars/portainerDeploy.groovy (shared library)
def call(Map config = [:]) {
    def portainerUrl = config.portainerUrl ?: error("portainerUrl is required")
    def stackName = config.stackName ?: error("stackName is required")
    def endpointId = config.endpointId ?: "1"
    def imageTag = config.imageTag ?: "latest"

    withCredentials([string(credentialsId: 'portainer-api-key', variable: 'API_KEY')]) {
        sh """
            apk add --no-cache curl jq 2>/dev/null || apt-get install -y curl jq 2>/dev/null

            STACK_ID=\$(curl -sf -H "X-API-Key: ${API_KEY}" \
                "${portainerUrl}/api/stacks" | \
                jq -r --arg n "${stackName}" '.[] | select(.Name == \$n) | .Id')

            if [ -z "\${STACK_ID}" ] || [ "\${STACK_ID}" = "null" ]; then
                echo "Stack not found: ${stackName}"
                exit 1
            fi

            COMPOSE=\$(curl -sf -H "X-API-Key: ${API_KEY}" \
                "${portainerUrl}/api/stacks/\${STACK_ID}/file" | \
                jq -r '.StackFileContent')

            curl -sf -X PUT -H "X-API-Key: ${API_KEY}" \
                -H "Content-Type: application/json" \
                "${portainerUrl}/api/stacks/\${STACK_ID}?endpointId=${endpointId}" \
                -d "{\\"StackFileContent\\": \$(echo "\$COMPOSE" | jq -Rs .), \\"Env\\": [{\\"name\\": \\"IMAGE_TAG\\", \\"value\\": \\"${imageTag}\\"}], \\"RepullImageAndRedeploy\\": true}"

            echo "Deployed ${stackName} with tag ${imageTag}"
        """
    }
}
```

Usage in Jenkinsfile:

```groovy
@Library('my-shared-library') _

stage('Deploy') {
    steps {
        portainerDeploy(
            portainerUrl: 'https://portainer.example.com',
            stackName: 'my-app',
            endpointId: '1',
            imageTag: env.IMAGE_TAG
        )
    }
}
```

## Conclusion

Integrating Jenkins with Portainer provides a mature, flexible CI/CD pipeline for teams already invested in Jenkins. The webhook approach offers the simplest setup when Portainer BE stack webhooks are available, while the API-based approach enables dynamic image tag injection for immutable deployments on file-based stacks. Use Jenkins Shared Libraries to standardize your Portainer deployment logic across multiple projects and pipelines.
