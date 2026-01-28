# How to Use Jenkins with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, Docker, CI/CD, Containers, DevOps

Description: Learn how to run Jenkins builds in Docker, use Docker agents, and build container images safely in pipelines.

---

Docker makes Jenkins builds reproducible and isolated. You can run Jenkins itself in Docker or use Docker-based agents for builds. This guide covers both patterns.

## Run Jenkins in Docker

```bash
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts
```

This persists Jenkins data in a Docker volume.

## Use Docker Agents in Pipelines

Jenkins pipelines can run steps inside Docker containers:

```groovy
pipeline {
  agent {
    docker { image 'node:20' }
  }
  stages {
    stage('Test') {
      steps {
        sh 'npm ci'
        sh 'npm test'
      }
    }
  }
}
```

## Build Docker Images in Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Build Image') {
      steps {
        sh 'docker build -t my-app:${BUILD_NUMBER} .'
      }
    }
  }
}
```

If Jenkins runs in Docker, you need access to the Docker daemon. The simplest option is mounting the host socket, but this has security risks.

## Safer Alternatives

- Use Docker-in-Docker (DinD) in a dedicated agent
- Use a remote build service like Kaniko or BuildKit

## Best Practices

- Avoid running builds on the controller
- Use dedicated agents per pipeline
- Keep Docker images pinned by version

## Conclusion

Jenkins with Docker gives you clean, isolated builds. Use Docker agents for reproducibility and keep build security in mind when accessing the Docker daemon.
