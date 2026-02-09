# How to Set Up GKE Config Sync for GitOps-Based Cluster Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GCP, GKE, GitOps, Config Sync

Description: Learn how to implement GKE Config Sync for GitOps-based cluster configuration management, enabling automated deployment and reconciliation from Git repositories.

---

GKE Config Sync continuously synchronizes Kubernetes cluster configuration from Git repositories. It implements GitOps principles by treating Git as the source of truth for cluster state, automatically applying changes when you commit to the repository. This approach provides version control, audit trails, and consistent configuration across multiple clusters.

## Understanding Config Sync Architecture

Config Sync consists of several components working together. The reconciler watches Git repositories for changes and applies them to the cluster. The admission webhook validates configurations before they are applied, preventing invalid or conflicting resources. The monitoring component tracks sync status and reports errors.

Unlike traditional deployment pipelines that push changes to clusters, Config Sync uses a pull model. Each cluster continuously polls the Git repository and reconciles any differences between the repository state and cluster state.

This architecture supports both hierarchical and unstructured repository layouts. Hierarchical repositories organize configurations by cluster, namespace, and environment. Unstructured repositories allow more flexibility in directory organization.

## Enabling Config Sync

Config Sync is available on GKE clusters as part of Anthos Config Management. Enable it through the GKE console or gcloud:

```bash
# Enable Config Sync on existing cluster
gcloud beta container fleet config-management enable \
  --project=my-project

# Register cluster with fleet
gcloud container fleet memberships register production-cluster \
  --gke-cluster=us-central1/production-cluster \
  --enable-workload-identity \
  --project=my-project
```

Install Config Sync operator:

```bash
# Download and apply Config Sync operator
gsutil cp gs://config-management-release/released/latest/config-sync-operator.yaml config-sync-operator.yaml

kubectl apply -f config-sync-operator.yaml

# Verify installation
kubectl get pods -n config-management-system
```

The config-management-system namespace contains the reconciler and other Config Sync components.

## Configuring Repository Synchronization

Create a ConfigManagement custom resource to specify your Git repository:

```yaml
apiVersion: configmanagement.gke.io/v1
kind: ConfigManagement
metadata:
  name: config-management
spec:
  clusterName: production-cluster
  git:
    syncRepo: https://github.com/myorg/k8s-configs
    syncBranch: main
    syncRev: HEAD
    secretType: ssh
    policyDir: clusters/production
  sourceFormat: unstructured
```

For public repositories, use token or none for secretType. For private repositories, create a secret with SSH credentials:

```bash
# Create SSH key pair
ssh-keygen -t rsa -b 4096 -C "config-sync@myorg.com" -f config-sync-key -N ""

# Add public key to GitHub as deploy key
cat config-sync-key.pub

# Create Kubernetes secret
kubectl create secret generic git-creds \
  --namespace=config-management-system \
  --from-file=ssh=config-sync-key
```

Update the ConfigManagement resource to reference the secret:

```yaml
spec:
  git:
    syncRepo: git@github.com:myorg/k8s-configs.git
    secretType: ssh
    secretRef:
      name: git-creds
```

Apply the configuration:

```bash
kubectl apply -f config-management.yaml

# Check sync status
kubectl get configmanagement config-management -o yaml
```

## Organizing Repository Structure

For unstructured repositories, organize configurations logically:

```
k8s-configs/
├── clusters/
│   ├── production/
│   │   ├── namespaces/
│   │   │   ├── app-namespace.yaml
│   │   │   └── monitoring-namespace.yaml
│   │   ├── deployments/
│   │   │   └── web-app.yaml
│   │   └── services/
│   │       └── web-service.yaml
│   └── staging/
│       └── ...
├── shared/
│   ├── network-policies/
│   └── rbac/
└── README.md
```

For hierarchical repositories, use the required directory structure:

```
k8s-configs/
├── system/
│   └── repo.yaml
├── clusterregistry/
│   ├── production.yaml
│   └── staging.yaml
├── cluster/
│   ├── cluster-role.yaml
│   └── cluster-role-binding.yaml
├── namespaces/
│   ├── production/
│   │   ├── namespace.yaml
│   │   └── deployment.yaml
│   └── staging/
│       └── ...
```

The system directory contains repository configuration, clusterregistry defines clusters, cluster holds cluster-scoped resources, and namespaces contains namespace-scoped resources.

## Creating Namespace Configurations

Define namespaces and their resources in the repository:

```yaml
# namespaces/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    managed-by: config-sync
```

Add deployments for that namespace:

```yaml
# namespaces/production/web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: gcr.io/my-project/web-app:v1.2.3
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
```

Commit and push to the repository:

