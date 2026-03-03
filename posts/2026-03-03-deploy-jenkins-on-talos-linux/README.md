# How to Deploy Jenkins on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Jenkins, CI/CD, Kubernetes, DevOps

Description: A complete guide to deploying Jenkins on Talos Linux with Kubernetes, covering installation, agent configuration, and pipeline setup for production use.

---

Jenkins has been the workhorse of CI/CD pipelines for over a decade. While newer tools have emerged, Jenkins remains the most widely deployed automation server, with thousands of plugins and a massive community. Running Jenkins on Talos Linux gives you a CI/CD platform on top of a secure, immutable Kubernetes platform. The Kubernetes plugin for Jenkins makes it particularly powerful, as it can dynamically spin up build agents as pods and tear them down when builds complete.

This guide covers deploying Jenkins on Talos Linux, configuring dynamic Kubernetes agents, and setting up production-ready pipelines.

## Prerequisites

Before starting, ensure you have:

- A Talos Linux cluster with at least 2 worker nodes
- kubectl configured and connected
- Helm v3 installed
- A StorageClass for persistent volumes (Jenkins needs persistent storage)
- Sufficient CPU and memory for build workloads

## Installing Jenkins with Helm

Deploy Jenkins using the official Helm chart.

```bash
# Add the Jenkins Helm repository
helm repo add jenkins https://charts.jenkins.io

# Update the chart cache
helm repo update

# Create a namespace for Jenkins
kubectl create namespace jenkins
```

Create a values file for the installation.

```yaml
# jenkins-values.yaml
controller:
  # Jenkins controller configuration
  image:
    tag: "lts-jdk17"

  # Resource allocation
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"

  # Persistent storage for Jenkins home
  persistence:
    enabled: true
    size: 50Gi
    storageClass: local-path

  # Install essential plugins
  installPlugins:
    - kubernetes:latest
    - workflow-aggregator:latest
    - git:latest
    - configuration-as-code:latest
    - pipeline-stage-view:latest
    - blueocean:latest
    - credentials-binding:latest
    - docker-workflow:latest

  # Jenkins Configuration as Code
  JCasC:
    configScripts:
      welcome-message: |
        jenkins:
          systemMessage: "Jenkins on Talos Linux - Managed by Helm"

  # Service configuration
  serviceType: ClusterIP

  # Admin password (use a secret in production)
  adminPassword: "change-me-immediately"

agent:
  # Enable Kubernetes-based agents
  enabled: true
  # Default agent image
  image:
    repository: "jenkins/inbound-agent"
    tag: "latest-jdk17"
  resources:
    requests:
      cpu: "256m"
      memory: "512Mi"
    limits:
      cpu: "1"
      memory: "1Gi"
```

```bash
# Install Jenkins
helm install jenkins \
  jenkins/jenkins \
  --namespace jenkins \
  -f jenkins-values.yaml

# Wait for Jenkins to be ready
kubectl get pods -n jenkins -w

# Get the admin password
kubectl exec -n jenkins jenkins-0 -- cat /run/secrets/additional/chart-admin-password

# Set up port forwarding to access the UI
kubectl port-forward -n jenkins svc/jenkins 8080:8080
```

## Configuring Kubernetes Cloud

Jenkins needs to be configured to use Kubernetes for dynamic agent provisioning. With the Helm chart, this is mostly automatic, but you can customize it.

```yaml
# Add to jenkins-values.yaml under controller.JCasC.configScripts
cloud-config: |
  jenkins:
    clouds:
      - kubernetes:
          name: "kubernetes"
          serverUrl: "https://kubernetes.default.svc"
          namespace: "jenkins"
          jenkinsUrl: "http://jenkins.jenkins.svc:8080"
          jenkinsTunnel: "jenkins-agent.jenkins.svc:50000"
          # Maximum number of concurrent agents
          containerCapStr: "20"
          # How long to retain idle agents
          retentionTimeout: 5
          templates:
            - name: "default-agent"
              label: "jenkins-agent"
              nodeUsageMode: NORMAL
              containers:
                - name: "jnlp"
                  image: "jenkins/inbound-agent:latest-jdk17"
                  resourceRequestCpu: "256m"
                  resourceRequestMemory: "512Mi"
                  resourceLimitCpu: "1"
                  resourceLimitMemory: "1Gi"
                  workingDir: "/home/jenkins/agent"
```

