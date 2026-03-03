# How to Use Kustomize Overlays for Talos Linux Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kustomize, Kubernetes, Overlays, Configuration Management

Description: Learn how to use Kustomize overlays to manage environment-specific configurations for staging and production on Talos Linux.

---

One of the biggest challenges in running Kubernetes workloads is managing configuration differences between environments. Your staging cluster might need fewer replicas, different resource limits, and separate database credentials compared to production. Kustomize overlays solve this problem elegantly by letting you define a single base configuration and then layer environment-specific changes on top of it.

On a Talos Linux cluster, this pattern works particularly well because it aligns with the declarative, version-controlled approach that Talos itself uses for machine configuration.

## The Overlay Pattern

Overlays in Kustomize follow a simple principle: you have a base that contains the common configuration, and overlays that modify specific parts for each environment. The base never changes when you deploy to a new environment. Instead, you add or adjust an overlay.

```
my-app/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    hpa.yaml
  overlays/
    development/
      kustomization.yaml
      resource-patch.yaml
    staging/
      kustomization.yaml
      replica-patch.yaml
      ingress.yaml
    production/
      kustomization.yaml
      replica-patch.yaml
      resource-patch.yaml
      ingress.yaml
      pdb.yaml
```

## Setting Up the Base

The base contains your application's core resources without any environment-specific details:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
        - name: web-api
          image: myorg/web-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: development
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-api
spec:
  selector:
    app: web-api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

```yaml
# base/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  minReplicas: 1
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - hpa.yaml
```

## Creating the Staging Overlay

The staging overlay adjusts replicas, resources, and adds an ingress rule:

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: staging

resources:
  - ../../base
  - ingress.yaml

patches:
  - path: replica-patch.yaml
    target:
      kind: Deployment
      name: web-api

images:
  - name: myorg/web-api
    newTag: staging-latest

configMapGenerator:
  - name: app-env
    behavior: create
    literals:
      - DATABASE_HOST=postgres.staging-db.svc.cluster.local
      - REDIS_HOST=redis.staging-cache.svc.cluster.local
      - LOG_LEVEL=debug
```

```yaml
# overlays/staging/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: web-api
          env:
            - name: NODE_ENV
              value: staging
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

```yaml
# overlays/staging/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-api
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  ingressClassName: nginx
  rules:
    - host: api-staging.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-api
                port:
                  number: 80
  tls:
    - secretName: web-api-staging-tls
      hosts:
        - api-staging.example.com
```

## Creating the Production Overlay

The production overlay has higher replicas, stricter resource limits, and a PodDisruptionBudget:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
  - ../../base
  - ingress.yaml
  - pdb.yaml

patches:
  - path: replica-patch.yaml
    target:
      kind: Deployment
      name: web-api
  - path: resource-patch.yaml
    target:
      kind: Deployment
      name: web-api
  - path: hpa-patch.yaml
    target:
      kind: HorizontalPodAutoscaler
      name: web-api

images:
  - name: myorg/web-api
    newTag: "1.5.2"

configMapGenerator:
  - name: app-env
    behavior: create
    literals:
      - DATABASE_HOST=postgres.production-db.svc.cluster.local
      - REDIS_HOST=redis.production-cache.svc.cluster.local
      - LOG_LEVEL=warn
```

```yaml
# overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: web-api
          env:
            - name: NODE_ENV
              value: production
```

```yaml
# overlays/production/resource-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  template:
    spec:
      containers:
        - name: web-api
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-api
```

```yaml
# overlays/production/hpa-patch.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-api
spec:
  minReplicas: 5
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
```

```yaml
# overlays/production/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-api
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: web-api
```

```yaml
# overlays/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-api
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-api
                port:
                  number: 80
  tls:
    - secretName: web-api-prod-tls
      hosts:
        - api.example.com
```

## Deploying to Each Environment

```bash
# Deploy to staging on your Talos Linux cluster
kubectl apply -k overlays/staging/

# Deploy to production
kubectl apply -k overlays/production/

# Preview what would be applied without deploying
kubectl kustomize overlays/production/
```

## Using Strategic Merge Patches vs JSON Patches

Kustomize supports two patching strategies. The examples above use strategic merge patches, which merge your patch with the base. For more precise control, use JSON patches:

```yaml
# overlays/production/kustomization.yaml
patches:
  - target:
      kind: Deployment
      name: web-api
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
      - op: add
        path: /spec/template/spec/containers/0/livenessProbe
        value:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 10
```

JSON patches are useful when you need to add, remove, or replace specific fields with precision.

## Talos Linux Overlay Considerations

When building overlays for Talos Linux environments, there are a few things to consider:

1. Storage classes vary between environments. Your development cluster might use local-path storage while production uses Rook-Ceph. Handle this with patches:

```yaml
# overlays/production/storage-patch.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: web-api-data
spec:
  storageClassName: ceph-block
```

2. Talos Linux nodes have labels that differ from cloud-managed Kubernetes. Use node selectors and affinities that match your actual Talos node labels.

3. Since Talos Linux is immutable, you can safely use topology spread constraints knowing that node configurations will not drift over time.

## Building a Complete Overlay Structure

For a real Talos Linux deployment, you might have overlays for different clusters as well:

```
overlays/
  dev-local/       # Local development cluster
  staging-aws/     # Staging on AWS
  staging-bare/    # Staging on bare metal Talos
  production-us/   # Production US region
  production-eu/   # Production EU region
```

Each overlay references the same base but applies cluster-specific patches. This keeps your base stable while giving you full flexibility for each deployment target.

## Summary

Kustomize overlays provide a clean, maintainable way to manage environment-specific configurations on Talos Linux. By separating base resources from environment patches, you reduce duplication and make it clear exactly what differs between staging and production. The overlay pattern works naturally with GitOps tools and fits the declarative philosophy that Talos Linux is built on. Whether you have two environments or twenty, the overlay approach scales without adding complexity to your base configuration.
