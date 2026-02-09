# How to Implement GitOps for Multi-Cluster with Flux CD Kustomization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitOps, Flux CD, Kubernetes, Multi-Cluster, Kustomize

Description: Learn how to implement GitOps workflows across multiple Kubernetes clusters using Flux CD and Kustomize for declarative, version-controlled infrastructure and application management.

---

GitOps brings the power of version control and declarative configuration to Kubernetes operations. When managing multiple clusters, GitOps becomes essential for maintaining consistency, auditability, and automated deployments. Flux CD combined with Kustomize provides a robust framework for multi-cluster GitOps, allowing you to define base configurations and overlay cluster-specific customizations.

In this guide, you'll learn how to set up Flux CD for multi-cluster management using Kustomize to handle configuration variations across environments and regions.

## Understanding Multi-Cluster GitOps Architecture

A well-designed multi-cluster GitOps setup uses a centralized Git repository containing base configurations and cluster-specific overlays. Each cluster runs its own Flux controllers that watch specific paths in the repository. Kustomize handles environment-specific customizations without duplicating configuration files.

The typical repository structure separates infrastructure from applications, uses base configurations with overlays for customization, and maintains separate directories for each cluster or environment.

## Installing Flux CD in Multiple Clusters

Bootstrap Flux in each cluster with cluster-specific configurations:

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-token>
export GITHUB_USER=<your-username>

# Bootstrap Flux in production-east cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production-east \
  --personal \
  --context=production-east

# Bootstrap Flux in production-west cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production-west \
  --personal \
  --context=production-west

# Bootstrap Flux in staging cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/staging \
  --personal \
  --context=staging
```

This creates a repository structure:

```
fleet-infra/
├── clusters/
│   ├── production-east/
│   │   └── flux-system/
│   ├── production-west/
│   │   └── flux-system/
│   └── staging/
│       └── flux-system/
```

## Organizing the Repository with Kustomize

Create a well-structured repository layout:

```
fleet-infra/
├── clusters/
│   ├── production-east/
│   │   ├── flux-system/
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   ├── production-west/
│   │   ├── flux-system/
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   └── staging/
│       ├── flux-system/
│       ├── infrastructure.yaml
│       └── apps.yaml
├── infrastructure/
│   ├── base/
│   │   ├── ingress-nginx/
│   │   ├── cert-manager/
│   │   └── monitoring/
│   └── overlays/
│       ├── production/
│       └── staging/
└── apps/
    ├── base/
    │   ├── api/
    │   ├── frontend/
    │   └── worker/
    └── overlays/
        ├── production-east/
        ├── production-west/
        └── staging/
```

## Creating Base Infrastructure Configurations

Define base infrastructure components:

```yaml
# infrastructure/base/ingress-nginx/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: ingress-nginx
resources:
- namespace.yaml
- helmrelease.yaml

---
# infrastructure/base/ingress-nginx/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx

---
# infrastructure/base/ingress-nginx/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: 4.9.0
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

Create production overlay:

```yaml
# infrastructure/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base/ingress-nginx
- ../../base/cert-manager
- ../../base/monitoring

patches:
- path: ingress-nginx-patch.yaml
  target:
    kind: HelmRelease
    name: ingress-nginx

---
# infrastructure/overlays/production/ingress-nginx-patch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  values:
    controller:
      replicaCount: 5
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
      service:
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

## Setting Up Cluster-Specific Kustomizations

Configure each cluster to use appropriate overlays:

```yaml
# clusters/production-east/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/overlays/production
  prune: true
  wait: true
  timeout: 5m
  patches:
  - patch: |
      - op: add
        path: /spec/values/controller/service/annotations/service.beta.kubernetes.io~1aws-load-balancer-cross-zone-load-balancing-enabled
        value: "true"
    target:
      kind: HelmRelease
      name: ingress-nginx
      namespace: ingress-nginx
```

## Managing Applications with Per-Cluster Overlays

Create base application configuration:

```yaml
# apps/base/api/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: default
resources:
- deployment.yaml
- service.yaml
- ingress.yaml

---
# apps/base/api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: myregistry.io/api:v1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

Create cluster-specific overlay:

