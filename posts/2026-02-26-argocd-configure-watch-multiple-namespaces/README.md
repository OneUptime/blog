# How to Configure ArgoCD to Watch Multiple Namespaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Namespace, Configuration

Description: Learn how to configure ArgoCD to watch for Application resources across multiple Kubernetes namespaces with proper security controls and namespace patterns.

---

By default, ArgoCD watches only its own namespace for Application custom resources. This is limiting in multi-tenant environments where teams want to manage their own Application resources without accessing the central argocd namespace. Configuring ArgoCD to watch multiple namespaces lets you distribute Application ownership while keeping centralized GitOps management.

## Default Behavior

In a standard ArgoCD installation, the application controller and API server only look for Application resources in the `argocd` namespace (or whatever namespace ArgoCD is installed in). If you create an Application resource in any other namespace, ArgoCD ignores it completely.

```bash
# This works (Application in argocd namespace)
kubectl apply -f my-app.yaml -n argocd

# This is ignored (Application in another namespace)
kubectl apply -f my-app.yaml -n team-frontend
```

## Configuration Methods

There are multiple ways to configure which namespaces ArgoCD watches.

### Method 1: ConfigMap (Recommended)

The most common approach uses the `argocd-cmd-params-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Explicit list of namespaces
  application.namespaces: "team-frontend, team-backend, team-data, team-platform"
```

### Method 2: Glob Patterns

Use glob patterns to match namespace names dynamically:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Match namespaces by pattern
  application.namespaces: "team-*, project-*"
```

This matches any namespace starting with `team-` or `project-`. When new namespaces matching the pattern are created, ArgoCD automatically starts watching them.

### Method 3: Watch All Namespaces

```yaml
data:
  application.namespaces: "*"
```

This watches every namespace in the cluster. Use this with extreme caution as it means anyone who can create Application resources in any namespace can potentially interact with ArgoCD.

### Method 4: Command-Line Arguments

You can also pass the configuration as command-line arguments to the ArgoCD components:

```yaml
# In the argocd-server Deployment
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          command:
            - argocd-server
          args:
            - --application-namespaces
            - "team-frontend,team-backend,team-data"

# In the argocd-application-controller StatefulSet
spec:
  template:
    spec:
      containers:
        - name: argocd-application-controller
          command:
            - argocd-application-controller
          args:
            - --application-namespaces
            - "team-frontend,team-backend,team-data"
```

Both the server and controller must have the same namespace configuration.

## Applying the Configuration

After updating the ConfigMap, restart the ArgoCD components:

```bash
# Apply the updated ConfigMap
kubectl apply -f argocd-cmd-params-cm.yaml

# Restart components to pick up changes
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout restart statefulset/argocd-application-controller -n argocd
kubectl rollout restart deployment/argocd-repo-server -n argocd

# Verify all pods are running
kubectl get pods -n argocd
```

## Setting Up Namespace-Level RBAC

ArgoCD needs RBAC permissions in each watched namespace to manage Application resources. If using glob patterns, you might need cluster-level permissions:

```yaml
# ClusterRole for ArgoCD to manage applications in all watched namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-application-controller-namespaced
rules:
  - apiGroups: ['argoproj.io']
    resources: ['applications', 'applicationsets']
    verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete']
  - apiGroups: ['argoproj.io']
    resources: ['applications/finalizers']
    verbs: ['update']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-application-controller-namespaced
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-application-controller-namespaced
subjects:
  - kind: ServiceAccount
    name: argocd-application-controller
    namespace: argocd
  - kind: ServiceAccount
    name: argocd-server
    namespace: argocd
```

## Configuring Projects for Multiple Namespaces

Each AppProject must declare which namespaces are allowed to create Application resources within it:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-frontend
  namespace: argocd
spec:
  description: "Frontend team applications"
  # Allow applications from these namespaces
  sourceNamespaces:
    - team-frontend
  sourceRepos:
    - 'https://github.com/myorg/frontend-*'
  destinations:
    - server: https://kubernetes.default.svc
      namespace: 'frontend-*'
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-backend
  namespace: argocd
spec:
  description: "Backend team applications"
  sourceNamespaces:
    - team-backend
  sourceRepos:
    - 'https://github.com/myorg/backend-*'
  destinations:
    - server: https://kubernetes.default.svc
      namespace: 'backend-*'
```

## Practical Multi-Namespace Setup

Here is a complete example setting up namespace-based application management for three teams:

```yaml
# Step 1: Create team namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: team-frontend
  labels:
    argocd.argoproj.io/managed-by: argocd
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-backend
  labels:
    argocd.argoproj.io/managed-by: argocd
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-data
  labels:
    argocd.argoproj.io/managed-by: argocd
```

```yaml
# Step 2: Configure ArgoCD to watch these namespaces
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  application.namespaces: "team-frontend, team-backend, team-data"
```

```yaml
# Step 3: Create projects with sourceNamespaces
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: frontend
  namespace: argocd
spec:
  sourceNamespaces: [team-frontend]
  sourceRepos: ['https://github.com/myorg/frontend-*']
  destinations:
    - server: https://kubernetes.default.svc
      namespace: 'frontend-*'
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
```

```yaml
# Step 4: Team creates Application in their namespace
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-frontend
  namespace: team-frontend  # Lives in team's namespace
spec:
  project: frontend
  source:
    repoURL: https://github.com/myorg/frontend-web.git
    targetRevision: main
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend-web
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Monitoring Across Namespaces

Track applications across all watched namespaces:

```bash
# List all applications across all namespaces
argocd app list

# Filter by app namespace
argocd app list --app-namespace team-frontend

# Use kubectl to see Application resources directly
kubectl get applications --all-namespaces

# Count applications per namespace
kubectl get applications --all-namespaces --no-headers \
  | awk '{print $1}' | sort | uniq -c | sort -rn
```

## Namespace Lifecycle Considerations

When using glob patterns, be aware of namespace lifecycle events:

**New namespace created matching the pattern** - ArgoCD automatically starts watching it. No restart needed.

**Namespace deleted** - Any Application resources in that namespace are deleted by Kubernetes. If those Applications had finalizers, ArgoCD processes the cleanup.

**Namespace renamed** - Kubernetes does not support namespace renaming. You would need to create a new namespace and migrate applications.

## Troubleshooting

### Application Not Detected

```bash
# Verify the namespace is in the watch list
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml

# Check controller logs for namespace watch events
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller \
  --tail=100 | grep -i "namespace"

# Verify the Application CRD exists
kubectl get crd applications.argoproj.io
```

### Permission Denied Errors

```bash
# Check if ArgoCD service accounts have proper RBAC
kubectl auth can-i list applications.argoproj.io \
  --as system:serviceaccount:argocd:argocd-application-controller \
  -n team-frontend
```

### Project Rejection

```bash
# Check project sourceNamespaces
kubectl get appproject frontend -n argocd \
  -o jsonpath='{.spec.sourceNamespaces}'

# Verify the Application's project reference
kubectl get application web-frontend -n team-frontend \
  -o jsonpath='{.spec.project}'
```

Configuring ArgoCD to watch multiple namespaces is a foundational step toward a proper multi-tenant GitOps platform. Combined with [AppProject source namespaces](https://oneuptime.com/blog/post/2026-02-26-argocd-enable-applications-any-namespace/view) and Kubernetes RBAC, it enables teams to self-serve their deployment configurations while maintaining security boundaries.
