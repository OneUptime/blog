# How to Implement OpenShift Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Tekton, Pipelines, CI/CD, Kubernetes, DevOps, Automation

Description: A comprehensive guide to implementing OpenShift Pipelines using Tekton, covering Tasks, Pipelines, Triggers, Workspaces, PVC integration, ClusterTasks, and monitoring for cloud-native CI/CD workflows.

---

> OpenShift Pipelines brings Tekton to Red Hat OpenShift, giving you Kubernetes-native CI/CD that scales with your cluster and treats pipelines as first-class resources.

## What Are OpenShift Pipelines?

OpenShift Pipelines is the Red Hat distribution of Tekton, a powerful Kubernetes-native CI/CD framework. Unlike traditional CI/CD tools that run on separate infrastructure, Tekton runs your pipelines as Kubernetes pods, leveraging the same scheduling, scaling, and resource management as your applications.

Key benefits:
- **Kubernetes-native**: Pipelines are CRDs, not external config files
- **Serverless**: No always-running CI server consuming resources
- **Scalable**: Each pipeline run is an isolated pod
- **Portable**: Same pipeline works on any Kubernetes cluster
- **Declarative**: Everything defined in YAML, stored in Git

## Installing OpenShift Pipelines

### Using the Operator (Recommended)

```yaml
# openshift-pipelines-subscription.yaml
# This installs the OpenShift Pipelines Operator from the Red Hat Marketplace
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: openshift-pipelines-operator
  namespace: openshift-operators
spec:
  channel: latest
  name: openshift-pipelines-operator-rh
  source: redhat-operators
  sourceNamespace: openshift-marketplace
```

Apply and verify:

```bash
# Install the operator
oc apply -f openshift-pipelines-subscription.yaml

# Wait for the operator to be ready
oc wait --for=condition=Ready pods -l app=openshift-pipelines-operator -n openshift-operators --timeout=300s

# Verify Tekton CRDs are installed
oc get crd | grep tekton
```

### Verify Installation

```bash
# Check all pipeline components are running
oc get pods -n openshift-pipelines

# You should see these components:
# - tekton-pipelines-controller
# - tekton-pipelines-webhook
# - tekton-triggers-controller
# - tekton-triggers-webhook
```

## Understanding Tasks

Tasks are the building blocks of Tekton pipelines. Each Task defines a series of steps that run sequentially in a single pod.

### Basic Task Structure

```yaml
# build-task.yaml
# A Task that builds a container image using buildah
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build-image
  namespace: my-project
spec:
  # Parameters make tasks reusable across different contexts
  params:
    - name: IMAGE
      description: The image to build and push
      type: string
    - name: DOCKERFILE
      description: Path to the Dockerfile
      type: string
      default: ./Dockerfile
    - name: CONTEXT
      description: Build context directory
      type: string
      default: .

  # Workspaces provide shared storage between steps
  workspaces:
    - name: source
      description: The source code workspace

  # Results allow tasks to output values for subsequent tasks
  results:
    - name: IMAGE_DIGEST
      description: Digest of the built image

  # Steps run sequentially in the same pod
  steps:
    # Step 1: Build the image
    - name: build
      image: registry.redhat.io/rhel8/buildah:latest
      workingDir: $(workspaces.source.path)
      script: |
        #!/usr/bin/env bash
        set -e

        # Build the container image using buildah
        buildah bud \
          --format=oci \
          --tls-verify=true \
          --layers \
          -f $(params.DOCKERFILE) \
          -t $(params.IMAGE) \
          $(params.CONTEXT)

      # Required for buildah to work in OpenShift
      securityContext:
        capabilities:
          add:
            - SETFCAP
      volumeMounts:
        - name: varlibcontainers
          mountPath: /var/lib/containers

    # Step 2: Push the image to registry
    - name: push
      image: registry.redhat.io/rhel8/buildah:latest
      script: |
        #!/usr/bin/env bash
        set -e

        # Push the image and capture the digest
        buildah push \
          --tls-verify=true \
          --digestfile=/tmp/image-digest \
          $(params.IMAGE) \
          docker://$(params.IMAGE)

        # Write digest to results
        cat /tmp/image-digest | tee $(results.IMAGE_DIGEST.path)

      volumeMounts:
        - name: varlibcontainers
          mountPath: /var/lib/containers

  # Volumes shared across all steps in this task
  volumes:
    - name: varlibcontainers
      emptyDir: {}
```

