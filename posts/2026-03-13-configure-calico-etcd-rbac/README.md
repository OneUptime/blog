# Configure Calico etcd RBAC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, etcd, RBAC, Security, Configuration

Description: A step-by-step guide to configuring etcd role-based access control for Calico to ensure each Calico component only has access to the etcd paths it requires.

---

## Introduction

When Calico is configured to use etcd as its datastore (rather than the Kubernetes API), each Calico component - calico/node, Felix, the CNI plugin, calico/kube-controllers, and calicoctl - reads and writes different subsets of the etcd key space. Granting all components the same broad access violates the principle of least privilege and increases the blast radius if any component is compromised.

etcd RBAC allows you to define roles that restrict which key prefixes each Calico component can access and with which permissions (read, write, or readwrite). This is particularly important in etcd clusters shared between Calico and the Kubernetes control plane, where Calico credentials should never be able to access Kubernetes secrets or other sensitive paths.

This guide walks through configuring etcd RBAC for Calico from scratch.

## Prerequisites

- etcd v3.x cluster with the root user and role created before authentication is enabled
- etcdctl configured with root credentials
- Calico configured to use etcd datastore
- TLS certificates for etcd client authentication

## Step 1: Enable etcd Authentication

Enable etcd authentication (which also enables RBAC):

```bash
etcdctl --endpoints=https://etcd:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/admin.crt \
  --key=/etc/etcd/admin.key \
  auth enable
```

## Step 2: Create etcd Roles for Calico Components

```mermaid
graph TD
    A[etcd RBAC] --> B[calico-felix role]
    A --> C[calico-cni role]
    A --> D[calico-admin role]
    A --> E[calico-controller role]
    B --> F[/calico/felix/v*, /calico/resources/v3/projectcalico.org/*]
    C --> G[/calico/ipam/v2/*, workloadendpoints, ippools, nodes]
    D --> H[/calico/* - read/write]
    E --> I[/calico/ipam/v2/*, policies, nodes, hostendpoints]
```

Create the calico/node role, which covers Felix running inside calico/node:

```bash
etcdctl role add calico-node
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/felix/v1/
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/felix/v2/
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/ipam/v2/
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/resources/v3/projectcalico.org/felixconfigurations/
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/resources/v3/projectcalico.org/nodes/
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/resources/v3/projectcalico.org/workloadendpoints/
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/resources/v3/projectcalico.org/clusterinformations/
etcdctl role grant-permission calico-node --prefix=true readwrite /calico/resources/v3/projectcalico.org/ippools/
etcdctl role grant-permission calico-node --prefix=true read /calico/resources/v3/projectcalico.org/
```

Create the CNI plugin role:

```bash
etcdctl role add calico-cni
etcdctl role grant-permission calico-cni --prefix=true readwrite /calico/ipam/v2/
etcdctl role grant-permission calico-cni --prefix=true readwrite /calico/resources/v3/projectcalico.org/workloadendpoints/
etcdctl role grant-permission calico-cni --prefix=true read /calico/resources/v3/projectcalico.org/ippools/
etcdctl role grant-permission calico-cni --prefix=true read /calico/resources/v3/projectcalico.org/clusterinformations/
etcdctl role grant-permission calico-cni --prefix=true read /calico/resources/v3/projectcalico.org/nodes/
```

Create the calico/kube-controllers role:

```bash
etcdctl role add calico-kube-controllers
etcdctl role grant-permission calico-kube-controllers --prefix=true readwrite /calico/ipam/v2/
etcdctl role grant-permission calico-kube-controllers --prefix=true readwrite /calico/resources/v3/projectcalico.org/profiles/
etcdctl role grant-permission calico-kube-controllers --prefix=true readwrite /calico/resources/v3/projectcalico.org/networkpolicies/
etcdctl role grant-permission calico-kube-controllers --prefix=true readwrite /calico/resources/v3/projectcalico.org/nodes/
etcdctl role grant-permission calico-kube-controllers --prefix=true readwrite /calico/resources/v3/projectcalico.org/clusterinformations/
etcdctl role grant-permission calico-kube-controllers --prefix=true readwrite /calico/resources/v3/projectcalico.org/hostendpoints/
etcdctl role grant-permission calico-kube-controllers --prefix=true readwrite /calico/resources/v3/projectcalico.org/kubecontrollersconfigurations/
etcdctl role grant-permission calico-kube-controllers --prefix=true read /calico/resources/v3/projectcalico.org/
```

Create the full admin role for calicoctl:

```bash
etcdctl role add calico-admin
etcdctl role grant-permission calico-admin --prefix=true readwrite /calico/
```

## Step 3: Create Users and Assign Roles

```bash
# Create users with passwords. For certificate auth, make each certificate CN
# match the etcd username.

etcdctl user add calico-node --new-user-password="$(openssl rand -base64 32)"
etcdctl user add calico-cni --new-user-password="$(openssl rand -base64 32)"
etcdctl user add calico-kube-controllers --new-user-password="$(openssl rand -base64 32)"
etcdctl user add calico-admin --new-user-password="$(openssl rand -base64 32)"

# Assign roles
etcdctl user grant-role calico-node calico-node
etcdctl user grant-role calico-cni calico-cni
etcdctl user grant-role calico-kube-controllers calico-kube-controllers
etcdctl user grant-role calico-admin calico-admin
```

## Step 4: Configure Calico Components to Use Credentials

Update the Calico secret in Kubernetes:

```bash
kubectl create secret generic calico-etcd-secrets \
  -n kube-system \
  --from-file=etcd-key=/etc/calico/etcd/node.key \
  --from-file=etcd-cert=/etc/calico/etcd/node.crt \
  --from-file=etcd-ca=/etc/etcd/ca.crt
```

## Conclusion

Configuring etcd RBAC for Calico enforces least-privilege access across Calico components, ensuring that a compromised CNI plugin or Felix agent cannot access etcd paths outside their operational scope. This is a foundational security control for any Calico deployment using etcd as its datastore.
