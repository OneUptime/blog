# How to Configure Jenkins Agents on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, Kubernetes, CI/CD, DevOps, Automation, Containers, Cloud Native

Description: A practical guide to configuring Jenkins agents on Kubernetes for scalable, ephemeral build environments with dynamic provisioning and resource management.

---

> Static Jenkins agents waste resources when idle and create bottlenecks during peak demand. Kubernetes-based agents spin up on demand, run your build, and disappear. You pay only for what you use.

## Installing the Kubernetes Plugin

The Kubernetes plugin is the foundation for running Jenkins agents on Kubernetes. It manages the lifecycle of agent pods automatically.

### Install via Jenkins UI

Navigate to **Manage Jenkins > Manage Plugins > Available** and search for "Kubernetes". Install the plugin and restart Jenkins.

### Install via Configuration as Code

```yaml
# jenkins-casc.yaml
# Jenkins Configuration as Code for Kubernetes plugin installation
jenkins:
  systemMessage: "Jenkins configured with Kubernetes agents"

unclassified:
  location:
    url: "https://jenkins.example.com/"

# Plugin installation is handled separately via plugins.txt
```

```text
# plugins.txt
# List of plugins to install - use with jenkins-plugin-cli
kubernetes:latest
workflow-aggregator:latest
git:latest
credentials-binding:latest
```

### Verify Installation

```groovy
// Run in Jenkins Script Console (Manage Jenkins > Script Console)
// Checks if Kubernetes plugin is installed and shows version
def plugin = Jenkins.instance.pluginManager.plugins.find {
    it.shortName == 'kubernetes'
}
println "Kubernetes plugin version: ${plugin?.version ?: 'NOT INSTALLED'}"
```

## Configuring the Kubernetes Cloud

Connect Jenkins to your Kubernetes cluster by configuring a cloud provider.

### Via Jenkins UI

Navigate to **Manage Jenkins > Manage Nodes and Clouds > Configure Clouds > Add a new cloud > Kubernetes**.

### Via Configuration as Code

```yaml
# jenkins-kubernetes-cloud.yaml
# Configures Jenkins to use Kubernetes for dynamic agent provisioning
jenkins:
  clouds:
    - kubernetes:
        # Name identifies this cloud configuration
        name: "kubernetes"

        # Kubernetes API server URL (leave blank if Jenkins runs in-cluster)
        serverUrl: ""

        # Namespace where agent pods will be created
        namespace: "jenkins"

        # URL for agents to connect back to Jenkins master
        # Use the Kubernetes service DNS name
        jenkinsUrl: "http://jenkins.jenkins.svc.cluster.local:8080"

        # Tunnel for JNLP agents (required for inbound agents)
        jenkinsTunnel: "jenkins-agent.jenkins.svc.cluster.local:50000"

        # Maximum number of concurrent agent pods
        containerCapStr: "10"

        # How long to keep idle agents before termination (seconds)
        retentionTimeout: 5

        # Connection timeout to Kubernetes API (seconds)
        connectTimeout: 5

        # Read timeout for Kubernetes API calls (seconds)
        readTimeout: 15
```

### In-Cluster vs External Configuration

```yaml
# When Jenkins runs inside Kubernetes (recommended)
# The plugin auto-discovers cluster credentials via service account
jenkins:
  clouds:
    - kubernetes:
        name: "kubernetes"
        serverUrl: ""  # Empty = use in-cluster config
        namespace: "jenkins"
        # Service account must have permissions to create pods

# When Jenkins runs outside Kubernetes
jenkins:
  clouds:
    - kubernetes:
        name: "kubernetes"
        serverUrl: "https://kubernetes.example.com:6443"
        # Reference a credential containing kubeconfig
        credentialsId: "kubeconfig-credential"
        namespace: "jenkins"
```

## Defining Pod Templates

Pod templates define the structure of agent pods including containers, volumes, and resource requirements.

### Basic Pod Template

```yaml
# jenkins-pod-template.yaml
# Defines a basic pod template for general-purpose builds
jenkins:
  clouds:
    - kubernetes:
        name: "kubernetes"
        namespace: "jenkins"
        templates:
          - name: "default"
            # Label used in Jenkinsfile to select this template
            label: "jenkins-agent"

            # Number of executors per pod
            instanceCap: 10

            # Idle timeout before pod termination (minutes)
            idleMinutes: 10

            # Pod-level settings
            yaml: |
              apiVersion: v1
              kind: Pod
              metadata:
                labels:
                  jenkins: agent
              spec:
                serviceAccountName: jenkins-agent
                securityContext:
                  runAsUser: 1000
                  fsGroup: 1000
```

