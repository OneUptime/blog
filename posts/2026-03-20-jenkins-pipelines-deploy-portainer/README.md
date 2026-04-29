# How to Use Jenkins Pipelines to Deploy to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Jenkins, CI/CD, Pipeline, Docker, Deployment

Description: Learn how to build Jenkins pipelines that build Docker images and deploy them to Portainer stacks automatically.

---

Jenkins can deploy to Portainer by calling the Portainer API or stack webhooks at the end of a pipeline. This guide covers deploying Jenkins itself via Portainer and building deployment pipelines.

## Deploying Jenkins via Portainer

Start Jenkins as a Portainer stack:

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts
    user: root
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      JAVA_OPTS: "-Djenkins.install.runSetupWizard=false"
    networks:
      - jenkins_net

volumes:
  jenkins_home:

networks:
  jenkins_net:
    driver: bridge
```

Mounting `docker.sock` allows a Jenkins agent that also has the Docker CLI installed to build images directly on the host. The official `jenkins/jenkins` image does not include the Docker CLI, so install it in the image or run the pipeline on a Docker-capable agent.

## Declarative Jenkinsfile

A complete pipeline that builds, pushes, updates a file-based staging stack through the Portainer API, and triggers production through a Portainer stack webhook. The agent running this pipeline needs Docker, `curl`, and `jq` installed:

```groovy
pipeline {
    agent any

    environment {
        IMAGE_NAME    = 'myregistry.example.com/my-app'
        IMAGE_TAG     = ''
        PORTAINER_URL = 'https://portainer.example.com'
        STACK_NAME    = 'my-app-staging'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = sh(script: 'git rev-parse --short=8 HEAD', returnStdout: true).trim()
                }
            }
        }

        stage('Build') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$IMAGE_TAG .'
                sh 'docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest'
            }
        }

        stage('Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'registry-credentials',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_PASS'
                )]) {
                    sh '''
                        set +x
                        echo "$REGISTRY_PASS" | docker login myregistry.example.com -u "$REGISTRY_USER" --password-stdin
                        docker push "$IMAGE_NAME:$IMAGE_TAG"
                        docker push "$IMAGE_NAME:latest"
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                withCredentials([string(
                    credentialsId: 'portainer-api-key',
                    variable: 'PORTAINER_API_KEY'
                )]) {
                    sh '''
                        set +x

                        stack_json=$(curl -fsS \
                          -H "X-API-Key: $PORTAINER_API_KEY" \
                          "$PORTAINER_URL/api/stacks" | \
                          jq -ce --arg stackName "$STACK_NAME" '.[] | select(.Name == $stackName)')

                        stack_id=$(printf '%s' "$stack_json" | jq -r '.Id')
                        endpoint_id=$(printf '%s' "$stack_json" | jq -r '.EndpointId')
                        stack_file=$(curl -fsS \
                          -H "X-API-Key: $PORTAINER_API_KEY" \
                          "$PORTAINER_URL/api/stacks/$stack_id/file" | \
                          jq -re '.StackFileContent')

                        jq -nc \
                          --arg stackFileContent "$stack_file" \
                          '{StackFileContent: $stackFileContent, RepullImageAndRedeploy: true}' | \
                          curl -fsS -X PUT \
                            -H "X-API-Key: $PORTAINER_API_KEY" \
                            -H 'Content-Type: application/json' \
                            --data @- \
                            "$PORTAINER_URL/api/stacks/$stack_id?endpointId=$endpoint_id"
                    '''
                }
            }
        }

        stage('Smoke Test') {
            steps {
                sh './scripts/smoke-test.sh https://staging.example.com'
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                withCredentials([string(
                    credentialsId: 'portainer-prod-webhook',
                    variable: 'PORTAINER_PROD_WEBHOOK'
                )]) {
                    sh '''
                        set +x
                        curl -fsS -X POST "$PORTAINER_PROD_WEBHOOK"
                    '''
                }
            }
        }
    }

    post {
        failure {
            mail to: 'team@example.com',
                 subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "See ${env.BUILD_URL} for details."
        }
    }
}
```

## Storing Credentials Securely in Jenkins

Never hardcode registry credentials, Portainer API tokens, or webhook URLs in Jenkinsfiles. Use Jenkins Credentials:

1. Go to **Manage Jenkins > Credentials**.
2. Under **System**, open **Global credentials (unrestricted)**.
3. Add a **Username with password** credential with ID `registry-credentials`.
4. Add a **Secret text** credential with ID `portainer-api-key`.
5. Add a **Secret text** credential with ID `portainer-prod-webhook`.
6. Reference them with `withCredentials` as shown in the pipeline above.

## Parallel Deployments

Deploy multiple services simultaneously to reduce pipeline duration:

```groovy
stage('Deploy Services') {
    parallel {
        stage('Deploy API') {
            steps {
                sh 'curl -fsS -X POST "$PORTAINER_WEBHOOK_API"'
            }
        }
        stage('Deploy Worker') {
            steps {
                sh 'curl -fsS -X POST "$PORTAINER_WEBHOOK_WORKER"'
            }
        }
        stage('Deploy Frontend') {
            steps {
                sh 'curl -fsS -X POST "$PORTAINER_WEBHOOK_FRONTEND"'
            }
        }
    }
}
```
