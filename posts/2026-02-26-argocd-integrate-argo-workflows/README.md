# How to Integrate ArgoCD with Argo Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Argo Workflows, CI/CD

Description: Learn how to integrate ArgoCD with Argo Workflows to build complete CI/CD pipelines where Argo Workflows handles continuous integration and ArgoCD manages continuous deployment through GitOps.

---

ArgoCD handles the "CD" in CI/CD - it deploys what is in Git to your cluster. But who updates Git in the first place? Who builds the container images, runs the tests, and pushes the new image tags? That is where Argo Workflows comes in. Together, ArgoCD and Argo Workflows form a powerful, Kubernetes-native CI/CD pipeline where Workflows builds and tests your code, updates the Git repository, and ArgoCD picks up the changes and deploys them.

## Architecture Overview

The integration follows a clean separation of concerns:

```mermaid
graph LR
    A[Developer Push] --> B[Argo Workflows]
    B --> C[Build Image]
    C --> D[Run Tests]
    D --> E[Push to Registry]
    E --> F[Update Git Manifests]
    F --> G[ArgoCD Detects Change]
    G --> H[Deploy to Cluster]
```

- **Argo Workflows** handles CI tasks: building images, running tests, scanning for vulnerabilities, and updating Git manifests
- **ArgoCD** handles CD: detecting Git changes and syncing the cluster state

This is a GitOps-native approach because the Git repository remains the single source of truth. Workflows does not deploy directly - it writes to Git, and ArgoCD reads from Git.

## Prerequisites

Install both ArgoCD and Argo Workflows in your cluster:

```bash
# ArgoCD (if not already installed)
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Argo Workflows
kubectl create namespace argo
kubectl apply -n argo -f https://github.com/argoproj/argo-workflows/releases/latest/download/install.yaml
```

You also need:
- A container registry (Docker Hub, ECR, GCR, etc.)
- A Git repository with your application code and Kubernetes manifests
- Git credentials configured as a Kubernetes secret

## Building the CI Workflow

Create an Argo Workflow that builds your container image and updates the deployment manifest in Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: ci-pipeline
  namespace: argo
spec:
  entrypoint: ci
  arguments:
    parameters:
      - name: git-repo
        value: https://github.com/my-org/my-app.git
      - name: git-revision
        value: main
      - name: image-name
        value: my-org/my-app
      - name: manifest-repo
        value: https://github.com/my-org/k8s-manifests.git
  volumeClaimTemplates:
    - metadata:
        name: workspace
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 2Gi

  templates:
    - name: ci
      dag:
        tasks:
          - name: checkout
            template: git-clone
            arguments:
              parameters:
                - name: repo
                  value: "{{workflow.parameters.git-repo}}"
                - name: revision
                  value: "{{workflow.parameters.git-revision}}"

          - name: build-and-push
            template: build-image
            dependencies: [checkout]
            arguments:
              parameters:
                - name: image
                  value: "{{workflow.parameters.image-name}}"

          - name: run-tests
            template: test
            dependencies: [checkout]

          - name: update-manifests
            template: update-git-manifests
            dependencies: [build-and-push, run-tests]
            arguments:
              parameters:
                - name: image
                  value: "{{workflow.parameters.image-name}}"
                - name: tag
                  value: "{{workflow.parameters.git-revision}}"

    - name: git-clone
      inputs:
        parameters:
          - name: repo
          - name: revision
      container:
        image: alpine/git:latest
        command: [sh, -c]
        args:
          - |
            git clone {{inputs.parameters.repo}} /workspace/source
            cd /workspace/source
            git checkout {{inputs.parameters.revision}}
        volumeMounts:
          - name: workspace
            mountPath: /workspace

    - name: build-image
      inputs:
        parameters:
          - name: image
      container:
        image: gcr.io/kaniko-project/executor:latest
        args:
          - "--dockerfile=/workspace/source/Dockerfile"
          - "--context=/workspace/source"
          - "--destination={{inputs.parameters.image}}:{{workflow.parameters.git-revision}}"
          - "--cache=true"
        volumeMounts:
          - name: workspace
            mountPath: /workspace
          - name: docker-config
            mountPath: /kaniko/.docker
      volumes:
        - name: docker-config
          secret:
            secretName: docker-registry-credentials

    - name: test
      container:
        image: golang:1.21
        command: [sh, -c]
        args:
          - |
            cd /workspace/source
            go test ./...
        volumeMounts:
          - name: workspace
            mountPath: /workspace

    - name: update-git-manifests
      inputs:
        parameters:
          - name: image
          - name: tag
      container:
        image: alpine/git:latest
        command: [sh, -c]
        args:
          - |
            # Clone the manifest repository
            git clone https://$(GIT_USER):$(GIT_TOKEN)@github.com/my-org/k8s-manifests.git /tmp/manifests
            cd /tmp/manifests

            # Update the image tag in the deployment manifest
            sed -i "s|image: {{inputs.parameters.image}}:.*|image: {{inputs.parameters.image}}:{{inputs.parameters.tag}}|" \
              apps/my-app/deployment.yaml

            # Commit and push
            git config user.email "ci@company.com"
            git config user.name "CI Pipeline"
            git add .
            git commit -m "Update my-app image to {{inputs.parameters.tag}}"
            git push origin main
        env:
          - name: GIT_USER
            valueFrom:
              secretKeyRef:
                name: git-credentials
                key: username
          - name: GIT_TOKEN
            valueFrom:
              secretKeyRef:
                name: git-credentials
                key: token
