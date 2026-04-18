# How to Troubleshoot Pod IPv4 Address Exhaustion in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv4, IPAM, Pod Networking, Troubleshooting, CNI

Description: Diagnose and resolve IPv4 address exhaustion in Kubernetes where pods fail to start because the CNI plugin has no available addresses to assign.

Pod IP exhaustion occurs when all IPv4 addresses in the node's CIDR block (or the cluster's IP pool) have been allocated. New pods will fail to start with CNI errors about no available IPs.

## Symptoms of IP Exhaustion

```bash
# Pods stuck in ContainerCreating

kubectl get pods --all-namespaces | grep ContainerCreating

# Pod events showing CNI failures
kubectl describe pod <failing-pod> -n <namespace>
# Events:
#   Warning  FailedCreatePodSandBox   Failed to create pod sandbox:
#   rpc error: ... failed to allocate for range 0: no IP addresses available in range set: ...
```

## Diagnosing the Problem

### Check Node CIDR Utilization

```bash
# View pod IPs on each node
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=worker1

# Count pods per node vs node CIDR capacity
NODE="worker1"
NODE_CIDR=$(kubectl get node $NODE -o jsonpath='{.spec.podCIDR}')
echo "Node CIDR: $NODE_CIDR"
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=$NODE --no-headers | wc -l
```

### Calico IPAM Check

```bash
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show

# If "IPS IN USE" = "IPS TOTAL" for any pool, that pool is exhausted
```

### Flannel Node Check

```bash
# Check Flannel IPAM subnet file on the node
cat /run/flannel/subnet.env
# FLANNEL_NETWORK=10.244.0.0/16
# FLANNEL_SUBNET=10.244.1.1/24   ← This node's allocation
# FLANNEL_MTU=1450
# FLANNEL_IPMASQ=true
```

## Releasing Leaked IPs

```bash
# For Calico: find and release IP addresses for non-existent pods
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam check

# Check for leaked IPs
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show --show-blocks

# Generate a report of problem IPs (required input for the release command)
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam check --show-problem-ips -o report.json

# Release the leaked IPs documented in the report
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam release --from-report=report.json
```

## Adding a New IP Pool to Expand Capacity

```yaml
# Add a second IP pool when the first is exhausted
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: secondary-ipv4-pool
spec:
  cidr: 10.245.0.0/16
  vxlanMode: CrossSubnet
  natOutgoing: true
  disabled: false
  blockSize: 26
```

```bash
calicoctl apply -f secondary-ippool.yaml
```

## Increasing Max Pods per Node

```bash
# Check current max-pods setting
kubectl get node worker1 -o jsonpath='{.status.allocatable.pods}'

# To increase, add to kubelet config and ensure node CIDR supports it
# In /var/lib/kubelet/config.yaml:
# maxPods: 200
# Then restart kubelet
sudo systemctl restart kubelet
```

## Prevention: Monitor IP Utilization

```bash
#!/bin/bash
# Script to alert when IP pool is > 80% utilized
# Parses the pipe-delimited row: | IP Pool | <CIDR> | <IPS TOTAL> | <IPS IN USE> | <IPS FREE> |
USED=$(calicoctl ipam show 2>/dev/null | awk '/IP Pool/{print $9}' | tr -d ,)
TOTAL=$(calicoctl ipam show 2>/dev/null | awk '/IP Pool/{print $7}' | tr -d ,)
PCT=$((USED * 100 / TOTAL))
if [ $PCT -gt 80 ]; then
    echo "WARNING: IP pool $PCT% utilized ($USED/$TOTAL IPs)"
fi
```

Regular IP utilization monitoring prevents exhaustion before it becomes an incident.
