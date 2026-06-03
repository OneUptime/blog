# How to Use RBAC Policies That Restrict PodSecurityPolicy Creation and Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security, PodSecurityPolicy, PSP

Description: Learn how to implement RBAC policies that prevent unauthorized creation and binding of PodSecurityPolicies, protecting cluster security boundaries from privilege escalation.

---

PodSecurityPolicy (PSP) controls security-sensitive aspects of pod specifications. PSP was deprecated in Kubernetes v1.21 and removed in v1.25, so these examples apply only to Kubernetes v1.24 and earlier, or to distributions that still provide PSP-compatible APIs. The RBAC patterns are still useful when thinking about who can change admission policy configuration. The key challenge is preventing users from creating or binding permissive policies that bypass security controls.

A user who can create a PSP and bind it to themselves can grant their pods any privileges they want, including running as root, accessing the host network, or mounting host paths. This completely bypasses security boundaries. Proper RBAC configuration ensures only cluster administrators can manage PSPs while application teams can use pre-approved policies.

## Understanding PSP RBAC Requirements

Using a PSP requires two permissions:

**Use Permission**: A RoleBinding or ClusterRoleBinding that grants the `use` verb on a specific PSP resource. When a pod is created, Kubernetes checks if the creating user or the pod's ServiceAccount has permission to use at least one PSP that validates the pod's specification.

**Create/Update Permission**: The ability to create or modify PSP objects themselves. This should be restricted to cluster administrators only.

The attack vector is straightforward: If a developer can create PSPs and has permission to use their own PSPs, they can create a permissive policy and bypass all security controls.

## Creating Restrictive PSPs for Application Teams

Start by defining secure PSPs that application teams can use:

```yaml
# restricted-psp.yaml

apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: false
```

Apply the PSP:

```bash
kubectl apply -f restricted-psp.yaml
```

Create a ClusterRole that allows using this PSP:

```yaml
# use-restricted-psp-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: use-restricted-psp
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
    - restricted  # Only this specific PSP
```

Apply the role:

```bash
kubectl apply -f use-restricted-psp-clusterrole.yaml
```

## Binding PSP Use Permissions to Users

Grant developers permission to use the restricted PSP:

```yaml
# developers-psp-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developers-use-restricted-psp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: use-restricted-psp
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
```

Apply the binding:

```bash
kubectl apply -f developers-psp-binding.yaml
```

Now developers can create pods that comply with the restricted PSP, but they cannot create pods that violate it or create new PSPs.

## Preventing PSP Creation by Regular Users

Ensure only cluster administrators can manage PSP objects:

```bash
# Check who can create PSPs
kubectl auth can-i create podsecuritypolicies.policy --as=developer@company.com
# Should return: no

# Verify admin can create PSPs
kubectl auth can-i create podsecuritypolicies.policy
# Should return: yes (if you're an admin)
```

The default RBAC configuration prevents PSP creation by users without cluster-admin. However, verify your cluster has not granted excessive permissions:

```bash
# Find all roles that allow PSP creation
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.rules[]? |
    select(.apiGroups[]? == "policy" and
           .resources[]? == "podsecuritypolicies" and
           (.verbs[]? == "create" or .verbs[]? == "*"))) |
  .metadata.name'
```

Any role other than cluster-admin or dedicated security roles should not appear in this list.

## Creating Privileged PSPs for System Components

System components like CNI plugins or monitoring agents need privileged PSPs:

```yaml
# privileged-psp.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: privileged
spec:
  privileged: true
  allowPrivilegeEscalation: true
  allowedCapabilities:
    - '*'
  volumes:
    - '*'
  hostNetwork: true
  hostPorts:
    - min: 0
      max: 65535
  hostIPC: true
  hostPID: true
  runAsUser:
    rule: 'RunAsAny'
  seLinux:
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

Create a role to use this PSP:

```yaml
# use-privileged-psp-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: use-privileged-psp
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
    - privileged
```

Bind it only to specific system ServiceAccounts:

```yaml
# system-privileged-psp-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system-use-privileged-psp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: use-privileged-psp
subjects:
# CNI ServiceAccount
- kind: ServiceAccount
  name: calico-node
  namespace: kube-system
# Monitoring agents
- kind: ServiceAccount
  name: node-exporter
  namespace: monitoring
