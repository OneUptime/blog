# How to Set Up Tekton Pipelines with Rancher - Pipelines Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Rancher, Kubernetes, CI/CD, Pipeline, DevOps, Cloud Native

Description: Learn how to install and configure Tekton Pipelines on a Rancher-managed Kubernetes cluster, create reusable tasks, and build end-to-end CI/CD pipelines for container applications.

---

Tekton is a cloud-native CI/CD framework that runs entirely on Kubernetes. Installing it on a Rancher-managed cluster gives you portable, repeatable pipelines that work with the Kubernetes namespaces and RBAC policies that Rancher manages.

---

## Step 1: Install Tekton Pipelines and Dashboard

```bash
# Install the core Tekton Pipelines components

kubectl apply -f \
  https://infra.tekton.dev/tekton-releases/pipeline/latest/release.yaml

# Install the Tekton Dashboard for a visual UI
kubectl apply -f \
  https://infra.tekton.dev/tekton-releases/dashboard/latest/release.yaml

# Create the namespace used by the examples
kubectl create namespace my-app

# Verify pods are running
kubectl get pods -n tekton-pipelines
```

---

## Step 2: Install the Tekton CLI

```bash
# macOS
brew install tektoncd-cli

# Linux x86_64
VERSION=v0.44.0
curl -LO https://github.com/tektoncd/cli/releases/download/${VERSION}/tkn_${VERSION#v}_Linux_x86_64.tar.gz
sudo tar xvzf tkn_${VERSION#v}_Linux_x86_64.tar.gz -C /usr/local/bin/ tkn
```

---

## Step 3: Create a Task

A Task is the basic unit in Tekton. This task builds and pushes a Docker image using Kaniko (a daemon-less builder):

```bash
# Create this once with credentials for your registry
REGISTRY_USERNAME="your-username"
REGISTRY_PASSWORD="your-password"
kubectl create secret docker-registry docker-registry-credentials \
  --namespace my-app \
  --docker-server=registry.example.com \
  --docker-username="$REGISTRY_USERNAME" \
  --docker-password="$REGISTRY_PASSWORD"
```

```yaml
# task-build-push.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-push-image
  namespace: my-app
spec:
  params:
    - name: IMAGE
      description: Full image reference including tag
    - name: CONTEXT
      description: Docker build context path
      default: "."
  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      args:
        # Build from the workspace and push to the registry
        - --dockerfile=Dockerfile
        - --context=dir://$(workspaces.source.path)/$(params.CONTEXT)
        - --destination=$(params.IMAGE)
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: docker-config
      secret:
        secretName: docker-registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
  workspaces:
    - name: source
```

```bash
kubectl apply -f task-build-push.yaml
```

---

## Step 4: Create a Pipeline

This Pipeline chains a git-clone task with the build-push task:

```bash
# Install the git-clone Task in the same namespace as the Pipeline
kubectl apply -n my-app -f \
  https://raw.githubusercontent.com/tektoncd/catalog/main/task/git-clone/0.10/git-clone.yaml
```

```yaml
# pipeline-build-deploy.yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-and-deploy
  namespace: my-app
spec:
  params:
    - name: repo-url
    - name: image-name
    - name: revision
      default: main
  workspaces:
    - name: shared-workspace
  tasks:
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

    - name: build
      # Run build only after clone finishes
      runAfter: [clone]
      taskRef:
        name: build-push-image
      params:
        - name: IMAGE
          value: $(params.image-name):$(tasks.clone.results.commit)
      workspaces:
        - name: source
          workspace: shared-workspace
```

```bash
kubectl apply -f pipeline-build-deploy.yaml
```

---

## Step 5: Create a PipelineRun

A PipelineRun triggers the pipeline with concrete parameter values:

```yaml
# pipelinerun-example.yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: build-and-deploy-run-
  namespace: my-app
spec:
  pipelineRef:
    name: build-and-deploy
  params:
    - name: repo-url
      value: https://github.com/my-org/my-app.git
    - name: image-name
      value: registry.example.com/my-org/my-app
  workspaces:
    - name: shared-workspace
      volumeClaimTemplate:
        spec:
          accessModes: [ReadWriteOnce]
          resources:
            requests:
              storage: 1Gi
```

```bash
kubectl create -f pipelinerun-example.yaml
# Watch the most recent pipeline run in the namespace
tkn pipelinerun logs --last -f -n my-app
```

---

## Step 6: Set Up Tekton Triggers for Webhooks

Install Tekton Triggers to automatically start pipelines on GitHub pushes:

```bash
kubectl apply -f \
  https://infra.tekton.dev/tekton-releases/triggers/latest/release.yaml
kubectl apply -f \
  https://infra.tekton.dev/tekton-releases/triggers/latest/interceptors.yaml
```

Then create an `EventListener` that accepts GitHub webhook events and starts the pipeline automatically. See the [Tekton Triggers docs](https://tekton.dev/docs/triggers/) for full details.

---

## Best Practices

- Use versioned **Tasks** or Tekton resolvers for common operations like `git-clone`; `ClusterTask` is deprecated.
- Store Tekton pipelines in Git and manage them with Rancher Fleet for GitOps.
- Use **Workspaces** backed by Longhorn PVCs for large build caches.
