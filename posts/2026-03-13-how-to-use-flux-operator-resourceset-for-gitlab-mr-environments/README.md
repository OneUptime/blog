# How to Use Flux Operator ResourceSet for GitLab MR Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, flux-operator, resourceset, gitlab, merge-requests, preview-environments, kubernetes, gitops

Description: Learn how to use Flux Operator ResourceSet to automatically provision and tear down preview environments for GitLab merge requests.

---

## Introduction

GitLab merge requests (MRs) are the primary collaboration mechanism for code review and integration. By creating preview environments for each MR, teams can validate changes in a real Kubernetes cluster before merging. The Flux Operator ResourceSet API supports GitLab as an input source, making it possible to automatically provision environments when MRs are opened and clean them up when MRs are closed or merged.

This guide covers how to configure a ResourceSet that watches GitLab merge requests and generates isolated preview environments for each one.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- kubectl configured to access your cluster
- The Flux Operator installed with a FluxInstance
- A GitLab project with your application code
- A GitLab personal access token or project access token with `read_api` scope
- An ingress controller installed in your cluster

## Architecture Overview

```mermaid
graph TD
    A[Developer Opens MR] --> B[GitLab API]
    B --> C[ResourceSet Controller]
    C --> D[Creates Namespace mr-N]
    C --> E[Creates GitRepository]
    C --> F[Creates Kustomization]
    C --> G[Creates Ingress]
    F --> H[Deploys App from MR Branch]
    G --> I[mr-N.preview.example.com]
    J[MR Merged/Closed] --> B
    B --> C
    C --> K[Deletes All MR Resources]
```

## Creating the GitLab Token Secret

Create a Secret containing your GitLab access token:

```bash
kubectl create secret generic gitlab-token \
  --namespace=flux-system \
  --from-literal=token=glpat-xxxxxxxxxxxxxxxxxxxx
```

## Configuring the ResourceSet for GitLab MR Environments

Create a ResourceSet that watches for open merge requests:

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: ResourceSet
metadata:
  name: mr-previews
  namespace: flux-system
spec:
  inputs:
    - gitlab:
        project: "my-group/my-app"
        api: "https://gitlab.com"
        token:
          secretRef:
            name: gitlab-token
            key: token
        mergeRequests:
          labels:
            - preview
          interval: 1m
  resources:
    - apiVersion: v1
      kind: Namespace
      metadata:
        name: "mr-{{ .iid }}"
        labels:
          preview: "true"
          mr-id: "{{ .iid }}"
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      metadata:
        name: "mr-{{ .iid }}"
        namespace: "mr-{{ .iid }}"
      spec:
        interval: 1m
        url: "https://gitlab.com/my-group/my-app.git"
        ref:
          branch: "{{ .source_branch }}"
        secretRef:
          name: gitlab-credentials
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      metadata:
        name: "mr-{{ .iid }}"
        namespace: "mr-{{ .iid }}"
      spec:
        interval: 5m
        sourceRef:
          kind: GitRepository
          name: "mr-{{ .iid }}"
        path: ./deploy/preview
        prune: true
        postBuild:
          substitute:
            MR_ID: "{{ .iid }}"
            MR_BRANCH: "{{ .source_branch }}"
            PREVIEW_HOST: "mr-{{ .iid }}.preview.example.com"
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      metadata:
        name: "mr-{{ .iid }}"
        namespace: "mr-{{ .iid }}"
        annotations:
          nginx.ingress.kubernetes.io/rewrite-target: /
      spec:
        ingressClassName: nginx
        rules:
          - host: "mr-{{ .iid }}.preview.example.com"
            http:
              paths:
                - path: /
                  pathType: Prefix
                  backend:
                    service:
                      name: app
                      port:
                        number: 80
```

## Setting Up GitLab Repository Credentials

Since GitLab repositories often require authentication, create a Secret for the source-controller to use:

```bash
kubectl create secret generic gitlab-credentials \
  --namespace=flux-system \
  --from-literal=username=gitlab-ci-token \
  --from-literal=password=glpat-xxxxxxxxxxxxxxxxxxxx
```

You will need to copy this Secret into each MR namespace. Add a resource template to the ResourceSet:

```yaml
# Add to the resources array
- apiVersion: v1
  kind: Secret
  metadata:
    name: gitlab-credentials
    namespace: "mr-{{ .iid }}"
  type: Opaque
  stringData:
    username: gitlab-ci-token
    password: "{{ .token }}"
```

Alternatively, use an ExternalSecret operator or a Kustomize patch to handle credential distribution.

## Available Template Variables

The GitLab merge request input provides these variables:

- `{{ .iid }}`: The MR internal ID (project-scoped number)
- `{{ .source_branch }}`: The source branch name
- `{{ .target_branch }}`: The target branch name
- `{{ .title }}`: The MR title
- `{{ .author }}`: The MR author username
- `{{ .sha }}`: The latest commit SHA

## Self-Hosted GitLab Configuration

For self-hosted GitLab instances, update the `api` field:

```yaml
inputs:
  - gitlab:
      project: "my-group/my-app"
      api: "https://gitlab.internal.company.com"
      token:
        secretRef:
          name: gitlab-token
          key: token
      mergeRequests:
        labels:
          - preview
        interval: 1m
```

## Adding Resource Constraints

Prevent preview environments from consuming excessive resources:

```yaml
# Add to the resources array
- apiVersion: v1
  kind: ResourceQuota
  metadata:
    name: preview-limits
    namespace: "mr-{{ .iid }}"
  spec:
    hard:
      requests.cpu: "500m"
      requests.memory: "512Mi"
      limits.cpu: "1"
      limits.memory: "1Gi"
      pods: "10"
- apiVersion: v1
  kind: LimitRange
  metadata:
    name: preview-defaults
    namespace: "mr-{{ .iid }}"
  spec:
    limits:
      - default:
          cpu: "200m"
          memory: "256Mi"
        defaultRequest:
          cpu: "100m"
          memory: "128Mi"
        type: Container
```

## Filtering MRs by Label

The `labels` filter ensures only MRs with the `preview` label trigger environment creation. This gives developers control over when preview environments are created:

```yaml
mergeRequests:
  labels:
    - preview
    - deploy-to-k8s
  interval: 1m
```

Developers add the label when they want a preview:

```bash
# Using GitLab CLI
glab mr update 42 --label preview
```

## Preview Application Configuration

Create a preview-specific Kustomization overlay in your application repository:

```yaml
# deploy/preview/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: Deployment
      name: app
    patch: |
      - op: replace
        path: /spec/replicas
        value: 1
  - target:
      kind: Service
      name: app
    patch: |
      - op: replace
        path: /spec/type
        value: ClusterIP
```

## Monitoring Preview Environments

List all active preview environments:

```bash
kubectl get namespaces -l preview=true
```

Check the ResourceSet status:

```bash
kubectl describe resourceset mr-previews -n flux-system
```

View resources in a specific preview:

```bash
kubectl get all -n mr-15
```

## Conclusion

The Flux Operator ResourceSet with GitLab merge request inputs automates the entire lifecycle of preview environments. Developers label their MRs to trigger environment creation, and the ResourceSet controller handles provisioning namespaces, sources, and deployments. When the MR is merged or closed, the controller cleans up all associated resources. This approach works with both GitLab.com and self-hosted GitLab instances, requiring only a project access token and a ResourceSet configuration.
