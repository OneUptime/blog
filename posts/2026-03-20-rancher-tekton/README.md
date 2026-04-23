# How to Set Up Tekton Pipelines with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Tekton, CI/CD, Pipeline

Description: Install and configure Tekton Pipelines on Rancher-managed clusters to build cloud-native CI/CD pipelines using Kubernetes-native resources.

## Introduction

Tekton is a Kubernetes-native CI/CD framework that runs pipelines as Kubernetes resources (Tasks, Pipelines, PipelineRuns). Its cloud-native design makes it a natural fit for Rancher-managed clusters. This guide covers installing Tekton, creating reusable tasks, and building complete CI/CD pipelines that deploy to Rancher clusters.

## Prerequisites

- Rancher-managed Kubernetes cluster (RKE2 or imported) running Kubernetes 1.28 or later
- `kubectl` installed with cluster-admin access to the target cluster
- Container registry access
- Secrets named `docker-registry-credentials` and `target-cluster-kubeconfig` created in the pipeline namespace

## Step 1: Install Tekton Pipelines

```bash
# Install Tekton Pipelines (latest stable)

kubectl apply -f \
  https://infra.tekton.dev/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Dashboard for UI
kubectl apply -f \
  https://storage.googleapis.com/tekton-releases/dashboard/latest/release.yaml

# Install Tekton Triggers (for webhook-based triggering)
kubectl apply -f \
  https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml
kubectl apply -f \
  https://storage.googleapis.com/tekton-releases/triggers/latest/interceptors.yaml

# Monitor Tekton components until they are ready
kubectl get pods --namespace tekton-pipelines --watch

# Expose the Tekton Dashboard via port-forward
kubectl --namespace tekton-pipelines port-forward svc/tekton-dashboard 9097:9097 &
```

## Step 2: Install the Tekton CLI

```bash
# macOS
brew install tektoncd-cli

# Linux
curl -LO https://github.com/tektoncd/cli/releases/latest/download/tkn_Linux_x86_64.tar.gz
tar xvzf tkn_Linux_x86_64.tar.gz tkn
sudo mv tkn /usr/local/bin/

# Verify
tkn version
```

## Step 3: Create Reusable Tasks

```yaml
# tasks/git-clone.yaml - Clone a Git repository
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: git-clone
spec:
  params:
    - name: url
      description: Repository URL to clone
    - name: revision
      default: main
  workspaces:
    - name: source
      description: The workspace where source code will be cloned
  steps:
    - name: clone
      image: alpine/git:latest
      script: |
        git clone $(params.url) $(workspaces.source.path)
        cd $(workspaces.source.path)
        git checkout $(params.revision)
---
# tasks/build-push.yaml - Build and push a Docker image
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-push
spec:
  params:
    - name: image
      description: Full image name including registry and tag
    - name: dockerfile
      default: "./Dockerfile"
  workspaces:
    - name: source
  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest  # No Docker daemon needed
      args:
        - "--dockerfile=$(params.dockerfile)"
        - "--context=$(workspaces.source.path)"
        - "--destination=$(params.image)"
      volumeMounts:
        - name: docker-credentials
          mountPath: /kaniko/.docker
  volumes:
    - name: docker-credentials
      secret:
        secretName: docker-registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
---
# tasks/kubectl-deploy.yaml - Deploy to Kubernetes
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: kubectl-deploy
spec:
  params:
    - name: image
      description: New image to deploy
    - name: deployment
      description: Deployment name
    - name: container
      default: app
      description: Container name inside the Deployment to update
    - name: namespace
      default: default
  steps:
    - name: deploy
      image: bitnami/kubectl:latest
      env:
        - name: KUBECONFIG_DATA
          valueFrom:
            secretKeyRef:
              name: target-cluster-kubeconfig
              key: kubeconfig
      script: |
        printf '%s' "$KUBECONFIG_DATA" > /tmp/kubeconfig
        kubectl set image deployment/$(params.deployment) \
          $(params.container)=$(params.image) \
          -n $(params.namespace) \
          --kubeconfig /tmp/kubeconfig
        kubectl rollout status deployment/$(params.deployment) \
          -n $(params.namespace) \
          --kubeconfig /tmp/kubeconfig \
          --timeout=5m
```

