# How to Apply Cluster-Specific Overrides with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster overrides, Multi-Cluster, GitOps, Kubernetes, Kustomize

Description: Learn how to apply cluster-specific overrides on top of shared configurations in Flux CD to handle per-cluster differences in a multi-cluster setup.

---

## Introduction

In a multi-cluster Flux CD setup, you share common configurations across all clusters but inevitably need per-cluster customizations. One cluster might need different resource limits, another might need a specific ingress class, and a third might require additional environment variables. Flux CD provides several mechanisms for applying cluster-specific overrides without duplicating the shared base. This guide covers all the techniques available.

## When You Need Cluster-Specific Overrides

Common scenarios requiring overrides:

- **Cloud provider differences**: AWS clusters use ALB, GCP clusters use GCE ingress
- **Regional settings**: Different DNS zones, storage classes, or node selectors per region
- **Cluster size**: Smaller development clusters need fewer replicas and smaller resource limits
- **Compliance requirements**: Some clusters in regulated regions need additional security controls
- **Feature rollouts**: Gradually enabling features on specific clusters first

## Repository Structure

```text
fleet-repo/
  base/
    apps/
      web-app/
        deployment.yaml
        service.yaml
        ingress.yaml
        kustomization.yaml
    infrastructure/
      ingress-controller/
        helmrelease.yaml
        kustomization.yaml
  clusters/
    aws-us-east/
      kustomization.yaml
      patches/
        ingress-override.yaml
        resources-override.yaml
    aws-eu-west/
      kustomization.yaml
      patches/
        ingress-override.yaml
        resources-override.yaml
    gcp-us-central/
      kustomization.yaml
      patches/
        ingress-override.yaml
        resources-override.yaml
```

## Method 1: Kustomize Patches

The most straightforward method for cluster-specific overrides is Kustomize strategic merge patches or JSON patches.

```yaml
# base/apps/web-app/deployment.yaml
# Base deployment shared across all clusters
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: apps
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: your-org/web-app:v2.0.0
          ports:
            - containerPort: 8080
          env:
            - name: CLUSTER_NAME
              value: default
            - name: REGION
              value: default
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

```yaml
# base/apps/web-app/ingress.yaml
# Base ingress shared across all clusters
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: apps
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  rules:
    - host: web-app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
  tls:
    - hosts:
        - web-app.example.com
      secretName: web-app-tls
```

```yaml
# base/apps/web-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

### AWS US East Cluster Override

```yaml
# clusters/aws-us-east/kustomization.yaml
# Kustomize overlay for the AWS US East cluster
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/apps/web-app
patches:
  # Apply cluster-specific patches
  - path: patches/ingress-override.yaml
  - path: patches/resources-override.yaml
```

```yaml
# clusters/aws-us-east/patches/ingress-override.yaml
# Override ingress for AWS US East: use ALB and us-east domain
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: apps
  annotations:
    # AWS-specific ALB annotations
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc-123
spec:
  # Use AWS ALB ingress class instead of nginx
  ingressClassName: alb
  rules:
    - host: web-app.us-east.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
  tls:
    - hosts:
        - web-app.us-east.example.com
      secretName: web-app-tls
```

```yaml
# clusters/aws-us-east/patches/resources-override.yaml
# Override resources for the larger AWS US East cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: apps
spec:
  # US East is the primary region, needs more replicas
  replicas: 5
  template:
    spec:
      containers:
        - name: web-app
          env:
            - name: CLUSTER_NAME
              value: aws-us-east
            - name: REGION
              value: us-east-1
            - name: AWS_REGION
              value: us-east-1
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
      # AWS-specific node selector
      nodeSelector:
        node.kubernetes.io/instance-type: m5.xlarge
```

### GCP US Central Cluster Override

```yaml
# clusters/gcp-us-central/patches/ingress-override.yaml
# Override ingress for GCP: use GCE ingress class and GCP annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: apps
  annotations:
    # GCP-specific annotations
    kubernetes.io/ingress.global-static-ip-name: web-app-ip
    networking.gke.io/managed-certificates: web-app-cert
spec:
  ingressClassName: gce
  rules:
    - host: web-app.us-central.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

## Method 2: Post-Build Variable Substitution

Flux CD supports variable substitution in Kustomization resources, which is ideal for simple value replacements.

```yaml
# base/apps/web-app/deployment-with-vars.yaml
# Deployment using variable placeholders that Flux substitutes per cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: apps
spec:
  replicas: ${REPLICAS:=2}
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
        cluster: ${CLUSTER_NAME}
    spec:
      containers:
        - name: web-app
          image: your-org/web-app:v2.0.0
          env:
            - name: CLUSTER_NAME
              value: ${CLUSTER_NAME}
            - name: REGION
              value: ${REGION}
            - name: DATABASE_HOST
              value: ${DATABASE_HOST}
            - name: CACHE_ENDPOINT
              value: ${CACHE_ENDPOINT}
          resources:
            requests:
              cpu: ${CPU_REQUEST:=200m}
              memory: ${MEMORY_REQUEST:=256Mi}
            limits:
              cpu: ${CPU_LIMIT:=500m}
              memory: ${MEMORY_LIMIT:=512Mi}
      nodeSelector:
        topology.kubernetes.io/zone: ${PREFERRED_ZONE:=us-east-1a}
