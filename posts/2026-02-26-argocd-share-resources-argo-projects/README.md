# How to Share Resources Between Argo Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Argo Workflows, Multi-Tenancy

Description: Learn how to share resources like secrets, configurations, service accounts, and artifact storage between ArgoCD, Argo Workflows, Argo Events, and Argo Rollouts.

---

When you run multiple Argo projects in the same cluster, they inevitably need to share resources. ArgoCD needs the same Git credentials as Argo Workflows. Argo Events needs permissions to trigger both Workflows and ArgoCD syncs. Argo Rollouts needs access to the same Prometheus instance that Argo Workflows uses for test results.

This guide covers practical patterns for sharing resources across the Argo ecosystem without creating a tangled mess of cross-namespace references.

## The Challenge of Multi-Namespace Argo Deployments

By default, each Argo project runs in its own namespace:

- `argocd` for ArgoCD
- `argo` for Argo Workflows
- `argo-rollouts` for Argo Rollouts
- `argo-events` for Argo Events

Kubernetes secrets and configmaps are namespace-scoped, so sharing credentials between these namespaces requires deliberate design.

## Sharing Git Credentials

Git credentials are the most commonly shared resource. ArgoCD needs them to pull manifests, and Argo Workflows needs them to clone source code and push manifest updates.

### Option 1: Duplicate Secrets with External Secrets Operator

The cleanest approach is using External Secrets Operator (ESO) to sync credentials from a central vault to each namespace:

```yaml
# external-secret for ArgoCD namespace
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: git-credentials
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: git-credentials
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        url: "https://github.com/myorg"
        username: "{{ .username }}"
        password: "{{ .password }}"
  data:
    - secretKey: username
      remoteRef:
        key: platform/git
        property: username
    - secretKey: password
      remoteRef:
        key: platform/git
        property: password
---
# Same credential in the argo namespace for Workflows
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: git-credentials
  namespace: argo
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: git-credentials
  data:
    - secretKey: username
      remoteRef:
        key: platform/git
        property: username
    - secretKey: password
      remoteRef:
        key: platform/git
        property: password
```

### Option 2: Kubernetes Reflector

If you do not use a vault, the Kubernetes Reflector project can mirror secrets across namespaces:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: argocd
  annotations:
    reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
    reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: "argo,argo-events"
    reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
    reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: "argo,argo-events"
type: Opaque
data:
  username: base64-encoded-username
  password: base64-encoded-password
```

This automatically creates copies of the secret in the `argo` and `argo-events` namespaces, and keeps them in sync when the source changes.

## Sharing Container Registry Credentials

Both Argo Workflows (for building and pushing images) and ArgoCD (for pulling image information) may need registry access:

```yaml
# Create a docker-registry secret that works across namespaces
apiVersion: v1
kind: Secret
metadata:
  name: registry-creds
  namespace: argo
  annotations:
    reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
    reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
    reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: "argocd,argo-events,production"
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

## Sharing Service Accounts with Cross-Namespace RBAC

When Argo Events needs to trigger Argo Workflows or ArgoCD syncs, it needs cross-namespace permissions. Use ClusterRoles and ClusterRoleBindings:

```yaml
# A ClusterRole that allows managing workflows and applications
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argo-cross-project
rules:
  # Manage Argo Workflows
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["create", "get", "list", "watch"]
  # Read ArgoCD Applications
  - apiGroups: ["argoproj.io"]
    resources: ["applications"]
    verbs: ["get", "list", "watch", "update", "patch"]
  # Read Rollout status
  - apiGroups: ["argoproj.io"]
    resources: ["rollouts", "analysisruns"]
    verbs: ["get", "list", "watch"]
---
# Bind the role to the Argo Events service account
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argo-events-cross-project
subjects:
  - kind: ServiceAccount
    name: argo-events-sa
    namespace: argo-events
roleRef:
  kind: ClusterRole
  name: argo-cross-project
  apiGroup: rbac.authorization.k8s.io
```

## Sharing Artifact Storage

Argo Workflows stores artifacts (build outputs, test results, logs) in S3-compatible storage. Argo Rollouts Analysis can also read from S3 for custom metric sources. Configure a shared artifact repository:

```yaml
# Shared MinIO for artifact storage
apiVersion: v1
kind: ConfigMap
metadata:
  name: artifact-repositories
  namespace: argo
  annotations:
    workflows.argoproj.io/default-artifact-repository: default-v1
data:
  default-v1: |
    archiveLogs: true
    s3:
      bucket: argo-artifacts
      endpoint: minio.shared.svc:9000
      insecure: true
      accessKeySecret:
        name: minio-creds
        key: accesskey
      secretKeySecret:
        name: minio-creds
        key: secretkey
```

Deploy MinIO in a shared namespace that all Argo components can access:

```yaml
# shared/minio-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: shared
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          command: ["minio", "server", "/data"]
          ports:
            - containerPort: 9000
          env:
            - name: MINIO_ACCESS_KEY
              value: "argoplatform"
            - name: MINIO_SECRET_KEY
              value: "argoplatform123"
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: shared
spec:
  selector:
    app: minio
  ports:
    - port: 9000
      targetPort: 9000
```

## Sharing Prometheus for Metrics

Argo Rollouts uses Prometheus for analysis queries, and Argo Workflows can use it for pipeline metrics. Point both to the same Prometheus instance:

```yaml
# In Argo Rollouts AnalysisTemplate
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: shared-metrics
spec:
  metrics:
    - name: success-rate
      provider:
        prometheus:
          # Same Prometheus used by Argo Workflows metrics
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(rate(http_requests_total{status=~"2.*"}[5m]))
            /
            sum(rate(http_requests_total[5m]))
```

## Sharing Notification Configuration

ArgoCD Notifications and Argo Events can share the same Slack, email, or webhook configuration:

```yaml
# Shared notification secret
apiVersion: v1
kind: Secret
metadata:
  name: notification-config
  namespace: argocd
  annotations:
    reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
    reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: "argo-events"
type: Opaque
data:
  slack-token: <base64-encoded-token>
  webhook-url: <base64-encoded-url>
```

## Using a Shared ConfigMap for Platform Settings

Create a central configuration that all components reference:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-config
  namespace: shared
data:
  git-org: "myorg"
  registry: "registry.example.com"
  prometheus-url: "http://prometheus.monitoring.svc:9090"
  argocd-server: "argocd-server.argocd.svc.cluster.local"
  argo-server: "argo-server.argo.svc.cluster.local"
```

Reference this from Argo Workflows:

```yaml
templates:
  - name: build
    container:
      env:
        - name: REGISTRY
          valueFrom:
            configMapKeyRef:
              name: platform-config
              key: registry
```

## Network Policies for Cross-Namespace Communication

Allow the Argo namespaces to communicate while keeping other namespaces isolated:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-argo-platform
  namespace: argo
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              argo-platform: "true"
  policyTypes:
    - Ingress
```

Label all Argo namespaces:

```bash
kubectl label namespace argocd argo-platform=true
kubectl label namespace argo argo-platform=true
kubectl label namespace argo-rollouts argo-platform=true
kubectl label namespace argo-events argo-platform=true
```

## Summary

Sharing resources between Argo projects requires thoughtful design around secrets management, RBAC, artifact storage, and network access. The key principles are: use External Secrets Operator or Kubernetes Reflector for credential sharing, use ClusterRoles for cross-namespace RBAC, centralize artifact storage and monitoring, and use network policies to control communication. For the complete platform setup guide, see our post on [setting up the complete Argo platform](https://oneuptime.com/blog/post/2026-02-26-argocd-complete-argo-platform/view).
