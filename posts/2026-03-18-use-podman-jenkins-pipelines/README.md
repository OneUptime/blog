# How to Use Podman in Jenkins Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Jenkins, CI/CD, Pipeline

Description: Learn how to replace Docker with Podman in Jenkins pipelines for building, testing, and deploying container images with improved security.

---

> Podman in Jenkins pipelines gives you rootless, daemonless container operations without requiring the Jenkins agent to have Docker socket access.

Jenkins remains one of the most widely used CI/CD servers, and Podman offers a more secure alternative to Docker for container operations within Jenkins pipelines. By removing the need for the Docker daemon and socket mounting, you reduce the attack surface of your CI environment. This guide shows you how to configure Jenkins to use Podman in declarative pipelines.

---

## Installing Podman on Jenkins Agents

Before using Podman in your pipelines, ensure it is installed on your Jenkins agents. For rootless Podman, the Jenkins user also needs subordinate UID/GID mappings in `/etc/subuid` and `/etc/subgid`, and the agent needs a rootless networking helper such as `passt`.

```bash
#!/bin/bash
# Install Podman on Ubuntu-based Jenkins agents

sudo apt-get update
sudo apt-get install -y podman fuse-overlayfs passt

# Verify the installation
podman --version

# Configure storage for the Jenkins user
# Create storage configuration for rootless operation
mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
# Use fuse-overlayfs for rootless overlay storage
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Verify Podman works for the Jenkins user
podman info --format '{{.Store.GraphDriverName}}'
```

## Basic Declarative Pipeline with Podman

Create a Jenkinsfile that uses Podman for container operations.

```groovy
// Jenkinsfile - Declarative pipeline using Podman
pipeline {
    agent any

    environment {
        // Define the image name and tag
        IMAGE_NAME = "myapp"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        REGISTRY = "registry.example.com"
    }

    stages {
        stage('Verify Podman') {
            steps {
                // Confirm Podman is available on this agent
                sh 'podman --version'
                sh 'podman info'
            }
        }

        stage('Build Image') {
            steps {
                // Build the container image using Podman
                sh """
                    podman build \
                        --tag ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                        --tag ${REGISTRY}/${IMAGE_NAME}:latest \
                        .
                """
            }
        }

        stage('Run Tests') {
            steps {
                // Execute the test suite inside the container
                sh """
                    podman run --rm \
                        ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                        npm test
                """
            }
        }

        stage('Push Image') {
            when {
                // Requires a Multibranch Pipeline job
                branch 'main'
            }
            steps {
                // Log in and push the image to the registry
                withCredentials([usernamePassword(
                    credentialsId: 'registry-creds',
                    usernameVariable: 'REG_USER',
                    passwordVariable: 'REG_PASS'
                )]) {
                    sh """
                        set +x
                        printf '%s' "\$REG_PASS" | podman login \
                            --username "\$REG_USER" \
                            --password-stdin \
                            ${REGISTRY}
                        set -x

                        podman push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        podman push ${REGISTRY}/${IMAGE_NAME}:latest
                    """
                }
            }
        }
    }

    post {
        always {
            // Clean up unused images to save disk space on the agent
            sh 'podman image prune -af || true'
        }
    }
}
```

## Multi-Container Integration Testing

Use Podman to spin up dependent services within your Jenkins pipeline.

```groovy
// Jenkinsfile - Integration testing with Podman pods
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'podman build -t myapp:test .'
            }
        }

        stage('Integration Test') {
            steps {
                // Create a pod for grouping test containers
                sh 'podman pod create --name jenkins-test-pod'

                // Start the database inside the pod
                sh """
                    podman run -d \
                        --pod jenkins-test-pod \
                        --name test-db \
                        -e POSTGRES_PASSWORD=secret \
                        -e POSTGRES_DB=testdb \
                        docker.io/library/postgres:16
                """

                // Wait for database readiness
                sh '''
                    for i in $(seq 1 30); do
                        if podman exec test-db pg_isready -U postgres -d testdb; then
                            exit 0
                        fi
                        sleep 2
                    done
                    exit 1
                '''

                // Run integration tests against the database
                sh """
                    podman run --rm \
                        --pod jenkins-test-pod \
                        -e DB_HOST=localhost \
                        -e DB_PASS=secret \
                        myapp:test npm run test:integration
                """
            }
            post {
                always {
                    // Tear down the pod and its containers
                    sh 'podman pod rm -f jenkins-test-pod || true'
                }
            }
        }
    }
}
```

## Creating a Podman Docker Alias

If you have existing Jenkins pipelines that call `docker`, you can provide a Docker-compatible entry point for Podman so many commands continue to work with minimal changes.

```bash
#!/bin/bash
# Create a docker-compatible entry point that points to podman on the Jenkins agent
# Many docker commands work unchanged, but verify your pipeline after switching

# Option 1: Symlink (requires root)
sudo ln -sf /usr/bin/podman /usr/local/bin/docker

# Option 2: Bash alias for interactive shells only
# Jenkins sh steps use the agent's default shell, not ~/.bashrc
echo 'alias docker=podman' >> ~jenkins/.bashrc

# Option 3: Wrapper script for non-interactive shells
sudo tee /usr/local/bin/docker << 'SCRIPT'
#!/bin/bash
# Wrapper script that forwards docker commands to podman
exec podman "$@"
SCRIPT
sudo chmod +x /usr/local/bin/docker

# Verify the alias works
docker --version  # Should show podman version
```

## Summary

Podman integrates well with Jenkins pipelines, offering a daemonless and rootless container runtime that improves security. You can use Podman in Jenkins pipelines for building images, running tests, and pushing to registries. The pod feature simplifies multi-container integration testing, and the Docker CLI compatibility means you can migrate many existing pipelines with minimal changes. Clean up unused images in post-build steps to keep your Jenkins agents healthy.
