# How to Troubleshoot Harvester Installation Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Troubleshooting, Installation, HCI, Kubernetes, SUSE Rancher

Description: Learn how to diagnose and resolve common Harvester installation failures including network configuration issues, storage initialization errors, and node join problems.

---

Harvester installation can fail due to hardware incompatibilities, network misconfigurations, or BIOS settings. This guide covers the most common failure scenarios and their solutions.

---

## Step 1: Check Installation Logs

During ISO installation, access the console logs:

```bash
# At the Harvester console, press CTRL+ALT+F2 and log in as rancher/rancher

# View installer console output
cat /var/log/console.log

# Check RKE2 startup logs captured during installation
cat /run/cos/target/rke2.log

# Generate a troubleshooting bundle if needed
supportconfig -k -c
```

---

## Issue 1: Installation Hangs at "Starting Services"

**Cause**: Often the management network has no default route, or the gateway/VLAN settings are incorrect.

```bash
# Check available network interfaces
ip link show

# Check whether the installer has a default route
ip route

# Review RKE2 startup logs captured during installation
cat /run/cos/target/rke2.log

# If no default route exists, fix DHCP to provide option routers
# or reinstall with a static gateway configured
```

---

## Issue 2: Nodes Cannot Join the Cluster

**Symptoms**: Additional nodes show "Join Token Invalid" or timeout.

```bash
# On an existing server node, get the cluster token
sudo yq eval .token /etc/rancher/rancherd/config.yaml

# Confirm the join target is the management VIP
kubectl -n kube-system get svc ingress-expose -o jsonpath='{.metadata.annotations.kube-vip\.io/requestedIP}{"\n"}'

# Check that the management API is reachable on the VIP
curl -fk https://<cluster-vip>/version
```

---

## Issue 3: Storage Not Initializing

**Symptoms**: Longhorn fails to start, disks not detected.

```bash
# Check if disks are visible
lsblk

# Check Longhorn manager pod status
kubectl get pods -n longhorn-system

# Common issue: disk is already partitioned
# Wipe it if you're sure it's safe
wipefs -a /dev/sdb
```

---

## Issue 4: Harvester WebUI Not Accessible

```bash
# Check the configured management VIP
kubectl get svc -n kube-system ingress-expose -o jsonpath='{.metadata.annotations.kube-vip\.io/requestedIP}{"\n"}'

# Identify which node currently owns the VIP
kubectl -n kube-system get svc ingress-expose -o jsonpath='{.metadata.annotations.kube-vip\.io/vipHost}'

# Verify the management bridge and VIP are present on that node
ip address show mgmt-br

# Verify the Harvester API answers on the VIP
curl -fk https://<VIP>/version
```

---

## Issue 5: After Installation, Cluster Shows "Not Ready"

```bash
# Check RKE2 server status
systemctl status rke2-server

# Check RKE2 server logs
journalctl -u rke2-server -f

# Check all system pods
kubectl get pods -A | grep -v Running

# Check events for errors
kubectl get events -A --sort-by=.lastTimestamp | tail -30

# Verify the Harvester API responds on the management VIP
curl -fk https://<VIP>/version
```

---

## Issue 6: BIOS/UEFI Configuration Problems

Common firmware and platform requirements not met:

```text
- VT-x / AMD-V hardware-assisted virtualization must be enabled
- Use UEFI for new installations; legacy BIOS boot is deprecated starting in Harvester v1.7.0
- Each node must expose a unique product_uuid
- Only local disks and hardware RAID are supported
```

---

## Generating a Support Bundle

If the issue persists:

```bash
# Via Harvester UI: Support > Generate Support Bundle
# Then list generated support bundle objects:
kubectl get supportbundle -A
```

---

## Best Practices

- Verify all hardware meets the Harvester minimum requirements before installation.
- Use the official Harvester ISO from the releases page - custom or modified ISOs may behave unpredictably.
- Prefer YES-certified hardware for SUSE Linux Micro 5.5/6.0/6.1 when selecting servers, NICs, and storage controllers.
