# How to Troubleshoot RKE2 Installation Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Troubleshooting, Kubernetes, Installation, Debugging, SUSE Rancher

Description: Learn how to diagnose and resolve common RKE2 installation failures including service startup errors, node join failures, networking issues, and certificate problems.

---

RKE2 installation can fail for a variety of reasons including firewall rules, SELinux policy, insufficient system resources, or misconfigured tokens. This guide covers the most common failures and how to fix them.

---

## General Debugging Approach

```bash
# Check RKE2 service status

systemctl status rke2-server
systemctl status rke2-agent

# Stream logs in real time
journalctl -u rke2-server -f
journalctl -u rke2-agent -f

# Check kernel messages for driver issues
dmesg | tail -50
```

---

## Issue 1: Service Fails to Start

**Symptoms**: `systemctl start rke2-server` exits immediately or fails within seconds.

```bash
# View the last 50 lines of the service log
journalctl -u rke2-server -n 50

# Common error: "address already in use" - another process is using port 6443
ss -tlnp | grep 6443

# If kubelet or another k8s distribution is running, stop it
systemctl stop kubelet
```

---

## Issue 2: Node Cannot Join the Cluster

**Symptoms**: Agent node shows `not found` or times out trying to connect to the server.

```bash
# On the agent node - test connectivity to the server
curl -k https://<SERVER_IP>:9345/ping
curl -k https://<SERVER_IP>:6443/version

# Check that the token matches exactly (including newlines)
cat /var/lib/rancher/rke2/server/node-token | wc -c
# Compare with what is in the agent config.yaml token field

# Check firewall rules on the server
# Common ports: 6443/TCP (API), 9345/TCP (supervisor), 10250/TCP (kubelet metrics),
# 2379-2381/TCP (etcd between servers), and the VXLAN port for your CNI
# (8472/UDP for Canal/Cilium VXLAN, 4789/UDP for Flannel/Calico VXLAN)
sudo iptables -L INPUT -n -v | grep -E "6443|9345|10250|2379|2380|2381|8472|4789"
```

---

## Issue 3: Pods Stuck in Pending or Not Running

```bash
# Check for node resource pressure
kubectl describe node <node-name> | grep -A 10 "Conditions:"

# Check if CoreDNS and CNI pods are running first
kubectl get pods -n kube-system

# Look for CNI binary issues
ls /opt/cni/bin/
ls /var/lib/rancher/rke2/data/*/bin/

# Check kubelet log for specific errors
journalctl -u rke2-agent -n 100 | grep -i "error\|failed"
```

---

## Issue 4: etcd Fails to Start

**Symptoms**: Server node repeatedly restarts, logs show etcd errors.

```bash
# Check etcd logs
journalctl -u rke2-server | grep etcd

# Common issue during a failed initial bootstrap: stale etcd data
# Only remove this directory if there is no cluster data to preserve
systemctl stop rke2-server
rm -rf /var/lib/rancher/rke2/server/db/etcd
systemctl start rke2-server
```

---

## Issue 5: Certificate Issues

**Symptoms**: TLS handshake errors, especially `x509: certificate is valid for ... not ...` SAN mismatch errors.

```bash
# Verify the API server certificate SANs match your cluster endpoint
openssl x509 -in /var/lib/rancher/rke2/server/tls/serving-kube-apiserver.crt -noout -text | grep -A 5 "Subject Alternative"

# If the SANs are wrong, add the missing endpoint to tls-san in /etc/rancher/rke2/config.yaml,
# then rotate the API server certificate
systemctl stop rke2-server
rke2 certificate rotate --service api-server
systemctl start rke2-server
```

---

## Issue 6: SELinux Blocking RKE2

```bash
# Check SELinux denials
ausearch -m avc -ts recent | audit2why

# Quick test: temporarily set to permissive
setenforce 0
systemctl start rke2-server

# If it works in permissive, install the RKE2 SELinux policy packages
yum install -y rke2-selinux container-selinux
# For tarball installs, set selinux: true in /etc/rancher/rke2/config.yaml
setenforce 1
systemctl restart rke2-server
```

---

## Cleanup and Reinstall

If all else fails, run the RKE2 uninstall script and start fresh:

```bash
# Tarball install
/usr/local/bin/rke2-uninstall.sh

# RPM install
/usr/bin/rke2-uninstall.sh
# This removes the binary, service, and all data
```

---

## Best Practices

- Always check `journalctl -u rke2-server -f` before declaring an installation failed - startup can take 2-3 minutes.
- Verify firewall rules before installing, especially for multi-node clusters.
- Use `--debug` flag when running RKE2 manually to get verbose output.
