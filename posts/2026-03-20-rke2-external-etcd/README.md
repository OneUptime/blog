# How to Configure RKE2 with External etcd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, etcd, External etcd, Database, Rancher

Description: Learn how to configure RKE2 to use an external etcd cluster instead of the embedded etcd for dedicated, high-performance control plane storage.

By default, RKE2 uses an embedded etcd cluster that runs on server nodes. For organizations requiring dedicated etcd management, custom backup strategies, or separation of concerns between the control plane and data store, RKE2 supports connecting to an external etcd cluster. This guide covers the complete setup of RKE2 with an external etcd.

## Prerequisites

- An operational external etcd cluster (3 nodes recommended for HA)
- etcd v3.4.0 or later
- TLS certificates for etcd client authentication
- Linux nodes for RKE2 server installation

## Step 1: Set Up an External etcd Cluster

```bash
# Install etcd on each etcd node (e.g., 3 dedicated etcd nodes)

# On each etcd node:

ETCD_VERSION="v3.5.9"
DOWNLOAD_URL="https://github.com/etcd-io/etcd/releases/download"

# Download etcd
curl -LO ${DOWNLOAD_URL}/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz
tar xzf etcd-${ETCD_VERSION}-linux-amd64.tar.gz

# Install binaries
sudo mv etcd-${ETCD_VERSION}-linux-amd64/etcd /usr/local/bin/
sudo mv etcd-${ETCD_VERSION}-linux-amd64/etcdctl /usr/local/bin/

# Verify installation
etcd --version
etcdctl version
```

## Step 2: Generate TLS Certificates for etcd

```bash
# Use cfssl to generate certificates
sudo apt-get install -y golang-cfssl  # Ubuntu
# or
# Download from: https://github.com/cloudflare/cfssl/releases

# Create CA configuration
cat > ca-config.json <<EOF
{
  "signing": {
    "default": {
      "expiry": "8760h"
    },
    "profiles": {
      "kubernetes": {
        "usages": ["signing", "key encipherment", "server auth", "client auth"],
        "expiry": "8760h"
      }
    }
  }
}
EOF

# Create CA certificate
cat > ca-csr.json <<EOF
{
  "CN": "etcd-ca",
  "key": {"algo": "rsa", "size": 2048},
  "names": [{"C": "US", "O": "etcd", "OU": "etcd CA"}]
}
EOF

cfssl gencert -initca ca-csr.json | cfssljson -bare ca

# Create server certificate (for each etcd node)
cat > etcd-server-csr.json <<EOF
{
  "CN": "etcd-server",
  "hosts": [
    "127.0.0.1",
    "10.0.1.1",
    "10.0.1.2",
    "10.0.1.3",
    "etcd1.example.com",
    "etcd2.example.com",
    "etcd3.example.com"
  ],
  "key": {"algo": "rsa", "size": 2048}
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem \
  -config=ca-config.json -profile=kubernetes \
  etcd-server-csr.json | cfssljson -bare etcd-server

# Create client certificate (for RKE2)
cat > etcd-client-csr.json <<EOF
{
  "CN": "etcd-client",
  "key": {"algo": "rsa", "size": 2048}
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem \
  -config=ca-config.json -profile=kubernetes \
  etcd-client-csr.json | cfssljson -bare etcd-client

echo "Certificates generated:"
ls -la *.pem
```

## Step 3: Configure External etcd

```bash
# Create etcd configuration on each etcd node
# Replace variables with actual values for each node

ETCD_NODE_NAME="etcd1"
ETCD_NODE_IP="10.0.1.1"

sudo mkdir -p /etc/etcd/pki
sudo cp ca.pem etcd-server.pem etcd-server-key.pem etcd-client.pem etcd-client-key.pem /etc/etcd/pki/

cat <<EOF | sudo tee /etc/etcd/etcd.conf.yaml
name: "${ETCD_NODE_NAME}"
data-dir: /var/lib/etcd

# Cluster configuration
initial-cluster: "etcd1=https://10.0.1.1:2380,etcd2=https://10.0.1.2:2380,etcd3=https://10.0.1.3:2380"
initial-cluster-state: new
initial-cluster-token: rke2-etcd-cluster-1

# Communication
listen-peer-urls: "https://${ETCD_NODE_IP}:2380"
initial-advertise-peer-urls: "https://${ETCD_NODE_IP}:2380"
listen-client-urls: "https://127.0.0.1:2379,https://${ETCD_NODE_IP}:2379"
advertise-client-urls: "https://${ETCD_NODE_IP}:2379"

# TLS configuration for peer communication
peer-cert-file: /etc/etcd/pki/etcd-server.pem
peer-key-file: /etc/etcd/pki/etcd-server-key.pem
peer-trusted-ca-file: /etc/etcd/pki/ca.pem
peer-client-cert-auth: true

# TLS configuration for client communication
cert-file: /etc/etcd/pki/etcd-server.pem
key-file: /etc/etcd/pki/etcd-server-key.pem
trusted-ca-file: /etc/etcd/pki/ca.pem
client-cert-auth: true
EOF

# Create systemd service for etcd
cat <<EOF | sudo tee /etc/systemd/system/etcd.service
[Unit]
Description=etcd
Documentation=https://github.com/etcd-io/etcd

[Service]
Type=notify
ExecStart=/usr/local/bin/etcd --config-file=/etc/etcd/etcd.conf.yaml
Restart=always
RestartSec=10s
LimitNOFILE=40000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now etcd

# Verify etcd cluster health
etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/etcd/pki/ca.pem \
  --cert=/etc/etcd/pki/etcd-client.pem \
  --key=/etc/etcd/pki/etcd-client-key.pem \
  member list

etcdctl --endpoints=https://10.0.1.1:2379,https://10.0.1.2:2379,https://10.0.1.3:2379 \
  --cacert=/etc/etcd/pki/ca.pem \
  --cert=/etc/etcd/pki/etcd-client.pem \
  --key=/etc/etcd/pki/etcd-client-key.pem \
  endpoint health
```

## Step 4: Configure RKE2 to Use External etcd

```bash
# Copy etcd client certificates to RKE2 server nodes
sudo mkdir -p /etc/rancher/rke2/pki/
sudo cp ca.pem /etc/rancher/rke2/pki/etcd-ca.crt
sudo cp etcd-client.pem /etc/rancher/rke2/pki/etcd-client.crt
sudo cp etcd-client-key.pem /etc/rancher/rke2/pki/etcd-client.key

# Configure RKE2 to use external etcd
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# External etcd configuration
datastore-endpoint: https://10.0.1.1:2379,https://10.0.1.2:2379,https://10.0.1.3:2379
datastore-cafile: /etc/rancher/rke2/pki/etcd-ca.crt
datastore-certfile: /etc/rancher/rke2/pki/etcd-client.crt
datastore-keyfile: /etc/rancher/rke2/pki/etcd-client.key

# TLS SANs
tls-san:
  - "k8s.example.com"
  - "10.0.0.10"

write-kubeconfig-mode: "0644"
EOF

# Start RKE2
sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Verify RKE2 is using external etcd
sudo journalctl -u rke2-server | grep etcd
```

## Conclusion

Configuring RKE2 with an external etcd cluster provides dedicated, independently managed storage for your Kubernetes cluster state. This setup is particularly valuable for large clusters with many objects, environments requiring independent etcd scaling, or organizations with specialized etcd operations teams. While more complex to set up than the embedded etcd, external etcd provides greater flexibility for backup, recovery, and performance tuning of the cluster's most critical component.
