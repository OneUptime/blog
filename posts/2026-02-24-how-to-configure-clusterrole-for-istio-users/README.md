# How to Configure ClusterRole for Istio Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ClusterRole, Kubernetes, RBAC, Security

Description: Learn how to create and manage Kubernetes ClusterRoles that give users the right level of access to Istio custom resources.

---

ClusterRoles in Kubernetes define a set of permissions that can be applied cluster-wide or scoped to individual namespaces through RoleBindings. When it comes to Istio, getting ClusterRoles right is important because Istio resources like VirtualServices and AuthorizationPolicies directly control traffic routing and security. Give someone too much access and they can accidentally break production routing. Give them too little and they cannot deploy their services properly.

The trick is to design ClusterRoles that match your organizational roles. A platform engineer needs different access than an application developer, who needs different access than a security auditor.

## Listing Istio CRDs and Their API Groups

Before creating ClusterRoles, know what resources exist:

```bash
kubectl get crd | grep istio
```

You will see something like:

```text
authorizationpolicies.security.istio.io
destinationrules.networking.istio.io
envoyfilters.networking.istio.io
gateways.networking.istio.io
peerauthentications.security.istio.io
proxyconfigs.networking.istio.io
requestauthentications.security.istio.io
serviceentries.networking.istio.io
sidecars.networking.istio.io
telemetries.telemetry.istio.io
virtualservices.networking.istio.io
wasmplugins.extensions.istio.io
workloadentries.networking.istio.io
workloadgroups.networking.istio.io
```

Each CRD belongs to an API group, and you need to reference both the group and the resource name in ClusterRole rules.

## ClusterRole for Traffic Management

This ClusterRole covers everything a developer needs to manage traffic routing for their services:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-traffic-manager
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - virtualservices
      - destinationrules
      - serviceentries
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
      - virtualservices/status
      - destinationrules/status
      - serviceentries/status
    verbs:
      - get
      - list
      - watch
```

Note the separate rule for status subresources. Status is read-only for users since the controller manages it, but users need to read it for debugging.

## ClusterRole for Security Configuration

Security resources should be managed by a smaller group of people:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-manager
rules:
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
      - security.istio.io
    resources:
      - authorizationpolicies/status
      - peerauthentications/status
      - requestauthentications/status
    verbs:
      - get
      - list
      - watch
```

## ClusterRole for Gateway Management

Gateways control ingress traffic and are typically managed by platform teams:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-gateway-manager
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - gateways
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
      - gateways/status
    verbs:
      - get
      - list
      - watch
```

## ClusterRole for Advanced Proxy Configuration

EnvoyFilters and Sidecars are advanced resources that can break things if misconfigured. Restrict these to experts:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-proxy-configurator
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - envoyfilters
      - sidecars
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
      - extensions.istio.io
    resources:
      - wasmplugins
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
```

## Binding ClusterRoles to Users

Cluster-wide binding (use for platform teams):

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-team-traffic
subjects:
  - kind: Group
    name: platform-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-traffic-manager
  apiGroup: rbac.authorization.k8s.io
```

Namespace-scoped binding (use for development teams):

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-traffic
  namespace: team-alpha
subjects:
  - kind: Group
    name: team-alpha-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-traffic-manager
  apiGroup: rbac.authorization.k8s.io
```

The same ClusterRole can be bound differently for different teams. Platform engineers get cluster-wide access while development teams are restricted to their namespaces.

## Using Aggregated ClusterRoles

For organizations that want composable roles, use label-based aggregation:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-traffic-viewer
  labels:
    istio.io/role-type: viewer
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules", "gateways", "serviceentries"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-viewer
  labels:
    istio.io/role-type: viewer
rules:
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies", "peerauthentications", "requestauthentications"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-telemetry-viewer
  labels:
    istio.io/role-type: viewer
rules:
  - apiGroups: ["telemetry.istio.io"]
    resources: ["telemetries"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-full-viewer
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        istio.io/role-type: viewer
rules: []
```

The `istio-full-viewer` role automatically includes all ClusterRoles with the `istio.io/role-type: viewer` label.

## Testing ClusterRole Permissions

Always verify your ClusterRoles work correctly:

```bash
# Test a specific user's access
kubectl auth can-i create virtualservices.networking.istio.io -n team-alpha \
  --as=developer@example.com

# Test a service account
kubectl auth can-i delete authorizationpolicies.security.istio.io -n production \
  --as=system:serviceaccount:cicd:deployer

# List all Istio-related permissions for a user
kubectl auth can-i --list --as=developer@example.com -n team-alpha 2>/dev/null | \
  grep -E "istio|networking|security|telemetry"
```

## Handling the istioctl CLI

Users who run `istioctl` commands need specific permissions. For example, `istioctl analyze` needs read access to Istio resources and Kubernetes core resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istioctl-user
rules:
  - apiGroups: ["networking.istio.io", "security.istio.io", "telemetry.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "services", "endpoints", "namespaces", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
```

The `pods/exec` permission is needed for commands like `istioctl proxy-config` that exec into sidecar containers.

## Best Practices

A few things to keep in mind when designing ClusterRoles for Istio:

1. Start restrictive and add permissions as needed. It is much easier to grant access than to revoke it after someone depends on it.

2. Separate networking and security permissions. The people managing traffic routing are often not the same people managing security policies.

3. Use namespace-scoped RoleBindings where possible. Most developers only need access to their own namespace.

4. Audit access regularly. Use `kubectl auth can-i` checks in your CI/CD pipeline to verify that role definitions have not drifted.

5. Document which ClusterRole each team should have. This avoids confusion and reduces the number of one-off access requests.

ClusterRoles are the building blocks of Istio access control at the Kubernetes level. Get them right, and you create a system where teams have the access they need without the risk of accidentally breaking each other's configurations.
