# How to Deploy Jenkins via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Jenkins, CI/CD, Docker, Deployment

Description: Learn how to deploy Jenkins via Portainer with Docker-in-Docker support, persistent job storage, and Blue Ocean UI for a self-hosted CI/CD pipeline.

## Jenkins via Portainer Stack

**Stacks → Add Stack → jenkins**

```yaml
version: "3.8"

services:
  jenkins:
    image: jenkins/jenkins:lts-jdk21
    restart: unless-stopped
    user: root    # Required for Docker socket access
    ports:
      - "8080:8080"     # Jenkins Web UI
      - "50000:50000"   # Agent connection port
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock    # Docker builds
      - /usr/bin/docker:/usr/bin/docker               # Docker CLI
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:8080/login | grep -q Jenkins"]
      interval: 30s
      retries: 10

volumes:
  jenkins_home:
```

## Initial Setup

After deploying, get the initial admin password:

```bash
# Via Portainer exec

cat /var/jenkins_home/secrets/initialAdminPassword

# Or from logs
# Portainer: Stacks > jenkins > jenkins > Logs > search for "initialAdminPassword"
```

Visit `http://server:8080`, paste the password, and complete setup.

## Custom Jenkins Image with Pre-Installed Plugins

Create a `Dockerfile` in your Git repository:

```dockerfile
FROM jenkins/jenkins:lts-jdk21

# Disable setup wizard (configure admin via JCasC / Groovy init script instead)
ENV JAVA_OPTS=-Djenkins.install.runSetupWizard=false

# Install plugins from plugins.txt
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
```

```text
# plugins.txt
blueocean:latest
docker-plugin:latest
git:latest
pipeline-stage-view:latest
credentials-binding:latest
ssh-slaves:latest
kubernetes:latest
```

Build and push, then use in Portainer stack:

```yaml
services:
  jenkins:
    image: your-registry/jenkins-custom:latest
```

## Example Jenkinsfile

```groovy
// Jenkinsfile (in your application repo)
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'docker build -t myapp:${BUILD_NUMBER} .'
            }
        }

        stage('Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_PASS'
                )]) {
                    sh '''
                        docker login -u $REGISTRY_USER -p $REGISTRY_PASS registry.example.com
                        docker push registry.example.com/myapp:${BUILD_NUMBER}
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(
                    credentialsId: 'portainer-webhook',
                    variable: 'WEBHOOK_URL'
                )]) {
                    sh 'curl -s -X POST "$WEBHOOK_URL?tag=${BUILD_NUMBER}"'
                }
            }
        }
    }
}
```

## Jenkins Backup

```bash
# Backup Jenkins home via Portainer exec
tar czf /tmp/jenkins-backup-$(date +%Y%m%d).tar.gz /var/jenkins_home

# Copy out
docker cp jenkins:/tmp/jenkins-backup-20260320.tar.gz /backup/
```

## Conclusion

Jenkins deployed via Portainer with Docker socket access gives you a self-hosted CI/CD platform capable of building and pushing Docker images, then triggering Portainer webhooks to deploy. The Docker socket mount is the key enabler - it lets Jenkins build images and interact with the same Docker engine that Portainer manages.