### Multi-Container Pod Template

```yaml
# jenkins-multi-container.yaml
# Pod template with multiple specialized containers
jenkins:
  clouds:
    - kubernetes:
        name: "kubernetes"
        templates:
          - name: "full-stack"
            label: "full-stack"
            containers:
              # JNLP container for Jenkins communication (required)
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"
                # Always include JNLP container first
                args: '${computer.jnlpmac} ${computer.name}'

              # Container for building Node.js applications
              - name: "nodejs"
                image: "node:20-alpine"
                # Keep container running so we can exec into it
                command: "sleep"
                args: "infinity"
                ttyEnabled: true

              # Container for Docker builds (Docker-in-Docker)
              - name: "docker"
                image: "docker:24-dind"
                privileged: true
                command: "dockerd"
                args: "--host=unix:///var/run/docker.sock"

              # Container for kubectl commands
              - name: "kubectl"
                image: "bitnami/kubectl:latest"
                command: "sleep"
                args: "infinity"
                ttyEnabled: true
```

## Configuring Container Templates

Container templates define individual containers within a pod, including images, commands, and environment variables.

### Container Template Options

```yaml
# jenkins-container-template.yaml
# Detailed container template configuration
jenkins:
  clouds:
    - kubernetes:
        templates:
          - name: "maven-builder"
            label: "maven"
            containers:
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"

              - name: "maven"
                # Container image to use
                image: "maven:3.9-eclipse-temurin-17"

                # Working directory inside container
                workingDir: "/home/jenkins/agent"

                # Command to keep container alive
                command: "sleep"
                args: "infinity"

                # Enable TTY for interactive commands
                ttyEnabled: true

                # Environment variables
                envVars:
                  - envVar:
                      key: "MAVEN_OPTS"
                      value: "-Xmx1024m -XX:+UseG1GC"
                  - envVar:
                      key: "MAVEN_CONFIG"
                      value: "/home/jenkins/.m2"
                  # Reference secrets from Kubernetes
                  - secretEnvVar:
                      key: "NEXUS_PASSWORD"
                      secretName: "nexus-credentials"
                      secretKey: "password"

                # Resource requests and limits
                resourceRequestCpu: "500m"
                resourceRequestMemory: "1Gi"
                resourceLimitCpu: "2000m"
                resourceLimitMemory: "4Gi"
```

### Sharing Docker Socket

```yaml
# jenkins-docker-socket.yaml
# Configuration for sharing Docker socket with agent containers
# Use when you need to build Docker images but not run Docker-in-Docker
jenkins:
  clouds:
    - kubernetes:
        templates:
          - name: "docker-builder"
            label: "docker"
            # Mount Docker socket from host
            volumes:
              - hostPathVolume:
                  mountPath: "/var/run/docker.sock"
                  hostPath: "/var/run/docker.sock"
            containers:
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"
              - name: "docker"
                image: "docker:24-cli"
                command: "sleep"
                args: "infinity"
                ttyEnabled: true
            # Pod must run on nodes with Docker installed
            nodeSelector: "docker=true"
```

## Dynamic Provisioning

Kubernetes agents are created on-demand when builds start and destroyed when complete.

### How Dynamic Provisioning Works

```groovy
// Jenkinsfile demonstrating dynamic provisioning
// When this pipeline runs:
// 1. Jenkins requests a pod from Kubernetes
// 2. Pod starts with specified containers
// 3. Build executes inside the pod
// 4. Pod is deleted after build completes

pipeline {
    agent {
        kubernetes {
            // Reference pod template by label
            label 'maven'
        }
    }

    stages {
        stage('Build') {
            steps {
                // Runs in the maven container
                container('maven') {
                    sh 'mvn clean package'
                }
            }
        }
    }
}
```

### Inline Pod Definition

```groovy
// Jenkinsfile with inline pod definition
// Useful for pipelines that need custom container configurations
pipeline {
    agent {
        kubernetes {
            // Define pod inline using YAML
            yaml '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-build
spec:
  containers:
  # JNLP agent container - required for Jenkins communication
  - name: jnlp
    image: jenkins/inbound-agent:latest

  # Custom build container
  - name: golang
    image: golang:1.22
    command:
    - sleep
    args:
    - infinity
    volumeMounts:
    - name: go-cache
      mountPath: /go/pkg/mod

  volumes:
  # Cache Go modules across builds
  - name: go-cache
    persistentVolumeClaim:
      claimName: go-mod-cache
'''
        }
    }

    stages {
        stage('Build') {
            steps {
                container('golang') {
                    sh '''
                        go mod download
                        go build -o app ./cmd/server
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                container('golang') {
                    sh 'go test -v ./...'
                }
            }
        }
    }
}
```

