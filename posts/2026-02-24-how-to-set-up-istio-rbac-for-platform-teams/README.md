# How to Set Up Istio RBAC for Platform Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Platform Engineering, Kubernetes, Security, Governance

Description: Set up Kubernetes RBAC roles and bindings to control who can manage Istio resources with separate permissions for platform teams and application teams.

---

When multiple teams share an Istio mesh, controlling who can create and modify Istio resources becomes critical. A developer accidentally applying a mesh-wide PeerAuthentication policy or a rogue EnvoyFilter can take down services across the entire cluster. Kubernetes RBAC is your first line of defense, and setting it up correctly for Istio takes some thought about which resources are safe for application teams to manage and which ones should be locked down to the platform team.

## Istio Resource Categories for RBAC

Not all Istio resources carry the same risk. Here is how to categorize them:

**High risk (platform team only):**
- `EnvoyFilter` - Direct Envoy manipulation, can break anything
- `PeerAuthentication` in istio-system - Mesh-wide mTLS policy
- `Sidecar` in istio-system - Mesh-wide sidecar configuration
- `Telemetry` in istio-system - Mesh-wide telemetry settings
- `WasmPlugin` - Custom proxy extensions

**Medium risk (team leads with platform review):**
- `PeerAuthentication` at namespace level
- `AuthorizationPolicy` at namespace level (without selector)
- `Gateway` resources

**Low risk (application teams):**
- `VirtualService`
- `DestinationRule`
- `ServiceEntry`
- `AuthorizationPolicy` with selector
- `RequestAuthentication`

## Platform Team ClusterRole

Create a ClusterRole that gives the platform team full control over all Istio resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-platform-admin
rules:
  - apiGroups: ["networking.istio.io"]
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
    verbs: ["*"]
  - apiGroups: ["security.istio.io"]
    resources:
      - peerauthentications
      - authorizationpolicies
      - requestauthentications
    verbs: ["*"]
  - apiGroups: ["telemetry.istio.io"]
    resources:
      - telemetries
    verbs: ["*"]
  - apiGroups: ["extensions.istio.io"]
    resources:
      - wasmplugins
    verbs: ["*"]
  - apiGroups: ["install.istio.io"]
    resources:
      - istiooperators
    verbs: ["get", "list", "watch"]
```

Bind it to your platform team group:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-team-istio-admin
subjects:
  - kind: Group
    name: platform-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-platform-admin
  apiGroup: rbac.authorization.k8s.io
```

## Application Team Role

Create a namespace-scoped Role for application teams that allows them to manage the safe Istio resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-app-developer
  namespace: checkout
rules:
  - apiGroups: ["networking.istio.io"]
    resources:
      - virtualservices
      - destinationrules
      - serviceentries
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["security.istio.io"]
    resources:
      - authorizationpolicies
      - requestauthentications
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.istio.io"]
    resources:
      - envoyfilters
      - sidecars
      - gateways
    verbs: ["get", "list", "watch"]
  - apiGroups: ["security.istio.io"]
    resources:
      - peerauthentications
    verbs: ["get", "list", "watch"]
```

Notice that application teams get full CRUD access to VirtualServices, DestinationRules, ServiceEntries, AuthorizationPolicies, and RequestAuthentications. They get read-only access to EnvoyFilters, Sidecars, Gateways, and PeerAuthentications so they can see what is configured but not modify it.

Bind it to the team:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: checkout-team-istio
  namespace: checkout
subjects:
  - kind: Group
    name: checkout-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: istio-app-developer
  apiGroup: rbac.authorization.k8s.io
```

## Read-Only Role for Debugging

