# How to Set Up Tekton Pipelines on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Tekton, CI/CD, Kubernetes, Cloud Native

Description: A step-by-step guide to deploying Tekton Pipelines on Talos Linux for building cloud-native CI/CD workflows directly in your Kubernetes cluster.

---

Tekton is a Kubernetes-native CI/CD framework that runs pipelines as native Kubernetes resources. Unlike traditional CI/CD tools that sit on top of Kubernetes, Tekton is built into it. Tasks, pipelines, and pipeline runs are all custom resources managed by the Kubernetes API. This makes Tekton a natural fit for Talos Linux, where everything is API-driven and the operating system itself is managed declaratively.

This guide walks through setting up Tekton on Talos Linux, creating tasks and pipelines, and building a real-world CI/CD workflow.

## Why Tekton on Talos Linux

Tekton and Talos Linux share a common philosophy: everything is declarative, everything is managed through APIs, and everything is reproducible. Tekton pipelines are defined as YAML and stored in Git, just like the Talos machine configuration. There is no CI server with a web UI you need to maintain. No plugins to update. No state to back up. The pipeline definitions are the source of truth, and Kubernetes handles the execution.

## Prerequisites

You will need the following:

- A Talos Linux cluster with kubectl configured
- At least 2 worker nodes with adequate resources
- A container registry for storing built images
- Git repositories with your application code

## Installing Tekton Pipelines

Tekton components are installed directly from their release manifests.

```bash
# Install Tekton Pipelines
kubectl apply --filename \
  https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Wait for the installation to complete
kubectl get pods -n tekton-pipelines -w

# Verify all components are running
kubectl get pods -n tekton-pipelines
# You should see:
# tekton-pipelines-controller
# tekton-pipelines-webhook
```

Install the Tekton Dashboard for a visual interface.

```bash
# Install the Tekton Dashboard
kubectl apply --filename \
  https://storage.googleapis.com/tekton-releases/dashboard/latest/release-full.yaml

# Access the dashboard
kubectl port-forward -n tekton-pipelines svc/tekton-dashboard 9097:9097
```

Install the Tekton CLI for command-line management.

```bash
# On macOS
brew install tektoncd-cli

# Verify the installation
tkn version
```

## Understanding Tekton Concepts

Tekton uses four main custom resources:

- **Task** - A collection of steps that run sequentially in a pod
- **TaskRun** - An execution of a Task
- **Pipeline** - A collection of Tasks that run in a defined order
- **PipelineRun** - An execution of a Pipeline

Each step in a Task runs in its own container within the same pod. Steps share a workspace through volume mounts.

## Creating Your First Task

```yaml
# git-clone-task.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: git-clone
  namespace: default
spec:
  params:
    - name: repo-url
      type: string
      description: The Git repository URL
    - name: revision
      type: string
      description: The Git revision to checkout
      default: main
  workspaces:
    - name: source
      description: The workspace to clone into
  steps:
    - name: clone
      image: alpine/git:latest
      script: |
        #!/usr/bin/env sh
        set -eu
        # Clone the repository
        git clone $(params.repo-url) $(workspaces.source.path)/src
        cd $(workspaces.source.path)/src
        git checkout $(params.revision)
        echo "Cloned $(params.repo-url) at $(git rev-parse HEAD)"
```

```yaml
# build-test-task.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: go-build-test
  namespace: default
spec:
  params:
    - name: package
      type: string
      description: The Go package to build
      default: "./..."
  workspaces:
    - name: source
      description: The workspace containing source code
  steps:
    - name: build
      image: golang:1.22
      workingDir: $(workspaces.source.path)/src
      script: |
        #!/usr/bin/env sh
        set -eu
        echo "Building Go application..."
        go build -v $(params.package)
        echo "Build completed successfully"

    - name: test
      image: golang:1.22
      workingDir: $(workspaces.source.path)/src
      script: |
        #!/usr/bin/env sh
        set -eu
        echo "Running tests..."
        go test -v -race -coverprofile=coverage.out $(params.package)
        echo "Tests completed"
```

```yaml
# build-image-task.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-push-image
  namespace: default
spec:
  params:
    - name: image
      type: string
      description: The image name and tag
    - name: dockerfile
      type: string
      default: Dockerfile
  workspaces:
    - name: source
      description: The workspace with source code and Dockerfile
    - name: docker-credentials
      description: Docker registry credentials
  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --dockerfile=$(workspaces.source.path)/src/$(params.dockerfile)
        - --context=$(workspaces.source.path)/src
        - --destination=$(params.image)
        - --cache=true
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: docker-config
      secret:
        secretName: docker-registry-credentials
```

