# How to Build a Reusable Tekton Task Catalog for Common Kubernetes CI/CD Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Kubernetes, CI/CD, DevOps, Task Library

Description: Create a reusable Tekton task catalog with common CI/CD operations like building images, running tests, deploying to Kubernetes, and scanning for vulnerabilities to standardize pipelines across teams.

---

Reusable Tekton tasks eliminate duplication and standardize CI/CD operations across teams. A well-designed task catalog provides tested, parameterized tasks for common operations like building container images, running tests, deploying applications, and scanning for security issues. This guide shows you how to build and maintain a comprehensive task catalog for your organization.

## Understanding Tekton Task Design

Good tasks are focused, parameterized, and composable. Each task should do one thing well, accept parameters for customization, produce results for downstream tasks, and include proper documentation. This modular approach enables flexible pipeline composition.

## Creating a Build Task

Create a Kaniko-based build task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build-image
  annotations:
    tekton.dev/displayName: "Build Container Image"
    tekton.dev/categories: "Build"
    tekton.dev/tags: "docker,kaniko,build"
spec:
  description: >
    Build a container image from a Dockerfile using Kaniko.
    Supports multi-stage builds and custom build arguments.

  params:
    - name: IMAGE
      description: The fully qualified image name
      type: string
    - name: DOCKERFILE
      description: Path to Dockerfile
      default: "./Dockerfile"
    - name: CONTEXT
      description: Build context directory
      default: "."
    - name: BUILD_ARGS
      description: Build arguments as comma-separated KEY=VALUE pairs
      default: ""
    - name: EXTRA_ARGS
      description: Additional Kaniko arguments
      default: ""

  workspaces:
    - name: source
      description: Source code workspace

  results:
    - name: IMAGE_DIGEST
      description: Digest of the built image
    - name: IMAGE_URL
      description: Full URL of the built image

  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --dockerfile=$(params.DOCKERFILE)
        - --context=$(workspaces.source.path)/$(params.CONTEXT)
        - --destination=$(params.IMAGE)
        - --digest-file=/tekton/results/IMAGE_DIGEST
        - $(params.EXTRA_ARGS)
      env:
        - name: DOCKER_CONFIG
          value: /tekton/home/.docker

    - name: write-url
      image: bash:latest
      script: |
        #!/bin/bash
        echo -n "$(params.IMAGE)" > $(results.IMAGE_URL.path)
```

## Creating a Test Task

Build a flexible test execution task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: run-tests
  annotations:
    tekton.dev/displayName: "Run Tests"
    tekton.dev/categories: "Test"
spec:
  description: >
    Run tests using specified test framework and image.
    Supports multiple test runners and generates reports.

  params:
    - name: TEST_IMAGE
      description: Image containing test tools
      default: "node:18"
    - name: TEST_COMMAND
      description: Command to run tests
      default: "npm test"
    - name: INSTALL_COMMAND
      description: Command to install dependencies
      default: "npm ci"
    - name: WORKING_DIR
      description: Working directory for tests
      default: "."

  workspaces:
    - name: source
      description: Source code workspace

  results:
    - name: TEST_STATUS
      description: Test execution status

  steps:
    - name: install-dependencies
      image: $(params.TEST_IMAGE)
      workingDir: $(workspaces.source.path)/$(params.WORKING_DIR)
      script: |
        #!/bin/bash
        set -e
        $(params.INSTALL_COMMAND)

    - name: run-tests
      image: $(params.TEST_IMAGE)
      workingDir: $(workspaces.source.path)/$(params.WORKING_DIR)
      script: |
        #!/bin/bash
        set -e

        if $(params.TEST_COMMAND); then
          echo -n "passed" > $(results.TEST_STATUS.path)
        else
          echo -n "failed" > $(results.TEST_STATUS.path)
          exit 1
        fi
```

## Creating a Deploy Task

Build a Kubernetes deployment task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: deploy-to-kubernetes
  annotations:
    tekton.dev/displayName: "Deploy to Kubernetes"
    tekton.dev/categories: "Deployment"
