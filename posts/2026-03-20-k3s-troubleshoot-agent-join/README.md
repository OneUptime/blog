# How to Troubleshoot K3s Agent Join Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Troubleshooting, Networking, DevOps

Description: A comprehensive troubleshooting guide for diagnosing and fixing issues when K3s agent nodes fail to join the cluster.

## Introduction

K3s agent join failures are common and can stem from network connectivity issues, authentication failures, firewall rules, time synchronization problems, or configuration mismatches. This guide provides a systematic approach to diagnosing why an agent node is not joining the cluster and how to resolve each type of issue.

## Step 1: Check Agent Service Status and Logs

Always start with the service logs:

```bash
# On the agent node, check service status

systemctl status k3s-agent

# View recent logs
journalctl -u k3s-agent -n 100 --no-pager

# Follow live logs to catch errors during join attempt
journalctl -u k3s-agent -f

# Run agent in foreground for verbose output
systemctl stop k3s-agent
k3s agent --debug \
  --server https://<server-ip>:6443 \
  --token <node-token> \
  2>&1 | tee /tmp/k3s-agent-debug.log
```

## Step 2: Verify Network Connectivity

The agent must be able to reach the server:

```bash
# Test basic TCP connectivity to the API server
curl -k https://<server-ip>:6443/readyz
# Expected: HTTP 200 and body "ok"

# Test with verbose output
curl -vk https://<server-ip>:6443/readyz

# Check if DNS resolution works
nslookup <server-hostname>
dig <server-hostname>

# Ping the server
ping -c 4 <server-ip>

# Trace the route
traceroute <server-ip>

# Test specific ports
nc -zv <server-ip> 6443      # API server
nc -zvu <server-ip> 8472     # Flannel VXLAN (UDP)
nc -zvu <server-ip> 51820    # WireGuard (if enabled, IPv4)
nc -zvu <server-ip> 51821    # WireGuard (if enabled, IPv6)
```

## Step 3: Check Firewall Rules

Firewall blocks are one of the most common causes of join failures:

```bash
# On the AGENT node, check outbound rules
# For UFW
ufw status

# For firewalld
firewall-cmd --list-all

# Test if the agent can reach the server port
# (on the agent node)
telnet <server-ip> 6443

# On the SERVER node, check inbound rules
# Required inbound ports depend on the cluster networking mode:
# 6443 - Kubernetes API
# 2379-2380 - etcd (HA mode)
# 8472/UDP - Flannel VXLAN between all nodes
# 51820/UDP - Flannel WireGuard between all nodes (IPv4)
# 51821/UDP - Flannel WireGuard between all nodes (IPv6)
# 10250 - Kubelet API/metrics between all nodes if metrics-server is used

# Open required ports on server (UFW)
ufw allow from <agent-ip> to any port 6443 proto tcp
# if using Flannel VXLAN:
ufw allow from <peer-node-subnet> to any port 8472 proto udp
# if using WireGuard-native instead of VXLAN:
ufw allow from <peer-node-subnet> to any port 51820 proto udp
# if metrics-server is used:
ufw allow from <peer-node-subnet> to any port 10250 proto tcp

# Open required ports on server (firewalld)
firewall-cmd --permanent --add-port=6443/tcp
# if using Flannel VXLAN:
firewall-cmd --permanent --add-port=8472/udp
# if using WireGuard-native instead of VXLAN:
firewall-cmd --permanent --add-port=51820/udp
# if using IPv6 with WireGuard-native:
firewall-cmd --permanent --add-port=51821/udp
# if metrics-server is used:
firewall-cmd --permanent --add-port=10250/tcp
firewall-cmd --reload
```

## Step 4: Verify Token Is Correct

Authentication failures are also very common:

```bash
# On the SERVER, get the correct token for agents
cat /var/lib/rancher/k3s/server/agent-token
# or, on default installs where the agent token links to the server token:
cat /var/lib/rancher/k3s/server/node-token

# Secure token format is:
# K10<cluster-ca-hash>::<credentials>

# Verify the token in the agent config
cat /etc/systemd/system/k3s-agent.service.env | grep TOKEN
# or
cat /etc/rancher/k3s/config.yaml | grep token

# Common errors with wrong token or stale node identity:
# "Node password rejected"
# "failed to register node with server"
# "Unauthorized"

# On the SERVER, check if the agent's node password is being rejected
journalctl -u k3s | grep -i "password\|rejected\|unauthorized"

# If the node was reinstalled or is reusing an old name, delete the old Node
# object so K3s removes the node password secret and allows re-registration
kubectl delete node <node-name>
```

