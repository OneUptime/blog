# How to Configure Read-Only Access to Istio Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Kubernetes, Read-Only, Security

Description: Step-by-step instructions for setting up read-only access to Istio resources for auditors, on-call engineers, and monitoring tools.

---

Not everyone who needs to see Istio configuration needs to change it. Auditors need to review security policies. On-call engineers need to check routing rules during incidents. Monitoring dashboards need to query resource state. All of these use cases call for read-only access to Istio resources, and Kubernetes RBAC makes it straightforward to set up.

The benefit of read-only access goes beyond security. When people know they cannot accidentally break anything, they are more willing to explore and understand the mesh configuration. That leads to better incident response and more informed architectural decisions.

## Creating a Basic Read-Only ClusterRole

Start with a ClusterRole that covers all Istio API groups:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-readonly
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
  - apiGroups:
      - install.istio.io
    resources:
      - istiooperators
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - extensions.istio.io
    resources:
      - wasmplugins
    verbs:
      - get
      - list
      - watch
```

The `get`, `list`, and `watch` verbs cover all read operations including streaming watches used by tools that need real-time updates.

## Binding for Cluster-Wide Read Access

For roles that need visibility across all namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: auditors-istio-readonly
subjects:
  - kind: Group
    name: security-auditors
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-readonly
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oncall-istio-readonly
subjects:
  - kind: Group
    name: oncall-engineers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-readonly
  apiGroup: rbac.authorization.k8s.io
```

## Namespace-Scoped Read Access

Sometimes you want to give a team read access only to their namespace plus shared infrastructure namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-istio-view
  namespace: team-alpha
subjects:
  - kind: Group
    name: team-alpha-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-readonly
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-shared-view
  namespace: istio-system
subjects:
  - kind: Group
    name: team-alpha-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-readonly
  apiGroup: rbac.authorization.k8s.io
```

## Adding Kubernetes Core Resource Read Access

Istio resources alone do not tell the full story. For effective troubleshooting, read-only users also need to see Kubernetes core resources that Istio depends on:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-readonly-full
rules:
  # Istio resources
  - apiGroups:
      - networking.istio.io
      - security.istio.io
      - telemetry.istio.io
      - install.istio.io
      - extensions.istio.io
    resources: ["*"]
    verbs:
      - get
      - list
      - watch
  # Core Kubernetes resources needed for context
  - apiGroups: [""]
    resources:
      - pods
      - services
      - endpoints
      - namespaces
      - configmaps
      - events
    verbs:
      - get
      - list
      - watch
  - apiGroups: ["apps"]
    resources:
      - deployments
      - replicasets
      - statefulsets
      - daemonsets
    verbs:
      - get
      - list
      - watch
```

## Read-Only Access for Service Accounts

Monitoring tools and dashboards run as pods with service accounts. Give them read-only access:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: istio-dashboard
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-dashboard-readonly
subjects:
  - kind: ServiceAccount
    name: istio-dashboard
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: istio-readonly
  apiGroup: rbac.authorization.k8s.io
```

## Enabling istioctl Read-Only Usage

The `istioctl` CLI needs additional permissions beyond Istio CRDs to work properly. For read-only istioctl usage, you need:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istioctl-readonly
rules:
  # Istio CRDs
  - apiGroups:
      - networking.istio.io
      - security.istio.io
      - telemetry.istio.io
    resources: ["*"]
    verbs:
      - get
      - list
      - watch
  # Core resources istioctl needs
  - apiGroups: [""]
    resources:
      - pods
      - services
      - endpoints
      - namespaces
      - configmaps
      - secrets
    verbs:
      - get
      - list
      - watch
  - apiGroups: ["apps"]
    resources:
      - deployments
      - replicasets
    verbs:
      - get
      - list
      - watch
  # Required for proxy-config commands
  - apiGroups: [""]
    resources:
      - pods/exec
    verbs:
      - create
  # Required for proxy-status
  - apiGroups: [""]
    resources:
      - pods/portforward
    verbs:
      - create
```

The `pods/exec` and `pods/portforward` permissions are necessary because commands like `istioctl proxy-config` and `istioctl proxy-status` exec into the istio-proxy container to fetch configuration. Without these, most diagnostic istioctl commands will fail.

## Read-Only Access with Resource Filtering

If you want read-only access limited to specific resource types, split the ClusterRole:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-networking-readonly
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-readonly
rules:
  - apiGroups: ["security.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

Then bind only the relevant roles to each user or group. This way, a network engineer gets to see networking resources and a security auditor gets to see security resources.

## Verifying Read-Only Access

Test all common operations to make sure write access is properly blocked:

```bash
# Should work - reading resources
kubectl auth can-i get virtualservices.networking.istio.io --all-namespaces \
  --as-group=security-auditors --as=auditor1
# Expected: yes

kubectl auth can-i list authorizationpolicies.security.istio.io --all-namespaces \
  --as-group=security-auditors --as=auditor1
# Expected: yes

# Should fail - creating resources
kubectl auth can-i create virtualservices.networking.istio.io -n production \
  --as-group=security-auditors --as=auditor1
# Expected: no

# Should fail - deleting resources
kubectl auth can-i delete authorizationpolicies.security.istio.io -n production \
  --as-group=security-auditors --as=auditor1
# Expected: no

# Should fail - updating resources
kubectl auth can-i update destinationrules.networking.istio.io -n production \
  --as-group=security-auditors --as=auditor1
# Expected: no
```

Run these checks as part of your CI/CD pipeline to catch any RBAC drift:

```bash
#!/bin/bash
FAILURES=0

check_denied() {
  RESULT=$(kubectl auth can-i "$1" "$2" -n "$3" --as-group="$4" --as=testuser 2>&1)
  if [ "$RESULT" = "yes" ]; then
    echo "FAIL: $4 should not be able to $1 $2 in $3"
    FAILURES=$((FAILURES + 1))
  else
    echo "PASS: $4 cannot $1 $2 in $3"
  fi
}

check_denied create virtualservices.networking.istio.io production security-auditors
check_denied delete authorizationpolicies.security.istio.io production security-auditors
check_denied update gateways.networking.istio.io istio-system oncall-engineers
check_denied patch peerauthentications.security.istio.io istio-system oncall-engineers

if [ $FAILURES -gt 0 ]; then
  echo "RBAC check failed with $FAILURES violations"
  exit 1
fi

echo "All RBAC checks passed"
```

## Aggregating Read-Only Roles

Use Kubernetes role aggregation to automatically compose the read-only role from individual pieces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-full-readonly
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        istio.io/access-level: readonly
rules: []
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-networking-view
  labels:
    istio.io/access-level: readonly
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-security-view
  labels:
    istio.io/access-level: readonly
rules:
  - apiGroups: ["security.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-telemetry-view
  labels:
    istio.io/access-level: readonly
rules:
  - apiGroups: ["telemetry.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

The aggregated role `istio-full-readonly` automatically includes all ClusterRoles with the `istio.io/access-level: readonly` label. When new Istio API groups are added, you just create a new labeled ClusterRole and the aggregated role picks it up.

Read-only access is one of those things that seems trivial but has a real impact on operational maturity. When everyone on the team can safely inspect the mesh configuration without fear of breaking anything, problems get diagnosed faster and knowledge spreads more evenly across the team.