spec:
  description: >
    Deploy application to Kubernetes using kubectl.
    Supports deployments, rollouts, and health checks.

  params:
    - name: NAMESPACE
      description: Target namespace
      type: string
    - name: DEPLOYMENT_NAME
      description: Deployment name
      type: string
    - name: IMAGE
      description: Container image to deploy
      type: string
    - name: WAIT_FOR_ROLLOUT
      description: Wait for rollout completion
      default: "true"
    - name: TIMEOUT
      description: Rollout timeout
      default: "5m"

  results:
    - name: DEPLOYMENT_STATUS
      description: Deployment status

  steps:
    - name: update-image
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash
        set -e

        kubectl set image deployment/$(params.DEPLOYMENT_NAME) \
          $(params.DEPLOYMENT_NAME)=$(params.IMAGE) \
          -n $(params.NAMESPACE)

    - name: wait-rollout
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash
        set -e

        if [ "$(params.WAIT_FOR_ROLLOUT)" == "true" ]; then
          kubectl rollout status deployment/$(params.DEPLOYMENT_NAME) \
            -n $(params.NAMESPACE) \
            --timeout=$(params.TIMEOUT)

          echo -n "success" > $(results.DEPLOYMENT_STATUS.path)
        else
          echo -n "initiated" > $(results.DEPLOYMENT_STATUS.path)
        fi
```

## Creating a Security Scan Task

Build a vulnerability scanning task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: scan-image
  annotations:
    tekton.dev/displayName: "Scan Image for Vulnerabilities"
    tekton.dev/categories: "Security"
spec:
  description: >
    Scan container image for vulnerabilities using Trivy.
    Can fail pipeline based on severity thresholds.

  params:
    - name: IMAGE
      description: Image to scan
    - name: SEVERITY
      description: Severity levels to scan for
      default: "CRITICAL,HIGH"
    - name: FAIL_ON_SEVERITY
      description: Severity level to fail on
      default: "CRITICAL"
    - name: SKIP_DIRS
      description: Directories to skip
      default: ""

  results:
    - name: VULNERABILITIES_FOUND
      description: Number of vulnerabilities found
    - name: SCAN_STATUS
      description: Scan status

  steps:
    - name: scan
      image: aquasec/trivy:latest
      script: |
        #!/bin/sh
        set -e

        trivy image \
          --severity $(params.SEVERITY) \
          --format json \
          --output scan-results.json \
          $(params.IMAGE)

        VULNS=$(jq '[.Results[].Vulnerabilities[]? | select(.Severity=="CRITICAL" or .Severity=="HIGH")] | length' scan-results.json)
        echo -n "$VULNS" > $(results.VULNERABILITIES_FOUND.path)

        if [ "$VULNS" -gt 0 ]; then
          echo "Found $VULNS vulnerabilities"
          trivy image --severity $(params.FAIL_ON_SEVERITY) --exit-code 1 $(params.IMAGE)
          echo -n "failed" > $(results.SCAN_STATUS.path)
          exit 1
        else
          echo -n "passed" > $(results.SCAN_STATUS.path)
        fi
```

## Creating a Notification Task

Build a notification task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: send-notification
  annotations:
    tekton.dev/displayName: "Send Notification"
    tekton.dev/categories: "Communication"
spec:
  description: >
    Send notifications to Slack or other services.
    Supports custom messages and attachments.

  params:
    - name: WEBHOOK_URL
      description: Webhook URL for notifications
    - name: MESSAGE
      description: Notification message
    - name: STATUS
      description: Status (success, failure, warning)
      default: "success"
    - name: ADDITIONAL_INFO
      description: Additional information as JSON
      default: "{}"

  steps:
    - name: send-slack
      image: curlimages/curl:latest
      script: |
        #!/bin/sh

        COLOR="good"
        if [ "$(params.STATUS)" = "failure" ]; then
          COLOR="danger"
        elif [ "$(params.STATUS)" = "warning" ]; then
          COLOR="warning"
        fi

        curl -X POST $(params.WEBHOOK_URL) \
          -H 'Content-Type: application/json' \
          -d '{
            "text": "$(params.MESSAGE)",
            "attachments": [{
              "color": "'$COLOR'",
              "fields": '$(params.ADDITIONAL_INFO)'
            }]
          }'
