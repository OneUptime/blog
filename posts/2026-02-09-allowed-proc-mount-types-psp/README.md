# How to configure allowedProcMountTypes in PodSecurityPolicy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, PodSecurityPolicy, Proc Mount, Container Security

Description: Learn how to configure allowedProcMountTypes in PodSecurityPolicy to control /proc filesystem access, restricting container visibility into kernel and process information for enhanced security.

---

PodSecurityPolicy, while deprecated in Kubernetes 1.25, remains in use in older clusters. The `allowedProcMountTypes` field controls whether containers can access full /proc filesystem information or only masked versions. Understanding this setting helps maintain security in clusters still using PSP and guides migration to Pod Security Admission.

## Understanding ProcMount Types

The /proc filesystem exposes kernel and process information. Kubernetes supports two procMount types: Default masks sensitive paths, while Unmasked provides full /proc visibility. PodSecurityPolicy's `allowedProcMountTypes` field restricts which types pods can use.

Allowing only Default prevents containers from accessing sensitive kernel information that aids reconnaissance and exploitation. Restricting procMount types is particularly important in multi-tenant environments where information disclosure between tenants must be prevented.

## Basic PodSecurityPolicy Configuration

Configure allowedProcMountTypes in your PSP:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  allowedProcMountTypes:
  - Default
  # Unmasked is not in the list, therefore not allowed
  requiredDropCapabilities:
  - ALL
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
```

This PSP permits only Default procMount, blocking Unmasked access.

## Permissive PSP Allowing Unmasked

Infrastructure pods might need unmasked /proc access:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: privileged-psp
spec:
  privileged: true
  allowPrivilegeEscalation: true
  allowedProcMountTypes:
  - Default
  - Unmasked
  # Permits both types
  allowedCapabilities:
  - '*'
  runAsUser:
    rule: RunAsAny
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  volumes:
  - '*'
  hostNetwork: true
  hostPID: true
  hostIPC: true
```

This permissive PSP allows unmasked proc mounts for system components.

## RBAC Integration

Bind PSPs to service accounts:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: restricted-sa
  namespace: applications
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: use-restricted-psp
  namespace: applications
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
  - restricted-psp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: restricted-sa-psp-binding
  namespace: applications
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: use-restricted-psp
subjects:
- kind: ServiceAccount
  name: restricted-sa
  namespace: applications
```

Only service accounts with proper bindings can use specific PSPs.

## Pod Using Restricted PSP

Pods must comply with their PSP:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: compliant-pod
  namespace: applications
spec:
  serviceAccountName: restricted-sa
  securityContext:
    runAsUser: 1000
    runAsNonRoot: true
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      procMount: Default
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
  volumes:
  - name: cache
    emptyDir: {}
```

This pod complies with restricted-psp requirements.

## Testing PSP Enforcement

Verify PSP blocks non-compliant pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: non-compliant-pod
  namespace: applications
spec:
  serviceAccountName: restricted-sa
  hostPID: true
  containers:
  - name: app
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      procMount: Unmasked
      # This violates the PSP
```

This pod will be rejected because it requests Unmasked procMount.

## System Component PSP

System components might need different policies:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: system-monitor-sa
  namespace: kube-system
---
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: system-monitor-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  allowedProcMountTypes:
  - Unmasked
  # System monitors might need full /proc visibility
  hostPID: true
  hostNetwork: true
  runAsUser:
    rule: RunAsAny
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  volumes:
  - '*'
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: use-system-monitor-psp
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
  - system-monitor-psp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system-monitor-psp-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: use-system-monitor-psp
subjects:
- kind: ServiceAccount
  name: system-monitor-sa
  namespace: kube-system
```

This configuration allows system monitors to use Unmasked procMount.

## Migration to Pod Security Admission

PSP is deprecated. Migrate to Pod Security Admission:

```yaml
# Old PSP approach
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  allowedProcMountTypes:
  - Default
  # ... other settings

---
# New Pod Security Admission approach
apiVersion: v1
kind: Namespace
metadata:
  name: applications
  labels:
    pod-security.kubernetes.io/enforce: restricted
    # Restricted standard requires Default procMount
```

Pod Security Standards automatically enforce appropriate procMount restrictions.

## Documenting Exceptions

Document why pods need unmasked proc:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-problem-detector
  namespace: kube-system
  annotations:
    security-exception: "unmasked-proc"
    exception-reason: "Requires full /proc visibility for node diagnostics"
    exception-approved-by: "security-team"
    exception-approval-date: "2026-02-09"
    exception-review-date: "2026-08-09"
spec:
  selector:
    matchLabels:
      app: node-problem-detector
  template:
    metadata:
      labels:
        app: node-problem-detector
    spec:
      serviceAccountName: system-monitor-sa
      hostPID: true
      containers:
      - name: detector
        image: node-problem-detector:1.0
        securityContext:
          procMount: Unmasked
```

Every exception requires documentation and regular review.

## Audit PSP Usage

Monitor which PSPs pods actually use:

```bash
# List all PSPs
kubectl get psp

# Check which PSP a pod is using
kubectl get pod <pod-name> -o yaml | grep "kubernetes.io/psp"

# Find pods using specific PSP
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.metadata.annotations.kubernetes\.io/psp}{"\n"}{end}' | grep privileged-psp
```

Regular audits ensure PSPs are working as intended.

## Default PSP Strategy

Configure cluster-wide defaults:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: default-restricted
  annotations:
    seccomp.security.alpha.kubernetes.io/allowedProfileNames: 'runtime/default'
    seccomp.security.alpha.kubernetes.io/defaultProfileName: 'runtime/default'
spec:
  privileged: false
  allowPrivilegeEscalation: false
  allowedProcMountTypes:
  - Default
  requiredDropCapabilities:
  - ALL
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: use-default-psp
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
  - default-restricted
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: all-serviceaccounts-psp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: use-default-psp
subjects:
- kind: Group
  name: system:serviceaccounts
  apiGroup: rbac.authorization.k8s.io
```

This provides a secure default for all pods.

## Conclusion

The allowedProcMountTypes field in PodSecurityPolicy controls /proc filesystem access, with Default masking sensitive paths and Unmasked providing full visibility. Configure PSPs to allow only Default for application workloads, reserving Unmasked for infrastructure components that genuinely need full /proc access. Bind PSPs to service accounts using RBAC to ensure appropriate policies apply to each workload. Document and regularly review exceptions that require unmasked proc access. While PSP is deprecated, understanding these concepts helps secure existing clusters and guides migration to Pod Security Admission, which enforces similar restrictions through the restricted standard. Treat unmasked proc access as a privilege requiring explicit justification and security review.