```

Never bind privileged PSPs to user groups or application ServiceAccounts.

## Auditing PSP Usage

Enable audit logging to track PSP admission decisions:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log PSP object access and changes
- level: Metadata
  omitStages:
    - RequestReceived
  resources:
  - group: "policy"
    resources: ["podsecuritypolicies"]

# Log pod creation and admission decisions
- level: Metadata
  omitStages:
    - RequestReceived
  resources:
  - group: ""
    resources: ["pods"]
  verbs: ["create"]
```

Search audit logs for PSP usage:

```bash
# Find pods annotated with the PSP that admitted them
kubectl get pods --all-namespaces \
  -o jsonpath="{range .items[*]}{.metadata.namespace} {.metadata.name} {.metadata.annotations.kubernetes\.io\/psp}{'\n'}{end}"

# Find pod creation audit annotations
jq 'select(.objectRef.resource=="pods" and .verb=="create") |
    .annotations' \
    /var/log/kubernetes/audit.log

# Find failed PSP admission
jq 'select(.responseStatus.code==403 and .objectRef.resource=="pods")' \
    /var/log/kubernetes/audit.log
```

## Testing PSP Enforcement

Verify that users cannot create privileged pods:

```bash
# Try to create a privileged pod as developer
kubectl run privileged-test \
  --image=nginx \
  --privileged=true \
  --as=developer@company.com
# Should fail with: Error creating: pods "privileged-test" is forbidden:
# unable to validate against any pod security policy
```

Verify restricted pods succeed:

```bash
# Create a restricted pod
kubectl run restricted-test \
  --image=busybox:1.36 \
  --as=developer@company.com \
  --overrides='{"apiVersion":"v1","spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":1000},"containers":[{"name":"restricted-test","image":"busybox:1.36","command":["sleep","3600"],"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}}]}}'
# Should succeed
```

Test with a manifest that violates the PSP:

```yaml
# privileged-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: privileged-test
spec:
  containers:
  - name: nginx
    image: nginx
    securityContext:
      privileged: true  # Violates restricted PSP
```

Try to create it:

```bash
kubectl apply -f privileged-pod.yaml --as=developer@company.com
# Should fail
```

## Migrating from PSP to Pod Security Admission

PSP is deprecated and removed in Kubernetes 1.25+. Migrate to Pod Security Admission (PSA):

```yaml
# Apply Pod Security Standards to namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

PSA does not require RBAC configuration, as it is enforced at the namespace level. However, you still need RBAC to control who can modify namespace labels:

```bash
# Prevent users from modifying namespace labels
# Default RBAC already restricts this to cluster admins
# Verify with:
kubectl auth can-i update namespace development --as=developer@company.com
# Should return: no
```

## Preventing PSP Binding Escalation

A subtle attack: If a user can create RoleBindings, they might try to bind the use-privileged-psp role to themselves:

```bash
# Check if user can create rolebindings
kubectl auth can-i create rolebindings --as=developer@company.com

# If yes, they might try:
kubectl create rolebinding escalate-psp \
  --clusterrole=use-privileged-psp \
  --user=developer@company.com \
  --namespace=development \
  --as=developer@company.com
```

Kubernetes prevents this automatically through escalation prevention unless the user already has the permissions in the referenced role or has explicit `bind` permission on that role. Verify this protection is working:

```bash
# This should fail
kubectl create rolebinding test-escalation \
  --clusterrole=cluster-admin \
  --user=developer@company.com \
  --as=developer@company.com
# Error: user cannot bind role with permissions they don't have
```

## Monitoring PSP Violations

Set up log-based alerts for repeated PSP violations that might indicate attack attempts. The built-in `apiserver_audit_event_total` metric only counts exported audit events and does not include request fields such as verb, resource, status code, or user, so use your audit log backend or a log-to-metrics pipeline for these labels:

```yaml
# Prometheus alert rule for a custom metric generated from audit logs
groups:
- name: psp-violations
  rules:
  - alert: RepeatedPSPViolations
    expr: |
      sum(rate(kubernetes_audit_pod_create_forbidden_total{
        verb="create",
        objectRef_resource="pods",
        responseStatus_code="403"
      }[5m])) by (user_username) > 5
    for: 5m
    annotations:
      summary: "User {{ $labels.user_username }} has repeated PSP violations"
```

Investigate users with frequent violations, as they might be trying to bypass security controls.

PSP RBAC configuration requires careful attention to prevent privilege escalation while allowing legitimate workloads to run. The key is separating PSP management permissions from PSP usage permissions, ensuring application teams can use secure policies without creating their own. As you migrate to Pod Security Admission, apply similar principles to namespace label management to maintain security boundaries.
