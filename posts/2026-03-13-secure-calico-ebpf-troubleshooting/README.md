# How to Secure Calico eBPF Troubleshooting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, eBPF, Troubleshooting, Security

Description: Implement security controls for Calico eBPF troubleshooting access, ensuring diagnostic tools are available when needed but restricted to authorized users.

---

## Introduction

eBPF troubleshooting requires privileged access - running privileged containers, accessing the host's BPF filesystem, and reading BPF maps that contain sensitive network state (NAT tables, conntrack entries). Without proper access controls, these capabilities could be abused. The challenge is making troubleshooting tools available to on-call engineers while restricting them from general use.

The security model for eBPF troubleshooting tools should be: authorized on-call engineers can access diagnostic tools, but not all developers, and all access is audited.

## Prerequisites

- Calico eBPF active
- RBAC configured
- Kubernetes audit logging enabled

## Security Control 1: RBAC for Troubleshooting Access

Kubernetes `PolicyRule` does not have a `namespaces` field — to scope permissions to specific namespaces you either use a `Role` (namespace-scoped) or a `ClusterRole` bound via a `RoleBinding` in the target namespace. We split the permissions so cluster-wide read-only access to Calico CRDs uses a `ClusterRole`, while exec and pod management permissions are scoped per-namespace.

```yaml
# calico-ebpf-troubleshoot-role.yaml

# Cluster-wide read-only access to Calico resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-ebpf-troubleshooter
rules:
  - apiGroups: ["projectcalico.org"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]

---
# Exec and log access scoped to calico-system
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: calico-ebpf-troubleshooter-system
  namespace: calico-system
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]

---
# Debug pod management scoped to calico-debug
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: calico-ebpf-troubleshooter-debug
  namespace: calico-debug
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["create", "delete", "get", "list"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-ebpf-troubleshooter-oncall
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-ebpf-troubleshooter
subjects:
  - kind: Group
    name: oncall-engineers
    apiGroup: rbac.authorization.k8s.io

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: calico-ebpf-troubleshooter-system
  namespace: calico-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: calico-ebpf-troubleshooter-system
subjects:
  - kind: Group
    name: oncall-engineers
    apiGroup: rbac.authorization.k8s.io

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: calico-ebpf-troubleshooter-debug
  namespace: calico-debug
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: calico-ebpf-troubleshooter-debug
subjects:
  - kind: Group
    name: oncall-engineers
    apiGroup: rbac.authorization.k8s.io
```

## Security Control 2: Dedicated Namespace for Debug Pods

```yaml
# calico-debug-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: calico-debug
  labels:
    # Allow privileged pods (debug pods need host access)
    pod-security.kubernetes.io/enforce: privileged
    # Still emit audit annotations for anything that fails the restricted profile
    pod-security.kubernetes.io/audit: restricted

---
# Limit debug pods to stay in the debug namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: debug-pod-limit
  namespace: calico-debug
spec:
  hard:
    pods: "5"  # Maximum 5 debug pods at once
    requests.cpu: "2"
    requests.memory: "2Gi"
```

## Security Control 3: Audit Logging for Troubleshooting Actions

```bash
# Ensure audit policy captures exec and BPF-related actions
# In kube-apiserver audit-policy.yaml:
cat <<EOF
- level: Request
  verbs: ["create"]
  resources:
    - group: ""
      resources: ["pods/exec"]
  namespaces: ["calico-system", "calico-debug"]
EOF

# Review audit logs for troubleshooting sessions
# (pod exec is recorded by the apiserver audit log, not the Kubernetes events API)
jq 'select(.objectRef.subresource=="exec" and (.objectRef.namespace=="calico-system" or .objectRef.namespace=="calico-debug"))' \
  /var/log/kubernetes/audit.log
```

## Security Control 4: Time-Limited Debug Access

```bash
# For emergency access, create time-limited tokens
# Create a short-lived token for an on-call engineer
kubectl create token calico-troubleshooter \
  --duration=4h \
  --namespace=calico-system

# Or use impersonation for audit trail
kubectl --as=user@example.com exec -n calico-system \
  ds/calico-node -c calico-node -- bpftool prog list
```

## Secure Troubleshooting Flow

```mermaid
flowchart TD
    A[Incident Triggered] --> B[On-call Engineer\ngets temporary access token]
    B --> C{Access granted?}
    C -->|Yes| D[Deploy debug pod in calico-debug ns]
    C -->|No| E[Escalate to platform team]
    D --> F[Run diagnostics\nAll actions audited]
    F --> G[Collect diagnostic bundle]
    G --> H[Revoke access token]
    H --> I[Archive diagnostic bundle\nfor post-incident review]
```

## Conclusion

Securing eBPF troubleshooting access requires balancing operational needs (fast access during incidents) with security requirements (restricted, audited access). By creating a dedicated RBAC role for on-call engineers, using a dedicated namespace for debug pods with appropriate Pod Security settings, enabling audit logging for all exec operations, and using time-limited tokens for emergency access, you ensure troubleshooting is possible when needed but controlled and audited throughout.
