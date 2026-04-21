# How to Configure Tekton Pipelines with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Tekton, Kubernetes, CI/CD, Pipeline, DevOps

Description: Configure Tekton Pipelines to run in IPv6 Kubernetes clusters, connect to IPv6 Git sources, and test IPv6 connectivity within pipeline tasks.

## Introduction

Tekton Pipelines is a Kubernetes-native CI/CD framework where every step runs as a container in a Kubernetes Pod. IPv6 support in Tekton is inherited from the Kubernetes cluster's network configuration - if the cluster supports IPv6, Tekton tasks automatically benefit from it.

## Prerequisites

- Kubernetes cluster with IPv6 support (dual-stack or IPv6-only)
- Tekton Pipelines installed
- kubectl and tkn (Tekton CLI) configured

## Step 1: Verify Tekton Runs in IPv6 Cluster

```bash
# Check Tekton components are running

kubectl get pods -n tekton-pipelines

# Verify a Tekton task pod gets an IPv6 address
kubectl apply -f - <<'EOF'
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  name: ipv6-test-run
spec:
  taskSpec:
    steps:
      - name: check-ipv6
        image: ubuntu:22.04
        script: |
          #!/bin/bash
          apt-get update -qq && apt-get install -y -qq iproute2 iputils-ping curl
          echo "IPv6 addresses:"
          ip -6 addr show scope global
          echo "Testing external IPv6:"
          curl -6 https://api6.ipify.org || echo "No external IPv6"
EOF

# Watch the TaskRun
tkn taskrun logs ipv6-test-run -f
```

## Step 2: Create a Task with IPv6 Git Clone

```yaml
# task-git-clone-ipv6.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: git-clone-ipv6
spec:
  params:
    - name: repo-url
      type: string
      description: Git repository URL (supports IPv6 URLs)
    - name: revision
      type: string
      default: main
  workspaces:
    - name: output
      description: The git repository will be cloned onto the volume here
  steps:
    - name: clone
      image: alpine/git:latest
      script: |
        #!/bin/sh
        # Git supports bracketed IPv6 literals in HTTP(S) URLs.
        # Make sure the image trusts your Git server's TLS certificate.

        # Clone the repository
        git clone "$(params.repo-url)" "$(workspaces.output.path)/repo"
        cd "$(workspaces.output.path)/repo"
        git checkout "$(params.revision)"
        echo "Repository cloned from $(params.repo-url)"
        ls -la
```

Apply and run:

```bash
kubectl apply -f task-git-clone-ipv6.yaml

kubectl apply -f - <<'EOF'
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  name: clone-from-ipv6-git
spec:
  taskRef:
    name: git-clone-ipv6
  params:
    - name: repo-url
      value: "https://[2001:db8::10]/org/my-app.git"
  workspaces:
    - name: output
      emptyDir: {}
EOF
```

## Step 3: Full IPv6-Aware Pipeline

```yaml
# pipeline-ipv6.yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: ipv6-app-pipeline
spec:
  params:
    - name: git-url
      type: string
    - name: image-name
      type: string
  workspaces:
    - name: source-code

  tasks:
    - name: fetch-source
      taskRef:
        name: git-clone-ipv6
      params:
        - name: repo-url
          value: "$(params.git-url)"
      workspaces:
        - name: output
          workspace: source-code

    - name: test-ipv6-connectivity
      runAfter: [fetch-source]
      taskSpec:
        steps:
          - name: ipv6-check
            image: ubuntu:22.04
            script: |
              #!/bin/bash
              apt-get update -qq && apt-get install -y -qq iputils-ping curl
              # Verify IPv6 works in this cluster
              if ping -6 -c 2 2606:4700:4700::1111; then
                echo "IPv6 connectivity: OK"
              else
                echo "WARNING: No external IPv6 connectivity"
              fi

    - name: build-image
      runAfter: [test-ipv6-connectivity]
      taskSpec:
        params:
          - name: image
        steps:
          - name: build
            image: registry.example.com/kaniko/executor:latest
            args:
              - --context=/workspace/source
              - --destination=$(params.image)
              # Use a maintained Kaniko executor image and an IPv6-reachable registry
      params:
        - name: image
          value: "$(params.image-name)"
      workspaces:
        - name: source
          workspace: source-code

---
# PipelineRun
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: ipv6-app-run-001
spec:
  pipelineRef:
    name: ipv6-app-pipeline
  params:
    - name: git-url
      value: "https://[2001:db8::10]/org/my-app.git"
    - name: image-name
      value: "myregistry.example.com/myapp:latest"
  workspaces:
    - name: source-code
      volumeClaimTemplate:
        spec:
          accessModes: [ReadWriteOnce]
          resources:
            requests:
              storage: 1Gi
```

## Step 4: Verify Pipeline Execution

```bash
# Apply the pipeline
kubectl apply -f pipeline-ipv6.yaml

# Watch the pipeline run
tkn pipelinerun logs ipv6-app-run-001 -f

# Check task run status
tkn taskrun list

# Get detailed logs for a specific task
tkn taskrun logs <taskrun-name> -f

# Check pod IP addresses for each task step
kubectl get pods -l tekton.dev/pipelineRun=ipv6-app-run-001 -o wide
```

## Conclusion

Tekton Pipelines inherits IPv6 support from the Kubernetes cluster - every task step runs as a container in a Pod, and if the cluster has IPv6, those pods automatically get IPv6 addresses. The key differences for IPv6 with Tekton are: using IPv6 bracket notation in Git URLs, ensuring container images are pulled from IPv6-accessible registries, and verifying that the cluster's CNI plugin correctly assigns IPv6 addresses to pods. No Tekton-specific IPv6 configuration is required beyond having a properly configured IPv6 Kubernetes cluster.
