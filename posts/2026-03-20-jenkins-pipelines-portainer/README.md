# How to Set Up Jenkins Pipelines That Deploy to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Jenkins, CI/CD, DevOps, Automation, Pipeline

Description: Configure Jenkins declarative pipelines to build Docker images and deploy stacks to Portainer using the Portainer API and webhooks.

## Introduction

Jenkins is the most widely deployed CI/CD automation server. This guide covers deploying Jenkins alongside Portainer, configuring pipelines that build Docker images, run tests, and deploy file-based stacks to Portainer environments - all from a single Jenkinsfile.

## Step 1: Deploy Jenkins with Docker Support

```yaml
# docker-compose.yml - Jenkins for Docker builds

networks:
  jenkins_network:
    driver: bridge

volumes:
  jenkins_home:
  jenkins_agents:

services:
  jenkins:
    build:
      context: .
    image: myjenkins:lts-jdk21
    container_name: jenkins
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "50000:50000"
    environment:
      - JAVA_OPTS=-Xmx2g -Xms512m
      - JENKINS_OPTS=--httpPort=8080
    volumes:
      - jenkins_home:/var/jenkins_home
      # Docker access for builds
      - /var/run/docker.sock:/var/run/docker.sock
    user: root
    networks:
      - jenkins_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.jenkins.rule=Host(`jenkins.yourdomain.com`)"
      - "traefik.http.routers.jenkins.entrypoints=websecure"
      - "traefik.http.services.jenkins.loadbalancer.server.port=8080"
```

## Step 2: Install Jenkins Docker Tools

```dockerfile
# Dockerfile - Extend Jenkins with Docker CLI and required plugins

FROM jenkins/jenkins:lts-jdk21

USER root
RUN apt-get update && apt-get install -y ca-certificates curl git gnupg lsb-release python3 && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get install -y docker-ce-cli && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

USER jenkins
RUN jenkins-plugin-cli --plugins "blueocean credentials-binding docker-workflow email-ext git github-branch-source job-dsl junit pipeline-utility-steps"
```

## Step 3: Configure Credentials in Jenkins

1. Navigate to **Manage Jenkins** > **Credentials** > **System** > **Global credentials**
2. Add the following:

| ID | Type | Value |
|----|------|-------|
| `portainer-api-key` | Secret text | Your Portainer API key |
| `docker-registry` | Username/password | Registry credentials |
| `portainer-url` | Secret text | `https://portainer.yourdomain.com` |

Generate Portainer API key:
1. Click your username in the top right, then select **My account**
2. In **Access tokens**, click **Add access token**
3. Copy the generated token

## Step 4: Complete Declarative Pipeline

