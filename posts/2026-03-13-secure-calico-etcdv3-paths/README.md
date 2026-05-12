# Secure Calico etcdv3 Paths

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, etcd, etcdv3, Security, Hardening

Description: Security best practices for protecting Calico etcdv3 path data, including access controls, encryption, and preventing unauthorized modification of network policy data.

---

## Introduction

Calico's etcdv3 paths contain the authoritative network policy configuration for your cluster. An attacker who can write to these paths can modify firewall rules, create new IP allocations for malicious workloads, or delete policies to remove security controls. Protecting this data is a critical aspect of Kubernetes cluster security.

Security for etcdv3 paths covers multiple layers: authentication (only authorized components can connect), authorization (each component can only access its required paths), encryption in transit (TLS), encryption at rest (etcd data encryption), and audit logging for all access events.

## Prerequisites

- etcd v3.x with RBAC and TLS configured
- Calico components using per-component credentials
- Understanding of the Calico etcdv3 path structure

## Security Layer 1: Limit Path Access via RBAC

Each Calico component should only be able to write to the paths it actually needs to modify:

| Component | Writable Paths | Read-Only Paths |
|-----------|---------------|-----------------|
| Felix | `/calico/felix/v1/` | `/calico/resources/v3/projectcalico.org/`, `/calico/ipam/v2/` |
| CNI | `/calico/ipam/v2/` | `/calico/resources/v3/projectcalico.org/` |
| API Server | `/calico/resources/v3/projectcalico.org/` (all) | - |

```bash
# Verify Felix cannot write to policy resources

etcdctl --cert=calico-felix.crt --key=calico-felix.key \
  put /calico/resources/v3/projectcalico.org/globalnetworkpolicies/test "value"
# Should fail: permission denied
```

## Security Layer 2: Encrypt etcd Data at Rest

Enable etcd encryption at rest to protect Calico policy data from physical storage attacks:

```bash
# Kubernetes API server encryption at rest for etcd data via kms or aescbc
# This is a kube-apiserver flag, not an etcd flag
kube-apiserver --encryption-provider-config=/etc/kubernetes/encryption.yaml
```

```yaml
# encryption.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-key>
      - identity: {}
```

## Security Layer 3: Protect Against Path Injection

```mermaid
graph TD
    A[Untrusted Input] -->|Path injection attempt| B{etcd RBAC}
    B -->|/calico/resources/v3/projectcalico.org/ allowed| C[Write Permitted]
    B -->|/registry/secrets/ denied| D[Permission Denied]
    C --> E[Input validation in Calico API]
    E -->|Valid resource| F[Written to etcd]
    E -->|Invalid/injection| G[Rejected]
```

Always interact with etcd through calicoctl or the Calico API server, which validates input before writing to etcd.

## Security Layer 4: Audit All Path Access

etcd does not have a native audit log feature. Capture access events by enabling structured logging and scraping the gRPC metrics that etcd exposes on `/metrics`:

```bash
# etcd structured logging (zap) to a file
etcd \
  --logger=zap \
  --log-outputs=/var/log/etcd/etcd.log \
  --log-level=info
```

Create a monitoring rule to alert on unauthorized access:

```yaml
- alert: EtcdUnauthorizedAccess
  expr: increase(grpc_server_handled_total{grpc_code="PermissionDenied"}[5m]) > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Unauthorized etcd access attempt detected (may affect Calico paths)"
```

## Security Layer 5: Restrict etcd Network Access

Combine etcd RBAC with network-level restrictions:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: restrict-etcd-network-access
spec:
  selector: "node-role == 'control-plane'"
  order: 1
  ingress:
    - action: Allow
      protocol: TCP
      destination:
        ports: [2379]
      source:
        selector: "has(node-role)"
    - action: Deny
      protocol: TCP
      destination:
        ports: [2379, 2380]
```

## Conclusion

Securing Calico etcdv3 paths requires defense in depth: RBAC to limit per-component access, encryption at rest for sensitive policy data, audit logging for all access events, network-level restrictions on etcd connectivity, and using Calico's API layer (calicoctl) to benefit from input validation before data reaches etcd. Together, these controls make it extremely difficult for an attacker to leverage etcd access to modify Calico's network security configuration.
