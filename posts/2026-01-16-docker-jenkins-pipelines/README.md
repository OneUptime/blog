# How to Build Docker Images in Jenkins Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Jenkins, CI/CD, DevOps, Pipelines

Description: Learn how to build Docker images in Jenkins pipelines, including Declarative and Scripted pipelines, Docker agents, multi-stage builds, and registry integration.

---

Jenkins pipelines provide powerful automation for building, testing, and deploying Docker images. This guide covers both Declarative and Scripted pipelines with Docker integration.

## Jenkins Docker Setup

### Installing Docker Plugin

```groovy
// Manage Jenkins > Manage Plugins > Available
// Install: Docker Pipeline, Docker, Docker API
```

### Configuring Docker on Jenkins Agent

```bash
# Add jenkins user to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins
sudo systemctl restart jenkins

# Verify Docker access
sudo -u jenkins docker ps
```

## Basic Pipeline Examples

### Declarative Pipeline with Docker Agent

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'node:20'
            args '-v /tmp:/tmp'
        }
    }

    stages {
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
    }
}
```

### Building Docker Images

```groovy
pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'myapp'
        DOCKER_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Build Image') {
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                }
            }
        }

        stage('Test Image') {
            steps {
                script {
                    docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").inside {
                        sh 'npm test'
                    }
                }
            }
        }
    }
}
```

## Docker Agent Options

### Custom Docker Agent

```groovy
pipeline {
    agent {
        docker {
            image 'maven:3.9-eclipse-temurin-21'
            label 'docker-agent'
            args '-v $HOME/.m2:/root/.m2 -v /var/run/docker.sock:/var/run/docker.sock'
            registryUrl 'https://registry.example.com'
            registryCredentialsId 'docker-registry-creds'
        }
    }

    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
    }
}
```

### Multiple Docker Agents

```groovy
pipeline {
    agent none

    stages {
        stage('Build') {
            agent {
                docker { image 'node:20' }
            }
            steps {
                sh 'npm install'
                sh 'npm run build'
                stash includes: 'dist/**', name: 'build-artifacts'
            }
        }

        stage('Test') {
            agent {
                docker { image 'node:20-alpine' }
            }
            steps {
                unstash 'build-artifacts'
                sh 'npm test'
            }
        }

        stage('Security Scan') {
            agent {
                docker { image 'aquasec/trivy' }
            }
            steps {
                sh 'trivy fs --exit-code 1 --severity HIGH,CRITICAL .'
            }
        }
    }
}
```

## Building and Pushing Images

### Basic Build and Push

```groovy
pipeline {
    agent any

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'myapp'
        DOCKER_CREDENTIALS = credentials('docker-registry-creds')
    }

    stages {
        stage('Build') {
            steps {
                script {
                    dockerImage = docker.build("${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER}")
                }
            }
        }

        stage('Push') {
            steps {
                script {
                    docker.withRegistry("https://${REGISTRY}", 'docker-registry-creds') {
                        dockerImage.push()
                        dockerImage.push('latest')
                    }
                }
            }
        }
    }

    post {
        always {
            sh "docker rmi ${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER} || true"
        }
    }
}
```

### Multi-Registry Push

```groovy
pipeline {
    agent any

    environment {
        IMAGE_NAME = 'myapp'
        VERSION = "${BUILD_NUMBER}"
    }

    stages {
        stage('Build') {
            steps {
                script {
                    dockerImage = docker.build("${IMAGE_NAME}:${VERSION}")
                }
            }
        }

        stage('Push to Multiple Registries') {
            parallel {
                stage('Docker Hub') {
                    steps {
                        script {
                            docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-creds') {
                                dockerImage.push("${VERSION}")
                                dockerImage.push('latest')
                            }
                        }
                    }
                }

                stage('AWS ECR') {
                    steps {
                        script {
                            docker.withRegistry('https://123456789.dkr.ecr.us-east-1.amazonaws.com', 'ecr:us-east-1:aws-creds') {
                                dockerImage.push("${VERSION}")
                            }
                        }
                    }
                }

                stage('GCR') {
                    steps {
                        script {
                            docker.withRegistry('https://gcr.io', 'gcr-creds') {
                                dockerImage.push("${VERSION}")
                            }
                        }
                    }
                }
            }
        }
    }
}
```

## Docker Compose in Jenkins

### Running Docker Compose

```groovy
pipeline {
    agent any

    stages {
        stage('Start Services') {
            steps {
                sh 'docker-compose up -d'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'docker-compose exec -T app npm test'
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker-compose down -v'
            }
        }
    }

    post {
        always {
            sh 'docker-compose down -v || true'
        }
    }
}
```

### Docker Compose with Environment Variables

```groovy
pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = "jenkins-${BUILD_NUMBER}"
        DATABASE_URL = 'postgresql://postgres:password@db:5432/test'
    }

    stages {
        stage('Integration Tests') {
            steps {
                sh '''
                    docker-compose -f docker-compose.test.yml up -d db
                    docker-compose -f docker-compose.test.yml run --rm app npm run test:integration
                '''
            }
        }
    }

    post {
        always {
            sh 'docker-compose -f docker-compose.test.yml down -v || true'
        }
    }
}
```

## Multi-Stage Builds

### Optimized Dockerfile

```dockerfile
# Dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Pipeline with Build Arguments