### Task with Multiple Steps

```yaml
# test-task.yaml
# A Task that runs unit tests and code quality checks
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: run-tests
  namespace: my-project
spec:
  params:
    - name: TEST_COMMAND
      description: Command to run tests
      type: string
      default: "npm test"

  workspaces:
    - name: source
      description: Source code workspace

  results:
    - name: TEST_PASSED
      description: Whether tests passed (true/false)
    - name: COVERAGE
      description: Test coverage percentage

  steps:
    # Step 1: Install dependencies
    - name: install-deps
      image: node:18-alpine
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        set -e
        echo "Installing dependencies..."
        npm ci --prefer-offline
      resources:
        requests:
          memory: "512Mi"
          cpu: "250m"
        limits:
          memory: "1Gi"
          cpu: "500m"

    # Step 2: Run linting
    - name: lint
      image: node:18-alpine
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        set -e
        echo "Running linter..."
        npm run lint || true  # Don't fail on lint warnings

    # Step 3: Run tests
    - name: test
      image: node:18-alpine
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        set -e
        echo "Running tests..."

        # Run tests with coverage
        if $(params.TEST_COMMAND); then
          echo "true" > $(results.TEST_PASSED.path)
        else
          echo "false" > $(results.TEST_PASSED.path)
          exit 1
        fi

        # Extract coverage if available
        if [ -f coverage/coverage-summary.json ]; then
          COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"pct":[0-9.]*' | head -1 | cut -d':' -f2)
          echo "${COVERAGE}%" > $(results.COVERAGE.path)
        else
          echo "N/A" > $(results.COVERAGE.path)
        fi
```

## Building Pipelines

Pipelines orchestrate multiple Tasks, defining execution order and data flow between them.

### Complete CI/CD Pipeline

```yaml
# ci-pipeline.yaml
# A complete CI/CD pipeline that clones, tests, builds, and deploys
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: ci-cd-pipeline
  namespace: my-project
spec:
  # Pipeline-level parameters
  params:
    - name: git-url
      description: Git repository URL
      type: string
    - name: git-revision
      description: Git revision to checkout
      type: string
      default: main
    - name: image-name
      description: Image name including registry
      type: string
    - name: deployment-name
      description: Name of the deployment to update
      type: string

  # Workspaces shared across pipeline tasks
  workspaces:
    - name: shared-workspace
      description: Workspace for source code and artifacts
    - name: git-credentials
      description: Git credentials for private repos
      optional: true
    - name: docker-credentials
      description: Registry credentials for pushing images

  # Define the pipeline tasks and their execution order
  tasks:
    # Task 1: Clone the source repository
    - name: clone-source
      taskRef:
        name: git-clone
        kind: ClusterTask
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
        - name: deleteExisting
          value: "true"
      workspaces:
        - name: output
          workspace: shared-workspace
        - name: basic-auth
          workspace: git-credentials

    # Task 2: Run tests (depends on clone-source)
    - name: run-tests
      taskRef:
        name: run-tests
      runAfter:
        - clone-source
      params:
        - name: TEST_COMMAND
          value: "npm test"
      workspaces:
        - name: source
          workspace: shared-workspace

    # Task 3: Build and push image (depends on tests passing)
    - name: build-image
      taskRef:
        name: build-image
      runAfter:
        - run-tests
      params:
        - name: IMAGE
          value: $(params.image-name):$(tasks.clone-source.results.commit)
        - name: DOCKERFILE
          value: ./Dockerfile
        - name: CONTEXT
          value: .
      workspaces:
        - name: source
          workspace: shared-workspace

    # Task 4: Deploy to development (depends on image build)
    - name: deploy-dev
      taskRef:
        name: openshift-client
        kind: ClusterTask
      runAfter:
        - build-image
      params:
        - name: SCRIPT
          value: |
            # Update the deployment with the new image
            oc set image deployment/$(params.deployment-name) \
              app=$(params.image-name):$(tasks.clone-source.results.commit) \
              -n development

            # Wait for rollout to complete
            oc rollout status deployment/$(params.deployment-name) \
              -n development \
              --timeout=300s

  # Define what happens on pipeline completion
  finally:
    # Always send notification regardless of success/failure
    - name: notify-completion
      taskRef:
        name: send-notification
      params:
        - name: message
          value: "Pipeline $(context.pipelineRun.name) completed with status $(tasks.status)"
```

