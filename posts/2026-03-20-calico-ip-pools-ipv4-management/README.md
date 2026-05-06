# How to Configure Calico IP Pools for IPv4 Address Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv4, IPAM, IP Pools, Networking

Description: Create, modify, and manage Calico IPv4 IP pools to control pod address allocation, encapsulation, and node pool assignment in a Kubernetes cluster.

Calico manages pod IPv4 addresses through IP Pools - custom resources that define CIDR blocks, encapsulation modes, and node selectors. You can have multiple pools to segment pods by namespace or node group.

## Viewing Existing IP Pools

```bash
# Using kubectl

kubectl get ippools -o yaml

# Using calicoctl (provides more detail)
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get ippool -o wide

# Example output:
# NAME                  CIDR            NAT    IPIPMODE   VXLANMODE   DISABLED   SELECTOR
# default-ipv4-ippool   10.244.0.0/16   true   Never      Never       false      all()
```

## Creating a New IP Pool

```yaml
# ippool-production.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: production-ipv4-pool
spec:
  # IPv4 CIDR for this pool
  cidr: 10.244.0.0/17
  # VXLAN encapsulation for cross-subnet routing
  vxlanMode: CrossSubnet
  ipipMode: Never
  # Enable NAT for traffic leaving the cluster
  natOutgoing: true
  # Assign this pool to production nodes only
  nodeSelector: "tier == 'production'"
  # Keep the pool enabled
  disabled: false
  # Automatically assign addresses from this pool on matching nodes
  assignmentMode: Automatic
  # Block size for per-node IP allocation
  blockSize: 26
```

```bash
kubectl apply -f ippool-production.yaml
```

## Creating a Separate Pool for a Namespace

```yaml
# ippool-monitoring.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: monitoring-ipv4-pool
spec:
  cidr: 10.245.0.0/24
  vxlanMode: Always
  natOutgoing: true
  disabled: false
  assignmentMode: Manual
  blockSize: 28
```

```bash
# Annotate a namespace so newly created pods use a specific pool
kubectl annotate namespace monitoring \
  cni.projectcalico.org/ipv4pools='["monitoring-ipv4-pool"]'
```

## Disabling a Pool (Draining)

```bash
# Disable a pool to stop new allocations (existing pods keep their IPs)
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec": {"disabled": true}}'
```

## Managing IP Blocks (Per-Node Allocations)

```bash
# View IP pools and their allocated blocks
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show --show-blocks

# View IPAM usage statistics
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show

# View allocations for a specific IP
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show --ip=10.244.1.5
```

## Checking for IP Allocation Issues

```bash
# Show IPAM blocks and utilization
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show

# Example output:
# +----------+----------------+------------+------------+----------------+
# | GROUPING |      CIDR      | IPS TOTAL  | IPS IN USE |    IPS FREE    |
# +----------+----------------+------------+------------+----------------+
# | IP Pool  | 10.244.0.0/16  |      65536 | 350 (1%)   | 65186 (99%)    |
# +----------+----------------+------------+------------+----------------+

# Lock the datastore before generating a leak report
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl datastore migrate lock

# Generate a report of leaked or inconsistent allocations
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam check -o report.json

# Release leaked IP addresses from the report
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam release --from-report=report.json

# Unlock the datastore when finished
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl datastore migrate unlock
```

## Changing Encapsulation Mode

```bash
# Switch from IPIP to VXLAN for better compatibility
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec": {"ipipMode": "Never", "vxlanMode": "CrossSubnet"}}'
```

Calico's IP pool management gives fine-grained control over IPv4 address allocation, enabling multi-tenant clusters where different workloads draw from separate CIDR ranges.