## Step 4: Create the Pipeline

```yaml
# pipeline/build-deploy.yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-and-deploy
spec:
  params:
    - name: repo-url
    - name: revision
      default: main
    - name: image
    - name: deployment-name

  workspaces:
    - name: source-code

  tasks:
    # Step 1: Clone source code
    - name: clone
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.repo-url)
        - name: revision
          value: $(params.revision)
      workspaces:
        - name: source
          workspace: source-code

    # Step 2: Build and push image (depends on clone)
    - name: build
      taskRef:
        name: build-push
      runAfter:
        - clone
      params:
        - name: image
          value: $(params.image):$(params.revision)
      workspaces:
        - name: source
          workspace: source-code

    # Step 3: Deploy to cluster (depends on build)
    - name: deploy
      taskRef:
        name: kubectl-deploy
      runAfter:
        - build
      params:
        - name: image
          value: $(params.image):$(params.revision)
        - name: deployment
          value: $(params.deployment-name)
```

## Step 5: Run the Pipeline

```yaml
# pipelinerun/run-deploy.yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: deploy-myapp-run-1
spec:
  pipelineRef:
    name: build-and-deploy
  params:
    - name: repo-url
      value: https://github.com/my-org/myapp
    - name: revision
      value: main
    - name: image
      value: ghcr.io/my-org/myapp
    - name: deployment-name
      value: myapp
  workspaces:
    - name: source-code
      volumeClaimTemplate:
        spec:
          accessModes: [ReadWriteOnce]
          resources:
            requests:
              storage: 1Gi
```

```bash
kubectl apply -f pipelinerun/run-deploy.yaml

# Watch the pipeline run
tkn pipelinerun logs deploy-myapp-run-1 -f
```

## Step 6: Configure Webhook Triggers

```yaml
# trigger/eventlistener.yaml - Trigger pipeline on GitHub push
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-sa
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-eventlistener-binding
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-triggers-eventlistener-roles
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-triggers-eventlistener-clusterbinding
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
    namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-triggers-eventlistener-clusterroles
---
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-push
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    - name: github-push-trigger
      interceptors:
        - ref:
            name: github
          params:
            - name: secretRef
              value:
                secretName: github-webhook-secret
                secretKey: secret
            - name: eventTypes
              value: ["push"]
      bindings:
        - name: gitrepositoryurl
          value: $(body.repository.clone_url)
        - name: gitrevision
          value: $(body.after)
      template:
        spec:
          params:
            - name: gitrepositoryurl
            - name: gitrevision
          resourcetemplates:
            - apiVersion: tekton.dev/v1
              kind: PipelineRun
              metadata:
                generateName: deploy-myapp-run-
              spec:
                pipelineRef:
                  name: build-and-deploy
                params:
                  - name: repo-url
                    value: $(tt.params.gitrepositoryurl)
                  - name: revision
                    value: $(tt.params.gitrevision)
                  - name: image
                    value: ghcr.io/my-org/myapp
                  - name: deployment-name
                    value: myapp
                workspaces:
                  - name: source-code
                    volumeClaimTemplate:
                      spec:
                        accessModes: [ReadWriteOnce]
                        resources:
                          requests:
                            storage: 1Gi
```

## Conclusion

Tekton brings Kubernetes-native CI/CD to Rancher-managed clusters, with pipelines that run as standard Kubernetes resources and benefit from all of Kubernetes' scheduling, RBAC, and resource management features. By composing reusable Tasks into Pipelines, teams can build standardized CI/CD processes that scale from a single cluster to a multi-cluster Rancher deployment.