### Pipeline with Parallel Tasks

```yaml
# parallel-pipeline.yaml
# Pipeline demonstrating parallel task execution
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: parallel-testing-pipeline
  namespace: my-project
spec:
  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
      default: main

  workspaces:
    - name: shared-workspace

  tasks:
    # Task 1: Clone repository
    - name: clone
      taskRef:
        name: git-clone
        kind: ClusterTask
      workspaces:
        - name: output
          workspace: shared-workspace
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)

    # Tasks 2-4 run in PARALLEL after clone completes
    # Unit tests
    - name: unit-tests
      taskRef:
        name: run-tests
      runAfter:
        - clone
      params:
        - name: TEST_COMMAND
          value: "npm run test:unit"
      workspaces:
        - name: source
          workspace: shared-workspace

    # Integration tests (runs in parallel with unit-tests)
    - name: integration-tests
      taskRef:
        name: run-tests
      runAfter:
        - clone
      params:
        - name: TEST_COMMAND
          value: "npm run test:integration"
      workspaces:
        - name: source
          workspace: shared-workspace

    # Security scan (runs in parallel with tests)
    - name: security-scan
      taskRef:
        name: trivy-scan
      runAfter:
        - clone
      workspaces:
        - name: source
          workspace: shared-workspace

    # Task 5: Build only runs after ALL parallel tasks complete
    - name: build
      taskRef:
        name: build-image
      runAfter:
        - unit-tests
        - integration-tests
        - security-scan
      workspaces:
        - name: source
          workspace: shared-workspace
```

## Implementing Triggers

Triggers enable automatic pipeline execution in response to external events like Git webhooks.

### EventListener Configuration

```yaml
# eventlistener.yaml
# EventListener receives incoming webhooks and routes them to TriggerBindings
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
  namespace: my-project
spec:
  # Service account for the EventListener pod
  serviceAccountName: pipeline-sa

  # Define triggers that respond to different events
  triggers:
    # Trigger for push events to main branch
    - name: github-push-main
      interceptors:
        # GitHub interceptor validates webhook signatures
        - ref:
            name: github
          params:
            - name: secretRef
              value:
                secretName: github-webhook-secret
                secretKey: token
            - name: eventTypes
              value:
                - push
        # CEL interceptor filters events
        - ref:
            name: cel
          params:
            - name: filter
              value: "body.ref == 'refs/heads/main'"
      bindings:
        - ref: github-push-binding
      template:
        ref: ci-pipeline-template

    # Trigger for pull request events
    - name: github-pr
      interceptors:
        - ref:
            name: github
          params:
            - name: secretRef
              value:
                secretName: github-webhook-secret
                secretKey: token
            - name: eventTypes
              value:
                - pull_request
        - ref:
            name: cel
          params:
            - name: filter
              value: "body.action in ['opened', 'synchronize', 'reopened']"
      bindings:
        - ref: github-pr-binding
      template:
        ref: pr-pipeline-template

  resources:
    kubernetesResource:
      spec:
        template:
          spec:
            serviceAccountName: pipeline-sa
            containers:
              - resources:
                  requests:
                    memory: "64Mi"
                    cpu: "50m"
                  limits:
                    memory: "128Mi"
                    cpu: "100m"
```

### TriggerBinding

```yaml
# triggerbinding.yaml
# TriggerBinding extracts data from webhook payloads
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-push-binding
  namespace: my-project
spec:
  params:
    # Extract repository URL from webhook payload
    - name: git-url
      value: $(body.repository.clone_url)

    # Extract the commit SHA
    - name: git-revision
      value: $(body.after)

    # Extract repository name for image tagging
    - name: repo-name
      value: $(body.repository.name)

    # Extract commit message for notifications
    - name: commit-message
      value: $(body.head_commit.message)

    # Extract author for audit trail
    - name: author
      value: $(body.pusher.name)

---
# TriggerBinding for pull requests
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-pr-binding
  namespace: my-project
spec:
  params:
    - name: git-url
      value: $(body.pull_request.head.repo.clone_url)
    - name: git-revision
      value: $(body.pull_request.head.sha)
    - name: pr-number
      value: $(body.pull_request.number)
    - name: pr-title
      value: $(body.pull_request.title)
```

