# How to Handle Cluster-Specific Overrides with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Cluster, Kustomize

Description: Learn how to manage cluster-specific configuration overrides in ArgoCD multi-cluster deployments using Kustomize overlays, Helm values, and ApplicationSet generators.

---

In a multi-cluster ArgoCD setup, you want most of your configuration to be identical across clusters. But every cluster has differences - cloud provider, region, node types, storage classes, domain names, and resource limits. The challenge is managing these per-cluster overrides without duplicating your entire configuration.

This guide covers practical patterns for handling cluster-specific overrides with ArgoCD.

## The Override Problem

Consider an application deployed to three clusters: AWS us-east-1, AWS eu-west-1, and GCP us-central1. The application code and most configuration are identical, but each cluster needs different:

- Database connection strings
- Storage class names
- Ingress domain names
- Resource limits (different node sizes)
- Cloud-specific annotations (ALB vs GCE ingress)
- Region-specific feature flags

You need a way to express "same application, different parameters" cleanly in Git.

## Pattern 1: Kustomize Overlays

The most common pattern uses Kustomize with a base and per-cluster overlays:

```text
app/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
  overlays/
    aws-us-east-1/
      kustomization.yaml
      patches/
        ingress-patch.yaml
        deployment-patch.yaml
    aws-eu-west-1/
      kustomization.yaml
      patches/
        ingress-patch.yaml
        deployment-patch.yaml
    gcp-us-central1/
      kustomization.yaml
      patches/
        ingress-patch.yaml
        deployment-patch.yaml
```

Base configuration:

```yaml
# app/base/deployment.yaml
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
          image: myorg/api:v1.5.0
          ports:
            - containerPort: 8080
          env:
            - name: REGION
              value: "OVERRIDE_ME"
            - name: DB_HOST
              value: "OVERRIDE_ME"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              memory: 1Gi
```

```yaml
# app/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
  - hpa.yaml
```

Cluster-specific overlay:

```yaml
# app/overlays/aws-us-east-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patches/deployment-patch.yaml
  - path: patches/ingress-patch.yaml
```

```yaml
# app/overlays/aws-us-east-1/patches/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: api
          env:
            - name: REGION
              value: "us-east-1"
            - name: DB_HOST
              value: "db.us-east-1.rds.amazonaws.com"
          resources:
            requests:
              cpu: "1"
              memory: 1Gi
            limits:
              memory: 2Gi
      nodeSelector:
        topology.kubernetes.io/zone: us-east-1a
```

```yaml
# app/overlays/aws-us-east-1/patches/ingress-patch.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  annotations:
    # AWS ALB specific annotations
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/xxx
spec:
  rules:
    - host: api-us.example.com
```

Wire it up with an ApplicationSet:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: api-service
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
        values:
          overlay: '{{metadata.labels.overlay-name}}'
  template:
    metadata:
      name: 'api-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/api-service.git
        targetRevision: main
        path: app/overlays/{{values.overlay}}
      destination:
        server: '{{server}}'
        namespace: api
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Pattern 2: Helm Values Per Cluster

If you use Helm charts, you can provide different values files per cluster:

```text
app/
  chart/
    Chart.yaml
    values.yaml           # Default values
    templates/
      deployment.yaml
      service.yaml
      ingress.yaml
  values/
    aws-us-east-1.yaml
    aws-eu-west-1.yaml
    gcp-us-central1.yaml
```

Default values:

```yaml
# app/chart/values.yaml
replicaCount: 3
image:
  repository: myorg/api
  tag: v1.5.0
region: "unknown"
database:
  host: "localhost"
  port: 5432
ingress:
  enabled: true
  className: nginx
  host: api.example.com
  annotations: {}
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    memory: 1Gi
```

Cluster-specific values:

```yaml
# app/values/aws-us-east-1.yaml
replicaCount: 5
region: "us-east-1"
database:
  host: "db.us-east-1.rds.amazonaws.com"
  port: 5432
ingress:
  className: alb
  host: api-us.example.com
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/xxx
resources:
  requests:
    cpu: "1"
    memory: 1Gi
  limits:
    memory: 2Gi
```

