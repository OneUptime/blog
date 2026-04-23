# How to Integrate Jenkins with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Jenkins, CI/CD

Description: Integrate Jenkins with Rancher to enable Kubernetes-native CI/CD pipelines, including dynamic agent provisioning and automated cluster deployments.

## Introduction

Jenkins is widely used for CI/CD pipelines. Integrating Jenkins with Rancher allows you to run Jenkins pipelines on dynamic Kubernetes-based agents, deploy applications to Rancher-managed clusters, and trigger cluster-level operations from pipeline steps. This guide covers setting up Jenkins on Rancher and configuring it to deploy to downstream clusters.

## Step 1: Deploy Jenkins on a Rancher-Managed Cluster

```bash
# Add the Jenkins Helm chart

helm repo add jenkins https://charts.jenkins.io
helm repo update

# Create a values file for production Jenkins
cat << 'EOF' > jenkins-values.yaml
controller:
  # Set admin password
  admin:
    username: admin
    password: ChangeMeNow!

  # Configure JVM options
  javaOpts: "-Xms512m -Xmx2g"

  # Install required plugins
  installPlugins:
    - kubernetes:4423.vb_59f230b_ce53
    - workflow-aggregator:608.v67378e9d3db_1
    - git:5.10.1
    - configuration-as-code:2074.va_57f83f7a_10b_
    - blueocean:1.27.25
    - kubernetes-credentials:207.v492f58828b_ed
  installLatestPlugins: false

persistence:
  enabled: true
  size: 50Gi
  storageClass: "default"

agent:
  enabled: true
  defaultsProviderTemplate: ""
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2
      memory: 2Gi
EOF

# Install Jenkins
helm install jenkins jenkins/jenkins \
  --namespace jenkins \
  --create-namespace \
  -f jenkins-values.yaml

# Get the admin password
kubectl get secret -n jenkins jenkins \
  -o jsonpath="{.data.jenkins-admin-password}" | base64 -d
```

## Step 2: Configure Kubernetes Plugin for Dynamic Agents

Jenkins' Kubernetes plugin provisions pods as build agents on demand:

```groovy
// Jenkinsfile - Declare a Kubernetes agent
pipeline {
  agent {
    kubernetes {
      yaml '''
        apiVersion: v1
        kind: Pod
        spec:
          containers:
          - name: maven
            image: maven:3.9.9-eclipse-temurin-17
            command:
            - cat
            tty: true
            resources:
              requests:
                cpu: 500m
                memory: 1Gi
      '''
      retries 2
    }
  }
  stages {
    stage('Build') {
      steps {
        container('maven') {
          sh 'mvn clean package -DskipTests'
        }
      }
    }
  }
}
```

## Step 3: Create Kubeconfig Credentials for Rancher Clusters

```bash
# Generate a kubeconfig for the target cluster from Rancher
# In Rancher UI: Cluster → Download KubeConfig

# Or via the Rancher Kubeconfig API (Rancher v2.12+):
kubectl create -o jsonpath='{.status.value}' -f - > target-cluster.kubeconfig << 'EOF'
apiVersion: ext.cattle.io/v1
kind: Kubeconfig
spec:
  clusters: ["<cluster-id>"]
  description: Jenkins deployment kubeconfig
EOF

# Store as a Jenkins credential
# Jenkins UI: Manage Jenkins → Credentials → Global → Add Credential
# Type: Secret file
# File: target-cluster.kubeconfig
# ID: rancher-prod-kubeconfig
```

## Step 4: Build a Deploy Pipeline

```groovy
// Jenkinsfile - Deploy an image to a Rancher-managed cluster
pipeline {
  agent {
    kubernetes {
      yaml '''
        apiVersion: v1
        kind: Pod
        spec:
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - cat
            tty: true
      '''
    }
  }

  parameters {
    string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Container image tag to deploy')
  }

  environment {
    KUBECONFIG = credentials('rancher-prod-kubeconfig')
  }

  stages {
    stage('Deploy to Rancher') {
      steps {
        container('kubectl') {
          sh '''
            # Update the deployment image
            kubectl set image deployment/myapp \
              myapp=registry.example.com/myapp:${IMAGE_TAG} \
              --kubeconfig="${KUBECONFIG}"

            # Wait for rollout
            kubectl rollout status deployment/myapp \
              --timeout=5m \
              --kubeconfig="${KUBECONFIG}"
          '''
        }
      }
    }
  }

  post {
    failure {
      // Auto-rollback on failure
      container('kubectl') {
        sh 'kubectl rollout undo deployment/myapp --kubeconfig="${KUBECONFIG}"'
      }
    }
  }
}
```

## Step 5: Use the Rancher API from Jenkins

```groovy
// Query Rancher cluster information via API
stage('Inspect Rancher') {
  steps {
    script {
      withCredentials([string(credentialsId: 'rancher-api-token', variable: 'RANCHER_TOKEN')]) {
        sh '''
          curl -sS \
            -H "Authorization: Bearer ${RANCHER_TOKEN}" \
            "https://rancher.example.com/v3/clusters" \
            | jq '.data[] | {id, name, state}'
        '''
      }
    }
  }
}
```

## Step 6: Trigger Pipelines on Rancher Alerts (Webhook)

```bash
# Create a Jenkins webhook trigger for Rancher alert events
# In Jenkins: install the Generic Webhook Trigger plugin and enable it for the pipeline

# In Rancher Monitoring, configure a receiver that posts to Jenkins:
# Monitoring → Alerting → AlertManagerConfigs → <config> → Add Receiver → Webhook
# URL: https://jenkins.example.com/generic-webhook-trigger/invoke?token=my-token
```

## Conclusion

Integrating Jenkins with Rancher creates a powerful CI/CD foundation: dynamic Kubernetes build agents eliminate static infrastructure, and kubeconfig-based deployments enable precise multi-cluster targeting. By combining Jenkins' mature pipeline ecosystem with Rancher's cluster management APIs, you can build sophisticated deployment workflows that span multiple environments and clouds.
