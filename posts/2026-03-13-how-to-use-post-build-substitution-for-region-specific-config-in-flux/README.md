# How to Use Post-Build Substitution for Region-Specific Config in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, Kustomization, Post-Build, Substitution, Multi-Region

Description: Learn how to leverage Flux post-build substitution to manage region-specific configurations such as endpoints, domains, and resource sizing across geographically distributed Kubernetes clusters.

---

## Introduction

Organizations running Kubernetes clusters across multiple cloud regions need to tailor configurations per region. Different regions may require different container registry mirrors, API endpoints, compliance labels, or resource allocations. Flux post-build substitution lets you parameterize your manifests and inject region-specific values at reconciliation time, keeping your base manifests identical across all regions while customizing the deployment for each location.

## Prerequisites

- Flux CD v2.0 or later installed on your clusters
- A Git repository configured as a GitRepository source in Flux
- Kubernetes clusters deployed across multiple regions
- kubectl access to your clusters

## Defining Region-Specific Variables

Start by creating a ConfigMap on each regional cluster that defines region-specific values. This ConfigMap is created once per cluster and contains all the variables that differ by region.

For a US East cluster:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
  namespace: flux-system
data:
  REGION: "us-east-1"
  CLOUD_PROVIDER: "aws"
  REGISTRY_MIRROR: "123456789.dkr.ecr.us-east-1.amazonaws.com"
  STORAGE_CLASS: "gp3"
  DOMAIN_SUFFIX: "us-east.example.com"
  BACKUP_BUCKET: "s3://backups-us-east-1"
  TIMEZONE: "America/New_York"
```

For an EU West cluster:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
  namespace: flux-system
data:
  REGION: "eu-west-1"
  CLOUD_PROVIDER: "aws"
  REGISTRY_MIRROR: "987654321.dkr.ecr.eu-west-1.amazonaws.com"
  STORAGE_CLASS: "gp3"
  DOMAIN_SUFFIX: "eu-west.example.com"
  BACKUP_BUCKET: "s3://backups-eu-west-1"
  TIMEZONE: "Europe/London"
```

## Referencing Region Config in Kustomization

The Flux Kustomization on each cluster references the region ConfigMap through the `postBuild.substituteFrom` field:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-platform
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/platform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: region-config
```

## Using Region Variables in Deployments

Your deployment manifests use the `${VAR_NAME}` placeholder syntax. Here is a Deployment that adapts to the region:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  labels:
    app: api-server
    region: ${REGION}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        region: ${REGION}
    spec:
      containers:
        - name: api-server
          image: ${REGISTRY_MIRROR}/api-server:v1.2.0
          env:
            - name: REGION
              value: "${REGION}"
            - name: TZ
              value: "${TIMEZONE}"
            - name: BACKUP_DESTINATION
              value: "${BACKUP_BUCKET}/api-server"
```

## Region-Specific Ingress Configuration

Ingress resources often need region-specific hostnames:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.${DOMAIN_SUFFIX}
      secretName: api-tls
  rules:
    - host: api.${DOMAIN_SUFFIX}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
```

## Region-Specific Storage

PersistentVolumeClaims can use region-appropriate storage classes:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: api-server-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ${STORAGE_CLASS}
  resources:
    requests:
      storage: 50Gi
```

## Combining Region and Environment Variables

In practice, you often need both region-specific and environment-specific variables. You can reference multiple ConfigMaps and combine them with inline overrides:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-platform
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/platform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      ENV: "production"
      REPLICAS: "3"
    substituteFrom:
      - kind: ConfigMap
        name: region-config
      - kind: ConfigMap
        name: env-config
```

When multiple sources define the same variable, the precedence order is: inline `substitute` values win over `substituteFrom` entries, and earlier entries in the `substituteFrom` list take precedence over later ones.

## Repository Structure for Multi-Region Deployments

A well-organized repository for multi-region deployments separates cluster definitions from application manifests:

```text
├── clusters/
│   ├── us-east-1/
│   │   ├── region-config.yaml
│   │   └── kustomizations.yaml
│   ├── eu-west-1/
│   │   ├── region-config.yaml
│   │   └── kustomizations.yaml
│   └── ap-southeast-1/
│       ├── region-config.yaml
│       └── kustomizations.yaml
└── apps/
    └── platform/
        ├── kustomization.yaml
        ├── deployment.yaml
        ├── service.yaml
        ├── ingress.yaml
        └── pvc.yaml
```

Each cluster bootstraps Flux pointing to its own directory under `clusters/`. The shared application manifests under `apps/` contain variable placeholders that Flux resolves using the region-specific ConfigMap on each cluster.

## Handling Region-Specific Secrets

For sensitive region-specific values like database endpoints or API keys, use Secrets instead of ConfigMaps:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: region-secrets
  namespace: flux-system
type: Opaque
stringData:
  DATABASE_HOST: "db.us-east-1.rds.amazonaws.com"
  DATABASE_PORT: "5432"
```

Reference it alongside the ConfigMap:

```yaml
postBuild:
  substituteFrom:
    - kind: ConfigMap
      name: region-config
    - kind: Secret
      name: region-secrets
```

## Verifying Region-Specific Substitution

After reconciliation, verify the correct values were substituted:

```bash
kubectl get deployment api-server -o jsonpath='{.spec.template.spec.containers[0].image}'
kubectl get ingress api-server -o jsonpath='{.spec.rules[0].host}'
flux get kustomization app-platform
```

## Conclusion

Flux post-build substitution provides an effective mechanism for managing region-specific configurations across geographically distributed clusters. By storing region-specific values in ConfigMaps and Secrets on each cluster, you can maintain a single set of application manifests in Git while customizing deployments per region. This pattern reduces duplication, minimizes drift between regions, and makes it straightforward to add new regions by creating a new cluster directory with the appropriate configuration values.