```yaml
# apps/overlays/production-east/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
- ../../base/api
- ../../base/frontend
- ../../base/worker

namespace: production

commonLabels:
  environment: production
  region: us-east-1

replicas:
- name: api
  count: 10
- name: frontend
  count: 5
- name: worker
  count: 3

images:
- name: myregistry.io/api
  newTag: v1.2.3

patches:
- path: resource-limits-patch.yaml
  target:
    kind: Deployment

---
# apps/overlays/production-east/resource-limits-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: all-deployments
spec:
  template:
    spec:
      containers:
      - name: api
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

## Implementing Progressive Delivery

Use Flagger for canary deployments across clusters:

```yaml
# apps/base/api/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://api-canary:8080/"
```

Customize canary configuration per environment:

```yaml
# apps/overlays/production-east/canary-patch.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
spec:
  analysis:
    threshold: 10  # More conservative in production
    maxWeight: 30
    stepWeight: 5
```

## Using Flux Image Automation

Automate image updates across clusters:

```yaml
# clusters/production-east/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageRepository
metadata:
  name: api
  namespace: flux-system
spec:
  image: myregistry.io/api
  interval: 5m

---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImagePolicy
metadata:
  name: api
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api
  policy:
    semver:
      range: 1.x.x

---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@example.com
        name: fluxcdbot
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Updated.Files -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $_ := .Updated.Objects -}}
        - {{ $resource.Kind }} {{ $resource.Name }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./apps/overlays/production-east
    strategy: Setters
```

## Managing Secrets Across Clusters

Use SOPS for encrypted secrets in Git:

```bash
# Install SOPS
brew install sops

# Create a GPG key or use AWS KMS
export SOPS_PGP_FP=<your-gpg-fingerprint>

# Encrypt a secret
kubectl create secret generic api-credentials \
  --from-literal=db-password=supersecret \
  --dry-run=client -o yaml > api-credentials.yaml

sops --encrypt --in-place --pgp ${SOPS_PGP_FP} api-credentials.yaml
```

Configure Flux to decrypt secrets:

```yaml
# clusters/production-east/flux-system/gotk-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production-east
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
```

Create the decryption secret:

```bash
gpg --export-secret-keys --armor ${SOPS_PGP_FP} | \
kubectl create secret generic sops-gpg \
  --namespace=flux-system \
  --from-file=sops.asc=/dev/stdin
```

## Monitoring Flux Across Clusters

Deploy a centralized monitoring dashboard:

```yaml
# infrastructure/base/monitoring/flux-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Flux Multi-Cluster Status",
        "panels": [
          {
            "title": "Kustomization Status by Cluster",
            "targets": [{
              "expr": "gotk_reconcile_condition{type='Ready'}"
            }]
          },
          {
            "title": "Reconciliation Failures",
            "targets": [{
              "expr": "sum(rate(gotk_reconcile_condition{status='False'}[5m])) by (cluster, name)"
            }]
          }
        ]
      }
    }
```

Set up alerts for failed reconciliations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-alerts
  namespace: flux-system
spec:
  groups:
  - name: flux
    rules:
    - alert: FluxReconciliationFailure
      expr: gotk_reconcile_condition{type="Ready",status="False"} == 1
      for: 10m
      annotations:
        summary: "Flux reconciliation failing for {{ $labels.name }}"

    - alert: FluxSuspended
      expr: gotk_suspend_status == 1
      for: 5m
      annotations:
        summary: "Flux resource {{ $labels.name }} is suspended"
```

## Best Practices

Use separate Git repositories for infrastructure and applications to allow different teams to manage them independently.

Implement proper RBAC for Git repositories. Access to the fleet repository means ability to deploy to clusters.

Always use Kustomize overlays instead of duplicating entire configurations across environments.

Tag commits that are deployed to production for easy rollback and audit trails.

Implement staging environments that mirror production configurations as closely as possible.

Use Flux notifications to alert teams when deployments fail or when manual intervention is required.

## Conclusion

GitOps with Flux CD and Kustomize provides a robust, scalable approach to managing multiple Kubernetes clusters. By treating Git as the source of truth and using Kustomize for environment-specific customizations, you gain consistency, auditability, and automated deployments across your entire cluster fleet.

Start with a simple setup for a few clusters and gradually add sophistication like image automation, progressive delivery, and encrypted secrets management as your needs grow. The investment in GitOps pays dividends through reduced operational overhead and improved reliability.
