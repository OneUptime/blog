# How to Deploy Jenkins on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Jenkins, CI/CD, Kubernetes, Helm, Pipeline

Description: Deploy Jenkins on Rancher with Kubernetes plugin for dynamic agent provisioning, persistent configuration storage, and pipeline integration.

## Introduction

Jenkins is the most widely used CI/CD automation server. The Kubernetes plugin enables Jenkins to provision build agents as ephemeral pods, scaling to zero when idle and spinning up on demand for builds.

## Step 1: Deploy Jenkins with Helm

```bash
helm repo add jenkins https://charts.jenkins.io
helm repo update
```

```yaml
# jenkins-values.yaml

controller:
  admin:
    username: admin
    password: "securepassword"

  ingress:
    enabled: true
    ingressClassName: nginx
    hostName: jenkins.example.com
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
    tls:
      - secretName: jenkins-tls
        hosts:
          - jenkins.example.com

  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"

  # Pre-install plugins
  installPlugins:
    - kubernetes:latest
    - workflow-aggregator:latest
    - git:latest
    - pipeline-github-lib:latest
    - prometheus:latest
    - blueocean:latest

persistence:
  enabled: true
  storageClass: longhorn
  size: 50Gi    # Jenkins config and job history

agent:
  enabled: true
  defaultsProviderTemplate: ""
  containerCap: 10    # Max 10 concurrent build pods
  podName: "jenkins-agent"
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2"
      memory: "2Gi"
```

```bash
kubectl create namespace jenkins
helm install jenkins jenkins/jenkins \
  --namespace jenkins \
  --values jenkins-values.yaml
```

## Step 2: Configure Kubernetes Agent

The Kubernetes plugin is pre-configured by the Helm chart. Verify in Jenkins UI:

1. Go to **Manage Jenkins > Clouds > Kubernetes**
2. Verify Kubernetes URL: `https://kubernetes.default.svc.cluster.local`
3. Verify Kubernetes namespace: `jenkins`

## Step 3: Create a Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent {
        kubernetes {
            // Define the build pod
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: maven
    image: maven:3.9-eclipse-temurin-17
    command: ['sleep']
    args: ['99d']
  - name: docker
    image: docker:24-dind
    securityContext:
      privileged: true
"""
            defaultContainer 'maven'
        }
    }
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package -DskipTests'
            }
        }
        stage('Test') {
            steps {
                sh 'mvn test'
            }
        }
        stage('Build Image') {
            steps {
                container('docker') {
                    sh 'docker build -t myregistry/myapp:${BUILD_NUMBER} .'
                    sh 'docker push myregistry/myapp:${BUILD_NUMBER}'
                }
            }
        }
        stage('Deploy to Rancher') {
            steps {
                sh 'kubectl set image deployment/myapp myapp=myregistry/myapp:${BUILD_NUMBER} -n production'
            }
        }
    }
}
```

## Conclusion

Jenkins on Rancher with the Kubernetes plugin provides an elastic CI/CD platform where build agents are pods that start on demand and terminate when builds complete. This eliminates the maintenance overhead of persistent build agents and scales automatically to handle parallel builds.
