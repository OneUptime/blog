# How to Set Up CI/CD with Portainer and Jenkins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Jenkins, CI/CD, Docker, Pipeline

Description: Learn how to create a Jenkins CI/CD pipeline that builds Docker images and deploys them automatically via Portainer.

## Overview

Jenkins is one of the most widely used CI/CD tools. Combined with Portainer, it creates a self-hosted deployment pipeline where Jenkins handles the build and test stages and Portainer handles deployment.

## Prerequisites

- Jenkins installed with the following plugins:
  - Docker Pipeline plugin
  - Credentials Binding plugin
  - Email Extension plugin
  - Generic Webhook Trigger plugin (optional, if you want Jenkins to receive webhook triggers)
- A Jenkins agent with Docker and `curl` installed, plus permission to access the Docker daemon.
- A multibranch Pipeline job if you want to use `when { branch 'main' }` as shown below.

## Configuring Jenkins Credentials

In Jenkins, go to **Manage Jenkins > Credentials** and add:

- **PORTAINER_STAGING_WEBHOOK**: Your staging Portainer webhook URL (Secret text).
- **PORTAINER_PROD_WEBHOOK**: Your production Portainer webhook URL (Secret text).
- **DOCKER_REGISTRY_CREDENTIALS**: Username/password for your registry.

## Declarative Pipeline (Jenkinsfile)

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        REGISTRY = "registry.mycompany.com"
        IMAGE_NAME = "${REGISTRY}/myapp"
        IMAGE_TAG = "${REGISTRY}/myapp:${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh '''
                    # Run unit tests in a Docker container
                    docker run --rm \
                        -v $(pwd):/app \
                        -w /app \
                        python:3.12-slim \
                        sh -c "pip install -r requirements.txt && pytest tests/"
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build the image using the build number as tag
                    docker.build("${IMAGE_TAG}")
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    // Push image with both build number and latest tags
                    withCredentials([usernamePassword(
                        credentialsId: 'DOCKER_REGISTRY_CREDENTIALS',
                        usernameVariable: 'REGISTRY_USER',
                        passwordVariable: 'REGISTRY_PASS'
                    )]) {
                        sh '''
                            echo "$REGISTRY_PASS" | docker login "$REGISTRY" \
                                --username "$REGISTRY_USER" \
                                --password-stdin
                            docker push "$IMAGE_TAG"
                            docker tag "$IMAGE_TAG" "$IMAGE_NAME:latest"
                            docker push "$IMAGE_NAME:latest"
                        '''
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                script {
                    withCredentials([string(
                        credentialsId: 'PORTAINER_STAGING_WEBHOOK',
                        variable: 'STAGING_WEBHOOK'
                    )]) {
                        def response = sh(
                            script: '''
                                curl -s -o /dev/null -w '%{http_code}' -X POST \
                                    "$STAGING_WEBHOOK?tag=$BUILD_NUMBER"
                            ''',
                            returnStdout: true
                        ).trim()

                        if (response != '204') {
                            error("Staging deployment failed: HTTP ${response}")
                        }
                        echo "Staging deployment triggered successfully"
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                beforeInput true
                branch 'main'
            }
            // Require manual input for production deployment
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            steps {
                script {
                    withCredentials([string(
                        credentialsId: 'PORTAINER_PROD_WEBHOOK',
                        variable: 'PROD_WEBHOOK'
                    )]) {
                        sh '''
                            HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
                                -X POST "$PROD_WEBHOOK?tag=$BUILD_NUMBER")

                            [ "$HTTP_STATUS" = "204" ] && \
                                echo "Production deployed" || \
                                (echo "Failed: HTTP $HTTP_STATUS"; exit 1)
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded - deployed build #${BUILD_NUMBER}"
        }
        failure {
            // Notify team on failure
            emailext(
                to: 'team@mycompany.com',
                subject: "Build Failed: ${JOB_NAME} #${BUILD_NUMBER}",
                body: "Check Jenkins at ${BUILD_URL}"
            )
        }
        cleanup {
            // Clean up local Docker images after push
            sh '''
                docker rmi "$IMAGE_NAME:latest" || true
                docker rmi "$IMAGE_TAG" || true
            '''
        }
    }
}
```

## Triggering Jenkins from a Webhook

If you want Jenkins to receive a webhook with a JSON body that includes a `tag` field:

```groovy
// Jenkins Generic Webhook Trigger plugin
triggers {
    GenericTrigger(
        genericVariables: [[key: 'IMAGE_TAG', value: '$.tag']],
        token: 'my-jenkins-token'
    )
}
```

## Conclusion

The Jenkins + Portainer combination is a popular self-hosted CI/CD stack that requires no external SaaS dependencies. The Declarative Pipeline syntax makes it easy to define multi-stage deployments with manual approval gates for production.
