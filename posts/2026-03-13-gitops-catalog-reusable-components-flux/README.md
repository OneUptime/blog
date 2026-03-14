# How to Build a GitOps Catalog of Reusable Components with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Platform Engineering, OCI, Component Catalog

Description: Create a catalog of reusable GitOps components with Flux CD using OCI artifacts so platform teams can distribute infrastructure building blocks to application teams reliably.

---

## Introduction

As a platform grows, teams frequently need the same infrastructure primitives: a properly configured Redis instance, a standard PostgreSQL deployment, a pre-configured Kafka cluster. Without a catalog, each team reimplements these from scratch, introduces inconsistencies, and misses security hardening that the platform team has already figured out.

A GitOps component catalog solves this by packaging reusable Kubernetes configurations as versioned, immutable OCI artifacts. Flux CD's OCI source support means teams can reference catalog components directly in their Kustomizations, pinned to specific versions. The platform team publishes updates to the catalog, and teams opt in at their own pace.

In this guide you will build a component catalog with OCI artifacts, set up a publishing pipeline, and show teams how to consume catalog components in their Flux configurations.

## Prerequisites

- Flux CD v2.1+ with OCI source support
- An OCI-compatible registry (GHCR, ECR, GCR, or Harbor)
- The Flux CLI installed locally
- A platform Git repository for catalog source

## Step 1: Structure the Catalog Repository

```plaintext
platform-catalog/
├── components/
│   ├── redis/
│   │   ├── v1.0.0/
│   │   │   ├── kustomization.yaml
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── pdb.yaml
│   │   └── v1.1.0/
│   ├── postgresql/
│   │   └── v2.0.0/
│   ├── kafka/
│   │   └── v1.0.0/
│   └── monitoring-stack/
│       └── v3.0.0/
├── .github/
│   └── workflows/
│       └── publish-catalog.yml
└── README.md
```

## Step 2: Build a Catalog Component

Create a well-documented, production-ready Redis component.

```yaml
# components/redis/v1.1.0/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app.kubernetes.io/name: redis
    app.kubernetes.io/version: "7.2"
    app.kubernetes.io/managed-by: flux
    catalog.platform.io/component: redis
    catalog.platform.io/version: "1.1.0"
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: redis
  template:
    metadata:
      labels:
        app.kubernetes.io/name: redis
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        fsGroup: 999
      containers:
        - name: redis
          image: redis:7.2-alpine
          command:
            - redis-server
            - --requirepass
            - $(REDIS_PASSWORD)
            - --maxmemory
            - 256mb
            - --maxmemory-policy
            - allkeys-lru
          ports:
            - containerPort: 6379
              name: redis
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: password
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 15
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
```

```yaml
# components/redis/v1.1.0/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: redis
  minAvailable: 1
```

```yaml
# components/redis/v1.1.0/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - pdb.yaml
```

## Step 3: Publish Components as OCI Artifacts

Set up a GitHub Actions workflow to publish catalog components on tag push.

```yaml
# .github/workflows/publish-catalog.yml
name: Publish Catalog Components

on:
  push:
    tags:
      - "*/v*"   # Matches tags like redis/v1.1.0

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Install Flux CLI
        run: |
          curl -s https://fluxcd.io/install.sh | sudo bash

      - name: Log in to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            flux push artifact \
            --credentials=username:${{ github.actor }}

      - name: Parse component and version from tag
        id: parse
        run: |
          TAG="${{ github.ref_name }}"
          COMPONENT="${TAG%/v*}"
          VERSION="${TAG#*/}"
          echo "component=$COMPONENT" >> $GITHUB_OUTPUT
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Push component to OCI registry
        run: |
          flux push artifact \
            oci://ghcr.io/acme/platform-catalog/${{ steps.parse.outputs.component }}:${{ steps.parse.outputs.version }} \
            --path=./components/${{ steps.parse.outputs.component }}/${{ steps.parse.outputs.version }} \
            --source="$(git remote get-url origin)" \
            --revision="${{ github.ref_name }}/$(git rev-parse HEAD)"
```

## Step 4: Consume Catalog Components in Team Applications

Teams reference catalog components using Flux OCIRepository sources.

```yaml
# tenants/overlays/team-alpha/redis-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: catalog-redis
  namespace: team-alpha
spec:
  interval: 10m
  url: oci://ghcr.io/acme/platform-catalog/redis
  ref:
    tag: v1.1.0    # Pinned to a specific version
  secretRef:
    name: ghcr-credentials
```

```yaml
# tenants/overlays/team-alpha/redis-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis
  namespace: team-alpha
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: catalog-redis
  path: .
  prune: true
  targetNamespace: team-alpha
  patches:
    - patch: |-
        - op: replace
          path: /spec/template/spec/containers/0/resources/limits/memory
          value: 1Gi   # Team alpha needs more Redis memory
      target:
        kind: Deployment
        name: redis
```

## Step 5: List and Discover Available Components

Teams can browse available catalog components using the Flux CLI.

```bash
# List all available components in the catalog registry
flux list artifacts oci://ghcr.io/acme/platform-catalog

# List versions of a specific component
flux list artifacts oci://ghcr.io/acme/platform-catalog/redis

# Inspect a component before using it
flux pull artifact oci://ghcr.io/acme/platform-catalog/redis:v1.1.0 \
  --output /tmp/redis-component
ls /tmp/redis-component
```

## Best Practices

- Sign OCI artifacts with cosign to ensure supply chain integrity
- Include a `CHANGELOG.md` inside each component directory documenting breaking changes
- Use semantic versioning strictly: patch for bug fixes, minor for new features, major for breaking changes
- Publish a component catalog website (e.g., using GitHub Pages) listing all components and their documentation
- Require security scanning of all component images before publishing
- Use Renovate or Dependabot to help teams discover when newer catalog versions are available

## Conclusion

A GitOps component catalog built on Flux CD OCI artifacts gives platform teams a scalable way to distribute infrastructure building blocks while maintaining version control and immutability. Teams get a curated library of production-ready components that encode organizational best practices, while the platform team gains the leverage of updating the catalog once and letting teams adopt improvements on their own schedule.
