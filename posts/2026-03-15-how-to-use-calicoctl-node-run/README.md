# How to Use calicoctl node run with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Kubernetes, Networking, Node Management, DevOps

Description: Learn how to use calicoctl node run to start the Calico node process for non-Kubernetes deployments and custom configurations.

---

## Introduction

The `calicoctl node run` command starts the Calico node services (Felix and BIRD) on a host. This command is primarily used in non-orchestrated or standalone Calico deployments where Calico is not managed by a Kubernetes operator or DaemonSet. It launches the `calico/node` container with the appropriate configuration for the host.

In Kubernetes environments, Calico nodes are typically managed by the Tigera operator or a DaemonSet, and `calicoctl node run` is not commonly needed. However, it remains useful for bare-metal deployments, development environments, and scenarios where you need direct control over the Calico node lifecycle.

This guide covers practical examples of using `calicoctl node run` with various configuration options.

## Prerequisites

- A Linux host with Docker or containerd installed
- `calicoctl` CLI installed on the host
- Network connectivity to an etcd cluster or Kubernetes API
- Root or sudo access on the host
- Understanding of Calico node components (Felix, BIRD)

## Basic Node Run

Start a Calico node with default settings:

```bash
sudo calicoctl node run
```

This starts the `calico/node` container with default configuration, connecting to the datastore specified by environment variables.

## Specifying the Datastore

### Using etcd as the Datastore

```bash
sudo calicoctl node run \
  --backend=bird \
  --dryrun=false \
  --log-dir=/var/log/calico \
  --node-image=calico/node:v3.27.0
```

Set the etcd endpoints via environment variable before running:

```bash
export ETCD_ENDPOINTS=https://etcd1:2379,https://etcd2:2379
export ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
export ETCD_CERT_FILE=/etc/calico/certs/cert.pem
export ETCD_KEY_FILE=/etc/calico/certs/key.pem
```

### Using Kubernetes as the Datastore

```bash
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/etc/kubernetes/admin.conf

sudo -E calicoctl node run \
  --node-image=calico/node:v3.27.0
```

## Common Options

### Specify the Node Image

Use a specific Calico node image version or alternate registry:

```bash
sudo calicoctl node run \
  --node-image=registry.internal.example.com/calico/node:v3.27.0
```

### Set the Node Name

Override the automatically detected hostname:

```bash
sudo calicoctl node run \
  --name=worker-node-01
```

### Configure the IP Address

Specify the node IP address for BGP peering:

```bash
sudo calicoctl node run \
  --ip=192.168.1.10
```

### Enable IP-in-IP Encapsulation

```bash
sudo calicoctl node run \
  --ip=192.168.1.10 \
  --backend=bird
```

### Set the AS Number

```bash
sudo calicoctl node run \
  --as=64512 \
  --ip=192.168.1.10
```

## Dry Run Mode

Preview what `calicoctl node run` would do without actually starting the node:

```bash
sudo calicoctl node run \
  --node-image=calico/node:v3.27.0 \
  --ip=192.168.1.10 \
  --dryrun
```

This outputs the Docker or container runtime command that would be executed, allowing you to review and customize it.

## Setting the Log Directory

Direct Calico node logs to a specific directory:

```bash
sudo calicoctl node run \
  --log-dir=/var/log/calico
```

## Running with Init System Integration

### Systemd Service

Create a systemd unit that uses `calicoctl node run`:

```ini
[Unit]
Description=Calico Node
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/calicoctl node run --node-image=calico/node:v3.27.0 --ip=autodetect
ExecStop=/usr/bin/docker stop calico-node
Restart=on-failure
RestartSec=10
Environment=DATASTORE_TYPE=etcdv3
Environment=ETCD_ENDPOINTS=https://etcd:2379

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable calico-node
sudo systemctl start calico-node
```

## Verification

After starting the node, verify it is running correctly:

```bash
# Check node status
sudo calicoctl node status

# Verify the container is running
docker ps | grep calico

# Check Felix logs
sudo journalctl -u calico-node -f

# Verify the node appears in the datastore
calicoctl get nodes
```

## Troubleshooting

- **Container fails to start**: Check Docker or containerd is running. Verify the image name and tag are correct and accessible.
- **Datastore connection failures**: Ensure the etcd or Kubernetes API endpoint is reachable. Check certificate paths for TLS connections.
- **BGP session not establishing**: Verify the IP address and AS number are correct. Check that the BGP port (179) is not firewalled.
- **Node not appearing in datastore**: Check the node name. If using auto-detection, verify the hostname is resolvable and unique.

## Conclusion

The `calicoctl node run` command provides direct control over Calico node lifecycle for environments where operator-managed or DaemonSet-based deployments are not suitable. While most Kubernetes environments will not need this command, it remains valuable for bare-metal deployments, edge computing scenarios, and development setups. The dry run mode is particularly useful for understanding and customizing the container configuration before launching.
