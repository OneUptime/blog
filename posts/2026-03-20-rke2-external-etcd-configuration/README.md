# How to Configure RKE2 with External etcd - Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, etcd, External Database, Kubernetes, High Availability, SUSE Rancher, Cluster Storage

Description: Learn how to configure RKE2 to use an external etcd cluster instead of the embedded etcd, giving you independent scaling and management of the control plane datastore.

---

While RKE2's embedded etcd is sufficient for most deployments, using an external etcd cluster gives you independent control over the datastore - useful for large clusters or when you need to manage etcd backups separately from the Kubernetes cluster.

---

## Prerequisites

- A running etcd cluster (3 or 5 nodes for HA)
- TLS certificates for client authentication
- etcd nodes reachable from all RKE2 server nodes

---

## Step 1: Set Up the External etcd Cluster

Install and configure etcd on dedicated nodes:

```bash
# Install etcd

ETCD_VERSION="v3.6.10"
wget https://github.com/etcd-io/etcd/releases/download/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz
tar xzf etcd-${ETCD_VERSION}-linux-amd64.tar.gz
cp etcd-${ETCD_VERSION}-linux-amd64/etcd* /usr/local/bin/
```

Create a minimal etcd configuration:

```yaml
# /etc/etcd/etcd.conf.yaml
name: etcd-1
data-dir: /var/lib/etcd

# Peer communication
initial-advertise-peer-urls: https://192.168.1.21:2380
listen-peer-urls: https://192.168.1.21:2380

# Client communication
advertise-client-urls: https://192.168.1.21:2379
listen-client-urls: https://192.168.1.21:2379,https://127.0.0.1:2379

# Initial cluster configuration
initial-cluster: "etcd-1=https://192.168.1.21:2380,etcd-2=https://192.168.1.22:2380,etcd-3=https://192.168.1.23:2380"
initial-cluster-state: new
initial-cluster-token: etcd-cluster-1

# TLS configuration
cert-file: /etc/etcd/tls/server.crt
key-file: /etc/etcd/tls/server.key
trusted-ca-file: /etc/etcd/tls/ca.crt
client-cert-auth: true
peer-cert-file: /etc/etcd/tls/peer.crt
peer-key-file: /etc/etcd/tls/peer.key
peer-trusted-ca-file: /etc/etcd/tls/ca.crt
peer-client-cert-auth: true
```

---

## Step 2: Generate etcd Client Certificates for RKE2

RKE2 needs client certificates to authenticate with the external etcd:

```bash
# Using cfssl to generate certificates
cat > client-csr.json <<EOF
{
  "CN": "rke2-kube-apiserver",
  "key": {"algo": "rsa", "size": 2048},
  "names": [{"O": "system:masters"}]
}
EOF

cfssl gencert \
  -ca=ca.pem \
  -ca-key=ca-key.pem \
  -config=ca-config.json \
  -profile=client \
  client-csr.json | cfssljson -bare rke2-client
```

Copy the certificates to each RKE2 server node:

```bash
# Place certificates in a location RKE2 can read
mkdir -p /etc/rancher/rke2/tls/etcd
cp ca.pem /etc/rancher/rke2/tls/etcd/ca.crt
cp rke2-client.pem /etc/rancher/rke2/tls/etcd/client.crt
cp rke2-client-key.pem /etc/rancher/rke2/tls/etcd/client.key
```

---

## Step 3: Configure RKE2 to Use External etcd

```yaml
# /etc/rancher/rke2/config.yaml

token: my-cluster-token
tls-san:
  - "rke2.example.com"

# External etcd endpoints
datastore-endpoint: "https://192.168.1.21:2379,https://192.168.1.22:2379,https://192.168.1.23:2379"

# Client certificates for etcd authentication
datastore-cafile: /etc/rancher/rke2/tls/etcd/ca.crt
datastore-certfile: /etc/rancher/rke2/tls/etcd/client.crt
datastore-keyfile: /etc/rancher/rke2/tls/etcd/client.key
```

---

## Step 4: Start RKE2 and Verify

```bash
systemctl enable --now rke2-server.service

# Check that kube-apiserver connected to etcd
journalctl -u rke2-server | grep etcd

# Verify cluster is healthy
kubectl get nodes
kubectl get --raw='/readyz?verbose'
```

---

## Best Practices

- Run the external etcd cluster on **dedicated nodes** with SSDs for low-latency writes.
- Back up the external etcd cluster **independently** using `etcdctl snapshot save`.
- Monitor etcd latency - values above 10ms consistently indicate storage or network issues.
- Set `--quota-backend-bytes` on etcd to 8GB for large clusters (default is 2GB).