## Building a Pipeline

Combine tasks into a pipeline.

```yaml
# ci-pipeline.yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: ci-pipeline
  namespace: default
spec:
  params:
    - name: repo-url
      type: string
    - name: revision
      type: string
      default: main
    - name: image-name
      type: string
  workspaces:
    - name: shared-workspace
    - name: docker-credentials

  tasks:
    # Step 1: Clone the repository
    - name: clone
      taskRef:
        name: git-clone
      params:
        - name: repo-url
          value: $(params.repo-url)
        - name: revision
          value: $(params.revision)
      workspaces:
        - name: source
          workspace: shared-workspace

    # Step 2: Build and test
    - name: build-test
      taskRef:
        name: go-build-test
      runAfter:
        - clone
      workspaces:
        - name: source
          workspace: shared-workspace

    # Step 3: Build and push container image
    - name: build-image
      taskRef:
        name: build-push-image
      runAfter:
        - build-test
      params:
        - name: image
          value: $(params.image-name)
      workspaces:
        - name: source
          workspace: shared-workspace
        - name: docker-credentials
          workspace: docker-credentials
```

## Running the Pipeline

```yaml
# pipeline-run.yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: ci-pipeline-run-
  namespace: default
spec:
  pipelineRef:
    name: ci-pipeline
  params:
    - name: repo-url
      value: "https://github.com/myorg/myapp.git"
    - name: revision
      value: "main"
    - name: image-name
      value: "registry.example.com/myapp:latest"
  workspaces:
    - name: shared-workspace
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Gi
    - name: docker-credentials
      secret:
        secretName: docker-registry-credentials
```

```bash
# Create the pipeline run
kubectl create -f pipeline-run.yaml

# Watch the pipeline execution
tkn pipelinerun logs -f -n default

# List all pipeline runs
tkn pipelinerun list -n default
```

## Setting Up Triggers

Tekton Triggers allow you to start pipelines automatically from Git webhooks.

```bash
# Install Tekton Triggers
kubectl apply --filename \
  https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml

# Install the interceptors
kubectl apply --filename \
  https://storage.googleapis.com/tekton-releases/triggers/latest/interceptors.yaml
```

```yaml
# trigger-template.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: ci-trigger-template
  namespace: default
spec:
  params:
    - name: git-revision
    - name: git-repo-url
  resourcetemplates:
    - apiVersion: tekton.dev/v1
      kind: PipelineRun
      metadata:
        generateName: ci-triggered-
      spec:
        pipelineRef:
          name: ci-pipeline
        params:
          - name: repo-url
            value: $(tt.params.git-repo-url)
          - name: revision
            value: $(tt.params.git-revision)
          - name: image-name
            value: "registry.example.com/myapp:$(tt.params.git-revision)"
        workspaces:
          - name: shared-workspace
            volumeClaimTemplate:
              spec:
                accessModes:
                  - ReadWriteOnce
                resources:
                  requests:
                    storage: 1Gi
          - name: docker-credentials
            secret:
              secretName: docker-registry-credentials
```

```yaml
# event-listener.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: ci-event-listener
  namespace: default
spec:
  triggers:
    - name: github-push
      interceptors:
        - ref:
            name: "github"
          params:
            - name: "eventTypes"
              value: ["push"]
      bindings:
        - name: git-revision
          value: $(body.after)
        - name: git-repo-url
          value: $(body.repository.clone_url)
      template:
        ref: ci-trigger-template
  resources:
    kubernetesResource:
      spec:
        template:
          spec:
            serviceAccountName: tekton-triggers-sa
```

## Cleanup and Resource Management

Tekton creates pods for each task run. Clean up completed runs to save resources.

```bash
# Delete completed pipeline runs older than 24 hours
tkn pipelinerun delete --keep 10 -n default

# Set up automatic pruning
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tekton-cleanup
  namespace: default
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: bitnami/kubectl:latest
              command: ["sh", "-c"]
              args: ["tkn pipelinerun delete --keep 20 -f -n default"]
          restartPolicy: OnFailure
          serviceAccountName: tekton-cleanup-sa
EOF
```

## Wrapping Up

Tekton Pipelines on Talos Linux delivers a truly Kubernetes-native CI/CD experience. Every component, from tasks to triggers, is a Kubernetes resource that you can manage with kubectl, store in Git, and audit through the API. There is no external CI server to maintain, no state to back up beyond what is in your cluster, and no plugins to manage. Combined with Talos Linux's immutable design, Tekton gives you a CI/CD platform that is as reliable and reproducible as the infrastructure it runs on.
