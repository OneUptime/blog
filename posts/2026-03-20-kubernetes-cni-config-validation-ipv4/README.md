# How to Validate CNI Configuration Files for IPv4 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, IPv4, Networking, Troubleshooting, Flannel, Calico

Description: Validate and troubleshoot Kubernetes CNI configuration files to ensure correct IPv4 subnet assignment and pod network connectivity.

## Introduction

The Container Network Interface (CNI) is responsible for configuring network namespaces for Kubernetes pods. Misconfigured CNI files are a common cause of pod networking failures. Understanding how to validate these files helps diagnose issues quickly.

## CNI Configuration Location

CNI configuration files are stored at `/etc/cni/net.d/` on each node:

```bash
# List CNI configuration files on a node

ls /etc/cni/net.d/

# Common files:
# 10-flannel.conflist  - Flannel CNI
# 10-calico.conflist   - Calico CNI
# 10-kindnet.conflist  - Kind networking
```

## Validating a CNI Configuration File

CNI uses JSON format. Validate syntax with `jq`:

```bash
# Validate JSON syntax of a CNI config
jq . /etc/cni/net.d/10-flannel.conflist
```

A well-formed Flannel configuration looks like:

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

## Checking the Allocated IPv4 Subnet

Flannel writes the current node subnet assignment to `/run/flannel/subnet.env`. Depending on how Flannel is deployed, the backing store may be the Kubernetes API or etcd:

```bash
# View the subnet allocated to a node (Flannel)
cat /run/flannel/subnet.env

# Expected output:
# FLANNEL_NETWORK=10.244.0.0/16
# FLANNEL_SUBNET=10.244.1.1/24
# FLANNEL_MTU=1450
# FLANNEL_IPMASQ=true
```

For Calico, check with `calicoctl`:

```bash
# Show IP pools
calicoctl get ippool -o wide

# Show node IPAM allocations
calicoctl ipam show --show-blocks
```

## Testing CNI Plugin Execution

You can manually invoke a CNI plugin to test it without creating a pod:

```bash
# Install CNI reference plugins for testing
# https://github.com/containernetworking/plugins

# Create a test network namespace
sudo ip netns add test-ns

# Set up environment variables for CNI
export CNI_COMMAND=ADD
export CNI_CONTAINERID=test123
export CNI_NETNS=/var/run/netns/test-ns
export CNI_IFNAME=eth0
export CNI_PATH=/opt/cni/bin

# Invoke the bridge plugin
echo '{
  "cniVersion": "0.3.1",
  "name": "test-cni",
  "type": "bridge",
  "bridge": "cni-test0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.50.0.0/24",
    "routes": [{"dst": "0.0.0.0/0"}]
  }
}' | sudo /opt/cni/bin/bridge

# Release the allocation and clean up the interface
export CNI_COMMAND=DEL
echo '{
  "cniVersion": "0.3.1",
  "name": "test-cni",
  "type": "bridge",
  "bridge": "cni-test0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.50.0.0/24",
    "routes": [{"dst": "0.0.0.0/0"}]
  }
}' | sudo /opt/cni/bin/bridge

# Remove the test namespace
sudo ip netns del test-ns
```

## Diagnosing Pod Network Issues

```bash
# Check pod IP assignment and status
kubectl get pods -o wide --all-namespaces

# Describe a failing pod for CNI errors
kubectl describe pod <pod-name> -n <namespace>
# Look for sandbox or CNI setup errors in the pod events

# Check kubelet logs for CNI errors
sudo journalctl -u kubelet -n 100 | grep -i cni

# Check if the CNI binaries are present
ls /opt/cni/bin/
```

## Common CNI Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Pods stuck in ContainerCreating | CNI binary missing | Install CNI plugins package |
| Pods get no IP address | CNI/IPAM network settings do not match the cluster pod network | Correct the IP pool or pod CIDR configuration, then restart the affected networking components if required |
| Pod-to-pod connectivity fails | Flannel subnet mismatch | Check `/run/flannel/subnet.env` matches expected range |
| DNS resolution fails in pods | CoreDNS unreachable | Verify CNI allows traffic to CoreDNS pod IPs |

## Conclusion

CNI configuration validation is the first step in diagnosing Kubernetes network issues. Start with `jq` for JSON syntax validation, check subnet allocations per node, and use `kubectl describe pod` to surface CNI error messages from kubelet.
