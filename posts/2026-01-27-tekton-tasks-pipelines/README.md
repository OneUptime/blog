# How to Create Tekton Tasks and Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Kubernetes, CI/CD, Pipelines, Cloud Native, DevOps, Automation

Description: A comprehensive guide to creating Tekton Tasks and Pipelines for cloud-native CI/CD workflows on Kubernetes.

---

> Tekton brings CI/CD directly into Kubernetes. Instead of managing external build servers, you define pipelines as Kubernetes resources that run as pods in your cluster.

## What Is Tekton?

Tekton is an open-source framework for creating cloud-native CI/CD pipelines. It runs natively on Kubernetes and uses custom resources to define your build and deployment workflows.

Key components:
- **Tasks** - Define a series of steps that run sequentially
- **Pipelines** - Orchestrate multiple tasks
- **PipelineRuns** - Execute pipelines with specific inputs
- **Workspaces** - Share data between tasks
- **Results** - Pass outputs between tasks

## Understanding Tasks

A Task is the fundamental building block in Tekton. It defines a sequence of steps that execute in order within a single pod.

```yaml
# task-example.yaml
# A basic Tekton Task that clones a repository and lists its contents
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: hello-task
spec:
  # Steps run sequentially in the same pod
  steps:
    # First step: print a greeting
    - name: greet
      image: alpine:3.18
      script: |
        #!/bin/sh
        echo "Hello from Tekton!"
        echo "Current directory: $(pwd)"

    # Second step: show environment info
    - name: show-env
      image: alpine:3.18
      command:
        - /bin/sh
        - -c
      args:
        - |
          echo "Running on Kubernetes"
          uname -a
```

Apply and run this task:

```bash
# Apply the task definition
kubectl apply -f task-example.yaml

# Create a TaskRun to execute it
kubectl create -f - <<EOF
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  generateName: hello-task-run-
spec:
  taskRef:
    name: hello-task
EOF

# Check the logs
tkn taskrun logs -f
```

## Steps in Detail

Steps are the individual commands that run within a Task. Each step runs in its own container but shares the same pod.

```yaml
# task-with-steps.yaml
# Demonstrates different ways to define steps
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: multi-step-task
spec:
  steps:
    # Method 1: Using script block (recommended for complex logic)
    - name: script-step
      image: python:3.11-slim
      script: |
        #!/usr/bin/env python3
        import json
        import os

        # Access environment variables
        workspace = os.environ.get('WORKSPACE', '/workspace')
        print(f"Working in: {workspace}")

        # Perform operations
        data = {"status": "success", "step": "script-step"}
        print(json.dumps(data, indent=2))

    # Method 2: Using command and args
    - name: command-step
      image: alpine:3.18
      command:
        - /bin/sh
        - -c
      args:
        - |
          echo "Running command step"
          date

    # Method 3: Using just args (uses image entrypoint)
    - name: curl-step
      image: curlimages/curl:8.4.0
      args:
        - "-s"
        - "https://httpbin.org/get"

    # Method 4: Working directory and environment
    - name: env-step
      image: alpine:3.18
      workingDir: /data
      env:
        - name: MY_VAR
          value: "custom-value"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
      script: |
        #!/bin/sh
        echo "MY_VAR is: $MY_VAR"
        echo "POD_NAME is: $POD_NAME"
        echo "Working directory: $(pwd)"
```

## Task Parameters

Parameters make tasks reusable by allowing dynamic values at runtime.

```yaml
# task-with-params.yaml
# A parameterized task for building container images
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-image
spec:
  # Define parameters the task accepts
  params:
    # Required parameter with no default
    - name: IMAGE_NAME
      type: string
      description: "Name of the image to build"

    # Optional parameter with default value
    - name: DOCKERFILE
      type: string
      description: "Path to the Dockerfile"
      default: "./Dockerfile"

    # Array parameter for build arguments
    - name: BUILD_ARGS
      type: array
      description: "Docker build arguments"
      default: []

  steps:
    - name: build
      image: gcr.io/kaniko-project/executor:latest
      args:
        # Reference string parameters with $(params.NAME)
        - "--dockerfile=$(params.DOCKERFILE)"
        - "--destination=$(params.IMAGE_NAME)"
        - "--context=/workspace/source"
        # Reference array parameters - they expand to multiple args
        - "$(params.BUILD_ARGS[*])"
```