### Parallel Builds with Dynamic Agents

```groovy
// Jenkinsfile demonstrating parallel builds
// Each parallel branch gets its own pod
pipeline {
    agent none  // No default agent - each stage defines its own

    stages {
        stage('Build All') {
            parallel {
                // Each parallel branch runs in a separate pod
                stage('Build Backend') {
                    agent {
                        kubernetes {
                            label 'maven'
                        }
                    }
                    steps {
                        container('maven') {
                            sh 'mvn clean package -pl backend'
                        }
                    }
                }

                stage('Build Frontend') {
                    agent {
                        kubernetes {
                            label 'nodejs'
                        }
                    }
                    steps {
                        container('nodejs') {
                            sh '''
                                npm ci
                                npm run build
                            '''
                        }
                    }
                }

                stage('Build Mobile') {
                    agent {
                        kubernetes {
                            label 'android'
                        }
                    }
                    steps {
                        container('android') {
                            sh './gradlew assembleRelease'
                        }
                    }
                }
            }
        }
    }
}
```

## Resource Limits and Requests

Properly configured resource limits prevent builds from consuming excessive cluster resources.

### Understanding Requests vs Limits

```yaml
# Resource definitions explained
# Requests: Minimum guaranteed resources (used for scheduling)
# Limits: Maximum resources container can use (enforced at runtime)

jenkins:
  clouds:
    - kubernetes:
        templates:
          - name: "resource-example"
            label: "resources"
            containers:
              - name: "builder"
                image: "maven:3.9"

                # CPU request: 500 millicores (0.5 CPU)
                # Kubernetes guarantees this much CPU
                resourceRequestCpu: "500m"

                # CPU limit: 2000 millicores (2 CPUs)
                # Container is throttled if it tries to exceed
                resourceLimitCpu: "2000m"

                # Memory request: 1 GiB
                # Kubernetes guarantees this much memory
                resourceRequestMemory: "1Gi"

                # Memory limit: 4 GiB
                # Container is OOMKilled if it exceeds
                resourceLimitMemory: "4Gi"
```

### Pod-Level Resource Configuration

```yaml
# jenkins-pod-resources.yaml
# Complete pod template with resource management
jenkins:
  clouds:
    - kubernetes:
        templates:
          - name: "production-build"
            label: "production"

            # Pod annotations for resource policies
            yaml: |
              apiVersion: v1
              kind: Pod
              metadata:
                annotations:
                  # Priority class for build pods
                  scheduler.alpha.kubernetes.io/priorityClassName: "build-priority"
              spec:
                # Tolerate dedicated build nodes
                tolerations:
                - key: "dedicated"
                  operator: "Equal"
                  value: "builds"
                  effect: "NoSchedule"

                # Prefer nodes labeled for builds
                affinity:
                  nodeAffinity:
                    preferredDuringSchedulingIgnoredDuringExecution:
                    - weight: 100
                      preference:
                        matchExpressions:
                        - key: node-type
                          operator: In
                          values:
                          - build

                # Set resource limits at pod level
                containers:
                - name: jnlp
                  resources:
                    requests:
                      cpu: "100m"
                      memory: "256Mi"
                    limits:
                      cpu: "500m"
                      memory: "512Mi"
```

### Ephemeral Storage Limits

```yaml
# jenkins-storage-limits.yaml
# Configure ephemeral storage limits for build artifacts
jenkins:
  clouds:
    - kubernetes:
        templates:
          - name: "storage-aware"
            label: "storage"
            yaml: |
              apiVersion: v1
              kind: Pod
              spec:
                containers:
                - name: jnlp
                  image: jenkins/inbound-agent:latest
                  resources:
                    requests:
                      ephemeral-storage: "1Gi"
                    limits:
                      # Limit temp storage to prevent filling node disk
                      ephemeral-storage: "10Gi"
                - name: builder
                  image: maven:3.9
                  resources:
                    requests:
                      ephemeral-storage: "2Gi"
                    limits:
                      ephemeral-storage: "20Gi"
```

## Persistent Workspaces

