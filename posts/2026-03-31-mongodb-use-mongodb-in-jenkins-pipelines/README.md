# How to Use MongoDB in Jenkins Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Jenkins, CI/CD, Pipeline, Testing

Description: Set up MongoDB in Jenkins pipelines using Docker agents and service containers to run integration tests with a real database instance.

---

## Introduction

Jenkins Pipelines can use Docker-based agents to spin up MongoDB for integration tests. Whether you use declarative or scripted pipelines, Docker gives you ephemeral, reproducible MongoDB instances for every build. This guide covers two common approaches: `docker run` in pipeline steps, and Docker Compose for multi-container setups.

## Declarative Pipeline with Docker Agent

```groovy
pipeline {
    agent {
        docker {
            image 'node:20-alpine'
            args '--network host'
        }
    }

    environment {
        MONGODB_URI = 'mongodb://localhost:27017/testdb'
    }

    stages {
        stage('Start MongoDB') {
            steps {
                sh '''
                    docker run -d \
                      --name mongodb-test-${BUILD_NUMBER} \
                      --network host \
                      -e MONGO_INITDB_DATABASE=testdb \
                      mongo:7.0

                    # Wait for MongoDB to be ready
                    for i in $(seq 1 30); do
                      docker exec mongodb-test-${BUILD_NUMBER} \
                        mongosh --eval "db.adminCommand('ping')" && break
                      echo "Waiting for MongoDB..."
                      sleep 2
                    done
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Run Integration Tests') {
            steps {
                sh 'npm run test:integration'
            }
        }
    }

    post {
        always {
            sh 'docker rm -f mongodb-test-${BUILD_NUMBER} || true'
        }
    }
}
```

## Using Docker Compose in Jenkins

For more complex setups, use Docker Compose:

```yaml
# docker-compose.test.yml
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: testdb
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    depends_on:
      mongodb:
        condition: service_healthy
    environment:
      MONGODB_URI: mongodb://mongodb:27017/testdb
    command: npm run test:integration
```

```groovy
pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh 'docker compose -f docker-compose.test.yml up --exit-code-from app'
            }
        }
    }

    post {
        always {
            sh 'docker compose -f docker-compose.test.yml down -v'
        }
    }
}
```

## Shared Library for MongoDB Setup

Create a Jenkins shared library to reuse MongoDB setup logic:

```groovy
// vars/withMongoDB.groovy
def call(Map config = [:], Closure body) {
    def mongoVersion = config.get('version', '7.0')
    def mongoPort = config.get('port', 27017)
    def containerName = "mongodb-${env.BUILD_NUMBER}"

    try {
        sh """
            docker run -d --name ${containerName} \
              -p ${mongoPort}:27017 \
              mongo:${mongoVersion}
        """
        waitUntilReady(containerName)
        body()
    } finally {
        sh "docker rm -f ${containerName} || true"
    }
}

def waitUntilReady(String containerName) {
    retry(15) {
        sleep(2)
        sh "docker exec ${containerName} mongosh --eval \"db.adminCommand('ping')\""
    }
}
```

## Storing Test Artifacts

```groovy
stage('Run Tests') {
    steps {
        sh 'npm run test:integration -- --reporter junit --reporter-options output=test-results.xml'
    }
    post {
        always {
            junit 'test-results.xml'
        }
    }
}
```

## Summary

Jenkins Pipelines work well with MongoDB through Docker-based workflows. Use `--network host` or Docker Compose networks to connect your test runner to MongoDB, always clean up containers in `post { always }` blocks, and consider shared libraries to standardize MongoDB test setup across teams. The declarative pipeline approach keeps configuration readable, while Docker Compose handles dependency ordering through health checks.