```groovy
// Jenkinsfile - Comprehensive deployment pipeline
pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['auto', 'staging', 'production'],
            description: 'Target deployment environment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip test execution'
        )
    }

    environment {
        PORTAINER_URL  = credentials('portainer-url')
        PORTAINER_KEY  = credentials('portainer-api-key')
        REGISTRY       = "registry.yourdomain.com"
        APP_NAME       = "myapp"
        IMAGE          = "${REGISTRY}/${APP_NAME}"
        // Environment-specific Portainer IDs
        STAGING_ENDPOINT_ID   = "1"
        PRODUCTION_ENDPOINT_ID = "2"
        STAGING_STACK_ID      = "10"
        PRODUCTION_STACK_ID   = "20"
    }

    stages {
        stage('Prepare') {
            steps {
                script {
                    // Compute image tag from git info
                    env.GIT_SHORT = env.GIT_COMMIT.take(7)
                    env.IMAGE_TAG = "${BUILD_NUMBER}-${env.GIT_SHORT}"
                    env.FULL_IMAGE = "${IMAGE}:${env.IMAGE_TAG}"

                    echo "Building: ${env.FULL_IMAGE}"
                }
            }
        }

        stage('Test') {
            when {
                not { expression { params.SKIP_TESTS } }
            }
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            docker.image('python:3.12-slim').inside {
                                sh '''
                                    mkdir -p test-results
                                    pip install -q -r requirements.txt
                                    pip install -q pytest pytest-cov
                                    pytest tests/unit/ -v --junitxml=test-results/unit.xml
                                '''
                            }
                        }
                        junit 'test-results/*.xml'
                    }
                }

                stage('Linting') {
                    steps {
                        script {
                            docker.image('python:3.12-slim').inside {
                                sh '''
                                    pip install -q flake8
                                    flake8 src/
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login "$REGISTRY" -u "$DOCKER_USER" --password-stdin

                        # Build with cache from latest
                        docker pull "$IMAGE:latest" || true
                        docker build \
                            --cache-from "$IMAGE:latest" \
                            --build-arg BUILD_NUMBER="$BUILD_NUMBER" \
                            --build-arg GIT_COMMIT="$GIT_SHORT" \
                            -t "$FULL_IMAGE" \
                            -t "$IMAGE:latest" \
                            .

                        docker push "$FULL_IMAGE"
                        docker push "$IMAGE:latest"

                        echo "Pushed: $FULL_IMAGE"
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                anyOf {
                    branch 'develop'
                    expression { params.ENVIRONMENT == 'staging' }
                }
            }
            steps {
                script {
                    deployToPortainer(
                        endpointId: STAGING_ENDPOINT_ID,
                        stackId: STAGING_STACK_ID,
                        imageTag: env.IMAGE_TAG
                    )
                }
            }
        }

        stage('Integration Tests') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    sleep 30
                    docker.image(env.FULL_IMAGE).inside('-e TARGET_URL=https://staging.yourdomain.com') {
                        sh 'python -m pytest tests/integration/ -v'
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                anyOf {
                    branch 'main'
                    expression { params.ENVIRONMENT == 'production' }
                }
            }
            steps {
                input(
                    message: "Deploy ${env.IMAGE_TAG} to PRODUCTION?",
                    ok: "Deploy"
                )
                script {
                    deployToPortainer(
                        endpointId: PRODUCTION_ENDPOINT_ID,
                        stackId: PRODUCTION_STACK_ID,
                        imageTag: env.IMAGE_TAG
                    )
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout ${REGISTRY} || true'
            deleteDir()
        }
        success {
            echo "Successfully deployed ${env.IMAGE_TAG}"
        }
        failure {
            emailext(
                subject: "FAILED: ${JOB_NAME} #${BUILD_NUMBER}",
                body: "Build failed. Details: ${BUILD_URL}",
                to: "devops@yourdomain.com"
            )
        }
    }
}

// Helper function to update a file-based stack via Portainer API.
// Assumes your stack file uses ${IMAGE_TAG} in the image reference.
def deployToPortainer(Map config) {
    sh """
        python3 - <<'PY' > portainer-payload.json
import json
from pathlib import Path

payload = {
    "StackFileContent": Path("docker-compose.yml").read_text(),
    "Env": [
        {"name": "IMAGE_TAG", "value": "${config.imageTag}"}
    ],
    "Prune": False,
    "RepullImageAndRedeploy": True
}

print(json.dumps(payload))
PY

        curl -fsS -X PUT \
            -H "X-API-Key: $PORTAINER_KEY" \
            -H "Content-Type: application/json" \
            "$PORTAINER_URL/api/stacks/${config.stackId}?endpointId=${config.endpointId}" \
            --data @portainer-payload.json | python3 -c "
import json,sys
r = json.load(sys.stdin)
if 'Id' in r:
    print('Stack updated successfully: ID=' + str(r['Id']))
else:
    print('Error: ' + json.dumps(r))
    sys.exit(1)
"
    """
}
```

## Step 5: Multibranch Pipeline Configuration

```groovy
// Jenkins Job DSL - Create multibranch pipeline automatically
multibranchPipelineJob('myapp-pipeline') {
    branchSources {
        github {
            id('myapp-github')
            repoOwner('yourorg')
            repository('myapp')
            credentialsId('github-token')
        }
    }
    orphanedItemStrategy {
        discardOldItems {
            numToKeep(10)
        }
    }
    triggers {
        periodicFolderTrigger {
            interval('5m')  // Fallback index scan every 5 minutes
        }
    }
}
```

## Conclusion

Jenkins pipelines with Portainer deployments give you a powerful, self-hosted CI/CD system. The declarative pipeline syntax makes it readable and maintainable, parallel stages speed up the pipeline, and the Portainer API integration keeps deployments managed and trackable. Use Jenkins shared libraries to extract common pipeline steps (like `deployToPortainer`) into a reusable library across all your projects.
