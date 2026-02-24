# How to Configure Namespace-Scoped RBAC for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Namespaces, Kubernetes, Multi-Tenancy

Description: How to set up namespace-scoped RBAC for Istio so teams can manage their own mesh configuration without affecting others.

---

Cluster-wide RBAC for Istio is fine when you have a small team and everyone trusts everyone else. But as your organization grows and multiple teams share a cluster, you need to scope Istio permissions to namespaces. The goal is to let each team manage their own VirtualServices, DestinationRules, and authorization policies without accidentally touching another team's configuration.

Namespace-scoped RBAC uses a combination of ClusterRoles (which define what permissions are available) and RoleBindings (which restrict those permissions to a specific namespace). The ClusterRole is like a template, and the RoleBinding activates it in a particular namespace for a particular user or group.

## The Pattern: ClusterRole + RoleBinding

Here is the core pattern. Define the permissions once as a ClusterRole:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-namespace-admin
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

Then bind it per namespace with RoleBindings:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-checkout-istio
  namespace: checkout
subjects:
  - kind: Group
    name: team-checkout
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-namespace-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-catalog-istio
  namespace: catalog
subjects:
  - kind: Group
    name: team-catalog
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-namespace-admin
  apiGroup: rbac.authorization.k8s.io
```

Team checkout can now manage Istio resources in the `checkout` namespace. They cannot see or modify anything in the `catalog` namespace (unless you give them separate read access there).

## Splitting Permissions by Resource Type

Some organizations want finer-grained control. Not every developer on a team should be able to create AuthorizationPolicies. Split the ClusterRole into multiple roles:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-routing-editor
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.istio.io"]
    resources: ["gateways", "serviceentries", "sidecars", "envoyfilters"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-editor
rules:
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies", "requestauthentications"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["security.istio.io"]
    resources: ["peerauthentications"]
    verbs: ["get", "list", "watch"]
```

Then bind them separately:

```yaml
# All developers can manage routing
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: checkout-routing
  namespace: checkout
subjects:
  - kind: Group
    name: team-checkout
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-routing-editor
  apiGroup: rbac.authorization.k8s.io
---
# Only team leads can manage security policies
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: checkout-security
  namespace: checkout
subjects:
  - kind: Group
    name: team-checkout-leads
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-security-editor
  apiGroup: rbac.authorization.k8s.io
```

## Providing Cross-Namespace Read Access

Teams often need to read Istio resources in other namespaces for debugging. Create a read-only ClusterRoleBinding for this:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-all-namespaces-viewer
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
  name: all-devs-istio-view
subjects:
  - kind: Group
    name: all-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-all-namespaces-viewer
  apiGroup: rbac.authorization.k8s.io
```

This gives all developers read access to Istio resources across the entire cluster, while write access remains scoped to their own namespace.

## Handling Shared Namespaces

Some namespaces are shared between teams, like a `shared-infra` namespace. For these, you can bind multiple teams:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: shared-infra-istio-checkout
  namespace: shared-infra
subjects:
  - kind: Group
    name: team-checkout
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-routing-editor
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: shared-infra-istio-catalog
  namespace: shared-infra
subjects:
  - kind: Group
    name: team-catalog
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-routing-editor
  apiGroup: rbac.authorization.k8s.io
```

## Automating RoleBinding Creation

Use a controller or script to automatically create RoleBindings when new namespaces are created:

```bash
#!/bin/bash
# Watch for new namespaces and create RBAC bindings
kubectl get namespaces --watch -o json | while read -r line; do
  NS=$(echo "$line" | jq -r '.metadata.name // empty')
  TEAM=$(echo "$line" | jq -r '.metadata.labels.team // empty')

  if [ -n "$TEAM" ] && [ -n "$NS" ]; then
    EXISTS=$(kubectl get rolebinding "${TEAM}-istio-admin" -n "$NS" 2>/dev/null)
    if [ -z "$EXISTS" ]; then
      echo "Creating RBAC for team $TEAM in namespace $NS"
      kubectl create rolebinding "${TEAM}-istio-admin" \
        --clusterrole=istio-namespace-admin \
        --group="$TEAM" \
        -n "$NS"
    fi
  fi
done
```

A more production-ready approach uses a Kubernetes operator or a policy tool like Kyverno:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: auto-create-istio-rbac
spec:
  rules:
    - name: create-istio-rolebinding
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchExpressions:
                  - key: team
                    operator: Exists
      generate:
        kind: RoleBinding
        apiVersion: rbac.authorization.k8s.io/v1
        name: "{{request.object.metadata.labels.team}}-istio-admin"
        namespace: "{{request.object.metadata.name}}"
        data:
          subjects:
            - kind: Group
              name: "{{request.object.metadata.labels.team}}"
              apiGroup: rbac.authorization.k8s.io
          roleRef:
            kind: ClusterRole
            name: istio-namespace-admin
            apiGroup: rbac.authorization.k8s.io
```

## Preventing Namespace Escape

One thing namespace-scoped RBAC does not prevent is a VirtualService in namespace A routing traffic to a service in namespace B. Istio's VirtualService allows specifying hosts in other namespaces. To prevent this, use an admission webhook or Gatekeeper policy:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istioroutingscope
spec:
  crd:
    spec:
      names:
        kind: IstioRoutingScope
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package istioroutingscope

        violation[{"msg": msg}] {
          input.review.object.kind == "VirtualService"
          ns := input.review.object.metadata.namespace
          route := input.review.object.spec.http[_].route[_]
          host := route.destination.host
          contains(host, ".")
          parts := split(host, ".")
          count(parts) >= 2
          target_ns := parts[1]
          target_ns != ns
          msg := sprintf("VirtualService in %v cannot route to %v", [ns, host])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioRoutingScope
metadata:
  name: restrict-cross-namespace-vs
spec:
  match:
    kinds:
      - apiGroups: ["networking.istio.io"]
        kinds: ["VirtualService"]
    excludedNamespaces: ["istio-system"]
```

## Verification Script

Run this to verify your namespace-scoped RBAC setup:

```bash
#!/bin/bash
TEAMS=("team-checkout:checkout" "team-catalog:catalog")

for ENTRY in "${TEAMS[@]}"; do
  TEAM=$(echo "$ENTRY" | cut -d: -f1)
  NS=$(echo "$ENTRY" | cut -d: -f2)

  echo "=== Testing $TEAM in namespace $NS ==="

  # Should be allowed
  kubectl auth can-i create virtualservices.networking.istio.io \
    -n "$NS" --as-group="$TEAM" --as=testuser

  # Should be denied (other namespace)
  for OTHER in "${TEAMS[@]}"; do
    OTHER_NS=$(echo "$OTHER" | cut -d: -f2)
    if [ "$OTHER_NS" != "$NS" ]; then
      kubectl auth can-i create virtualservices.networking.istio.io \
        -n "$OTHER_NS" --as-group="$TEAM" --as=testuser
    fi
  done
done
```

Namespace-scoped RBAC for Istio is the right default for any multi-team cluster. It provides the isolation teams need while keeping the flexibility for platform teams to manage mesh-wide concerns. Start with the simple pattern of ClusterRole plus RoleBinding and add more granularity as your needs grow.
