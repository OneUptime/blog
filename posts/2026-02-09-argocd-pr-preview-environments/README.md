# How to Build PR-Based Preview Environments with ArgoCD Pull Request Generator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Preview Environments, Pull Requests, CI/CD

Description: Learn how to automatically create ephemeral preview environments for every pull request using ArgoCD ApplicationSet pull request generator, enabling developers to test changes in isolated Kubernetes namespaces before merging.

---

Preview environments accelerate development by giving every pull request its own isolated deployment. Developers and reviewers can test changes in a real environment before merging, catching integration issues early. ArgoCD's pull request generator automates this process by creating Applications for each open PR.

This guide demonstrates how to configure PR-based preview environments that automatically deploy and clean up with your pull request lifecycle.

## Understanding Pull Request Generator

The PR generator watches your Git repository for open pull requests. When it finds one, it creates an Application using the PR branch code. When the PR closes or merges, ArgoCD automatically deletes the Application and cleans up resources.

The generator works with GitHub, GitLab, Gitea, and Bitbucket, using their APIs to discover PRs.

## Installing ArgoCD with ApplicationSet

Ensure ApplicationSet controller is installed:

```bash
kubectl get deployment -n argocd argocd-applicationset-controller
```

If not present, install ArgoCD with ApplicationSet:

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

## Configuring GitHub Pull Request Generator

Create an ApplicationSet for GitHub PRs:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: pr-preview
  namespace: argocd
spec:
  generators:
  - pullRequest:
      github:
        owner: myorg
        repo: myapp
        tokenRef:
          secretName: github-token
          key: token
        labels:
        - preview  # Only PRs with this label
  template:
    metadata:
      name: 'preview-pr-{{number}}'
      labels:
        preview: "true"
        pr-number: "{{number}}"
    spec:
      project: default
      source:
        repoURL: 'https://github.com/myorg/myapp'
        targetRevision: '{{head_sha}}'
        path: kubernetes
        helm:
          parameters:
          - name: image.tag
            value: 'pr-{{number}}'
          - name: ingress.host
            value: 'pr-{{number}}.preview.example.com'
      destination:
        server: https://kubernetes.default.svc
        namespace: 'preview-pr-{{number}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

Create GitHub token secret:

```bash
kubectl create secret generic github-token \
  --from-literal=token=ghp_xxxxx \
  -n argocd
```

## Configuring GitLab Merge Request Generator

For GitLab:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: mr-preview
  namespace: argocd
spec:
  generators:
  - pullRequest:
      gitlab:
        project: myorg/myapp
        api: https://gitlab.com
        tokenRef:
          secretName: gitlab-token
          key: token
        pullRequestState: opened
        labels:
        - preview
  template:
    metadata:
      name: 'preview-mr-{{number}}'
    spec:
      project: default
      source:
        repoURL: 'https://gitlab.com/myorg/myapp'
        targetRevision: '{{head_sha}}'
        path: deploy
      destination:
        server: https://kubernetes.default.svc
        namespace: 'preview-mr-{{number}}'
      syncPolicy:
        automated:
          prune: true
        syncOptions:
        - CreateNamespace=true
```

## Creating Preview-Specific Manifests

Structure your repository for preview deployments:

```
kubernetes/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── production/
    └── preview/
        ├── kustomization.yaml
        ├── ingress.yaml
        └── resources.yaml
```

Preview overlay:

```yaml
# kubernetes/overlays/preview/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
- ../../base
namePrefix: preview-
commonLabels:
  environment: preview
patchesStrategicMerge:
- resources.yaml
---
# kubernetes/overlays/preview/resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1  # Single replica for previews
  template:
    spec:
      containers:
      - name: api
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

Update ApplicationSet to use overlay:

```yaml
spec:
  template:
    spec:
      source:
        path: kubernetes/overlays/preview
        kustomize:
          namePrefix: 'pr-{{number}}-'
```

## Adding Dynamic DNS for Preview URLs

Configure Ingress with PR-specific hostnames:

```yaml
# In your Helm values or Kustomize patch
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: preview-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  tls:
  - hosts:
    - pr-{{number}}.preview.example.com
    secretName: pr-{{number}}-tls
  rules:
  - host: pr-{{number}}.preview.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 80
```

Configure external-dns to create DNS records:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  template:
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=ingress
        - --domain-filter=preview.example.com
        - --provider=cloudflare
        - --txt-owner-id=preview-env
```

## Implementing Resource Quotas for Preview Namespaces

Limit resources per preview environment:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: preview-quota
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    persistentvolumeclaims: "2"
    services.loadbalancers: "0"
```

Include in your preview overlay or use a policy controller.

## Posting Preview URLs to Pull Requests

Create a GitHub Action to comment on PRs:

```yaml
# .github/workflows/preview-url.yml
name: Post Preview URL
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
    - name: Wait for ArgoCD
      run: sleep 60

    - name: Comment PR
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `### Preview Environment Ready!

            URL: https://pr-${{ github.event.pull_request.number }}.preview.example.com

            ArgoCD: https://argocd.example.com/applications/preview-pr-${{ github.event.pull_request.number }}`
          })
```

## Handling Database and Dependencies

Deploy ephemeral databases for previews:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: preview_db
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: preview-db-password
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

Or use shared development databases with PR-specific schemas.

## Setting TTL for Preview Environments

Auto-delete old preview environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: pr-preview
  namespace: argocd
spec:
  generators:
  - pullRequest:
      github:
        owner: myorg
        repo: myapp
        tokenRef:
          secretName: github-token
          key: token
  template:
    metadata:
      name: 'preview-pr-{{number}}'
      finalizers:
      - resources-finalizer.argocd.argoproj.io
      annotations:
        janitor/ttl: "72h"  # Delete after 3 days
    spec:
      # ... rest of spec
```

Deploy kube-janitor to enforce TTL:

```bash
helm repo add kube-janitor https://hjacobs.github.io/kube-janitor/
helm install kube-janitor kube-janitor/kube-janitor
```

## Monitoring Preview Environments

Track active preview environments:

```bash
kubectl get applications -n argocd -l preview=true

kubectl get namespaces -l preview=true
```

Monitor resource usage:

```promql
sum by (namespace) (
  kube_pod_container_resource_requests{namespace=~"preview-pr-.*"}
)
```

Create alerts for resource exhaustion:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: preview-alerts
  namespace: monitoring
spec:
  groups:
  - name: preview
    rules:
    - alert: TooManyPreviewEnvironments
      expr: count(kube_namespace_labels{label_preview="true"}) > 20
      annotations:
        summary: "More than 20 preview environments active"
```

## Troubleshooting Common Issues

If Applications don't create:

```bash
kubectl logs -n argocd deployment/argocd-applicationset-controller

# Check generator status
kubectl describe applicationset pr-preview -n argocd
```

If ingress doesn't work:

```bash
kubectl get ingress -n preview-pr-123
kubectl describe ingress -n preview-pr-123
```

PR-based preview environments with ArgoCD transform development workflows by giving every code change its own isolated, production-like environment for testing and validation before merge.
