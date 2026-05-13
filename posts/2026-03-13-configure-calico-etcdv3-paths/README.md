# Configure Calico etcdv3 Paths

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, etcd, etcdv3, Configuration, Datastore

Description: Understand and configure the etcdv3 key paths used by Calico to store network policy, IPAM, and host configuration data in your Kubernetes cluster.

---

## Introduction

Calico uses a structured hierarchy of etcdv3 key paths to store all its operational data - from network policies and IP address management (IPAM) records to host configuration and Felix agent state. Understanding this path structure is essential for configuring etcd RBAC correctly, diagnosing datastore issues, and performing maintenance operations such as data migration or backup.

The Calico etcdv3 path hierarchy is organized by data type, with each path prefix corresponding to a specific category of information. Knowing which component reads and writes which paths helps you configure minimal permissions and understand the blast radius of potential datastore failures.

## Prerequisites

- Calico configured with etcd datastore (not Kubernetes API mode)
- etcdctl configured with appropriate credentials
- Understanding of Calico's component architecture

## Calico etcdv3 Path Structure

```mermaid
graph TD
    A[/calico/] --> B[/calico/felix/v1/]
    A --> C[/calico/felix/v2/]
    A --> D[/calico/ipam/v2/]
    A --> E[/calico/resources/v3/projectcalico.org/]
    E --> F[/calico/resources/v3/projectcalico.org/networkpolicies/]
    E --> G[/calico/resources/v3/projectcalico.org/globalnetworkpolicies/]
    E --> H[/calico/resources/v3/projectcalico.org/profiles/]
    E --> I[/calico/resources/v3/projectcalico.org/nodes/]
    E --> J[/calico/resources/v3/projectcalico.org/workloadendpoints/]
    E --> K[/calico/resources/v3/projectcalico.org/felixconfigurations/]
```

## Key Path Categories

### Policy Paths

```bash
# List all network policies

etcdctl get /calico/resources/v3/projectcalico.org/networkpolicies/ --prefix --keys-only

# Key paths:
# /calico/resources/v3/projectcalico.org/tiers/
# /calico/resources/v3/projectcalico.org/networkpolicies/
# /calico/resources/v3/projectcalico.org/globalnetworkpolicies/
# /calico/resources/v3/projectcalico.org/profiles/
```

### Host/Endpoint Paths

```bash
# List all host data
etcdctl get /calico/resources/v3/projectcalico.org/nodes/ --prefix --keys-only

# Key paths:
# /calico/resources/v3/projectcalico.org/nodes/
# /calico/resources/v3/projectcalico.org/hostendpoints/
# /calico/resources/v3/projectcalico.org/workloadendpoints/
# /calico/resources/v3/projectcalico.org/felixconfigurations/
```

### IPAM Paths

```bash
# View IPAM data
etcdctl get /calico/ipam/v2/ --prefix --keys-only

# Key paths:
# /calico/ipam/v2/
# /calico/resources/v3/projectcalico.org/ippools/
# /calico/resources/v3/projectcalico.org/ipreservations/
```

## Step 1: Configure etcd Datastore Settings

Calico's documented etcd paths use the `/calico/` prefix. Configure kube-controllers etcdv3 compaction on the KubeControllersConfiguration resource:

```bash
calicoctl patch kubecontrollersconfiguration default \
  --patch='{"spec":{"etcdV3CompactionPeriod":"10m"}}'
```

Configure component datastore access via environment variables in the DaemonSet:

```yaml
env:
  - name: DATASTORE_TYPE
    value: "etcdv3"
  - name: ETCD_ENDPOINTS
    value: "https://etcd:2379"
```

## Step 2: Explore Current Data

```bash
# Count total Calico keys in etcd
etcdctl get /calico/ --prefix --keys-only | wc -l

# View a specific policy
etcdctl get /calico/resources/v3/projectcalico.org/networkpolicies/ --prefix --keys-only

# View Felix configuration
etcdctl get /calico/resources/v3/projectcalico.org/felixconfigurations/default
```

## Step 3: Verify Data Integrity

```bash
# Check that host entries exist for all cluster nodes
for node in $(kubectl get nodes -o name | cut -d/ -f2); do
  count=$(etcdctl get "/calico/resources/v3/projectcalico.org/nodes/${node}" --keys-only | wc -l)
  echo "Node ${node}: ${count} etcd entries"
done
```

## Conclusion

Understanding Calico's etcdv3 path structure enables precise RBAC configuration, targeted backup/restore operations, and effective troubleshooting. The key prefixes - `/calico/resources/v3/projectcalico.org/`, `/calico/ipam/v2/`, `/calico/felix/v1/`, and `/calico/felix/v2/` - each serve distinct functional areas and can be managed independently. Always interact with these paths using calicoctl in preference to direct etcdctl manipulation to avoid data corruption.
