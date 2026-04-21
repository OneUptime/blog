# How to Set Up Tekton Pipelines with Rancher - Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Rancher, Kubernetes, CI/CD, Pipeline, GitOps, SUSE Rancher

Description: Learn how to install Tekton Pipelines on a Rancher-managed Kubernetes cluster, create pipeline tasks, and automate container image builds and deployments.

---

Tekton is a Kubernetes-native CI/CD framework that runs pipelines as Kubernetes resources. On a Rancher-managed cluster, you can install Tekton with the official release manifests and manage pipelines alongside your workloads.

---

## Step 1: Install Tekton Pipelines

```bash
# Install Tekton Pipelines using kubectl

kubectl apply --filename \
  https://infra.tekton.dev/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Triggers (for webhook-triggered pipelines)
kubectl apply --filename \
  https://infra.tekton.dev/tekton-releases/triggers/latest/release.yaml
kubectl apply --filename \
  https://infra.tekton.dev/tekton-releases/triggers/latest/interceptors.yaml

# Install Tekton Dashboard for UI
kubectl apply --filename \
  https://infra.tekton.dev/tekton-releases/dashboard/latest/release.yaml

# Verify all Tekton pods are running
kubectl get pods --namespace tekton-pipelines --watch
```

---

## Step 2: Install the Tekton CLI

```bash
# Install tkn CLI
curl -LO https://github.com/tektoncd/cli/releases/download/v0.44.0/tkn_0.44.0_Linux_x86_64.tar.gz
sudo tar xvzf tkn_0.44.0_Linux_x86_64.tar.gz -C /usr/local/bin/ tkn

# Verify
tkn version
```

---

## Step 3: Create Pipeline Tasks

```yaml
# build-task.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: git-clone
  namespace: tekton-pipelines
spec:
  params:
    - name: url
      type: string
    - name: revision
      type: string
      default: main
    - name: subdirectory
      type: string
      default: source
  workspaces:
    - name: output
  steps:
    - name: clone
      image: alpine/git:latest
      script: |
        #!/bin/sh
        set -eu

        checkout_dir="$(workspaces.output.path)/$(params.subdirectory)"
        rm -rf "$checkout_dir"
        git clone "$(params.url)" "$checkout_dir"
        cd "$checkout_dir"
        git checkout "$(params.revision)"
---
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-and-push
  namespace: tekton-pipelines
spec:
  params:
    - name: image
      type: string
      description: The image to build and push
    - name: context
      type: string
      default: source
  workspaces:
    - name: source
      description: The git repository source
  steps:
    - name: build
      image: gcr.io/kaniko-project/executor:latest
      args:
        - "--dockerfile=Dockerfile"
        - "--context=$(workspaces.source.path)/$(params.context)"
        - "--destination=$(params.image)"
        - "--cache=true"
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: docker-config
      secret:
        secretName: registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
```

```bash
# Create the registry credentials used by the Kaniko step
kubectl create secret docker-registry registry-credentials \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  --namespace tekton-pipelines \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f build-task.yaml
```

---

## Step 4: Create a Pipeline

```yaml
# pipeline.yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-deploy-pipeline
  namespace: tekton-pipelines
spec:
  params:
    - name: repo-url
      type: string
    - name: image
      type: string
    - name: revision
      type: string
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
      runAfter: [clone]
      taskRef:
        name: build-and-push
      params:
        - name: image
          value: $(params.image)
      workspaces:
        - name: source
          workspace: shared-workspace
```

```bash
kubectl apply -f pipeline.yaml
```

---

## Step 5: Create a PipelineRun

```yaml
# pipeline-run.yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: build-deploy-run-
  namespace: tekton-pipelines
spec:
  pipelineRef:
    name: build-deploy-pipeline
  params:
    - name: repo-url
      value: https://github.com/my-org/my-app
    - name: image
      value: ghcr.io/my-org/my-app:latest
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
kubectl create -f pipeline-run.yaml

# Watch the pipeline run
tkn pipelinerun logs --last -f -n tekton-pipelines
```

---

## Step 6: Set Up a Webhook Trigger

```yaml
# trigger-template.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: pipeline-trigger-template
  namespace: tekton-pipelines
spec:
  params:
    - name: gitrepourl
    - name: gitrevision
  resourcetemplates:
    - apiVersion: tekton.dev/v1
      kind: PipelineRun
      metadata:
        generateName: triggered-run-
        namespace: tekton-pipelines
      spec:
        pipelineRef:
          name: build-deploy-pipeline
        params:
          - name: repo-url
            value: $(tt.params.gitrepourl)
          - name: revision
            value: $(tt.params.gitrevision)
          - name: image
            value: ghcr.io/my-org/my-app:$(tt.params.gitrevision)
        workspaces:
          - name: shared-workspace
            volumeClaimTemplate:
              spec:
                accessModes: [ReadWriteOnce]
                resources:
                  requests:
                    storage: 1Gi
---
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: pipeline-trigger-binding
  namespace: tekton-pipelines
spec:
  params:
    - name: gitrepourl
      value: $(body.repository.clone_url)
    - name: gitrevision
      value: $(body.after)
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-sa
  namespace: tekton-pipelines
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-sa-binding
  namespace: tekton-pipelines
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
  name: tekton-triggers-sa-clusterbinding
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
    namespace: tekton-pipelines
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-triggers-eventlistener-clusterroles
---
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: pipeline-event-listener
  namespace: tekton-pipelines
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    - name: github-push-trigger
      bindings:
        - ref: pipeline-trigger-binding
      template:
        ref: pipeline-trigger-template
```

```bash
kubectl apply -f trigger-template.yaml

# For local testing. Use an Ingress or LoadBalancer URL for real Git provider webhooks.
kubectl port-forward service/el-pipeline-event-listener 8080:8080 -n tekton-pipelines
```

---

## Best Practices

- Use reusable namespaced Tasks or remote Task resolution for common steps like Git clone and image builds instead of relying on deprecated ClusterTasks.
- Use workspaces with `volumeClaimTemplate` for pipeline runs when each run should get its own PersistentVolumeClaim.
- Expose the Tekton Dashboard through an Ingress with authentication to give developers visibility into pipeline runs without `kubectl` access.