Running a task with parameters:

```yaml
# taskrun-with-params.yaml
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  name: build-my-app
spec:
  taskRef:
    name: build-image
  params:
    - name: IMAGE_NAME
      value: "registry.example.com/myapp:v1.0.0"
    - name: DOCKERFILE
      value: "./docker/Dockerfile.prod"
    - name: BUILD_ARGS
      value:
        - "--build-arg=NODE_ENV=production"
        - "--build-arg=VERSION=1.0.0"
```

## Workspaces

Workspaces provide shared storage between steps and tasks. They are essential for passing files and artifacts through your pipeline.

```yaml
# task-with-workspace.yaml
# Task that uses a workspace for source code
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: test-code
spec:
  # Declare workspaces the task needs
  workspaces:
    # Main workspace for source code
    - name: source
      description: "The source code to test"

    # Optional workspace for caching
    - name: cache
      description: "Cache for dependencies"
      optional: true

  params:
    - name: TEST_CMD
      type: string
      default: "npm test"

  steps:
    - name: install-deps
      image: node:20-alpine
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        # Check if cache exists and use it
        if [ -d "$(workspaces.cache.path)/node_modules" ]; then
          echo "Restoring cached node_modules"
          cp -r $(workspaces.cache.path)/node_modules .
        fi

        npm ci

        # Save to cache for next run
        if [ -d "$(workspaces.cache.path)" ]; then
          cp -r node_modules $(workspaces.cache.path)/
        fi

    - name: run-tests
      image: node:20-alpine
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        $(params.TEST_CMD)
```

Binding workspaces in a TaskRun:

```yaml
# taskrun-with-workspace.yaml
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  name: test-my-code
spec:
  taskRef:
    name: test-code
  workspaces:
    # Use a PersistentVolumeClaim
    - name: source
      persistentVolumeClaim:
        claimName: source-pvc

    # Use an emptyDir for temporary storage
    - name: cache
      emptyDir: {}
```

## Results

Results allow tasks to produce outputs that can be consumed by other tasks in a pipeline.

```yaml
# task-with-results.yaml
# Task that outputs version information
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: get-version
spec:
  workspaces:
    - name: source

  # Declare results this task produces
  results:
    - name: version
      description: "The application version"
    - name: commit-sha
      description: "The git commit SHA"
    - name: build-date
      description: "The build timestamp"

  steps:
    - name: extract-version
      image: alpine:3.18
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        # Extract version from package.json or similar
        VERSION=$(cat version.txt 2>/dev/null || echo "0.0.1")

        # Write results - each result is a file in /tekton/results
        echo -n "$VERSION" > $(results.version.path)
        echo -n "$(date -u +%Y%m%d%H%M%S)" > $(results.build-date.path)

    - name: get-git-info
      image: alpine/git:2.40.1
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        # Get current commit SHA
        git rev-parse HEAD | tr -d '\n' > $(results.commit-sha.path)
```

## Pipelines

Pipelines orchestrate multiple tasks, defining execution order and data flow.

```yaml
# pipeline-example.yaml
# Complete CI/CD pipeline for a Node.js application
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: nodejs-cicd
spec:
  # Pipeline-level parameters
  params:
    - name: repo-url
      type: string
      description: "Git repository URL"
    - name: revision
      type: string
      default: "main"
    - name: image-name
      type: string
      description: "Container image to build"

  # Pipeline-level workspaces
  workspaces:
    - name: shared-workspace
      description: "Workspace shared across all tasks"
    - name: docker-credentials
      description: "Docker registry credentials"

  # Define tasks and their order
  tasks:
    # Task 1: Clone the repository
    - name: clone
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.repo-url)
        - name: revision
          value: $(params.revision)
      workspaces:
        - name: output
          workspace: shared-workspace

    # Task 2: Run tests (depends on clone)
    - name: test
      taskRef:
        name: npm-test
      runAfter:
        - clone
      workspaces:
        - name: source
          workspace: shared-workspace

    # Task 3: Build image (depends on test)
    - name: build
      taskRef:
        name: kaniko-build
      runAfter:
        - test
      params:
        - name: IMAGE
          # Use results from previous tasks
          value: "$(params.image-name):$(tasks.clone.results.commit)"
      workspaces:
        - name: source
          workspace: shared-workspace
        - name: dockerconfig
          workspace: docker-credentials

    # Task 4: Deploy to staging (depends on build)
    - name: deploy-staging
      taskRef:
        name: kubectl-deploy
      runAfter:
        - build
      params:
        - name: image
          value: "$(params.image-name):$(tasks.clone.results.commit)"
        - name: namespace
          value: "staging"
```