## Creating Custom Agent Pod Templates

For different build types, create specialized agent templates.

```yaml
# Pod template for Docker builds (using Kaniko)
docker-build-template: |
  jenkins:
    clouds:
      - kubernetes:
          templates:
            - name: "docker-builder"
              label: "docker"
              containers:
                - name: "jnlp"
                  image: "jenkins/inbound-agent:latest-jdk17"
                  workingDir: "/home/jenkins/agent"
                - name: "kaniko"
                  image: "gcr.io/kaniko-project/executor:debug"
                  command: "/busybox/cat"
                  ttyEnabled: true
                  workingDir: "/home/jenkins/agent"
              volumes:
                - secretVolume:
                    secretName: "docker-credentials"
                    mountPath: "/kaniko/.docker"

            - name: "node-builder"
              label: "nodejs"
              containers:
                - name: "jnlp"
                  image: "jenkins/inbound-agent:latest-jdk17"
                  workingDir: "/home/jenkins/agent"
                - name: "node"
                  image: "node:20-alpine"
                  command: "cat"
                  ttyEnabled: true
                  workingDir: "/home/jenkins/agent"
```

## Writing a Kubernetes Pipeline

Here is a complete Jenkinsfile that uses Kubernetes agents.

```groovy
// Jenkinsfile
pipeline {
    agent {
        kubernetes {
            // Use a custom pod template
            yaml '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins-build: "true"
spec:
  containers:
    - name: golang
      image: golang:1.22
      command:
        - cat
      tty: true
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2
          memory: 2Gi
    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command:
        - /busybox/cat
      tty: true
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: docker-config
      secret:
        secretName: docker-registry-credentials
'''
        }
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                container('golang') {
                    sh '''
                        # Build the Go application
                        go mod download
                        go build -o app ./cmd/server
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                container('golang') {
                    sh '''
                        # Run tests with coverage
                        go test -v -coverprofile=coverage.out ./...
                    '''
                }
            }
        }

        stage('Build Image') {
            when {
                branch 'main'
            }
            steps {
                container('kaniko') {
                    sh '''
                        /kaniko/executor \
                          --dockerfile=Dockerfile \
                          --context=dir:///home/jenkins/agent/workspace/${JOB_NAME} \
                          --destination=registry.example.com/myapp:${BUILD_NUMBER}
                    '''
                }
            }
        }
    }

    post {
        always {
            // Clean up workspace
            cleanWs()
        }
    }
}
```

## Securing Jenkins on Talos Linux

### RBAC Configuration

Limit the permissions Jenkins has in your cluster.

```yaml
# jenkins-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: jenkins-agent
  namespace: jenkins
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["create", "delete", "get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create", "get"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["watch"]
```

### Network Policies

Restrict Jenkins network access.

```yaml
# jenkins-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: jenkins-network
  namespace: jenkins
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: jenkins
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress
      ports:
        - port: 8080
  egress:
    # Allow DNS
    - to: []
      ports:
        - port: 53
          protocol: UDP
    # Allow Git access
    - to: []
      ports:
        - port: 443
        - port: 22
```

## Exposing Jenkins with Ingress

```yaml
# jenkins-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jenkins
  namespace: jenkins
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - jenkins.example.com
      secretName: jenkins-tls
  rules:
    - host: jenkins.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: jenkins
                port:
                  number: 8080
```

## Backup and Recovery

Jenkins state is stored on the persistent volume. Set up regular backups.

```bash
# Create a backup of Jenkins configuration
kubectl exec -n jenkins jenkins-0 -- tar czf /tmp/jenkins-backup.tar.gz /var/jenkins_home

# Copy the backup locally
kubectl cp jenkins/jenkins-0:/tmp/jenkins-backup.tar.gz ./jenkins-backup.tar.gz
```

## Wrapping Up

Jenkins on Talos Linux gives you a mature, battle-tested CI/CD platform running on a secure, immutable infrastructure. The Kubernetes plugin dynamically provisions build agents as pods, which means you never waste resources on idle agents. Builds run in isolated containers that are destroyed after completion, and the Talos host ensures the underlying infrastructure cannot be tampered with. Start with the Helm chart, customize the agent templates for your build requirements, and secure the deployment with proper RBAC and network policies.