### TriggerTemplate

```yaml
# triggertemplate.yaml
# TriggerTemplate creates PipelineRuns from trigger events
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: ci-pipeline-template
  namespace: my-project
spec:
  # Parameters received from TriggerBinding
  params:
    - name: git-url
      description: Repository URL
    - name: git-revision
      description: Git commit SHA
    - name: repo-name
      description: Repository name
    - name: author
      description: Commit author

  # Resources to create when triggered
  resourcetemplates:
    # Create a PipelineRun
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun
      metadata:
        # Generate unique name using timestamp
        generateName: ci-pipeline-run-
        namespace: my-project
        labels:
          tekton.dev/pipeline: ci-cd-pipeline
          app.kubernetes.io/managed-by: triggers
        annotations:
          # Store trigger metadata for audit
          triggers.tekton.dev/git-revision: $(tt.params.git-revision)
          triggers.tekton.dev/author: $(tt.params.author)
      spec:
        pipelineRef:
          name: ci-cd-pipeline
        params:
          - name: git-url
            value: $(tt.params.git-url)
          - name: git-revision
            value: $(tt.params.git-revision)
          - name: image-name
            value: image-registry.openshift-image-registry.svc:5000/my-project/$(tt.params.repo-name)
          - name: deployment-name
            value: $(tt.params.repo-name)
        workspaces:
          - name: shared-workspace
            volumeClaimTemplate:
              spec:
                accessModes:
                  - ReadWriteOnce
                resources:
                  requests:
                    storage: 1Gi
                storageClassName: gp3
          - name: docker-credentials
            secret:
              secretName: registry-credentials
        # Set a timeout for the entire pipeline
        timeout: "1h0m0s"
        # Configure pod template for all tasks
        podTemplate:
          securityContext:
            fsGroup: 65532
```

### Expose EventListener

```yaml
# eventlistener-route.yaml
# Create a Route to expose the EventListener externally
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: github-webhook
  namespace: my-project
spec:
  to:
    kind: Service
    name: el-github-listener  # EventListener creates a service with el- prefix
  port:
    targetPort: http-listener
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## Working with Workspaces

Workspaces provide flexible storage options for Tasks and Pipelines.

### Workspace Types

```yaml
# workspace-examples.yaml
# Different workspace configurations for various use cases
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: workspace-examples
  namespace: my-project
spec:
  pipelineRef:
    name: my-pipeline
  workspaces:
    # Option 1: VolumeClaimTemplate (recommended for most cases)
    # Creates a new PVC for each PipelineRun, automatically cleaned up
    - name: source-code
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 2Gi
          storageClassName: gp3  # Use your cluster's storage class

    # Option 2: Existing PersistentVolumeClaim
    # Use when you need data to persist across pipeline runs
    - name: maven-cache
      persistentVolumeClaim:
        claimName: maven-repo-cache

    # Option 3: ConfigMap (read-only configuration)
    # Perfect for configuration files, scripts, or templates
    - name: build-config
      configMap:
        name: build-settings
        items:
          - key: settings.xml
            path: settings.xml

    # Option 4: Secret (credentials, keys)
    # Use for sensitive data that tasks need
    - name: ssh-credentials
      secret:
        secretName: git-ssh-key

    # Option 5: EmptyDir (temporary, fast storage)
    # For scratch space that does not need to persist
    - name: temp-workspace
      emptyDir: {}
```

### Workspace in Task Definition

```yaml
# task-with-workspaces.yaml
# Task demonstrating multiple workspace usage patterns
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build-with-cache
  namespace: my-project
