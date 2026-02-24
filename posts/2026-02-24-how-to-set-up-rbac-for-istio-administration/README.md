# How to Set Up RBAC for Istio Administration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Kubernetes, Security, Administration

Description: How to configure Kubernetes RBAC to control who can create, modify, and delete Istio resources in your cluster safely.

---

Installing Istio is one thing. Controlling who gets to touch its configuration is another. Without proper RBAC, any developer with namespace access can create VirtualServices, DestinationRules, or AuthorizationPolicies that affect the entire mesh. That is a recipe for outages caused by well-meaning but poorly tested configuration changes.

Kubernetes RBAC gives you the tools to lock this down. You can decide who gets to read Istio resources, who can create them, and who has full admin access. The key is mapping Istio's custom resource types to the right ClusterRoles and RoleBindings.

## Understanding Istio Resource Types

Istio registers several custom resource definitions (CRDs) in your cluster. Each one belongs to an API group. Here are the main ones:

```bash
kubectl api-resources | grep istio
```

The primary API groups are:

- `networking.istio.io` - VirtualService, DestinationRule, Gateway, ServiceEntry, Sidecar
- `security.istio.io` - AuthorizationPolicy, PeerAuthentication, RequestAuthentication
- `telemetry.istio.io` - Telemetry
- `install.istio.io` - IstioOperator

Each of these is a separate RBAC resource you can grant or restrict access to.

## Creating an Istio Admin Role

For platform engineers who need full control over Istio:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-admin
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - virtualservices
      - destinationrules
      - gateways
      - serviceentries
      - sidecars
      - envoyfilters
      - workloadentries
      - workloadgroups
      - proxyconfigs
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
  - apiGroups:
      - security.istio.io
    resources:
      - authorizationpolicies
      - peerauthentications
      - requestauthentications
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
  - apiGroups:
      - telemetry.istio.io
    resources:
      - telemetries
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
  - apiGroups:
      - install.istio.io
    resources:
      - istiooperators
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
```

Bind it to a group of platform engineers:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-admin-binding
subjects:
  - kind: Group
    name: platform-engineers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-admin
  apiGroup: rbac.authorization.k8s.io
```

## Creating a Developer Role

Developers typically need to manage VirtualServices and DestinationRules for their own namespaces but should not touch security policies or mesh-wide configuration:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-developer
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - virtualservices
      - destinationrules
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
  - apiGroups:
      - networking.istio.io
    resources:
      - gateways
      - serviceentries
      - sidecars
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - security.istio.io
    resources:
      - authorizationpolicies
      - peerauthentications
      - requestauthentications
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - telemetry.istio.io
    resources:
      - telemetries
    verbs:
      - get
      - list
      - watch
```

Bind this at the namespace level:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: istio-developer-binding
  namespace: team-alpha
subjects:
  - kind: Group
    name: team-alpha-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-developer
  apiGroup: rbac.authorization.k8s.io
```

Notice that we use a ClusterRole with a namespace-scoped RoleBinding. This means the ClusterRole defines the permissions, but the RoleBinding restricts those permissions to a single namespace.

## Creating a Read-Only Role

For auditors, on-call engineers who need visibility, or dashboards:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-viewer
rules:
  - apiGroups:
      - networking.istio.io
      - security.istio.io
      - telemetry.istio.io
      - install.istio.io
    resources: ["*"]
    verbs:
      - get
      - list
      - watch
```

Bind it cluster-wide for visibility across all namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-viewer-binding
subjects:
  - kind: Group
    name: oncall-engineers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-viewer
  apiGroup: rbac.authorization.k8s.io
```

## Protecting the istio-system Namespace

The `istio-system` namespace contains the control plane. You should restrict who can modify resources there:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-system-admin
  namespace: istio-system
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: istio-system-admin-binding
  namespace: istio-system
subjects:
  - kind: Group
    name: platform-leads
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: istio-system-admin
  apiGroup: rbac.authorization.k8s.io
```

## Service Account RBAC for CI/CD

Your CI/CD pipelines also need RBAC to deploy Istio resources. Create a dedicated service account with just enough permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-istio-deployer
  namespace: cicd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cicd-istio-deployer
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - virtualservices
      - destinationrules
    verbs:
      - get
      - list
      - create
      - update
      - patch
  - apiGroups:
      - security.istio.io
    resources:
      - authorizationpolicies
    verbs:
      - get
      - list
      - create
      - update
      - patch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cicd-istio-deployer-binding
subjects:
  - kind: ServiceAccount
    name: cicd-istio-deployer
    namespace: cicd
roleRef:
  kind: ClusterRole
  name: cicd-istio-deployer
  apiGroup: rbac.authorization.k8s.io
```

Note that the CI/CD role does not include `delete` permission. This prevents accidental deletion of routing or security policies during deployment.

## Verifying RBAC Configuration

Test that your RBAC policies work as expected:

```bash
# Check if a user can create VirtualServices in a namespace
kubectl auth can-i create virtualservices.networking.istio.io \
  -n team-alpha --as=alice@example.com

# Check if a service account can update AuthorizationPolicies
kubectl auth can-i update authorizationpolicies.security.istio.io \
  -n production --as=system:serviceaccount:cicd:cicd-istio-deployer

# List all permissions for a user
kubectl auth can-i --list --as=alice@example.com -n team-alpha | grep istio
```

## Aggregated ClusterRoles

Kubernetes supports ClusterRole aggregation, where a parent role automatically includes rules from child roles with matching labels. This is useful for building composable permission sets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-networking-editor
  labels:
    rbac.istio.io/aggregate-to-admin: "true"
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-editor
  labels:
    rbac.istio.io/aggregate-to-admin: "true"
rules:
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies", "peerauthentications"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-full-admin
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        rbac.istio.io/aggregate-to-admin: "true"
rules: []
```

The `istio-full-admin` role automatically picks up permissions from any ClusterRole labeled with `rbac.istio.io/aggregate-to-admin: "true"`. When you add new permission sets later, the admin role inherits them without needing an update.

Setting up RBAC for Istio takes effort upfront, but it pays off by preventing configuration mistakes and unauthorized changes. Start with three roles (admin, developer, viewer), bind them appropriately, and expand from there as your organization's needs become clearer.