```groovy
pipeline {
    agent any

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'myapp'
    }

    stages {
        stage('Build') {
            steps {
                script {
                    dockerImage = docker.build(
                        "${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER}",
                        "--build-arg VERSION=${BUILD_NUMBER} " +
                        "--build-arg BUILD_DATE=\$(date -u +%Y-%m-%dT%H:%M:%SZ) " +
                        "--build-arg GIT_COMMIT=${GIT_COMMIT} " +
                        "-f Dockerfile ."
                    )
                }
            }
        }
    }
}
```

## BuildKit Integration

### Enable BuildKit

```groovy
pipeline {
    agent any

    environment {
        DOCKER_BUILDKIT = '1'
    }

    stages {
        stage('Build with BuildKit') {
            steps {
                sh '''
                    docker build \
                        --build-arg BUILDKIT_INLINE_CACHE=1 \
                        --cache-from ${REGISTRY}/${IMAGE_NAME}:latest \
                        -t ${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER} \
                        .
                '''
            }
        }
    }
}
```

### BuildKit with Cache Mounts

```dockerfile
# Dockerfile with cache mounts
# syntax=docker/dockerfile:1.4
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build
```

## Docker-in-Docker Setup

### Using DinD in Jenkins

```groovy
pipeline {
    agent {
        docker {
            image 'docker:dind'
            args '--privileged -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    stages {
        stage('Build Nested Image') {
            steps {
                sh 'docker build -t nested-image .'
            }
        }
    }
}
```

### DinD with Docker Compose

```yaml
# docker-compose.jenkins.yml
version: '3.8'

services:
  jenkins:
    image: jenkins/jenkins:lts
    privileged: true
    user: root
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DOCKER_HOST=unix:///var/run/docker.sock

volumes:
  jenkins_home:
```

## Credentials Management

### Using Docker Credentials

```groovy
pipeline {
    agent any

    stages {
        stage('Login and Build') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin registry.example.com
                        docker build -t registry.example.com/myapp:${BUILD_NUMBER} .
                        docker push registry.example.com/myapp:${BUILD_NUMBER}
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout registry.example.com'
        }
    }
}
```

### AWS ECR Authentication

```groovy
pipeline {
    agent any

    environment {
        AWS_DEFAULT_REGION = 'us-east-1'
        ECR_REGISTRY = '123456789.dkr.ecr.us-east-1.amazonaws.com'
    }

    stages {
        stage('Login to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    sh '''
                        aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | \
                        docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    '''
                }
            }
        }

        stage('Build and Push') {
            steps {
                sh '''
                    docker build -t ${ECR_REGISTRY}/myapp:${BUILD_NUMBER} .
                    docker push ${ECR_REGISTRY}/myapp:${BUILD_NUMBER}
                '''
            }
        }
    }
}
```

