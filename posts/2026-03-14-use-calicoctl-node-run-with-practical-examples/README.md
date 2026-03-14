# Using calicoctl node run with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Node, Kubernetes, Container Networking

Description: A comprehensive guide to using calicoctl node run to start the Calico node process, covering configuration options, runtime flags, and real-world deployment scenarios.

---

## Introduction

The `calicoctl node run` command starts the Calico node service on a host, initializing the Felix agent and BIRD BGP daemon that together provide Calico's networking and network policy enforcement. While most modern Calico deployments use Kubernetes DaemonSets or the Tigera operator to manage Calico nodes, understanding `calicoctl node run` is valuable for non-orchestrated environments, debugging, and custom deployment scenarios.

This command is particularly relevant when deploying Calico on bare-metal hosts outside of Kubernetes, in Docker-only environments, or when you need fine-grained control over how the Calico node container starts. It handles pulling the Calico node image, configuring environment variables, and starting the container with the correct capabilities and mounts.

This guide provides practical examples of using `calicoctl node run` across different scenarios, with detailed explanations of the most important configuration options.

## Prerequisites

- A Linux host with Docker or containerd installed
- `calicoctl` v3.25+ installed on the host
- Network connectivity to an etcd cluster or Kubernetes API server
- Root or sudo access on the host
- An existing Calico datastore (etcd or Kubernetes API)

## Basic Usage

Start the Calico node with default settings:

```bash
# Start calico/node using Kubernetes datastore
sudo calicoctl node run

# Start with explicit etcd datastore
sudo ETCD_ENDPOINTS=https://10.0.1.5:2379 calicoctl node run
```

This pulls the `calico/node` image and starts it as a Docker container with the necessary privileges.

## Common Configuration Options

### Specifying the Node Image

```bash
# Use a specific Calico node image version
sudo calicoctl node run --node-image=calico/node:v3.27.0

# Use a private registry image
sudo calicoctl node run --node-image=registry.internal.company.com/calico/node:v3.27.0
```

### Setting the Node Name

```bash
# Override the auto-detected node name
sudo calicoctl node run --name=custom-node-01
```

By default, the node name is derived from the hostname. Override this when the hostname is not suitable as a Calico node identifier.

### Configuring IP Detection

```bash
# Auto-detect the node IP from a specific interface
sudo calicoctl node run --ip=autodetect --ip-autodetection-method=interface=eth0

# Use a specific IP address
sudo calicoctl node run --ip=10.0.1.10

# Auto-detect IPv6 address
sudo calicoctl node run --ip6=autodetect --ip6-autodetection-method=interface=eth0
```

### Configuring the AS Number for BGP

```bash
# Set a specific BGP AS number
sudo calicoctl node run --as=64512
```

## Deploying on Bare Metal with etcd

For non-Kubernetes bare-metal deployments:

```bash
#!/bin/bash
# deploy-calico-node-baremetal.sh

# Set etcd connection details
export ETCD_ENDPOINTS="https://10.0.1.5:2379,https://10.0.1.6:2379,https://10.0.1.7:2379"
export ETCD_KEY_FILE="/etc/calico/certs/key.pem"
export ETCD_CERT_FILE="/etc/calico/certs/cert.pem"
export ETCD_CA_CERT_FILE="/etc/calico/certs/ca.pem"

# Set node configuration
export CALICO_NODENAME=$(hostname)
export CALICO_IP="autodetect"
export CALICO_IP_AUTODETECTION_METHOD="interface=ens192"
export CALICO_AS="64512"

# Start the Calico node
sudo -E calicoctl node run \
  --node-image=calico/node:v3.27.0 \
  --name="$CALICO_NODENAME" \
  --ip="$CALICO_IP" \
  --ip-autodetection-method="$CALICO_IP_AUTODETECTION_METHOD" \
  --as="$CALICO_AS"

echo "Calico node started on $(hostname)"
```

## Running with VXLAN Encapsulation

When BGP is not available (e.g., in cloud environments without BGP support):

```bash
# Start with VXLAN backend
sudo calicoctl node run --node-image=calico/node:v3.27.0

# After starting, configure the IP pool for VXLAN
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-pool
spec:
  cidr: 192.168.0.0/16
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Running with Custom Log Levels

For debugging, increase the log verbosity:

```bash
# Set Felix log level via environment variable
sudo FELIX_LOGSEVERITYSCREEN=Debug calicoctl node run

# Or for BGP-specific debugging
sudo BGP_LOGSEVERITYSCREEN=Debug calicoctl node run
```

## Systemd Service Integration

For production bare-metal deployments, create a systemd service:

```ini
# /etc/systemd/system/calico-node.service
[Unit]
Description=Calico Node
After=docker.service
Requires=docker.service

[Service]
Type=simple
EnvironmentFile=/etc/calico/calico-node.env
ExecStartPre=-/usr/bin/docker rm -f calico-node
ExecStart=/usr/local/bin/calicoctl node run --init-system --name=${CALICO_NODENAME}
ExecStop=/usr/local/bin/calicoctl node stop
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

The environment file:

```bash
# /etc/calico/calico-node.env
DATASTORE_TYPE=etcdv3
ETCD_ENDPOINTS=https://10.0.1.5:2379
ETCD_KEY_FILE=/etc/calico/certs/key.pem
ETCD_CERT_FILE=/etc/calico/certs/cert.pem
ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
CALICO_NODENAME=worker-01
CALICO_IP=autodetect
CALICO_IP_AUTODETECTION_METHOD=interface=ens192
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable calico-node
sudo systemctl start calico-node
sudo systemctl status calico-node
```

## Verification

After running the node, verify it is operational:

```bash
# Check the node is running
sudo calicoctl node status

# Verify BGP peering
sudo calicoctl node status | grep "BGP"

# Check the node appears in the datastore
calicoctl get nodes -o wide

# Verify Felix is healthy
docker logs calico-node 2>&1 | grep "Felix" | tail -5
```

## Troubleshooting

- **Container fails to start**: Check Docker logs with `docker logs calico-node`. Common issues include missing capabilities or incorrect mounts.
- **IP auto-detection picks wrong interface**: Use `--ip-autodetection-method=interface=<name>` to specify the exact interface, or use `--ip=<address>` to set it explicitly.
- **BGP sessions not establishing**: Verify that the configured AS number matches your BGP peer configuration. Check that port 179 is accessible between nodes.
- **Cannot reach etcd**: Verify the ETCD_ENDPOINTS, certificate paths, and that the etcd cluster is accessible from this host.
- **Node name conflict**: If a node with the same name already exists in the datastore, either remove the old entry with `calicoctl delete node <name>` or use a different `--name`.

## Conclusion

While `calicoctl node run` is less commonly used in modern Kubernetes-centric deployments, it remains the essential tool for bare-metal Calico installations and non-orchestrated environments. Understanding its configuration options gives you the flexibility to deploy Calico in any environment and debug node startup issues when using the DaemonSet-based approach.