```

```yaml
# clusters/aws-us-east/apps.yaml
# Flux Kustomization with cluster-specific variable values
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./base/apps/web-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Substitute cluster-specific values into the templates
  postBuild:
    substitute:
      CLUSTER_NAME: aws-us-east
      REGION: us-east-1
      REPLICAS: "5"
      CPU_REQUEST: 500m
      MEMORY_REQUEST: 512Mi
      CPU_LIMIT: "1"
      MEMORY_LIMIT: 1Gi
      DATABASE_HOST: db.us-east-1.rds.amazonaws.com
      CACHE_ENDPOINT: cache.us-east-1.elasticache.amazonaws.com
      PREFERRED_ZONE: us-east-1a
```

```yaml
# clusters/gcp-us-central/apps.yaml
# Flux Kustomization with GCP-specific variable values
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./base/apps/web-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: gcp-us-central
      REGION: us-central1
      REPLICAS: "3"
      CPU_REQUEST: 300m
      MEMORY_REQUEST: 384Mi
      CPU_LIMIT: 750m
      MEMORY_LIMIT: 768Mi
      DATABASE_HOST: 10.0.0.5
      CACHE_ENDPOINT: 10.0.0.10
      PREFERRED_ZONE: us-central1-a
```

## Method 3: ConfigMap-Based Substitution

Store cluster-specific values in a ConfigMap for easier management.

```yaml
# clusters/aws-us-east/cluster-settings.yaml
# ConfigMap containing all cluster-specific settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-settings
  namespace: flux-system
data:
  CLUSTER_NAME: aws-us-east
  REGION: us-east-1
  CLOUD_PROVIDER: aws
  REPLICAS: "5"
  STORAGE_CLASS: gp3
  INGRESS_CLASS: alb
  DNS_ZONE: us-east.example.com
  CPU_REQUEST: 500m
  MEMORY_REQUEST: 512Mi
```

```yaml
# clusters/aws-us-east/apps.yaml
# Reference the ConfigMap for variable substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./base/apps/web-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      # Load variables from the ConfigMap
      - kind: ConfigMap
        name: cluster-settings
      # Load sensitive variables from a Secret
      - kind: Secret
        name: cluster-secrets
```

## Method 4: Helm Values Overrides per Cluster

For Helm-based deployments, use cluster-specific values files.

```yaml
# base/infrastructure/ingress-controller/helmrelease.yaml
# Base HelmRelease for the ingress controller
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-controller
  namespace: ingress-system
spec:
  interval: 15m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.9.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      metrics:
        enabled: true
```

```yaml
# clusters/aws-us-east/patches/ingress-helm-override.yaml
# AWS-specific Helm values override for the ingress controller
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-controller
  namespace: ingress-system
spec:
  values:
    controller:
      # AWS-specific service type and annotations
      service:
        type: LoadBalancer
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
          service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
          service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
      # AWS-specific replica count
      replicaCount: 3
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
```

## Combining Override Methods

You can combine multiple override methods in the same cluster for maximum flexibility.

```yaml
# clusters/aws-us-east/kustomization.yaml
# Combine Kustomize patches with base resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/apps/web-app
  - ../../base/infrastructure/ingress-controller
patches:
  # Kustomize patches for structural changes
  - path: patches/ingress-override.yaml
  - path: patches/resources-override.yaml
  - path: patches/ingress-helm-override.yaml
```

```yaml
# clusters/aws-us-east/flux-kustomization.yaml
# Flux Kustomization combines Kustomize patches with variable substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/aws-us-east
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Variable substitution for simple value replacements
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-settings
      - kind: Secret
        name: cluster-secrets
```

## Verifying Overrides

```bash
# Preview what Kustomize will generate for a specific cluster
kustomize build clusters/aws-us-east

# Compare the rendered output between two clusters
diff <(kustomize build clusters/aws-us-east) <(kustomize build gcp-us-central)

# Check applied resources on the actual cluster
kubectl --context aws-us-east get deployment web-app -n apps -o yaml

# Verify variable substitution worked correctly
flux get kustomization apps -n flux-system -o json | jq '.status'
```

## Best Practices

1. **Prefer Kustomize patches for structural changes**: Use patches when you need to add, remove, or restructure YAML fields.
2. **Use variable substitution for simple values**: Use `postBuild.substitute` for string replacements like region names or endpoint URLs.
3. **Store cluster settings in ConfigMaps**: Makes it easy to see all cluster-specific values in one place.
4. **Keep overrides minimal**: If most clusters need the same override, move it to the base instead.
5. **Document what each cluster overrides**: Add comments explaining why a cluster diverges from the base.
6. **Review overrides regularly**: Periodic reviews help identify overrides that can be consolidated back into the base.

## Conclusion

Flux CD provides multiple mechanisms for applying cluster-specific overrides: Kustomize patches for structural changes, post-build variable substitution for simple values, ConfigMap-based substitution for centralized settings management, and Helm values overrides for chart-based deployments. By choosing the right mechanism for each type of override and combining them as needed, you can maintain a clean separation between shared base configurations and cluster-specific customizations.
