# Troubleshooting Errors in calicoctl node run

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Node, Troubleshooting, Kubernetes, Docker

Description: Diagnose and resolve common errors encountered when starting the Calico node with calicoctl node run, from container runtime issues to networking configuration problems.

---

## Introduction

Starting a Calico node with `calicoctl node run` involves multiple components: the container runtime, network configuration, datastore connectivity, and the Calico processes themselves (Felix, BIRD, confd). When any of these components fail, the error messages can be cryptic and difficult to interpret without understanding the underlying architecture.

This guide covers the most common errors encountered during `calicoctl node run`, organized by the component that produces them. For each error, we explain the root cause and provide a step-by-step fix.

The majority of these issues occur in bare-metal and Docker-based deployments where the operator has direct control over the node startup process, but the troubleshooting principles also apply to Kubernetes DaemonSet deployments where the calico-node container fails to start.

## Prerequisites

- A Linux host where `calicoctl node run` has been attempted
- Root or sudo access
- Docker or containerd installed and running
- `calicoctl` binary installed
- Access to the Calico datastore

## Container Runtime Errors

### Error: Docker Not Running

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

```bash
# Check Docker status
sudo systemctl status docker

# Start Docker if stopped
sudo systemctl start docker

# Verify Docker is accessible
docker info

# Retry
sudo calicoctl node run
```

### Error: Image Pull Failed

```
Error response from daemon: manifest for calico/node:v3.27.0 not found
```

```bash
# Verify the image exists
docker pull calico/node:v3.27.0

# If using a private registry, authenticate first
docker login registry.internal.company.com
docker pull registry.internal.company.com/calico/node:v3.27.0

# Use the correct image reference
sudo calicoctl node run --node-image=registry.internal.company.com/calico/node:v3.27.0
```

### Error: Container Already Exists

```
Conflict: container name "/calico-node" already in use
```

```bash
# Stop and remove the existing container
docker stop calico-node
docker rm calico-node

# Retry
sudo calicoctl node run
```

## Datastore Connectivity Errors

### Error: Unable to Connect to etcd

```
Failed to connect to etcd cluster: dial tcp 10.0.1.5:2379: connect: connection refused
```

```bash
# Verify etcd is running and accessible
curl --cacert /etc/calico/certs/ca.pem \
     --cert /etc/calico/certs/cert.pem \
     --key /etc/calico/certs/key.pem \
     https://10.0.1.5:2379/health

# Check environment variables
echo "ETCD_ENDPOINTS=$ETCD_ENDPOINTS"
echo "ETCD_KEY_FILE=$ETCD_KEY_FILE"
echo "ETCD_CERT_FILE=$ETCD_CERT_FILE"
echo "ETCD_CA_CERT_FILE=$ETCD_CA_CERT_FILE"

# Verify certificates are readable
ls -la /etc/calico/certs/
```

### Error: Certificate Verification Failed

```
x509: certificate signed by unknown authority
```

```bash
# Verify the CA certificate matches the etcd server certificate
openssl verify -CAfile /etc/calico/certs/ca.pem /etc/calico/certs/cert.pem

# Check certificate expiration
openssl x509 -in /etc/calico/certs/cert.pem -noout -dates

# Ensure the CA cert file contains the correct CA
openssl x509 -in /etc/calico/certs/ca.pem -noout -subject
```

## Network Configuration Errors

### Error: IP Auto-Detection Failed

```
Unable to auto-detect IPv4 address: no valid host interfaces found
```

```bash
# List available network interfaces
ip addr show

# Specify the correct interface explicitly
sudo calicoctl node run --ip-autodetection-method=interface=eth0

# Or set a static IP
sudo calicoctl node run --ip=10.0.1.10
```

### Error: Conflicting IP Address

```
Node IP address conflict: 10.0.1.10 already assigned to another node
```

```bash
# Check existing node registrations
calicoctl get nodes -o wide

# If the old node entry is stale, delete it
calicoctl delete node old-node-name

# Retry with the correct node name
sudo calicoctl node run --name=unique-node-name --ip=10.0.1.10
```

### Error: BGP Port Already in Use

```
bind: address already in use (port 179)
```

```bash
# Check what is using port 179
sudo ss -tlnp | grep 179
sudo lsof -i :179

# If another BIRD instance is running, stop it
sudo systemctl stop bird
sudo systemctl disable bird

# Retry
sudo calicoctl node run
```

## Felix Startup Errors

These appear in the container logs after the container starts:

```bash
# View Felix logs
docker logs calico-node 2>&1 | grep -i "felix"
```

### Error: Felix Unable to Connect to Datastore

```
Felix is not ready: Failed to connect to datastore
```

```bash
# Check if the datastore configuration inside the container is correct
docker exec calico-node env | grep -E "(DATASTORE|ETCD|KUBE)"

# Verify from inside the container
docker exec calico-node calicoctl get nodes
```

### Error: Felix iptables Errors

```
Failed to execute iptables command: iptables v1.8.9: can't initialize iptables table 'filter'
```

```bash
# Ensure the container has NET_ADMIN capability
docker inspect calico-node | grep -A5 "CapAdd"

# Check host iptables
sudo iptables -L -n

# Load required kernel modules
sudo modprobe ip_tables
sudo modprobe iptable_filter
sudo modprobe iptable_nat
```

## Comprehensive Diagnostic Script

```bash
#!/bin/bash
# diagnose-node-run.sh
echo "=== Calico Node Run Diagnostics ==="

echo "--- Docker Status ---"
docker info > /dev/null 2>&1 && echo "Docker: OK" || echo "Docker: NOT RUNNING"

echo "--- Container Status ---"
docker ps -a --filter name=calico-node --format "Status: {{.Status}}"

echo "--- Network Interfaces ---"
ip -4 addr show | grep "inet " | awk '{print $NF, $2}'

echo "--- Port 179 (BGP) ---"
ss -tlnp | grep 179 || echo "Port 179: available"

echo "--- Kernel Modules ---"
for mod in ip_tables iptable_filter iptable_nat ip_set nf_conntrack; do
  lsmod | grep -q "$mod" && echo "$mod: loaded" || echo "$mod: NOT LOADED"
done

echo "--- Datastore Config ---"
echo "DATASTORE_TYPE=${DATASTORE_TYPE:-not set}"
echo "ETCD_ENDPOINTS=${ETCD_ENDPOINTS:-not set}"

echo "--- Container Logs (last 20 lines) ---"
docker logs calico-node --tail=20 2>&1
```

## Verification

After resolving errors and starting the node:

```bash
# Verify the container is running
docker ps --filter name=calico-node

# Check node status
sudo calicoctl node status

# Verify BGP peering
sudo calicoctl node status | grep -A5 "IPv4 BGP"

# Check the node in the datastore
calicoctl get node $(hostname) -o yaml
```

## Troubleshooting

| Error Category | Quick Check | Common Fix |
|---------------|-------------|------------|
| Container runtime | `docker info` | Start Docker, remove stale container |
| Image pull | `docker pull calico/node:v3.27.0` | Fix registry auth or tag |
| Datastore | `calicoctl get nodes` | Fix ETCD_ENDPOINTS or certs |
| Networking | `ip addr show` | Specify `--ip` or `--ip-autodetection-method` |
| Permissions | `docker inspect calico-node` | Run with `--privileged` or correct caps |

## Conclusion

Errors from `calicoctl node run` fall into predictable categories: container runtime issues, datastore connectivity, network configuration, and kernel/permission problems. Using the diagnostic script and systematic checking approach described here, you can quickly identify and resolve startup failures in any Calico node deployment.
