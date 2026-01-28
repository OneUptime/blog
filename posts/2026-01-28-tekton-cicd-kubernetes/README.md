# How to Implement Tekton CI/CD for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, CI/CD, Kubernetes, DevOps, Pipelines

Description: Learn how to build a full CI/CD workflow with Tekton, including build, test, and deployment stages for Kubernetes apps.

---

Tekton is a Kubernetes-native CI/CD system. This guide shows how to build a simple pipeline that builds an image and deploys it to a Kubernetes cluster.

## Step 1: Define a Build Task

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-image
spec:
  steps:
    - name: build
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --destination=registry.example.com/app:${REVISION}
```

## Step 2: Define a Deployment Task

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: deploy
spec:
  steps:
    - name: kubectl
      image: bitnami/kubectl:latest
      script: |
        kubectl set image deployment/app app=registry.example.com/app:${REVISION}
```

## Step 3: Create a Pipeline

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: cicd
spec:
  tasks:
    - name: build
      taskRef:
        name: build-image
    - name: deploy
      runAfter: ["build"]
      taskRef:
        name: deploy
```

## Step 4: Trigger the Pipeline

Use a PipelineRun or EventListener to trigger on Git events.

## Best Practices

- Use workspaces for source sharing
- Store secrets in Kubernetes and mount into tasks
- Use separate namespaces per environment

## Conclusion

Tekton provides flexible CI/CD for Kubernetes. With a few tasks and a pipeline, you can automate build and deployment workflows in a GitOps-friendly way.