```

## Triggering Workflows on Git Push

Use Argo Events to automatically trigger the CI workflow when code is pushed:

```yaml
# EventSource - watches for GitHub webhooks
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: github-webhook
  namespace: argo-events
spec:
  github:
    my-app:
      repositories:
        - owner: my-org
          names:
            - my-app
      webhook:
        endpoint: /push
        port: "12000"
        method: POST
      events:
        - push
      apiToken:
        name: github-access
        key: token
      webhookSecret:
        name: github-access
        key: webhook-secret

---
# Sensor - triggers the workflow
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: ci-trigger
  namespace: argo-events
spec:
  dependencies:
    - name: github-push
      eventSourceName: github-webhook
      eventName: my-app
      filters:
        data:
          - path: body.ref
            type: string
            value:
              - "refs/heads/main"
  triggers:
    - template:
        name: trigger-ci
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: ci-my-app-
                namespace: argo
              spec:
                workflowTemplateRef:
                  name: ci-pipeline
                arguments:
                  parameters:
                    - name: git-revision
                      value: ""
          parameters:
            - src:
                dependencyName: github-push
                dataKey: body.after
              dest: spec.arguments.parameters.0.value
```

## ArgoCD Application Configuration

Configure ArgoCD to watch the manifest repository that the workflow updates:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # Notify on deployment events
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

With `automated` sync enabled, ArgoCD detects the Git changes made by the workflow and deploys automatically.

## Using ArgoCD Image Updater as an Alternative

Instead of having the workflow update Git manifests directly, you can use ArgoCD Image Updater to detect new images in the registry:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # ArgoCD Image Updater annotations
    argocd-image-updater.argoproj.io/image-list: myapp=my-org/my-app
    argocd-image-updater.argoproj.io/myapp.update-strategy: latest
    argocd-image-updater.argoproj.io/write-back-method: git
spec:
  # ...
```

This eliminates the "update Git manifests" step from the workflow, making the CI pipeline simpler:

```mermaid
graph LR
    A[Argo Workflows] --> B[Build & Push Image]
    B --> C[Image Updater Detects]
    C --> D[Updates Git]
    D --> E[ArgoCD Syncs]
```

## Calling ArgoCD from Workflows

Sometimes you need to trigger an ArgoCD sync from within a workflow, for example after a manual approval step:

```yaml
- name: sync-argocd-app
  container:
    image: argoproj/argocd:v2.9.0
    command: [sh, -c]
    args:
      - |
        # Login to ArgoCD
        argocd login argocd-server.argocd.svc.cluster.local \
          --username admin \
          --password $ARGOCD_PASSWORD \
          --insecure

        # Trigger sync
        argocd app sync my-app --prune

        # Wait for sync to complete
        argocd app wait my-app --timeout 300
    env:
      - name: ARGOCD_PASSWORD
        valueFrom:
          secretKeyRef:
            name: argocd-credentials
            key: admin-password
```

## Complete Pipeline Example

Here is how the full pipeline flows:

1. Developer pushes code to the application repository
2. GitHub webhook triggers Argo Events
3. Argo Events creates an Argo Workflow
4. The Workflow builds the image, runs tests, pushes to registry
5. The Workflow updates the image tag in the manifest repository
6. ArgoCD detects the manifest change
7. ArgoCD syncs the new version to the cluster
8. ArgoCD notifications alert the team of the deployment

This gives you a fully automated, GitOps-native CI/CD pipeline where every change is tracked in Git and every deployment is declarative. For more on ArgoCD notifications in this workflow, see [How to Configure Notifications in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view).