ApplicationSet using Helm values:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: api-service
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
        values:
          valuesFile: '{{metadata.labels.overlay-name}}'
  template:
    metadata:
      name: 'api-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/api-service.git
        targetRevision: main
        path: app/chart
        helm:
          valueFiles:
            - ../values/{{values.valuesFile}}.yaml
      destination:
        server: '{{server}}'
        namespace: api
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Pattern 3: ApplicationSet Values from Cluster Labels

Store override values directly in cluster labels or annotations:

```yaml
# Cluster secret with configuration labels
apiVersion: v1
kind: Secret
metadata:
  name: us-east-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    environment: production
    region: us-east-1
    cloud: aws
    storage-class: gp3
    ingress-class: alb
    domain: api-us.example.com
type: Opaque
stringData:
  name: us-east
  server: https://us-east.k8s.example.com
  config: '...'
```

Use these labels in the ApplicationSet template:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: api-service
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
        values:
          region: '{{metadata.labels.region}}'
          cloud: '{{metadata.labels.cloud}}'
          storageClass: '{{metadata.labels.storage-class}}'
          ingressClass: '{{metadata.labels.ingress-class}}'
          domain: '{{metadata.labels.domain}}'
  template:
    metadata:
      name: 'api-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/api-service.git
        targetRevision: main
        path: app/chart
        helm:
          parameters:
            - name: region
              value: '{{values.region}}'
            - name: ingress.className
              value: '{{values.ingressClass}}'
            - name: ingress.host
              value: '{{values.domain}}'
      destination:
        server: '{{server}}'
        namespace: api
```

## Pattern 4: Git Generator for Complex Overrides

For complex per-cluster configurations, use a Git generator with directory or file patterns:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-config
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/cluster-configs.git
        revision: main
        files:
          - path: "clusters/*/config.json"
  template:
    metadata:
      name: 'config-{{cluster.name}}'
    spec:
      project: platform
      source:
        repoURL: https://github.com/myorg/cluster-configs.git
        targetRevision: main
        path: 'clusters/{{cluster.name}}/manifests'
      destination:
        server: '{{cluster.server}}'
        namespace: '{{cluster.namespace}}'
```

Each cluster has a config.json:

```json
{
  "cluster": {
    "name": "us-east",
    "server": "https://us-east.k8s.example.com",
    "namespace": "platform",
    "region": "us-east-1",
    "cloud": "aws"
  }
}
```

## Pattern 5: ConfigMap Generator for Runtime Overrides

Some overrides are consumed at runtime, not at deployment time. Use a ConfigMap generator:

```yaml
# app/overlays/aws-us-east-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
configMapGenerator:
  - name: cluster-config
    literals:
      - REGION=us-east-1
      - CLOUD_PROVIDER=aws
      - AVAILABILITY_ZONES=us-east-1a,us-east-1b,us-east-1c
      - STORAGE_CLASS=gp3
      - INGRESS_CLASS=alb
    options:
      disableNameSuffixHash: true
```

Reference it in your Deployment:

```yaml
containers:
  - name: api
    envFrom:
      - configMapRef:
          name: cluster-config
```

## Best Practices

**Keep overrides minimal**: If you find yourself overriding everything, your base configuration is too specific. Move shared defaults into the base and only override what truly differs.

**Use a consistent naming convention**: Name overlays after their cluster identifier (region + cloud) so the mapping is obvious.

**Document what can be overridden**: Maintain a list of override parameters and their allowed values in your repository.

**Validate overrides in CI**: Run `kustomize build` or `helm template` for each overlay in your CI pipeline to catch errors before they reach ArgoCD.

```yaml
# .github/workflows/validate-overlays.yaml
name: Validate Overlays
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        overlay: [aws-us-east-1, aws-eu-west-1, gcp-us-central1]
    steps:
      - uses: actions/checkout@v4
      - name: Validate overlay
        run: |
          kustomize build app/overlays/${{ matrix.overlay }} | \
            kubectl apply --dry-run=client -f -
```

## Summary

Cluster-specific overrides are inevitable in multi-cluster deployments. The key is to minimize them and manage them systematically. Kustomize overlays and Helm values files are the two main approaches, with ApplicationSet generators connecting the right configuration to the right cluster. Keep your base broad, your overrides narrow, and validate everything in CI. For the broader picture of multi-cluster configuration, see our guide on [consistent configuration across clusters](https://oneuptime.com/blog/post/2026-02-26-how-to-implement-consistent-configuration-across-clusters-with-argocd/view).
