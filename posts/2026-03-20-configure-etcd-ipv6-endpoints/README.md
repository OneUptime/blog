# How to Configure etcd with IPv6 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, etcd, Key-Value Store, Kubernetes, Distributed

Description: Learn how to configure etcd to listen on IPv6 addresses for client and peer communication, including single-node and cluster configurations with IPv6 endpoints.

## etcd IPv6 Configuration Flags

```bash
# Start node1 in a three-node cluster on a specific IPv6 address

etcd \
    --name node1 \
    --listen-client-urls http://[2001:db8::10]:2379,http://[::1]:2379 \
    --advertise-client-urls http://[2001:db8::10]:2379 \
    --listen-peer-urls http://[2001:db8::10]:2380 \
    --initial-advertise-peer-urls http://[2001:db8::10]:2380 \
    --initial-cluster "node1=http://[2001:db8::10]:2380,node2=http://[2001:db8::11]:2380,node3=http://[2001:db8::12]:2380" \
    --initial-cluster-state new
```

## etcd Configuration File

```yaml
# /etc/etcd/etcd.conf.yml

name: node1

# Client-facing addresses
listen-client-urls: "http://[2001:db8::10]:2379,http://[::1]:2379"
advertise-client-urls: "http://[2001:db8::10]:2379"

# Peer-to-peer addresses
listen-peer-urls: "http://[2001:db8::10]:2380"
initial-advertise-peer-urls: "http://[2001:db8::10]:2380"

# Cluster configuration
initial-cluster: "node1=http://[2001:db8::10]:2380,node2=http://[2001:db8::11]:2380,node3=http://[2001:db8::12]:2380"
initial-cluster-token: my-etcd-cluster
initial-cluster-state: new

# Data directory
data-dir: /var/lib/etcd
```

## TLS Configuration for IPv6 etcd

```yaml
# With TLS (recommended for production)
listen-client-urls: "https://[2001:db8::10]:2379"
advertise-client-urls: "https://[2001:db8::10]:2379"
listen-peer-urls: "https://[2001:db8::10]:2380"
initial-advertise-peer-urls: "https://[2001:db8::10]:2380"

# TLS certificates
# Certificates must include the IPv6 address in their SANs
cert-file: /etc/etcd/ssl/server.crt
key-file: /etc/etcd/ssl/server.key
client-cert-auth: true
trusted-ca-file: /etc/etcd/ssl/ca.crt
peer-cert-file: /etc/etcd/ssl/peer.crt
peer-key-file: /etc/etcd/ssl/peer.key
peer-client-cert-auth: true
peer-trusted-ca-file: /etc/etcd/ssl/ca.crt
```

## Connect etcdctl over IPv6

```bash
# Set endpoint for etcdctl
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS="http://[2001:db8::10]:2379"

# Basic operations
etcdctl put mykey myvalue
etcdctl get mykey

# Cluster health check
etcdctl endpoint health

# With TLS
etcdctl --endpoints=https://[2001:db8::10]:2379 \
    --cacert=/etc/etcd/ssl/ca.crt \
    --cert=/etc/etcd/ssl/client.crt \
    --key=/etc/etcd/ssl/client.key \
    endpoint health
```

## Kubernetes etcd with IPv6

```bash
# For Kubernetes clusters using IPv6 etcd:
# In /etc/kubernetes/manifests/etcd.yaml (static pod)
# The etcd pod configuration includes IPv6 listen URLs

# Check etcd is listening
ss -6 -tlnp | grep etcd

# Verify cluster member list
etcdctl member list --write-out=table
```

## Summary

Configure etcd for IPv6 with `--listen-client-urls http://[2001:db8::10]:2379` and `--advertise-client-urls http://[2001:db8::10]:2379`. For clusters, set `--initial-cluster` with all member IPv6 addresses in bracket notation. Use HTTPS URLs with TLS certificates and client/peer certificate authentication for production. Connect with `etcdctl --endpoints=http://[2001:db8::10]:2379`. etcd is commonly used in Kubernetes clusters; if Kubernetes components connect to etcd over IPv6, ensure the etcd URLs and TLS certificate SANs include the IPv6 addresses in use.