## Complete Production Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'myapp'
        DOCKER_BUILDKIT = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    dockerImage = docker.build(
                        "${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT_SHORT}",
                        "--build-arg VERSION=${GIT_COMMIT_SHORT} ."
                    )
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            dockerImage.inside {
                                sh 'npm test'
                            }
                        }
                    }
                }

                stage('Lint') {
                    steps {
                        script {
                            dockerImage.inside {
                                sh 'npm run lint'
                            }
                        }
                    }
                }
            }
        }

        stage('Security Scan') {
            steps {
                sh """
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy image \
                        --exit-code 0 \
                        --severity HIGH,CRITICAL \
                        ${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT_SHORT}
                """
            }
        }

        stage('Push') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    docker.withRegistry("https://${REGISTRY}", 'docker-registry-creds') {
                        dockerImage.push("${GIT_COMMIT_SHORT}")

                        if (env.BRANCH_NAME == 'main') {
                            dockerImage.push('latest')
                        }
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh """
                    curl -X POST \
                        -H 'Authorization: Bearer ${DEPLOY_TOKEN}' \
                        '${DEPLOY_URL}/staging?image=${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT_SHORT}'
                """
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
                sh """
                    curl -X POST \
                        -H 'Authorization: Bearer ${DEPLOY_TOKEN}' \
                        '${DEPLOY_URL}/production?image=${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT_SHORT}'
                """
            }
        }
    }

    post {
        always {
            sh "docker rmi ${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT_SHORT} || true"
            cleanWs()
        }

        success {
            slackSend(
                color: 'good',
                message: "Build succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }

        failure {
            slackSend(
                color: 'danger',
                message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

## Shared Libraries

### Docker Build Library

```groovy
// vars/dockerBuild.groovy
def call(Map config = [:]) {
    def registry = config.registry ?: 'docker.io'
    def imageName = config.imageName ?: error('imageName is required')
    def tag = config.tag ?: env.BUILD_NUMBER
    def dockerfile = config.dockerfile ?: 'Dockerfile'

    def fullImageName = "${registry}/${imageName}:${tag}"

    docker.build(fullImageName, "-f ${dockerfile} .")

    return fullImageName
}
```

### Using Shared Library

```groovy
@Library('my-shared-library') _

pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                script {
                    def image = dockerBuild(
                        registry: 'registry.example.com',
                        imageName: 'myapp',
                        tag: env.GIT_COMMIT_SHORT
                    )
                    echo "Built image: ${image}"
                }
            }
        }
    }
}
```

## Troubleshooting

### Permission Denied

```bash
# Add jenkins to docker group
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

# Or use sudo in pipeline (not recommended)
sh 'sudo docker build .'
```

### Docker Daemon Not Running

```groovy
stage('Check Docker') {
    steps {
        sh '''
            docker info || (
                echo "Docker daemon not running"
                exit 1
            )
        '''
    }
}
```

### Cleanup Old Images

```groovy
post {
    always {
        sh '''
            # Remove dangling images
            docker image prune -f

            # Remove images older than 24h
            docker image prune -a --filter "until=24h" -f
        '''
    }
}
```

## Summary

| Approach | Use Case | Complexity |
|----------|----------|------------|
| Docker agent | Run builds in containers | Low |
| docker.build() | Build Docker images | Low |
| Docker Compose | Integration tests | Medium |
| DinD | Nested Docker builds | High |
| Socket binding | Better performance | Medium |

Jenkins Docker integration provides flexible CI/CD pipelines for containerized applications. Use Docker agents for isolated builds, the docker.build() method for image creation, and proper credential management for registry authentication. For layer caching strategies, see our post on [Docker Layer Caching in CI/CD](https://oneuptime.com/blog/post/2026-01-16-docker-layer-caching-cicd/view).