Sometimes developers need to inspect Istio resources across namespaces for debugging but should not be able to modify anything:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-readonly
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["security.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["telemetry.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

This is useful for on-call engineers who need to read the current mesh configuration during incidents.

## Gateway Management Role

Gateways are a shared resource that typically live in the `istio-system` namespace or a dedicated gateway namespace. Create a specific role for teams that manage ingress:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-gateway-manager
  namespace: istio-ingress
rules:
  - apiGroups: ["networking.istio.io"]
    resources:
      - gateways
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources:
      - secrets
    verbs: ["get", "list", "watch", "create", "update", "patch"]
    resourceNames: []
```

Be careful with the secrets permission. Gateway TLS certificates are stored as secrets, so gateway managers need access to create and update them. You might want to limit this to specific secret names using `resourceNames` if you want finer control.

## Automating RBAC with Helm

If you manage many namespaces, create a Helm chart that generates the RBAC resources for each team:

```yaml
# values.yaml
teams:
  - name: checkout-team
    namespace: checkout
    group: checkout-team
  - name: payments-team
    namespace: payments
    group: payments-team
  - name: shipping-team
    namespace: shipping
    group: shipping-team
```

```yaml
# templates/role.yaml
{{- range .Values.teams }}
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-app-developer
  namespace: {{ .namespace }}
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules", "serviceentries"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies", "requestauthentications"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: {{ .name }}-istio
  namespace: {{ .namespace }}
subjects:
  - kind: Group
    name: {{ .group }}
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: istio-app-developer
  apiGroup: rbac.authorization.k8s.io
---
{{- end }}
```

## Service Account Permissions for CI/CD

Your CI/CD pipelines also need Istio RBAC permissions. Create dedicated service accounts with the minimum required permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deploy
  namespace: checkout
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-istio-deploy
  namespace: checkout
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules"]
    verbs: ["get", "list", "create", "update", "patch"]
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies"]
    verbs: ["get", "list", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-istio-deploy
  namespace: checkout
subjects:
  - kind: ServiceAccount
    name: ci-deploy
    namespace: checkout
roleRef:
  kind: Role
  name: ci-istio-deploy
  apiGroup: rbac.authorization.k8s.io
```

Notice the CI service account does not get `delete` permission. This prevents CI/CD pipelines from accidentally removing Istio resources. If you need to delete resources during deployments, add it explicitly and consider requiring approval in the CI/CD workflow.

## Testing RBAC Permissions

After setting up RBAC, verify the permissions work as expected:

```bash
# Test as a checkout team member
kubectl auth can-i create virtualservices -n checkout --as-group=checkout-team --as=developer
# Expected: yes

kubectl auth can-i create envoyfilters -n checkout --as-group=checkout-team --as=developer
# Expected: no

kubectl auth can-i create virtualservices -n payments --as-group=checkout-team --as=developer
# Expected: no

# Test as platform team
kubectl auth can-i create envoyfilters -n checkout --as-group=platform-team --as=admin
# Expected: yes
```

Run these checks as part of your infrastructure tests to catch permission regressions.

## Aggregated ClusterRoles

Kubernetes supports ClusterRole aggregation, which lets you compose roles. This is useful for building up Istio permissions incrementally:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-networking-editor
  labels:
    istio-rbac: "true"
    istio-role: "networking-editor"
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules", "serviceentries"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-editor
  labels:
    istio-rbac: "true"
    istio-role: "security-editor"
rules:
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies", "requestauthentications"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-app-full
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        istio-rbac: "true"
rules: []  # Rules are automatically filled in by the controller
```

The `istio-app-full` role automatically includes all rules from roles labeled with `istio-rbac: "true"`. This makes it easy to add new permissions without modifying existing role bindings.

## Monitoring RBAC Denials

Enable audit logging to catch RBAC denials:

```bash
# Check for recent denied requests to Istio resources
kubectl get events -A --field-selector reason=Forbidden | grep istio
```

Monitor these in your logging system and set up alerts for repeated denials, which might indicate a misconfigured role or a team that needs additional permissions.

## Summary

Setting up RBAC for Istio is about matching permissions to risk. The platform team gets full access to all resources, especially the dangerous ones like EnvoyFilter and mesh-wide PeerAuthentication. Application teams get self-service access to safe resources like VirtualServices and DestinationRules, scoped to their own namespaces. CI/CD service accounts get the minimum permissions needed for deployment. Use aggregated ClusterRoles for composability, Helm charts for consistency across namespaces, and regular testing to verify permissions work as intended.