spec:
  workspaces:
    # Required workspace for source code
    - name: source
      description: Source code to build
      mountPath: /workspace/source

    # Optional workspace for build cache
    - name: cache
      description: Cache directory for faster builds
      optional: true
      mountPath: /workspace/cache

    # Read-only workspace for configuration
    - name: config
      description: Build configuration files
      readOnly: true
      mountPath: /workspace/config

  steps:
    - name: build
      image: maven:3.8-openjdk-17
      script: |
        #!/bin/bash
        set -e

        cd /workspace/source

        # Use cache if available
        if [ -d "/workspace/cache" ]; then
          echo "Using build cache..."
          export MAVEN_OPTS="-Dmaven.repo.local=/workspace/cache/.m2"
        fi

        # Use custom settings if provided
        if [ -f "/workspace/config/settings.xml" ]; then
          mvn -s /workspace/config/settings.xml clean package
        else
          mvn clean package
        fi
```

## PVC Integration

Persistent Volume Claims provide durable storage for pipeline artifacts and caches.

### Creating a Shared PVC

```yaml
# shared-pvc.yaml
# PersistentVolumeClaim for pipeline workspace storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pipeline-workspace-pvc
  namespace: my-project
  labels:
    app.kubernetes.io/component: pipeline
spec:
  accessModes:
    # ReadWriteOnce for single-node access
    # Use ReadWriteMany if tasks run on different nodes
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: gp3
  # Optional: specify volume mode
  volumeMode: Filesystem
```

### PVC for Build Cache

```yaml
# cache-pvc.yaml
# Dedicated PVC for build caches (Maven, npm, etc.)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: build-cache-pvc
  namespace: my-project
  annotations:
    # Prevent accidental deletion
    helm.sh/resource-policy: keep
spec:
  accessModes:
    - ReadWriteMany  # Allow multiple pods to read cache
  resources:
    requests:
      storage: 20Gi
  storageClassName: efs  # Use shared filesystem for cache
---
# Task using the shared cache
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: npm-build-with-cache
  namespace: my-project
spec:
  workspaces:
    - name: source
    - name: npm-cache
      mountPath: /home/node/.npm

  steps:
    - name: install-and-build
      image: node:18
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/bash
        # npm will use the mounted cache directory automatically
        npm ci
        npm run build
      env:
        - name: npm_config_cache
          value: /home/node/.npm
```

### Dynamic PVC with VolumeClaimTemplate

```yaml
# pipeline-with-dynamic-pvc.yaml
# Pipeline using VolumeClaimTemplate for automatic PVC management
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: build-run-
  namespace: my-project
spec:
  pipelineRef:
    name: ci-cd-pipeline
  workspaces:
    - name: shared-workspace
      # VolumeClaimTemplate creates a PVC for this specific run
      # The PVC is automatically deleted when the PipelineRun is cleaned up
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 5Gi
          storageClassName: gp3-csi
          # Optional: Set volume attributes
          volumeMode: Filesystem

  # Control PVC cleanup behavior
  podTemplate:
    # Run as non-root user
    securityContext:
      runAsNonRoot: true
      fsGroup: 65532
```

## Using ClusterTasks

ClusterTasks are cluster-scoped tasks available to all namespaces, reducing duplication and ensuring consistency.

### Available ClusterTasks

```bash
# List all available ClusterTasks
oc get clustertasks

# Common ClusterTasks included with OpenShift Pipelines:
# - git-clone         - Clone a Git repository
# - buildah           - Build images using buildah
# - openshift-client  - Run oc commands
# - s2i-*             - Source-to-Image builders
# - maven             - Build with Maven
# - npm               - Run npm commands
```

### Using ClusterTasks in Pipelines

```yaml
# pipeline-with-clustertasks.yaml
# Pipeline leveraging built-in ClusterTasks
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: standard-build-pipeline
  namespace: my-project
