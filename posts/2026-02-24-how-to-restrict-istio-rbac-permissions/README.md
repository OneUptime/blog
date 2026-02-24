# How to Restrict Istio RBAC Permissions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Security, Kubernetes, Access Control

Description: How to audit and tighten Kubernetes RBAC permissions for Istio components to follow the principle of least privilege.

---

Istio installs several ClusterRoles, ClusterRoleBindings, Roles, and RoleBindings into your cluster. By default, these permissions are broader than many production environments require. The principle of least privilege says you should only grant the minimum permissions needed for each component to function. This guide shows you how to audit what Istio has, understand what it actually needs, and tighten it up.

## Auditing Current RBAC

Start by understanding what RBAC resources Istio has created:

```bash
# List all ClusterRoles created by Istio
kubectl get clusterroles | grep istio

# List all ClusterRoleBindings
kubectl get clusterrolebindings | grep istio

# List Roles in istio-system
kubectl get roles -n istio-system

# List RoleBindings in istio-system
kubectl get rolebindings -n istio-system
```

To see the actual permissions:

```bash
# View istiod's ClusterRole
kubectl get clusterrole istiod-istio-system -o yaml

# Check what istiod's service account can do
kubectl auth can-i --list --as=system:serviceaccount:istio-system:istiod
```

The output will show you every permission the istiod service account has. Look for overly broad permissions like `*` on resources or verbs.

## Understanding What Istio Needs

Different Istio components need different permissions:

**istiod** needs to:
- Watch services, endpoints, pods, namespaces for service discovery
- Watch Istio CRDs (VirtualService, DestinationRule, etc.) for configuration
- Create and manage secrets for certificate issuance
- Update webhook configurations
- Watch ConfigMaps for mesh configuration

**Ingress Gateway** needs to:
- Read secrets in its namespace (for TLS certificates)
- Read Istio CRDs referenced by its Gateway configuration

**Sidecar Proxy** needs minimal Kubernetes API access. It gets its configuration from istiod via xDS, not directly from the API server.

## Creating Restricted ClusterRoles

Replace the default istiod ClusterRole with a more restrictive one:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istiod-restricted
  labels:
    app: istiod
rules:
# Service discovery - read only
- apiGroups: [""]
  resources: ["endpoints", "pods", "services", "namespaces", "nodes"]
  verbs: ["get", "list", "watch"]

# ConfigMaps for mesh config
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

# Secrets for CA and certificates
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update"]

# Istio networking CRDs - read only
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules", "gateways", "serviceentries", "sidecars", "envoyfilters", "workloadentries", "workloadgroups", "proxyconfigs"]
  verbs: ["get", "list", "watch"]

# Istio networking CRD status - update
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices/status", "destinationrules/status", "gateways/status", "serviceentries/status"]
  verbs: ["get", "update", "patch"]

# Istio security CRDs
- apiGroups: ["security.istio.io"]
  resources: ["authorizationpolicies", "peerauthentications", "requestauthentications"]
  verbs: ["get", "list", "watch"]

# Istio telemetry CRDs
- apiGroups: ["telemetry.istio.io"]
  resources: ["telemetries"]
  verbs: ["get", "list", "watch"]

# Webhooks - needed for sidecar injection
- apiGroups: ["admissionregistration.k8s.io"]
  resources: ["mutatingwebhookconfigurations"]
  verbs: ["get", "list", "watch", "update", "patch"]
- apiGroups: ["admissionregistration.k8s.io"]
  resources: ["validatingwebhookconfigurations"]
  verbs: ["get", "list", "watch", "update"]

# Leases for leader election
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]

# Certificate signing
- apiGroups: ["certificates.k8s.io"]
  resources: ["certificatesigningrequests", "certificatesigningrequests/approval", "certificatesigningrequests/status"]
  verbs: ["get", "list", "watch", "update", "create", "delete"]
- apiGroups: ["certificates.k8s.io"]
  resources: ["signers"]
  resourceNames: ["kubernetes.io/legacy-unknown"]
  verbs: ["approve"]
```

## Restricting Gateway Permissions

The ingress gateway needs far fewer permissions than istiod:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-ingressgateway-restricted
  namespace: istio-system
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch"]
```

Bind it to the gateway service account:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: istio-ingressgateway-binding
  namespace: istio-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: istio-ingressgateway-restricted
subjects:
- kind: ServiceAccount
  name: istio-ingressgateway
  namespace: istio-system
```

## Restricting User Access to Istio Resources

Not every developer should be able to modify Istio configuration. Create roles that limit who can change what:

**Read-only access to Istio resources:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-viewer
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
```

**Namespace-scoped Istio editor:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-editor
  namespace: myapp
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["security.istio.io"]
  resources: ["authorizationpolicies"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

**Security-sensitive resources restricted to security team:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-admin
rules:
- apiGroups: ["security.istio.io"]
  resources: ["peerauthentications", "requestauthentications"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["networking.istio.io"]
  resources: ["gateways"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Blocking Dangerous Operations

Some Istio operations are particularly dangerous. Use ValidatingAdmissionWebhooks or OPA to block them:

**Prevent disabling mTLS:**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prevent-permissive-mtls
spec:
  validationFailureAction: Enforce
  rules:
  - name: block-permissive-mtls
    match:
      any:
      - resources:
          kinds:
          - PeerAuthentication
    validate:
      message: "Permissive or disabled mTLS is not allowed"
      deny:
        conditions:
          any:
          - key: "{{ request.object.spec.mtls.mode }}"
            operator: AnyIn
            value: ["PERMISSIVE", "DISABLE"]
```

**Prevent wildcard AuthorizationPolicies:**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prevent-wildcard-authz
spec:
  validationFailureAction: Enforce
  rules:
  - name: block-allow-all
    match:
      any:
      - resources:
          kinds:
          - AuthorizationPolicy
    validate:
      message: "AuthorizationPolicy must have at least one rule with specific sources"
      pattern:
        spec:
          rules:
          - from:
            - source:
                principals: "?*"
```

## Auditing RBAC Usage

Regularly audit whether the permissions granted are actually being used:

```bash
# Enable API server audit logging for Istio-related API calls
# Then analyze the audit log

# Check for unused service accounts
kubectl get serviceaccounts -n istio-system

# Review recent API calls by Istio service accounts
kubectl get events -n istio-system --sort-by='.lastTimestamp'
```

Set up alerts for unexpected RBAC usage:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rbac-alerts
spec:
  groups:
  - name: rbac
    rules:
    - alert: UnexpectedIstioRBACAccess
      expr: |
        sum(rate(apiserver_request_total{
          user=~"system:serviceaccount:istio-system:.*",
          resource=~"secrets|configmaps",
          verb=~"create|update|delete"
        }[5m])) > 10
      for: 5m
      labels:
        severity: warning
```

## Applying Changes Safely

When modifying Istio RBAC, always:

1. Test in a non-production environment first
2. Apply changes one component at a time
3. Monitor istiod logs for permission errors after changes
4. Have a rollback plan ready

```bash
# Apply the new ClusterRole
kubectl apply -f istiod-restricted.yaml

# Watch istiod logs for errors
kubectl logs -n istio-system deploy/istiod -f | grep -i "error\|forbidden\|denied"

# If issues arise, revert
kubectl apply -f istiod-original-role.yaml
```

Tightening RBAC for Istio is an iterative process. Start by auditing what exists, then gradually restrict permissions while monitoring for breakage. The goal is to reach a state where each component has exactly the permissions it needs and nothing more.
