# How to Configure RBAC for Istio Multi-Tenancy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Multi-Tenancy, Kubernetes, Security

Description: How to set up Kubernetes RBAC to support multiple teams sharing an Istio service mesh with proper isolation and access controls.

---

Running a shared Istio mesh for multiple teams is common in larger organizations. It saves on infrastructure costs and simplifies operations. But sharing a mesh also means that one team's VirtualService could accidentally route traffic to another team's service, or a misconfigured AuthorizationPolicy could block cross-team communication. RBAC is how you prevent these problems.

The goal is to give each team full control over their own namespaces while preventing them from affecting other teams' configurations. At the same time, the platform team needs cluster-wide visibility and the ability to set mesh-wide policies.

## Namespace-Based Tenancy Model

The most practical multi-tenancy model for Istio uses Kubernetes namespaces as tenant boundaries. Each team gets one or more namespaces, and RBAC restricts what they can do within those namespaces.

Create namespaces for each team:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    istio-injection: enabled
    team: alpha
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-beta
  labels:
    istio-injection: enabled
    team: beta
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-gamma
  labels:
    istio-injection: enabled
    team: gamma
```

## Defining Tenant ClusterRoles

Create a ClusterRole that gives teams control over Istio resources. This role will be bound per-namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-tenant-admin
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - virtualservices
      - destinationrules
      - serviceentries
      - sidecars
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
```

Notice that this role does not include `gateways`, `envoyfilters`, or `peerauthentications`. Those affect mesh-wide behavior and should be reserved for the platform team.

## Binding Roles to Teams

Bind the ClusterRole to each team scoped to their namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-istio-admin
  namespace: team-alpha
subjects:
  - kind: Group
    name: team-alpha
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-tenant-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-beta-istio-admin
  namespace: team-beta
subjects:
  - kind: Group
    name: team-beta
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-tenant-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-gamma-istio-admin
  namespace: team-gamma
subjects:
  - kind: Group
    name: team-gamma
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-tenant-admin
  apiGroup: rbac.authorization.k8s.io
```

With this setup, team-alpha can create VirtualServices in the `team-alpha` namespace but cannot touch anything in `team-beta` or `team-gamma`.

## Platform Team ClusterRole

The platform team needs cluster-wide access plus the ability to manage resources that tenants cannot:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-platform-admin
rules:
  - apiGroups:
      - networking.istio.io
    resources: ["*"]
    verbs: ["*"]
  - apiGroups:
      - security.istio.io
    resources: ["*"]
    verbs: ["*"]
  - apiGroups:
      - telemetry.istio.io
    resources: ["*"]
    verbs: ["*"]
  - apiGroups:
      - install.istio.io
    resources: ["*"]
    verbs: ["*"]
  - apiGroups:
      - extensions.istio.io
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-team-istio
subjects:
  - kind: Group
    name: platform-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-platform-admin
  apiGroup: rbac.authorization.k8s.io
```

## Cross-Tenant Visibility

Teams often need read access to other teams' configurations for debugging cross-service communication issues. Create a read-only role for this:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-mesh-viewer
rules:
  - apiGroups:
      - networking.istio.io
      - security.istio.io
      - telemetry.istio.io
    resources: ["*"]
    verbs:
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: all-teams-mesh-viewer
subjects:
  - kind: Group
    name: all-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-mesh-viewer
  apiGroup: rbac.authorization.k8s.io
```

This lets any developer see the mesh configuration across all namespaces but only modify their own.

## Enforcing Tenant Isolation with Istio Policies

RBAC controls who can create Istio resources, but you also need Istio-level policies to enforce runtime isolation. The platform team should set baseline policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-cross-tenant
  namespace: team-alpha
spec:
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces:
              - team-alpha
              - istio-system
```

Apply this for each tenant namespace to prevent unauthorized cross-namespace traffic.

A more scalable approach uses a default-deny policy at the mesh level:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: default-deny
  namespace: istio-system
spec:
  {}
```

Then each team creates explicit ALLOW policies for their services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-team-alpha-internal
  namespace: team-alpha
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - team-alpha
```

## Preventing Scope Creep with Resource Quotas

RBAC prevents unauthorized access, but it does not prevent a team from creating too many resources. Use ResourceQuotas to limit Istio resource creation:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: istio-resource-quota
  namespace: team-alpha
spec:
  hard:
    count/virtualservices.networking.istio.io: "20"
    count/destinationrules.networking.istio.io: "20"
    count/authorizationpolicies.security.istio.io: "30"
    count/serviceentries.networking.istio.io: "10"
```

## Automating Tenant Onboarding

When a new team joins the mesh, automate the namespace, RBAC, and policy creation:

```bash
#!/bin/bash
TEAM_NAME=$1
TEAM_GROUP=$2

# Create namespace
kubectl create namespace "$TEAM_NAME"
kubectl label namespace "$TEAM_NAME" istio-injection=enabled team="$TEAM_NAME"

# Bind Istio tenant role
kubectl create rolebinding "${TEAM_NAME}-istio-admin" \
  --clusterrole=istio-tenant-admin \
  --group="$TEAM_GROUP" \
  -n "$TEAM_NAME"

# Create default authorization policy
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: ${TEAM_NAME}
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - ${TEAM_NAME}
              - istio-system
EOF

# Create resource quota
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: istio-resource-quota
  namespace: ${TEAM_NAME}
spec:
  hard:
    count/virtualservices.networking.istio.io: "20"
    count/destinationrules.networking.istio.io: "20"
    count/authorizationpolicies.security.istio.io: "30"
EOF

echo "Tenant $TEAM_NAME onboarded successfully"
```

Run it:

```bash
./onboard-tenant.sh team-delta team-delta-developers
```

## Verifying Tenant Isolation

Test that isolation is working correctly:

```bash
# Verify team-alpha cannot create resources in team-beta namespace
kubectl auth can-i create virtualservices.networking.istio.io \
  -n team-beta --as-group=team-alpha --as=alice

# Verify team-alpha can create resources in their own namespace
kubectl auth can-i create virtualservices.networking.istio.io \
  -n team-alpha --as-group=team-alpha --as=alice

# Verify platform team has access everywhere
kubectl auth can-i create gateways.networking.istio.io \
  -n team-alpha --as-group=platform-team --as=admin
```

Multi-tenancy in Istio requires coordination between Kubernetes RBAC and Istio's own policy system. RBAC controls who can create and modify mesh configuration, while Istio's AuthorizationPolicies control the runtime behavior of traffic. You need both layers working together to have proper tenant isolation that is both secure and practical for day-to-day operations.