spec:
  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
      default: main
    - name: image
      type: string

  workspaces:
    - name: shared-workspace
    - name: maven-settings
      optional: true

  tasks:
    # Use git-clone ClusterTask
    - name: fetch-source
      taskRef:
        name: git-clone
        kind: ClusterTask  # Specify ClusterTask kind
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
        - name: subdirectory
          value: ""
        - name: deleteExisting
          value: "true"
      workspaces:
        - name: output
          workspace: shared-workspace

    # Use maven ClusterTask for Java builds
    - name: build-java
      taskRef:
        name: maven
        kind: ClusterTask
      runAfter:
        - fetch-source
      params:
        - name: GOALS
          value:
            - clean
            - package
            - -DskipTests
      workspaces:
        - name: source
          workspace: shared-workspace
        - name: maven-settings
          workspace: maven-settings

    # Use buildah ClusterTask to build container image
    - name: build-image
      taskRef:
        name: buildah
        kind: ClusterTask
      runAfter:
        - build-java
      params:
        - name: IMAGE
          value: $(params.image)
        - name: DOCKERFILE
          value: ./Dockerfile
        - name: CONTEXT
          value: .
        - name: TLSVERIFY
          value: "true"
      workspaces:
        - name: source
          workspace: shared-workspace

    # Use openshift-client ClusterTask for deployment
    - name: deploy
      taskRef:
        name: openshift-client
        kind: ClusterTask
      runAfter:
        - build-image
      params:
        - name: SCRIPT
          value: |
            oc rollout restart deployment/myapp -n my-project
            oc rollout status deployment/myapp -n my-project --timeout=300s
```

### Creating Custom ClusterTasks

```yaml
# custom-clustertask.yaml
# Custom ClusterTask for organization-wide reuse
apiVersion: tekton.dev/v1beta1
kind: ClusterTask
metadata:
  name: sonarqube-scan
  labels:
    app.kubernetes.io/version: "1.0.0"
  annotations:
    tekton.dev/pipelines.minVersion: "0.17.0"
    tekton.dev/categories: Code Quality
    tekton.dev/tags: security,quality
    tekton.dev/displayName: "SonarQube Scanner"
spec:
  description: |
    Runs SonarQube analysis on source code.
    Requires SONAR_TOKEN secret in the namespace.

  params:
    - name: SONAR_HOST_URL
      description: SonarQube server URL
      type: string
      default: https://sonarqube.example.com
    - name: SONAR_PROJECT_KEY
      description: Unique project identifier in SonarQube
      type: string
    - name: SOURCE_DIR
      description: Directory containing source code
      type: string
      default: "."
    - name: EXTRA_ARGS
      description: Additional arguments for sonar-scanner
      type: array
      default: []

  workspaces:
    - name: source
      description: Workspace containing source code

  steps:
    - name: scan
      image: sonarsource/sonar-scanner-cli:5
      workingDir: $(workspaces.source.path)
      args:
        - "$(params.EXTRA_ARGS[*])"
      script: |
        #!/bin/bash
        set -e

        sonar-scanner \
          -Dsonar.host.url=$(params.SONAR_HOST_URL) \
          -Dsonar.projectKey=$(params.SONAR_PROJECT_KEY) \
          -Dsonar.sources=$(params.SOURCE_DIR) \
          -Dsonar.login=${SONAR_TOKEN} \
          "$@"
      env:
        - name: SONAR_TOKEN
          valueFrom:
            secretKeyRef:
              name: sonar-token
              key: token
```

## Monitoring Pipelines

Effective monitoring ensures pipeline health and helps troubleshoot failures.

### Checking Pipeline Status

```bash
# List all PipelineRuns in a namespace
oc get pipelineruns -n my-project

# Watch PipelineRuns in real-time
oc get pipelineruns -n my-project -w

# Get detailed status of a specific PipelineRun
oc describe pipelinerun my-pipeline-run-abc123 -n my-project

# Get TaskRun status within a PipelineRun
oc get taskruns -l tekton.dev/pipelineRun=my-pipeline-run-abc123 -n my-project
```

### Viewing Logs

```bash
# View logs for a specific TaskRun
tkn taskrun logs my-taskrun-name -n my-project

# Follow logs of a running PipelineRun
tkn pipelinerun logs my-pipeline-run-abc123 -f -n my-project

# View logs for a specific task within a pipeline
tkn pipelinerun logs my-pipeline-run-abc123 -f --task build-image -n my-project

# View logs for the last PipelineRun of a Pipeline
tkn pipeline logs ci-cd-pipeline --last -n my-project
```

### Metrics and Dashboards

```yaml
# servicemonitor.yaml
# ServiceMonitor for Prometheus to scrape Tekton metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: tekton-pipelines
  namespace: openshift-pipelines
  labels:
    app: tekton-pipelines
