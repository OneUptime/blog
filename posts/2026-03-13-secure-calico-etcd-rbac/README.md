# Secure Calico etcd RBAC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, etcd, RBAC, Security, Hardening

Description: Best practices for hardening Calico etcd RBAC configurations to protect the etcd datastore from unauthorized access and prevent lateral movement through the Calico data plane.

---

## Introduction

etcd is the most sensitive component in a Kubernetes cluster — it holds all cluster state including secrets, configurations, and Calico network policy. When Calico uses etcd as its datastore, each Calico component has credentials that can access portions of the etcd keyspace. Hardening these credentials and the RBAC configuration that governs them is a critical security control.

An attacker who compromises a Calico component and obtains its etcd credentials could modify network policies to open firewall rules, create new IPAM allocations to facilitate network attacks, or access other portions of etcd if permissions are too broad. This guide covers hardening the Calico etcd RBAC configuration against these threats.

## Prerequisites

- etcd v3.x with RBAC and TLS enabled
- Calico components using separate per-component credentials
- A security-conscious approach to certificate management

## Hardening Practice 1: Use Certificate-Based Auth Over Passwords

Certificate authentication is stronger than passwords and integrates with your PKI:

```bash
# Create a dedicated CA for Calico etcd clients
openssl genrsa -out calico-etcd-ca.key 4096
openssl req -x509 -new -key calico-etcd-ca.key \
  -out calico-etcd-ca.crt -days 3650 \
  -subj "/CN=calico-etcd-ca"

# Generate Felix client certificate
openssl genrsa -out felix-etcd.key 2048
openssl req -new -key felix-etcd.key \
  -out felix-etcd.csr \
  -subj "/CN=calico-felix"
openssl x509 -req -in felix-etcd.csr \
  -CA calico-etcd-ca.crt -CAkey calico-etcd-ca.key \
  -out felix-etcd.crt -days 365 -CAcreateserial
```

## Hardening Practice 2: Minimize Path Permissions

Review and minimize permissions beyond defaults:

```mermaid
graph TD
    A[calico-felix role] --> B[/calico/v1/host/ - readwrite]
    A --> C[/calico/v1/policy/ - READ ONLY]
    A --> D[/calico/v1/config/ - READ ONLY]
    A --> E[/calico/felix/v1/ - readwrite]
    F[calico-cni role] --> G[/calico/v1/ipam/ - readwrite]
    F --> H[/calico/v1/host/ - readwrite]
    F --> I[/calico/v1/config/ - READ ONLY]
```

Regularly audit permissions with:

```bash
etcdctl ... role get calico-felix
etcdctl ... role get calico-cni
```

## Hardening Practice 3: Short Certificate Lifetimes with Auto-Rotation

Use cert-manager or a custom script to rotate Calico etcd client certificates before expiry:

```yaml
# cert-manager Certificate for Felix etcd auth
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: calico-felix-etcd
  namespace: kube-system
spec:
  secretName: calico-felix-etcd-certs
  duration: 720h   # 30 days
  renewBefore: 168h  # Renew 7 days before expiry
  issuerRef:
    name: calico-etcd-issuer
    kind: ClusterIssuer
  subject:
    organizations: ["calico"]
  commonName: calico-felix
```

## Hardening Practice 4: Isolate Calico etcd on Separate Cluster

For the highest security, run Calico's etcd on a separate cluster from the Kubernetes etcd:

```bash
# Calico etcd endpoints in calico-config
kubectl get configmap calico-config -n kube-system -o yaml | grep etcd_endpoints
# Should point to dedicated Calico etcd, not the Kubernetes etcd
```

## Hardening Practice 5: Network-Level Restriction

Restrict etcd access at the network level using iptables or host endpoint policies:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: restrict-etcd-access
spec:
  selector: "node-role == 'control-plane'"
  order: 1
  ingress:
    - action: Allow
      protocol: TCP
      destination:
        ports: [2379, 2380]
      source:
        selector: "has(node-role)"
    - action: Deny
      protocol: TCP
      destination:
        ports: [2379, 2380]
```

## Conclusion

Securing Calico etcd RBAC requires certificate-based authentication with short-lived credentials, minimal path permissions scoped to each component's actual needs, network-level restrictions on etcd access, and ideally an isolated etcd cluster for Calico. These controls together ensure that a compromised Calico component cannot leverage its etcd access to escalate privileges or modify other components' data.
