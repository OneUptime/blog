# How to Troubleshoot RKE2 Node Join Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rancher, Troubleshooting, Node Management

Description: A comprehensive guide to diagnosing and resolving common issues that prevent nodes from joining an RKE2 cluster.

## Introduction

One of the most frustrating problems when managing an RKE2 cluster is when a worker or server node fails to join. The failure can be silent or cryptic, and the root cause can range from network misconfiguration to token mismatches. This guide walks you through systematic troubleshooting steps to get your nodes connected.

## Prerequisites

- An existing RKE2 server node
- SSH access to both the server and the joining node
- Basic familiarity with systemd and Linux networking

## Step 1: Check the RKE2 Service Status

Start by checking the service status on the node that is failing to join. Use `rke2-agent` for a worker node and `rke2-server` for a server node.

```bash
# Check the status of a worker node
sudo systemctl status rke2-agent
sudo journalctl -u rke2-agent -n 100 --no-pager

# For a joining server node, check the server service instead
sudo systemctl status rke2-server
sudo journalctl -u rke2-server -n 100 --no-pager
```

Look for error messages such as:
- `failed to connect to server`
- `token mismatch`
- `certificate verification failed`
- `connection refused`

## Step 2: Verify the Token

The most common cause of join failures is a token mismatch. The token on the joining node must match the one on the server.

```bash
# On the SERVER node, retrieve the cluster token
sudo cat /var/lib/rancher/rke2/server/node-token

# On the JOINING node, check the configured token
sudo cat /etc/rancher/rke2/config.yaml
```

Your joining node's `config.yaml` should look like this:

```yaml
# /etc/rancher/rke2/config.yaml on the joining node
server: https://<SERVER_IP>:9345
token: <TOKEN_FROM_SERVER>
```

If the token is wrong, update `config.yaml` and restart the service:

```bash
# For a worker node
sudo systemctl restart rke2-agent

# For a server node
sudo systemctl restart rke2-server
```

## Step 3: Check Network Connectivity

RKE2 requires several ports to be accessible between nodes.

```bash
# Test connectivity to the server registration port (9345)
nc -zv <SERVER_IP> 9345

# Test connectivity to the Kubernetes API port (6443)
nc -zv <SERVER_IP> 6443

# Check if firewall rules are blocking traffic
sudo iptables -L -n | grep DROP
sudo firewall-cmd --list-all  # on Fedora/RHEL systems
```

Common inbound ports to check:

| Port | Protocol | Destination | Purpose |
|------|----------|-------------|---------|
| 9345 | TCP | RKE2 server nodes | RKE2 supervisor API |
| 6443 | TCP | RKE2 server nodes | Kubernetes API |
| 10250 | TCP | All RKE2 nodes | Kubelet metrics, if using metrics server |
| 2379 | TCP | RKE2 server nodes | etcd client traffic between server nodes |
| 2380 | TCP | RKE2 server nodes | etcd peer traffic between server nodes |
| 2381 | TCP | RKE2 server nodes | etcd metrics traffic between server nodes |
| 8472 | UDP | All RKE2 nodes | Canal or Cilium VXLAN traffic, if used |
| 4789 | UDP | All RKE2 nodes | Flannel or Calico VXLAN traffic, if used |
| 9099 | TCP | All RKE2 nodes | Canal or Calico health checks, if used |
| 4240 | TCP | All RKE2 nodes | Cilium TCP health checks, if used |

```bash
# Open the core server join ports with firewalld
sudo firewall-cmd --permanent --add-port=9345/tcp
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --reload
```

## Step 4: Verify DNS Resolution

The joining node must be able to resolve the server's hostname if you used a DNS name instead of an IP.

```bash
# Test DNS resolution
nslookup <SERVER_HOSTNAME>
dig <SERVER_HOSTNAME>

# If DNS fails, use the IP directly in config.yaml or add a hosts entry
echo "<SERVER_IP> <SERVER_HOSTNAME>" | sudo tee -a /etc/hosts
```

## Step 5: Check TLS and Certificate Issues

If you see certificate errors, the server URL or SAN configuration may be wrong.

```bash
# Verify TLS certificate SANs on the server
echo | openssl s_client -connect <SERVER_IP>:9345 2>/dev/null | openssl x509 -noout -text | grep -A 5 "Subject Alternative"
```

If the IP or hostname is not in the certificate SANs, add it to the server's `config.yaml`:

```yaml
# /etc/rancher/rke2/config.yaml on the SERVER node
tls-san:
  - <SERVER_IP>
  - <SERVER_HOSTNAME>
  - my-cluster.example.com
```

Then restart the server and re-join the agent.

## Step 6: Inspect the RKE2 Data Directory

Stale data from a previous installation can cause join failures.

```bash
# Clean up stale RKE2 data on the AGENT node
sudo systemctl stop rke2-agent
sudo rm -rf /var/lib/rancher/rke2/agent/
sudo systemctl start rke2-agent
```

## Step 7: Check System Requirements

Ensure the node meets minimum requirements.

```bash
# Check OS and kernel version
uname -r
cat /etc/os-release

# Check available memory (minimum 4GB, 8GB recommended)
free -h

# Check available disk space
df -h /var/lib/rancher
```

## Common Error Messages and Fixes

### Error: "failed to get CA certs"

This usually means the agent cannot reach the server's supervisor endpoint. Double-check the `server` URL in `config.yaml` and verify port 9345 is open.

### Error: "node password rejected"

The node previously registered with a different password, or a stale node password secret exists for that node name. Delete the stale node password secret, then restart the agent:

```bash
# On the affected agent node
sudo systemctl stop rke2-agent

# On a server node with access to the cluster kubeconfig
sudo /var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml \
    get secret -n kube-system | grep node-password.rke2
sudo /var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml \
    delete secret -n kube-system <NODE_NAME>.node-password.rke2

# On the affected agent node
sudo systemctl start rke2-agent
```

### Error: "x509: certificate signed by unknown authority"

RKE2 normally bootstraps trust from the CA hash in the secure join token. Re-copy the current token from the server and make sure the `server` URL points to the intended cluster:

```bash
# On the SERVER node, retrieve the current cluster token
sudo cat /var/lib/rancher/rke2/server/node-token

# On the AGENT node, update /etc/rancher/rke2/config.yaml with this token, then retry
sudo systemctl restart rke2-agent
```

## Conclusion

Troubleshooting RKE2 node join issues requires a methodical approach: verify the token, check network ports, inspect logs, and ensure the system meets requirements. The most common culprits are token mismatches and firewall rules blocking ports 9345 and 6443. By following the steps in this guide, you should be able to identify and resolve the issue quickly and get your nodes back online.