## Step 5: Check Time Synchronization

Large clock skew can break TLS validation and node registration:

```bash
# Check current time on agent and server
date
timedatectl

# Check time difference between nodes
# On agent:
date +%s

# On server:
date +%s

# Large clock skew can trigger x509 "certificate has expired or is not yet valid" errors

# Check NTP status
timedatectl show-timesync --all
chronyc tracking 2>/dev/null || ntpq -p

# Sync time immediately
timedatectl set-ntp true
# or
chronyc makestep

# Verify sync
timedatectl
```

## Step 6: Verify Certificate Authority

The agent must trust the server's certificates:

```bash
# Test TLS connection to see certificate details
openssl s_client -connect <server-ip>:6443 -showcerts

# Check if the server IP/hostname is in the certificate's SANs
openssl s_client -connect <server-ip>:6443 2>/dev/null | \
  openssl x509 -noout -text | grep -A 1 "Subject Alternative Name"

# If the IP is not in the SANs, add it to K3s server config:
# /etc/rancher/k3s/config.yaml on server:
# tls-san:
#   - "192.168.1.10"
#   - "k3s-server.example.com"
# Then rotate the API server certificate and restart K3s:
# systemctl stop k3s
# k3s certificate rotate --service api-server
# systemctl start k3s
```

## Step 7: Check Resource Constraints on Agent Node

```bash
# Check memory availability (K3s agent minimum is 512MB RAM)
free -h

# Check disk space
df -h

# Check CPU
uptime

# K3s requires cgroup v1 or v2 to be properly configured
# Check cgroup version
stat -fc %T /sys/fs/cgroup/
# output 'cgroup2fs' = v2, 'tmpfs' = v1

# Check for cgroup subsystems
cat /proc/cgroups | grep -E "memory|cpu"
# "1" in the last column means enabled

# On systems where memory cgroups are disabled (common on Raspberry Pi),
# add this to the kernel cmdline, for example /boot/firmware/cmdline.txt:
# cgroup_memory=1 cgroup_enable=memory
```

## Step 8: Check for Previous K3s Installation Artifacts

Stale data from a previous installation can prevent joining:

```bash
# Check for leftover K3s files
ls /var/lib/rancher/k3s/ 2>/dev/null
ls /etc/rancher/k3s/ 2>/dev/null

# On the AGENT, if this is a reinstall, prefer the generated uninstall script
systemctl stop k3s-agent
/usr/local/bin/k3s-agent-uninstall.sh

# On the SERVER, if you plan to rejoin with the same node name,
# delete the old Node object so the node password secret is removed
kubectl delete node <node-name>

# Now reinstall the agent
```

## Step 9: Diagnose via Server Logs

Check the server side for clues:

```bash
# On the K3s server, watch for agent connection attempts
journalctl -u k3s -f | grep -E "agent|node|register|join"

# Look for specific errors
journalctl -u k3s | grep -iE "error|failed|refused|denied"

# Check registered nodes
kubectl get nodes

# If you're using expiring bootstrap tokens, list them on the server
k3s token list
```

## Step 10: Common Error Messages and Solutions

```bash
# Error: "failed to dial" / "connection refused"
# → Server not listening on 6443, firewall blocking, wrong IP
# Solution: Verify K3s server is running, check firewall

# Error: "certificate signed by unknown authority"
# → Secure token/CA trust problem, or the server certificate SANs do not match
# Solution: Use the correct secure token and ensure the address in --server is in tls-san

# Error: "node password rejected"
# → Token mismatch or stale node entry
# Solution: Verify token, then delete the old Node object if the node was reinstalled

# Error: "failed to reserve node name"
# → Duplicate hostname
# Solution: Set unique --node-name or use --with-node-id in agent config

# Error: "no route to host"
# → Network routing issue between agent and server
# Solution: Check network routing, gateway configuration
```

## Conclusion

K3s agent join failures almost always fall into one of five categories: network connectivity, firewall rules, authentication tokens, time synchronization, or stale configuration. Using `journalctl -u k3s-agent -f` combined with curl connectivity tests and systematic elimination of each potential cause will resolve the vast majority of join failures. When issues persist, running the agent in foreground debug mode provides the most detailed diagnostic information.
