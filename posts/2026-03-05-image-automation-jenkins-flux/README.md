# How to Set Up Image Automation with Jenkins and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Jenkins, Image Automation, CI/CD

Description: Learn how to integrate Jenkins CI pipelines with Flux CD image automation to automatically deploy new container images to Kubernetes.

---

## Introduction

Jenkins remains one of the most widely used CI systems in enterprise environments. When paired with Flux CD, Jenkins handles building and pushing container images while Flux handles the GitOps-based deployment. This separation of concerns gives teams the flexibility to keep their existing Jenkins infrastructure while adopting GitOps for deployments. This guide covers configuring Jenkins to produce properly tagged images and setting up Flux to detect and deploy them.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- Flux image-reflector-controller and image-automation-controller installed
- A Jenkins instance with Docker build capabilities
- A container registry accessible from both Jenkins and the Kubernetes cluster
- `kubectl` and `flux` CLI access to your cluster

Install the image automation controllers if you have not already:

```bash
flux install --components-extra=image-reflector-controller,image-automation-controller
```

## Jenkins Pipeline with Build Number Tags

Jenkins provides the `BUILD_NUMBER` environment variable automatically, which increments with each build. This makes it a natural choice for image tags.

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'my-org/my-app'
        REGISTRY_CREDS = credentials('registry-credentials')
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Build and Push') {
            when {
                branch 'main'
            }
            steps {
                sh """
                    echo ${REGISTRY_CREDS_PSW} | docker login ${REGISTRY} \
                      -u ${REGISTRY_CREDS_USR} --password-stdin
                    docker build -t ${REGISTRY}/${IMAGE_NAME}:build-${BUILD_NUMBER} .
                    docker push ${REGISTRY}/${IMAGE_NAME}:build-${BUILD_NUMBER}
                """
            }
        }
    }
}
```

## Jenkins Pipeline with SemVer Tags

For pipelines triggered by Git tags:

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'my-org/my-app'
        REGISTRY_CREDS = credentials('registry-credentials')
    }

    stages {
        stage('Build') {
            steps {
                script {
                    def tag = env.TAG_NAME ?: "build-${env.BUILD_NUMBER}"
                    env.IMAGE_TAG = "${REGISTRY}/${IMAGE_NAME}:${tag}"
                }
                sh "docker build -t ${env.IMAGE_TAG} ."
            }
        }

        stage('Push') {
            steps {
                sh """
                    echo ${REGISTRY_CREDS_PSW} | docker login ${REGISTRY} \
                      -u ${REGISTRY_CREDS_USR} --password-stdin
                    docker push ${env.IMAGE_TAG}
                """
            }
        }
    }
}
```

## Jenkins Pipeline with Timestamp Tags

For timestamp-based tagging, configure the Jenkins Build Timestamp plugin with the pattern `yyyyMMddHHmmss` so that lexicographic sorting matches chronological order.

```groovy
stage('Build and Push') {
    steps {
        script {
            def timestamp = new Date().format("yyyyMMddHHmmss", TimeZone.getTimeZone('UTC'))
            def tag = "${timestamp}-${env.GIT_COMMIT.take(7)}"
            env.IMAGE_TAG = "${REGISTRY}/${IMAGE_NAME}:${tag}"
        }
        sh """
            echo ${REGISTRY_CREDS_PSW} | docker login ${REGISTRY} \
              -u ${REGISTRY_CREDS_USR} --password-stdin
            docker build -t ${env.IMAGE_TAG} .
            docker push ${env.IMAGE_TAG}
        """
    }
}
```

## Configuring Flux Image Automation

### Registry Credentials

Create a Kubernetes secret for registry access.

```bash
kubectl create secret docker-registry registry-auth \
  --namespace flux-system \
  --docker-server=registry.example.com \
  --docker-username=flux-reader \
  --docker-password="${REGISTRY_PASSWORD}"
```

### ImageRepository

```yaml
# image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-org/my-app
  interval: 5m
  secretRef:
    name: registry-auth
```

### ImagePolicy for Build Numbers

```yaml
# image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^build-(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

### ImagePolicy for Timestamp Tags

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>[0-9]{14})-[a-f0-9]{7}$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

## Marking Deployment Manifests

Add the image policy marker comment to your deployment manifest.

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-org/my-app:build-100 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

## Configuring ImageUpdateAutomation

```yaml
# image-automation/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: jenkins-flux-bot
        email: jenkins-flux-bot@example.com
      messageTemplate: |
        chore: automated image update from Jenkins build

        {{ range .Changed.Objects -}}
        - {{ .Kind }}/{{ .Name }}: {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Triggering Flux from Jenkins

To reduce the delay between a Jenkins build and Flux detecting the new image, add a post-build step that triggers a Flux reconciliation via a webhook.

Set up a Flux Receiver:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: jenkins-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1beta2
      kind: ImageRepository
      name: my-app
```

```bash
# Create the webhook secret
kubectl create secret generic webhook-token \
  --namespace flux-system \
  --from-literal=token="${WEBHOOK_SECRET}"
```

Add a post-build step in Jenkins using the stored webhook URL:

```groovy
stage('Notify Flux') {
    environment {
        FLUX_WEBHOOK_URL = credentials('flux-webhook-url')
    }
    steps {
        sh "curl -s -X POST ${FLUX_WEBHOOK_URL}"
    }
}
```

## Handling Private Registries

If Jenkins pushes to Amazon ECR, Flux supports native ECR authentication:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
```

For this to work, the image-reflector-controller must have IAM permissions to pull from ECR. Use IRSA (IAM Roles for Service Accounts) to grant these permissions.

## Verifying the Pipeline

```bash
# Trigger a Jenkins build and wait for completion

# Check Flux image scanning
flux get image repository my-app -n flux-system

# Check the selected image
flux get image policy my-app -n flux-system

# Check automation status
flux get image update my-app -n flux-system

# Verify the deployment was updated
kubectl get deployment my-app -n my-app -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Troubleshooting

**Jenkins pushes images but Flux does not detect them.** Verify the image path in the ImageRepository matches the path Jenkins pushes to. Check registry authentication by examining the ImageRepository status.

**Build numbers are not sorted correctly.** Ensure the ImagePolicy uses `numerical` ordering, not `alphabetical`. Build number `9` would sort after `10` with alphabetical ordering.

**Flux cannot push commits to the GitOps repository.** Verify the GitRepository source has a deploy key or token with write access. Jenkins and Flux may use different Git authentication methods.

**Timestamp tags not sortable.** Ensure the timestamp format produces lexicographically sortable strings. Use `yyyyMMddHHmmss` rather than formats with separators that may sort incorrectly.

## Conclusion

Jenkins and Flux CD integrate effectively by dividing responsibilities: Jenkins builds and pushes container images, and Flux detects new tags and updates Kubernetes deployments. The key to a smooth integration is consistent image tagging in Jenkins, proper registry credentials in Flux, and optionally a webhook to trigger immediate reconciliation after a build completes. This approach lets teams keep their existing Jenkins investment while gaining the benefits of GitOps-based deployments.