```bash
git add namespaces/production/
git commit -m "Add production namespace and web deployment"
git push origin main
```

Config Sync detects the changes and applies them within seconds.

## Managing Cluster-Scoped Resources

Cluster-scoped resources like ClusterRoles and ClusterRoleBindings go in the cluster directory or at the repository root for unstructured layouts:

```yaml
# cluster/readonly-cluster-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-cluster-role
  labels:
    managed-by: config-sync
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "watch"]
```

```yaml
# cluster/readonly-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readonly-users-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: readonly-cluster-role
subjects:
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
```

## Using Multiple Sync Sources

Config Sync supports multiple Git repositories through RootSync and RepoSync resources. RootSync applies cluster-scoped and namespace-scoped resources, while RepoSync applies only namespace-scoped resources.

Create additional RootSync for a different repository:

```yaml
apiVersion: configsync.gke.io/v1beta1
kind: RootSync
metadata:
  name: infrastructure-sync
  namespace: config-management-system
spec:
  sourceFormat: unstructured
  git:
    repo: https://github.com/myorg/infrastructure-configs
    branch: main
    dir: clusters/production
    auth: token
    secretRef:
      name: github-token
```

For namespace-specific configurations managed by application teams:

```yaml
apiVersion: configsync.gke.io/v1beta1
kind: RepoSync
metadata:
  name: app-team-sync
  namespace: app-team
spec:
  sourceFormat: unstructured
  git:
    repo: https://github.com/myorg/app-team-configs
    branch: main
    auth: none
```

This delegation allows application teams to manage their namespace configurations without cluster admin access.

## Implementing Policy Enforcement

Combine Config Sync with Policy Controller (OPA Gatekeeper) to enforce organizational policies:

```yaml
# policies/require-labels.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-environment-label
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Namespace"]
  parameters:
    labels:
    - key: environment
      allowedRegex: "^(production|staging|development)$"
```

Config Sync applies this constraint, and Policy Controller enforces it on all namespace creations.

## Handling Secrets with External Secrets Operator

Don't commit secrets to Git. Use External Secrets Operator to inject secrets from Google Secret Manager:

```yaml
# secrets/database-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: prod-db-username
  - secretKey: password
    remoteRef:
      key: prod-db-password
```

Create SecretStore for Google Secret Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-secret-store
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: my-project
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: production-cluster
          serviceAccountRef:
            name: external-secrets-sa
```

This approach keeps secrets secure while maintaining GitOps workflows.

## Monitoring Sync Status

Check Config Sync status through kubectl:

```bash
# Check overall sync status
kubectl get rootsync -n config-management-system

# Check specific RootSync details
kubectl describe rootsync root-sync -n config-management-system

# View reconciler logs
kubectl logs -n config-management-system -l app=reconciler
```

Config Sync exposes metrics for monitoring:

```bash
# Port-forward to metrics endpoint
kubectl port-forward -n config-management-system \
  svc/reconciler-manager 8675:8675

# Query metrics
curl http://localhost:8675/metrics | grep config_sync
```

Integrate with Cloud Monitoring for alerting:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: config-management-system
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
          scrape_configs:
          - job_name: 'config-sync'
            static_configs:
            - targets: ['reconciler-manager:8675']
    exporters:
      googlecloud:
        project: my-project
    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          exporters: [googlecloud]
```

## Handling Sync Errors

When Config Sync encounters errors, it reports them in the status field:

```bash
# View sync errors
kubectl get rootsync root-sync -n config-management-system \
  -o jsonpath='{.status.sync.errors}'
```

Common errors include invalid YAML syntax, resource conflicts, and validation failures. Fix errors in the Git repository and push changes. Config Sync automatically retries.

For persistent errors, check reconciler logs:

```bash
kubectl logs -n config-management-system \
  -l app=reconciler \
  --tail=100
```

## Multi-Cluster Management

Manage multiple clusters from a single repository using cluster selectors:

```yaml
# clusters/production/cluster-selector.yaml
apiVersion: configmanagement.gke.io/v1
kind: ClusterSelector
metadata:
  name: production-cluster-selector
spec:
  selector:
    matchLabels:
      environment: production
      region: us-central1
```

Apply configurations conditionally:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
  annotations:
    configmanagement.gke.io/cluster-selector: production-cluster-selector
data:
  database_host: prod-db.internal
  cache_size: "1024"
```

This ConfigMap only applies to clusters matching the selector.

GKE Config Sync brings GitOps principles to Kubernetes cluster management with minimal overhead. The continuous reconciliation model ensures clusters stay synchronized with the desired state defined in Git, reducing configuration drift and improving operational reliability.
