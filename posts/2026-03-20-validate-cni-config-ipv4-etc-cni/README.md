# How to Validate CNI Configuration Files for IPv4 in /etc/cni/net.d

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, IPv4, Configuration, Validation, Linux

Description: Inspect and validate CNI plugin configuration files in /etc/cni/net.d to ensure correct IPv4 settings before pods are scheduled.

CNI configuration files in `/etc/cni/net.d/` tell the container runtime how to set up pod networking. Misconfigured or corrupt files prevent all pod networking on that node.

## Structure of CNI Config Files

```bash
# List configuration files on a node

ls -la /etc/cni/net.d/
# Files are sorted alphabetically; the first matching file is used
# 10-calico.conflist    ← used (10 sorts before 20)
# 20-something.conf

# .conf = single CNI plugin
# .conflist = chain of multiple CNI plugins
```

## Validating Flannel Configuration

```bash
cat /etc/cni/net.d/10-flannel.conflist
```

Expected valid structure:

```json
{
  "name": "cbr0",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "flannel",
      "delegate": {
        "hairpinMode": true,
        "isDefaultGateway": true
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    }
  ]
}
```

```bash
# Validate JSON syntax
python3 -c "import json; json.load(open('/etc/cni/net.d/10-flannel.conflist'))"
# No output = valid JSON
# json.decoder.JSONDecodeError = invalid JSON
```

## Validating Calico Configuration

```bash
cat /etc/cni/net.d/10-calico.conflist | python3 -m json.tool | head -40
```

Key fields to check:

```json
{
  "name": "k8s-pod-network",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "calico",
      "log_level": "info",
      "datastore_type": "kubernetes",
      "nodename": "__KUBERNETES_NODE_NAME__",
      "ipam": {
        "type": "calico-ipam"
      },
      "policy": {
        "type": "k8s"
      },
      "kubernetes": {
        "kubeconfig": "__KUBECONFIG_FILEPATH__"
      }
    }
  ]
}
```

## Checking for Template Variables Not Replaced

```bash
# Template variables like __KUBERNETES_NODE_NAME__ should be replaced at runtime
grep -r "__" /etc/cni/net.d/

# If you see unreplaced variables, the CNI DaemonSet init container may have failed
```

## Verifying CNI Binary Availability

```bash
# Each "type" in the config must have a corresponding binary in /opt/cni/bin/
ls /opt/cni/bin/
# Expected: calico  calico-ipam  flannel  host-local  loopback  portmap  etc.

# Check that the binary is executable
file /opt/cni/bin/flannel
# flannel: ELF 64-bit LSB executable

# Test binary execution
/opt/cni/bin/flannel 2>&1 | head -3
```

## Checking the kubeconfig Referenced in CNI Config

```bash
# The CNI plugin needs a kubeconfig to communicate with the API server
cat /etc/cni/net.d/calico-kubeconfig
# Should contain a valid kubeconfig with certificate data

# Test the kubeconfig works
KUBECONFIG=/etc/cni/net.d/calico-kubeconfig kubectl get nodes
```

## Fixing Permission Issues

```bash
# CNI config files should be readable by root
sudo ls -la /etc/cni/net.d/
# Expected: -rw-r--r-- or -rw------- owned by root

# Fix permissions if wrong
sudo chmod 644 /etc/cni/net.d/*.conflist
sudo chown root:root /etc/cni/net.d/*.conflist
```

## Reloading After Changes

```bash
# The container runtime reads CNI configs on each new container creation
# No daemon restart needed for containerd/CRI-O

# Verify by creating a test pod
kubectl run cni-test --image=alpine --restart=Never -- sleep 3600
kubectl get pod cni-test -o wide
# Should show a pod IP from your CNI's CIDR
```

Correct CNI configuration is the foundation of pod networking. Any invalid JSON, missing binary, or wrong CIDR in the config file will prevent new pods from getting network connectivity.