By default, agent workspaces are ephemeral. Configure persistent storage for caching dependencies and artifacts.

### PersistentVolumeClaim for Workspace

```yaml
# jenkins-pvc.yaml
# Create PVC for persistent workspace storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jenkins-workspace
  namespace: jenkins
spec:
  accessModes:
    - ReadWriteMany  # Required if multiple pods access simultaneously
  storageClassName: nfs  # Use a storage class that supports RWX
  resources:
    requests:
      storage: 50Gi
```

```yaml
# jenkins-persistent-workspace.yaml
# Pod template using persistent workspace
jenkins:
  clouds:
    - kubernetes:
        templates:
          - name: "persistent"
            label: "persistent-workspace"

            # Mount PVC for workspace persistence
            volumes:
              - persistentVolumeClaim:
                  claimName: "jenkins-workspace"
                  mountPath: "/home/jenkins/agent"
                  readOnly: false

            containers:
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"
                workingDir: "/home/jenkins/agent"
```

### Caching Dependencies with Persistent Volumes

```yaml
# jenkins-cache-volumes.yaml
# Separate caches for different dependency managers
jenkins:
  clouds:
    - kubernetes:
        templates:
          - name: "cached-build"
            label: "cached"

            volumes:
              # Maven local repository cache
              - persistentVolumeClaim:
                  claimName: "maven-cache"
                  mountPath: "/root/.m2/repository"

              # npm cache
              - persistentVolumeClaim:
                  claimName: "npm-cache"
                  mountPath: "/root/.npm"

              # Go modules cache
              - persistentVolumeClaim:
                  claimName: "go-cache"
                  mountPath: "/go/pkg/mod"

              # Gradle cache
              - persistentVolumeClaim:
                  claimName: "gradle-cache"
                  mountPath: "/root/.gradle"

            containers:
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"
              - name: "maven"
                image: "maven:3.9"
                command: "sleep"
                args: "infinity"
              - name: "nodejs"
                image: "node:20"
                command: "sleep"
                args: "infinity"
```

### Using emptyDir for Shared Temp Storage

```groovy
// Jenkinsfile using emptyDir for inter-container sharing
// emptyDir volumes exist for pod lifetime and are shared between containers
pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest

  - name: builder
    image: maven:3.9
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: shared-data
      mountPath: /shared

  - name: scanner
    image: sonarsource/sonar-scanner-cli:latest
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: shared-data
      mountPath: /shared

  volumes:
  # emptyDir: fast, temporary storage shared between containers
  - name: shared-data
    emptyDir:
      medium: Memory  # Use RAM for speed (optional)
      sizeLimit: 1Gi
'''
        }
    }

    stages {
        stage('Build') {
            steps {
                container('builder') {
                    sh '''
                        mvn clean package
                        cp -r target /shared/
                    '''
                }
            }
        }

        stage('Scan') {
            steps {
                container('scanner') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectBaseDir=/shared/target
                    '''
                }
            }
        }
    }
}
```

## Jenkinsfile Configuration Examples

Complete examples for common build scenarios.

### Java/Maven Build

