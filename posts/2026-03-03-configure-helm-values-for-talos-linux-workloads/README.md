# How to Configure Helm Values for Talos Linux Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Helm, Kubernetes, Configuration Management, Helm Values

Description: Master Helm values configuration for Talos Linux workloads with practical examples covering resources, storage, networking, and security.

---

Helm values are the primary mechanism for customizing chart deployments. When you are running workloads on Talos Linux, getting your values right is especially important because of the operating system's immutable nature and security-first design. Certain defaults that work on traditional Linux distributions will not work on Talos, and understanding how to configure values properly will save you hours of debugging.

This guide covers the strategies and patterns for writing effective Helm values files tailored to Talos Linux environments.

## How Helm Values Work

Every Helm chart has a `values.yaml` file that defines default configuration. When you install a chart, you can override any of these defaults using:

- The `--set` flag for individual values
- The `-f` or `--values` flag to pass a values file
- Multiple values files layered on top of each other

The order of precedence is: defaults < first values file < second values file < `--set` flags. Later values always override earlier ones.

```bash
# View the default values for a chart
helm show values bitnami/nginx

# Override a single value
helm install my-app bitnami/nginx --set replicaCount=3

# Use a values file
helm install my-app bitnami/nginx -f my-values.yaml

# Layer multiple files with set overrides
helm install my-app bitnami/nginx \
  -f base-values.yaml \
  -f production-values.yaml \
  --set image.tag=1.25.0
```

## Resource Configuration

On Talos Linux clusters, setting proper resource requests and limits is critical. Talos runs a minimal set of system services, so you have more node resources available for your workloads, but you still need to plan capacity carefully.

```yaml
# Always set both requests and limits
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

A good practice is to start with conservative requests and use monitoring to adjust over time:

```yaml
# Resource values for a typical web application
resources:
  requests:
    cpu: 250m      # Start with a quarter core
    memory: 256Mi  # Start with 256MB
  limits:
    cpu: "1"       # Allow bursting to 1 core
    memory: 512Mi  # Hard limit at 512MB
```

For Talos Linux specifically, keep in mind that the OS itself uses very little memory (around 100-200MB), so you have more headroom per node compared to traditional Linux distributions.

## Storage Configuration

Talos Linux does not have traditional local storage paths like `/var/lib/data`. Persistent storage must go through Kubernetes storage classes and PersistentVolumeClaims.

```yaml
# Storage configuration for a database chart
persistence:
  enabled: true
  storageClass: "local-path"  # Adjust to your storage provisioner
  accessModes:
    - ReadWriteOnce
  size: 20Gi

# For charts with multiple storage sections
dataDir:
  persistence:
    enabled: true
    size: 50Gi
    storageClass: "ceph-block"

logDir:
  persistence:
    enabled: true
    size: 10Gi
    storageClass: "ceph-block"
```

If you are using a specific storage solution on Talos, such as Rook-Ceph or Longhorn, make sure to reference the correct storage class name:

```yaml
# Common storage classes on Talos Linux
# Rook-Ceph block storage
storageClass: "ceph-block"

# Rook-Ceph filesystem storage
storageClass: "ceph-filesystem"

# Longhorn distributed storage
storageClass: "longhorn"

# Local path provisioner
storageClass: "local-path"
```

## Networking Values

Talos Linux clusters typically use Cilium, Flannel, or another CNI. Your Helm values should account for the networking setup:

```yaml
# Service configuration
service:
  type: ClusterIP    # Use ClusterIP with an ingress controller
  port: 80
  targetPort: 8080

# Ingress configuration
ingress:
  enabled: true
  className: nginx   # Or your ingress controller class
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com
```

If your Talos cluster uses MetalLB for bare-metal load balancing:

```yaml
# LoadBalancer service for MetalLB
service:
  type: LoadBalancer
  annotations:
    metallb.universe.tf/address-pool: production-pool
  loadBalancerIP: 192.168.1.100  # Optional: request a specific IP
```

## Security Context Values

Talos Linux enforces strict security policies. Your Helm values should configure security contexts properly:

```yaml
# Pod security context
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault

# Container security context
containerSecurityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

For workloads that need specific capabilities (like a network monitoring tool):

```yaml
containerSecurityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
    add:
      - NET_BIND_SERVICE  # Only add what is truly needed
```

## Node Scheduling Values

On Talos Linux, you often want to control which nodes run which workloads. Use node selectors, tolerations, and affinities:

```yaml
# Simple node selector
nodeSelector:
  kubernetes.io/os: linux
  node-role: worker

# Tolerations for tainted nodes
tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "monitoring"
    effect: "NoSchedule"

# Pod anti-affinity to spread replicas across nodes
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
                - my-app
        topologyKey: kubernetes.io/hostname
```

## Environment-Specific Values

A common pattern is to have a base values file and environment-specific overlays:

```yaml
# values-base.yaml
replicaCount: 1
image:
  repository: myapp
  tag: latest
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 100m
    memory: 128Mi

env:
  - name: LOG_LEVEL
    value: "info"
```

```yaml
# values-production.yaml
replicaCount: 3
image:
  tag: "1.5.2"
  pullPolicy: Always

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "1"
    memory: 1Gi

env:
  - name: LOG_LEVEL
    value: "warn"
  - name: ENABLE_METRICS
    value: "true"
```

```bash
# Deploy with layered values
helm install my-app ./charts/my-app \
  -f values-base.yaml \
  -f values-production.yaml
```

## Handling Secrets in Values

Never store secrets in plain text values files that get committed to version control. Instead, use these approaches:

```bash
# Pass secrets via --set at deploy time
helm install my-app ./charts/my-app \
  -f values.yaml \
  --set database.password="${DB_PASSWORD}"

# Or use Kubernetes secrets referenced in values
```

```yaml
# Reference existing Kubernetes secrets in your values
existingSecret: my-app-secrets
existingSecretKeys:
  databasePassword: db-password
  apiKey: api-key
```

For a more robust approach, consider using tools like Sealed Secrets or External Secrets Operator:

```yaml
# Values for External Secrets Operator integration
externalSecrets:
  enabled: true
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  data:
    - secretKey: database-url
      remoteRef:
        key: myapp/production
        property: database_url
```

## Validating Values Before Deployment

Always validate your values before applying them to a production Talos cluster:

```bash
# Render templates locally to check for errors
helm template my-app bitnami/nginx -f my-values.yaml

# Dry run against the cluster API for validation
helm install my-app bitnami/nginx \
  -f my-values.yaml \
  --dry-run --debug

# Lint the chart with your values
helm lint ./charts/my-app -f my-values.yaml
```

## Summary

Configuring Helm values for Talos Linux workloads requires attention to the platform's unique characteristics. Storage must go through proper CSI drivers and storage classes since there is no traditional local filesystem access. Security contexts should be strict by default, aligning with Talos Linux's security-focused design. Resource requests and limits should take advantage of the minimal OS overhead. By organizing your values files with base configurations and environment-specific overlays, you create a maintainable and auditable deployment workflow that works well with Talos Linux's immutable infrastructure model.