## PipelineRuns

PipelineRuns execute a Pipeline with specific parameters and workspace bindings.

```yaml
# pipelinerun-example.yaml
# Execute the CI/CD pipeline
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  # Use generateName for unique run names
  generateName: nodejs-cicd-run-
spec:
  pipelineRef:
    name: nodejs-cicd

  # Provide parameter values
  params:
    - name: repo-url
      value: "https://github.com/example/nodejs-app.git"
    - name: revision
      value: "feature/new-feature"
    - name: image-name
      value: "registry.example.com/nodejs-app"

  # Bind workspaces to actual storage
  workspaces:
    # Use a VolumeClaimTemplate for dynamic PVC creation
    - name: shared-workspace
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Gi

    # Use a secret for Docker credentials
    - name: docker-credentials
      secret:
        secretName: docker-registry-secret

  # Optional: Set a timeout
  timeouts:
    pipeline: "1h"
    tasks: "30m"

  # Optional: Pod template for all task pods
  podTemplate:
    nodeSelector:
      kubernetes.io/os: linux
    tolerations:
      - key: "ci"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

## When Expressions

When expressions provide conditional execution of tasks based on parameters or results.

```yaml
# pipeline-with-conditions.yaml
# Pipeline with conditional task execution
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: conditional-pipeline
spec:
  params:
    - name: run-tests
      type: string
      default: "true"
    - name: environment
      type: string
      default: "staging"

  workspaces:
    - name: source

  tasks:
    - name: clone
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: source

    # Only run tests if run-tests parameter is "true"
    - name: unit-tests
      taskRef:
        name: run-tests
      runAfter:
        - clone
      when:
        - input: $(params.run-tests)
          operator: in
          values: ["true", "yes", "1"]
      workspaces:
        - name: source
          workspace: source

    # Deploy to staging only for staging environment
    - name: deploy-staging
      taskRef:
        name: deploy
      runAfter:
        - unit-tests
      when:
        - input: $(params.environment)
          operator: in
          values: ["staging", "stage"]
      params:
        - name: namespace
          value: "staging"

    # Deploy to production only for production environment
    - name: deploy-production
      taskRef:
        name: deploy
      runAfter:
        - unit-tests
      when:
        # Multiple conditions are ANDed together
        - input: $(params.environment)
          operator: in
          values: ["production", "prod"]
        # Can also use "notin" operator
        - input: $(tasks.unit-tests.results.test-status)
          operator: notin
          values: ["failed", "error"]
      params:
        - name: namespace
          value: "production"