```groovy
// Jenkinsfile for Java Maven project
// Complete CI pipeline with build, test, and deploy stages
pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    build: maven
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest
    resources:
      requests:
        cpu: 100m
        memory: 256Mi

  - name: maven
    image: maven:3.9-eclipse-temurin-17
    command: ["sleep", "infinity"]
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi
    volumeMounts:
    - name: maven-cache
      mountPath: /root/.m2/repository

  - name: docker
    image: docker:24-cli
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock

  volumes:
  - name: maven-cache
    persistentVolumeClaim:
      claimName: maven-cache
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }

    environment {
        // Define environment variables
        DOCKER_REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'myapp'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                container('maven') {
                    sh 'mvn clean compile -DskipTests'
                }
            }
        }

        stage('Test') {
            steps {
                container('maven') {
                    sh 'mvn test'
                }
            }
            post {
                always {
                    // Publish test results
                    junit '**/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Package') {
            steps {
                container('maven') {
                    sh 'mvn package -DskipTests'
                }
            }
        }

        stage('Build Image') {
            when {
                branch 'main'
            }
            steps {
                container('docker') {
                    sh '''
                        docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER} .
                        docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER}
                    '''
                }
            }
        }
    }

    post {
        failure {
            // Send notification on failure
            slackSend(
                color: 'danger',
                message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

### Node.js Build with Multiple Node Versions

```groovy
// Jenkinsfile for Node.js with matrix builds
// Tests against multiple Node.js versions in parallel
pipeline {
    agent none

    stages {
        stage('Test Matrix') {
            matrix {
                axes {
                    axis {
                        name 'NODE_VERSION'
                        values '18', '20', '22'
                    }
                }

                stages {
                    stage('Test') {
                        agent {
                            kubernetes {
                                yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest
  - name: nodejs
    image: node:${NODE_VERSION}-alpine
    command: ["sleep", "infinity"]
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
"""
                            }
                        }

                        steps {
                            container('nodejs') {
                                sh '''
                                    node --version
                                    npm ci
                                    npm test
                                '''
                            }
                        }
                    }
                }
            }
        }
    }
}
```

### Kubernetes Deployment Pipeline

```groovy
// Jenkinsfile for deploying to Kubernetes
// Includes image building, scanning, and rolling deployment
pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest

  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: docker-config
      mountPath: /kaniko/.docker

  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["sleep", "infinity"]

  - name: trivy
    image: aquasec/trivy:latest
    command: ["sleep", "infinity"]

  volumes:
  - name: docker-config
    secret:
      secretName: docker-registry-credentials
      items:
      - key: .dockerconfigjson
        path: config.json
'''
        }
    }

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE = "${REGISTRY}/myapp"
        TAG = "${env.GIT_COMMIT?.take(7) ?: 'latest'}"
    }

    stages {
        stage('Build Image') {
            steps {
                container('kaniko') {
                    sh '''
                        /kaniko/executor \
                          --context=dir://. \
                          --destination=${IMAGE}:${TAG} \
                          --cache=true \
                          --cache-repo=${REGISTRY}/cache
                    '''
                }
            }
        }

        stage('Scan Image') {
            steps {
                container('trivy') {
                    sh '''
                        trivy image \
                          --exit-code 1 \
                          --severity HIGH,CRITICAL \
                          ${IMAGE}:${TAG}
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                container('kubectl') {
                    sh '''
                        kubectl set image deployment/myapp \
                          myapp=${IMAGE}:${TAG} \
                          --namespace=staging

                        kubectl rollout status deployment/myapp \
                          --namespace=staging \
                          --timeout=5m
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            steps {
                container('kubectl') {
                    sh '''
                        kubectl set image deployment/myapp \
                          myapp=${IMAGE}:${TAG} \
                          --namespace=production

                        kubectl rollout status deployment/myapp \
                          --namespace=production \
                          --timeout=10m
                    '''
                }
            }
        }
    }
}
```

## Best Practices Summary

### Pod Template Best Practices

- Always include a JNLP container for Jenkins communication
- Use specific image tags instead of `latest` for reproducibility
- Set resource requests and limits on all containers
- Use read-only root filesystems where possible
- Run containers as non-root users with security contexts

### Resource Management Best Practices

- Set CPU requests to typical usage and limits to peak usage
- Set memory requests equal to limits to avoid OOM surprises
- Use LimitRanges to enforce defaults in the namespace
- Monitor resource usage and adjust based on actual consumption
- Consider using VPA (Vertical Pod Autoscaler) for dynamic adjustments

### Security Best Practices

- Create dedicated service accounts for Jenkins agents
- Use RBAC to limit agent permissions to required operations
- Avoid mounting the Docker socket when possible (use Kaniko instead)
- Store secrets in Kubernetes Secrets, not Jenkins credentials
- Enable Pod Security Standards to enforce security policies

### Performance Best Practices

- Use persistent volumes for dependency caches
- Configure appropriate idle timeouts to balance cost and availability
- Use node selectors or taints to run builds on dedicated nodes
- Enable pod templates caching to speed up pod creation
- Use parallel stages to maximize cluster utilization

### Reliability Best Practices

- Set appropriate timeouts on all pipeline stages
- Configure retry logic for transient failures
- Use pod disruption budgets for the Jenkins controller
- Implement health checks in custom container images
- Monitor Jenkins and Kubernetes metrics with OneUptime

---

Running Jenkins agents on Kubernetes transforms your CI/CD from a capacity-constrained bottleneck into an elastic, cost-efficient system. Pods spin up in seconds, execute builds in isolated environments, and vanish when done. Combined with proper caching and resource management, you get fast, reliable builds that scale with your team.

Monitor your Jenkins pipelines, Kubernetes cluster health, and build performance in one place with [OneUptime](https://oneuptime.com). Track build times, detect failures, and get alerted before issues impact your development velocity.
