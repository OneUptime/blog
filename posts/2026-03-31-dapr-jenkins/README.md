# How to Use Jenkins with Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Jenkins, CI/CD, Pipeline, DevOps

Description: Learn how to configure Jenkins pipelines for Dapr applications using Jenkinsfile stages for building, testing with Dapr CLI, and deploying to Kubernetes.

---

Jenkins is a widely-used CI/CD platform that can build, test, and deploy Dapr applications through declarative pipelines. This guide covers writing a Jenkinsfile that installs the Dapr CLI, runs integration tests, and deploys Dapr components to Kubernetes.

## Prerequisites

Install the following Jenkins plugins:
- Docker Pipeline
- Kubernetes CLI Plugin
- Slack Notification Plugin (for build notifications)
- Blue Ocean (optional, for visualization)

## Declarative Jenkinsfile

```groovy
pipeline {
    agent {
        docker {
            image 'ubuntu:22.04'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        DAPR_VERSION = '1.13.0'
        IMAGE_NAME = 'myrepo/order-service'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        REGISTRY_CREDENTIALS = credentials('docker-hub-credentials')
    }

    stages {
        stage('Prepare') {
            steps {
                sh '''
                    apt-get update -qq
                    apt-get install -y wget curl python3 python3-pip docker.io
                    wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | bash
                    dapr init --runtime-version ${DAPR_VERSION}
                '''
            }
        }

        stage('Unit Test') {
            steps {
                sh '''
                    pip3 install -r requirements.txt -r requirements-dev.txt
                    pytest tests/unit/ -v --junitxml=unit-test-results.xml
                '''
            }
            post {
                always {
                    junit 'unit-test-results.xml'
                }
            }
        }

        stage('Integration Test') {
            steps {
                sh '''
                    # Start Dapr subscriber in background
                    dapr run --app-id test-subscriber \
                        --app-port 5001 \
                        --resources-path ./components/local \
                        -- python3 subscriber.py &
                    SUBSCRIBER_PID=$!
                    sleep 3

                    # Run integration tests
                    pytest tests/integration/ -v --junitxml=integration-results.xml

                    # Cleanup
                    kill $SUBSCRIBER_PID 2>/dev/null || true
                    dapr stop --app-id test-subscriber 2>/dev/null || true
                '''
            }
            post {
                always {
                    junit 'integration-results.xml'
                }
            }
        }

        stage('Build and Push Image') {
            steps {
                sh '''
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                    echo ${REGISTRY_CREDENTIALS_PSW} | docker login -u ${REGISTRY_CREDENTIALS_USR} --password-stdin
                    docker push ${IMAGE_NAME}:${IMAGE_TAG}
                    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                    docker push ${IMAGE_NAME}:latest
                '''
            }
        }

        stage('Security Scan') {
            steps {
                sh '''
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --exit-code 1 \
                        --severity HIGH,CRITICAL \
                        ${IMAGE_NAME}:${IMAGE_TAG}
                '''
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                withKubeConfig([credentialsId: 'staging-kubeconfig']) {
                    sh '''
                        kubectl apply -f k8s/components/ -n staging
                        kubectl set image deployment/order-service \
                            order-service=${IMAGE_NAME}:${IMAGE_TAG} -n staging
                        kubectl rollout status deployment/order-service -n staging
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message 'Deploy to production?'
                ok 'Deploy'
            }
            steps {
                withKubeConfig([credentialsId: 'prod-kubeconfig']) {
                    sh '''
                        kubectl apply -f k8s/components/ -n production
                        kubectl set image deployment/order-service \
                            order-service=${IMAGE_NAME}:${IMAGE_TAG} -n production
                        kubectl rollout status deployment/order-service -n production
                    '''
                }
            }
        }
    }

    post {
        failure {
            slackSend(
                color: 'danger',
                message: "Pipeline FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER} - ${env.BUILD_URL}"
            )
        }
        success {
            slackSend(
                color: 'good',
                message: "Pipeline SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

## Summary

Jenkins declarative pipelines support Dapr applications through stages that install the Dapr CLI, run both unit and integration tests with live Dapr sidecars, build and push container images, perform security scanning, and deploy to Kubernetes using the Kubernetes CLI Plugin. Use the `input` directive to require manual approval before production deployments.