```

## Organizing the Catalog

Create a catalog structure:

```bash
# Catalog directory structure
tekton-catalog/
├── tasks/
│   ├── build/
│   │   ├── build-image.yaml
│   │   ├── build-go.yaml
│   │   └── build-node.yaml
│   ├── test/
│   │   ├── run-tests.yaml
│   │   ├── integration-tests.yaml
│   │   └── e2e-tests.yaml
│   ├── deploy/
│   │   ├── deploy-to-kubernetes.yaml
│   │   ├── deploy-helm.yaml
│   │   └── deploy-kustomize.yaml
│   ├── security/
│   │   ├── scan-image.yaml
│   │   ├── scan-code.yaml
│   │   └── verify-signature.yaml
│   └── utils/
│       ├── send-notification.yaml
│       ├── git-clone.yaml
│       └── create-namespace.yaml
└── pipelines/
    ├── templates/
    │   ├── build-deploy.yaml
    │   └── build-test-deploy.yaml
    └── examples/
        ├── nodejs-app.yaml
        └── go-service.yaml
```

## Installing Tasks from Catalog

Install tasks to your cluster:

```bash
# Install individual task
kubectl apply -f tekton-catalog/tasks/build/build-image.yaml

# Install all tasks in a category
kubectl apply -f tekton-catalog/tasks/build/

# Install entire catalog
kubectl apply -R -f tekton-catalog/tasks/
```

## Using Catalog Tasks in Pipelines

Reference catalog tasks:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: complete-pipeline
spec:
  params:
    - name: repo-url
    - name: image-name
    - name: namespace

  workspaces:
    - name: shared-workspace

  tasks:
    - name: clone
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.repo-url)
      workspaces:
        - name: output
          workspace: shared-workspace

    - name: build
      runAfter: [clone]
      taskRef:
        name: build-image
      params:
        - name: IMAGE
          value: $(params.image-name)
      workspaces:
        - name: source
          workspace: shared-workspace

    - name: scan
      runAfter: [build]
      taskRef:
        name: scan-image
      params:
        - name: IMAGE
          value: $(params.image-name)

    - name: test
      runAfter: [build]
      taskRef:
        name: run-tests
      workspaces:
        - name: source
          workspace: shared-workspace

    - name: deploy
      runAfter: [scan, test]
      taskRef:
        name: deploy-to-kubernetes
      params:
        - name: NAMESPACE
          value: $(params.namespace)
        - name: IMAGE
          value: $(params.image-name)
```

## Versioning and Documentation

Add proper documentation:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build-image
  labels:
    app.kubernetes.io/version: "1.2.0"
  annotations:
    tekton.dev/displayName: "Build Container Image"
    tekton.dev/categories: "Build"
    tekton.dev/tags: "docker,kaniko,build"
    tekton.dev/platforms: "linux/amd64,linux/arm64"
    tekton.dev/pipelines.minVersion: "0.40.0"
spec:
  description: |
    # Build Container Image

    This task builds a container image from a Dockerfile using Kaniko.

    ## Parameters
    - IMAGE: Full image name including registry and tag
    - DOCKERFILE: Path to Dockerfile (default: ./Dockerfile)
    - CONTEXT: Build context directory (default: .)

    ## Workspaces
    - source: Source code containing Dockerfile

    ## Results
    - IMAGE_DIGEST: SHA256 digest of built image
    - IMAGE_URL: Full image URL

    ## Examples
    ```yaml
    - name: build
      taskRef:
        name: build-image
      params:
        - name: IMAGE
          value: registry.example.com/myapp:v1.0.0
    ```
```

## Testing Catalog Tasks

Create test pipelines:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: test-build-task
spec:
  workspaces:
    - name: test-workspace

  tasks:
    - name: setup-test-code
      taskSpec:
        workspaces:
          - name: output
        steps:
          - name: create-dockerfile
            image: bash:latest
            script: |
              cd $(workspaces.output.path)
              cat > Dockerfile <<EOF
              FROM alpine:latest
              CMD ["echo", "test"]
              EOF

    - name: test-build
      runAfter: [setup-test-code]
      taskRef:
        name: build-image
      params:
        - name: IMAGE
          value: localhost:5000/test:latest
      workspaces:
        - name: source
          workspace: test-workspace
```

## Conclusion

A well-maintained Tekton task catalog standardizes CI/CD operations, eliminates duplication, and improves pipeline quality across teams. By creating focused, parameterized tasks with clear documentation and proper versioning, you build a library of reusable components that accelerate pipeline development while ensuring consistency and best practices. Regular updates, testing, and community contributions keep the catalog current and valuable for your organization.