```

## Real-World Example: Complete CI/CD Pipeline

Here is a complete, production-ready pipeline:

```yaml
# complete-pipeline.yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: app-cicd-pipeline
spec:
  description: "Complete CI/CD pipeline with testing, security scanning, and deployment"

  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
      default: "main"
    - name: image-registry
      type: string
      default: "docker.io"
    - name: image-name
      type: string
    - name: deploy-env
      type: string
      default: "staging"

  workspaces:
    - name: source-code
    - name: docker-config
    - name: kubeconfig

  results:
    # Pipeline-level results from task results
    - name: image-digest
      description: "Built image digest"
      value: $(tasks.build-image.results.IMAGE_DIGEST)
    - name: deployed-version
      description: "Deployed version"
      value: $(tasks.get-version.results.version)

  tasks:
    # Stage 1: Clone
    - name: fetch-source
      taskRef:
        name: git-clone
        kind: ClusterTask
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
        - name: depth
          value: "1"
      workspaces:
        - name: output
          workspace: source-code

    # Stage 2: Get version info
    - name: get-version
      taskRef:
        name: get-version
      runAfter:
        - fetch-source
      workspaces:
        - name: source
          workspace: source-code

    # Stage 3: Parallel testing and scanning
    - name: run-unit-tests
      taskRef:
        name: run-tests
      runAfter:
        - fetch-source
      params:
        - name: test-type
          value: "unit"
      workspaces:
        - name: source
          workspace: source-code

    - name: run-lint
      taskRef:
        name: run-lint
      runAfter:
        - fetch-source
      workspaces:
        - name: source
          workspace: source-code

    - name: security-scan
      taskRef:
        name: trivy-scan
      runAfter:
        - fetch-source
      workspaces:
        - name: source
          workspace: source-code

    # Stage 4: Build image (after all tests pass)
    - name: build-image
      taskRef:
        name: kaniko
        kind: ClusterTask
      runAfter:
        - run-unit-tests
        - run-lint
        - security-scan
        - get-version
      params:
        - name: IMAGE
          value: "$(params.image-registry)/$(params.image-name):$(tasks.get-version.results.version)"
        - name: EXTRA_ARGS
          value:
            - "--cache=true"
            - "--cache-repo=$(params.image-registry)/$(params.image-name)-cache"
      workspaces:
        - name: source
          workspace: source-code
        - name: dockerconfig
          workspace: docker-config

    # Stage 5: Deploy to staging
    - name: deploy-staging
      taskRef:
        name: kubernetes-deploy
      runAfter:
        - build-image
      when:
        - input: $(params.deploy-env)
          operator: in
          values: ["staging", "all"]
      params:
        - name: image
          value: "$(params.image-registry)/$(params.image-name):$(tasks.get-version.results.version)"
        - name: namespace
          value: "staging"
      workspaces:
        - name: kubeconfig
          workspace: kubeconfig

    # Stage 6: Integration tests on staging
    - name: integration-tests
      taskRef:
        name: run-tests
      runAfter:
        - deploy-staging
      when:
        - input: $(params.deploy-env)
          operator: in
          values: ["staging", "all"]
      params:
        - name: test-type
          value: "integration"
        - name: target-url
          value: "http://app.staging.svc.cluster.local"
      workspaces:
        - name: source
          workspace: source-code

    # Stage 7: Deploy to production (manual approval typically added)
    - name: deploy-production
      taskRef:
        name: kubernetes-deploy
      runAfter:
        - integration-tests
      when:
        - input: $(params.deploy-env)
          operator: in
          values: ["production", "all"]
        - input: $(tasks.integration-tests.results.status)
          operator: in
          values: ["passed"]
      params:
        - name: image
          value: "$(params.image-registry)/$(params.image-name):$(tasks.get-version.results.version)"
        - name: namespace
          value: "production"
      workspaces:
        - name: kubeconfig
          workspace: kubeconfig

  # Finally block - runs regardless of success/failure
  finally:
    - name: cleanup
      taskRef:
        name: cleanup-workspace
      workspaces:
        - name: source
          workspace: source-code

    - name: notify
      taskRef:
        name: send-notification
      params:
        - name: status
          value: "$(tasks.status)"
        - name: pipeline-name
          value: "$(context.pipelineRun.name)"
```

## Best Practices Summary

1. **Use Workspaces for Data Sharing**: Prefer workspaces over embedded git clones in each task. Clone once and share.

2. **Parameterize Everything**: Make tasks reusable by parameterizing image names, paths, commands, and configuration.

3. **Keep Tasks Focused**: Each task should do one thing well. Combine them in pipelines for complex workflows.

4. **Use Results for Communication**: Pass data between tasks using results rather than files with hardcoded paths.

5. **Leverage When Expressions**: Use conditional execution to build flexible pipelines that adapt to different scenarios.

6. **Set Appropriate Timeouts**: Always configure timeouts to prevent hung pipelines from consuming resources.

7. **Use Finally Tasks**: Add cleanup and notification tasks in the finally block to ensure they run regardless of pipeline status.

8. **Version Your Pipeline Definitions**: Store pipeline YAML in git alongside your application code.

9. **Use ClusterTasks for Common Operations**: Share common tasks across namespaces using ClusterTask resources.

10. **Secure Your Workspaces**: Use secrets for credentials and limit workspace access to what each task needs.

---

Tekton provides a powerful, Kubernetes-native approach to CI/CD. Start with simple tasks, combine them into pipelines, and gradually add complexity as your needs grow. The declarative nature of Tekton makes your pipelines versionable, reviewable, and reproducible.

Monitor your Tekton pipelines alongside your applications with [OneUptime](https://oneuptime.com) for complete visibility into your CI/CD workflows and production systems.