spec:
  selector:
    matchLabels:
      app: tekton-pipelines-controller
  namespaceSelector:
    matchNames:
      - openshift-pipelines
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Useful Metrics

```yaml
# Key Tekton metrics to monitor:
#
# tekton_pipelines_controller_pipelinerun_duration_seconds
#   - Duration of PipelineRuns
#   - Use for SLO tracking
#
# tekton_pipelines_controller_pipelinerun_count
#   - Total number of PipelineRuns
#   - Track by status (success/failure)
#
# tekton_pipelines_controller_taskrun_duration_seconds
#   - Duration of individual TaskRuns
#   - Identify slow tasks
#
# tekton_pipelines_controller_running_pipelineruns_count
#   - Currently running pipelines
#   - Capacity planning

# Example Prometheus alert
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tekton-alerts
  namespace: openshift-pipelines
spec:
  groups:
    - name: tekton.rules
      rules:
        - alert: PipelineRunFailed
          expr: |
            increase(tekton_pipelines_controller_pipelinerun_count{status="failed"}[5m]) > 0
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Pipeline run failed"
            description: "A PipelineRun has failed in the last 5 minutes"

        - alert: PipelineRunDurationHigh
          expr: |
            tekton_pipelines_controller_pipelinerun_duration_seconds{status="success"} > 1800
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pipeline taking too long"
            description: "Pipeline run duration exceeds 30 minutes"
```

### Using the tkn CLI for Monitoring

```bash
# Install tkn CLI (if not already installed)
# On macOS:
brew install tektoncd-cli

# On Linux:
curl -LO https://github.com/tektoncd/cli/releases/download/v0.33.0/tkn_0.33.0_Linux_x86_64.tar.gz
tar xvzf tkn_0.33.0_Linux_x86_64.tar.gz
sudo mv tkn /usr/local/bin/

# List pipelines
tkn pipeline list -n my-project

# List recent PipelineRuns
tkn pipelinerun list -n my-project

# Describe a Pipeline
tkn pipeline describe ci-cd-pipeline -n my-project

# Start a Pipeline manually
tkn pipeline start ci-cd-pipeline \
  -p git-url=https://github.com/myorg/myapp.git \
  -p git-revision=main \
  -w name=shared-workspace,claimName=pipeline-pvc \
  -n my-project

# Cancel a running PipelineRun
tkn pipelinerun cancel my-pipeline-run-abc123 -n my-project

# Delete old PipelineRuns (keep last 5)
tkn pipelinerun delete --keep 5 -n my-project
```

## Best Practices Summary

1. **Use ClusterTasks for common operations** - Leverage built-in ClusterTasks for git-clone, buildah, and openshift-client to reduce maintenance overhead and ensure consistency.

2. **Implement workspace isolation** - Use VolumeClaimTemplates for pipeline workspaces to ensure each run gets clean storage and automatic cleanup.

3. **Cache build dependencies** - Create dedicated PVCs for Maven, npm, or other build caches to significantly reduce build times.

4. **Set resource limits** - Define CPU and memory limits on Task steps to prevent runaway builds from affecting cluster stability.

5. **Use Triggers for automation** - Implement EventListeners with proper webhook validation to securely automate pipeline execution.

6. **Structure pipelines for parallelism** - Design pipelines to run independent tasks (like different test suites) in parallel to reduce overall execution time.

7. **Implement proper error handling** - Use finally tasks for cleanup and notifications regardless of pipeline success or failure.

8. **Monitor pipeline metrics** - Export Tekton metrics to Prometheus and set up alerts for failures and performance degradation.

9. **Version your pipeline definitions** - Store all Pipeline, Task, and Trigger definitions in Git alongside your application code.

10. **Use results for task communication** - Pass data between tasks using results rather than relying on workspace files for small values.

---

OpenShift Pipelines transforms how you build and deploy applications on OpenShift. Start with simple Tasks and Pipelines, then gradually add Triggers for automation and advanced features like parallel execution and multi-environment deployments. The Kubernetes-native approach means your CI/CD scales with your cluster and benefits from the same reliability and observability tools you use for your applications.

Ready to monitor your OpenShift Pipelines and the applications they deploy? [OneUptime](https://oneuptime.com) provides comprehensive observability for your entire stack, from pipeline metrics to application performance.
