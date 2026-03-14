# Configure Calico etcd RBAC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Etcd, RBAC, Security, Configuration

Description: A step-by-step guide to configuring etcd role-based access control for Calico to ensure each Calico component only has access to the etcd paths it requires.

---

## Introduction

When Calico is configured to use etcd as its datastore (rather than the Kubernetes API), each Calico component - Felix, the CNI plugin, calicoctl, and the Calico API server - reads and writes different subsets of the etcd key space. Granting all components the same broad access violates the principle of least privilege and increases the blast radius if any component is compromised.

etcd RBAC allows you to define roles that restrict which key prefixes each Calico component can access and with which verbs (read, write, delete). This is particularly important in etcd clusters shared between Calico and the Kubernetes control plane, where Calico credentials should never be able to access Kubernetes secrets or other sensitive paths.

This guide walks through configuring etcd RBAC for Calico from scratch.

## Prerequisites

- etcd v3.x cluster with RBAC enabled
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
    A --> D[calico-apiserver role]
    A --> E[calico-controller role]
    B --> F[/calico/v1/host/*, /calico/v1/policy/* - read/write]
    C --> G[/calico/v1/ipam/*, /calico/v1/config/* - read/write]
    D --> H[/calico/v1/* - read/write]
    E --> I[/calico/v1/* - read/write]
```

Create the Felix role:

```bash
etcdctl role add calico-felix
etcdctl role grant-permission calico-felix --prefix=true readwrite /calico/v1/host/
etcdctl role grant-permission calico-felix --prefix=true read /calico/v1/policy/
etcdctl role grant-permission calico-felix --prefix=true read /calico/v1/config/
etcdctl role grant-permission calico-felix --prefix=true readwrite /calico/felix/v1/
```

Create the CNI plugin role:

```bash
etcdctl role add calico-cni
etcdctl role grant-permission calico-cni --prefix=true readwrite /calico/v1/ipam/
etcdctl role grant-permission calico-cni --prefix=true readwrite /calico/v1/host/
etcdctl role grant-permission calico-cni --prefix=true read /calico/v1/config/
etcdctl role grant-permission calico-cni --prefix=true read /calico/v1/policy/
```

Create the full admin role for calicoctl and the API server:

```bash
etcdctl role add calico-admin
etcdctl role grant-permission calico-admin --prefix=true readwrite /calico/
```

## Step 3: Create Users and Assign Roles

```bash
# Create users with passwords (certificate auth is preferred - see cert guide)
etcdctl user add calico-felix --new-user-password="$(openssl rand -base64 32)"
etcdctl user add calico-cni --new-user-password="$(openssl rand -base64 32)"
etcdctl user add calico-admin --new-user-password="$(openssl rand -base64 32)"

# Assign roles
etcdctl user grant-role calico-felix calico-felix
etcdctl user grant-role calico-cni calico-cni
etcdctl user grant-role calico-admin calico-admin
```

## Step 4: Configure Calico Components to Use Credentials

Update the Calico secret in Kubernetes:

```bash
kubectl create secret generic calico-etcd-secrets \
  -n kube-system \
  --from-literal=etcd-key="$(cat /etc/calico/etcd/felix.key | base64 -w0)" \
  --from-literal=etcd-cert="$(cat /etc/calico/etcd/felix.crt | base64 -w0)" \
  --from-literal=etcd-ca="$(cat /etc/etcd/ca.crt | base64 -w0)"
```

## Conclusion

Configuring etcd RBAC for Calico enforces least-privilege access across Calico components, ensuring that a compromised CNI plugin or Felix agent cannot access etcd paths outside their operational scope. This is a foundational security control for any Calico deployment using etcd as its datastore.
