# How to Build a Complete CI/CD Pipeline with Jenkins and Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Jenkins, CI/CD, GitOps, Kubernetes, DevOps

Description: Learn how to integrate Jenkins for continuous integration with Flux CD for GitOps deployment to build a complete, auditable Kubernetes pipeline.

---

## Introduction

Jenkins remains one of the most widely deployed CI systems in enterprise environments, with its rich plugin ecosystem and flexible pipeline-as-code model. Migrating from a Jenkins push-based deployment to a GitOps model does not require abandoning Jenkins CI; instead, Jenkins handles what it does best (build, test, publish) while Flux CD takes over the deployment concern.

In this architecture, a Jenkins pipeline builds your Docker image, pushes it to a registry, then updates an image tag in your Git fleet repository. Flux CD watches that repository and reconciles the new image into the cluster. No Kubernetes credentials are needed in Jenkins, and every deployment is traceable in Git history.

This guide walks through a Jenkinsfile-based pipeline integrated with Flux CD image automation for a complete GitOps workflow.

## Prerequisites

- Jenkins instance with Pipeline, Docker Pipeline, and Git plugins installed
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry accessible from Jenkins agents
- A fleet Git repository containing Kubernetes manifests
- `kubectl` and `flux` CLI for verification steps

## Step 1: Bootstrap Flux on Your Cluster

```bash
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal
```

Flux creates the GitRepository and Kustomization controllers in the `flux-system` namespace.

## Step 2: Define Flux Resources for the Application

```yaml
# clusters/production/apps/myapp.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/fleet-repo
  ref:
    branch: main
  secretRef:
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
```

## Step 3: Annotate the Deployment for Image Automation

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: your-registry.example.com/myapp:1.0.0 # {"$imagepolicy": "flux-system:myapp"}
          ports:
            - containerPort: 8080
```

## Step 4: Write the Jenkinsfile

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        REGISTRY = 'your-registry.example.com'
        IMAGE_NAME = 'myapp'
        FLEET_REPO = 'https://github.com/your-org/fleet-repo.git'
        FLEET_REPO_CRED = 'github-fleet-credentials'
        REGISTRY_CRED = 'registry-credentials'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh 'make test'
            }
        }

        stage('Build Image') {
            when {
                tag 'v*'
            }
            steps {
                script {
                    def imageTag = "${env.TAG_NAME}"
                    docker.withRegistry("https://${REGISTRY}", REGISTRY_CRED) {
                        def image = docker.build("${REGISTRY}/${IMAGE_NAME}:${imageTag}")
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }

        stage('Update Fleet Repo') {
            when {
                tag 'v*'
            }
            steps {
                script {
                    def imageTag = "${env.TAG_NAME}"
                    withCredentials([usernamePassword(
                        credentialsId: FLEET_REPO_CRED,
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )]) {
                        sh """
                            git clone https://${GIT_USER}:${GIT_TOKEN}@github.com/your-org/fleet-repo.git fleet-repo
                            cd fleet-repo
                            sed -i 's|image: ${REGISTRY}/${IMAGE_NAME}:.*|image: ${REGISTRY}/${IMAGE_NAME}:${imageTag}|' apps/myapp/deployment.yaml
                            git config user.email "jenkins@your-org.com"
                            git config user.name "Jenkins CI"
                            git add apps/myapp/deployment.yaml
                            git commit -m "chore: update myapp to ${imageTag}"
                            git push origin main
                        """
                    }
                }
            }
        }
    }

    post {
        failure {
            mail to: 'team@your-org.com',
                 subject: "Pipeline failed: ${env.JOB_NAME} ${env.BUILD_NUMBER}",
                 body: "Check console at ${env.BUILD_URL}"
        }
    }
}
```

## Step 5: Configure Flux Image Policy

```yaml
# clusters/production/apps/myapp-image.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: your-registry.example.com/myapp
  interval: 1m
  secretRef:
    name: registry-pull-secret
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 6: Verify the Pipeline End to End

```bash
# After Jenkins pushes a new tag and updates the fleet repo:

# Confirm Flux detected the new commit
flux get sources git fleet-repo

# Check image policy resolved the new tag
flux get images policy myapp

# Verify the Kustomization reconciled
flux get kustomizations myapp

# Check the pod is running the new image
kubectl get pods -n myapp -o jsonpath='{.items[*].spec.containers[0].image}'
```

## Best Practices

- Store registry and Git credentials in Jenkins Credentials Manager, never in the Jenkinsfile.
- Restrict the fleet repository credentials to write access only to the `apps/` path to limit blast radius.
- Use Jenkins shared libraries to standardize the fleet repo update pattern across teams.
- Add a post-deploy verification stage that polls `flux get kustomizations` via the Flux API or a kubectl check.
- Use multibranch pipelines to handle feature branch images separately from production tags.
- Run the fleet update only on tagged builds, not on every commit, to avoid noisy Git history.

## Conclusion

Jenkins can serve as the CI backbone of a GitOps workflow with minimal changes to existing pipelines. By limiting Jenkins to building and publishing, and delegating all cluster changes to Flux CD, you gain the auditability and self-healing properties of GitOps without replacing your existing CI investment.
