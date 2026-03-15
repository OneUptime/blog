# How to Use calicoctl ipam show with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Kubernetes, Networking, IP Address Management, Monitoring

Description: Learn how to use calicoctl ipam show to view IP address allocation details and usage across a Calico cluster.

---

## Introduction

Understanding how IP addresses are distributed and consumed across your Kubernetes cluster is essential for capacity planning and troubleshooting. The `calicoctl ipam show` command provides a detailed view of IP address allocations, including how many addresses are in use, available, and reserved per IP pool and per node.

Without visibility into IPAM utilization, you risk running into IP address exhaustion, which causes new pods to fail scheduling. The `calicoctl ipam show` command gives you the data needed to proactively manage IP capacity.

This guide covers the various output options and practical uses of `calicoctl ipam show` for cluster monitoring and capacity planning.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` configured with datastore access
- `kubectl` access to the cluster

## Basic Usage

View a summary of IPAM allocations:

```bash
calicoctl ipam show
```

Example output:

```
+----------+--------------+-----------+------------+-----------+
| GROUPING |     CIDR     | IPS TOTAL | IPS IN USE | IPS FREE  |
+----------+--------------+-----------+------------+-----------+
| IP Pool  | 10.244.0.0/16|    65536  |     342    |   65194   |
+----------+--------------+-----------+------------+-----------+
```

## Showing Per-Block Details

To see allocation details at the block level:

```bash
calicoctl ipam show --show-blocks
```

This displays each /26 block and its utilization:

```
+----------+----------------+-----------+------------+-----------+
| GROUPING |      CIDR      | IPS TOTAL | IPS IN USE | IPS FREE  |
+----------+----------------+-----------+------------+-----------+
| IP Pool  | 10.244.0.0/16  |    65536  |     342    |   65194   |
| Block    | 10.244.0.0/26  |       64  |      12    |      52   |
| Block    | 10.244.0.64/26 |       64  |      28    |      36   |
| Block    | 10.244.1.0/26  |       64  |      15    |      49   |
| Block    | 10.244.1.64/26 |       64  |       8    |      56   |
| Block    | 10.244.2.0/26  |       64  |      31    |      33   |
+----------+----------------+-----------+------------+-----------+
```

## Showing Configuration Details

View IPAM configuration alongside allocation data:

```bash
calicoctl ipam show --show-configuration
```

This includes the strict affinity setting and maximum blocks per host alongside the allocation summary.

## Monitoring IPAM Utilization Over Time

Create a script that records IPAM usage periodically:

```bash
#!/bin/bash
LOG_DIR="/var/log/calico-ipam"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="$LOG_DIR/ipam-usage-$TIMESTAMP.txt"

echo "=== IPAM Usage Report - $(date) ===" > "$OUTPUT_FILE"
calicoctl ipam show --show-blocks >> "$OUTPUT_FILE"

# Extract utilization percentage
TOTAL=$(calicoctl ipam show 2>/dev/null | grep "IP Pool" | awk '{print $6}')
USED=$(calicoctl ipam show 2>/dev/null | grep "IP Pool" | awk '{print $8}')

if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
  PERCENT=$((USED * 100 / TOTAL))
  echo "Utilization: ${PERCENT}%" >> "$OUTPUT_FILE"

  if [ "$PERCENT" -gt 80 ]; then
    echo "WARNING: IPAM utilization above 80%"
  fi
fi
```

## Checking Per-Node Utilization

Combine `calicoctl ipam show` with node information to understand per-node distribution:

```bash
#!/bin/bash
echo "=== Per-Node IP Usage ==="
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  POD_COUNT=$(kubectl get pods --all-namespaces --field-selector spec.nodeName="$NODE" --no-headers 2>/dev/null | wc -l)
  echo "Node: $NODE - Pods: $POD_COUNT"
done

echo ""
echo "=== IPAM Block Details ==="
calicoctl ipam show --show-blocks
```

## Checking Available Capacity for New Workloads

Before deploying a large number of pods, verify available capacity:

```bash
#!/bin/bash
REQUIRED_IPS=$1

if [ -z "$REQUIRED_IPS" ]; then
  echo "Usage: $0 <number-of-ips-needed>"
  exit 1
fi

FREE_IPS=$(calicoctl ipam show 2>/dev/null | grep "IP Pool" | awk '{print $10}')

echo "Required IPs: $REQUIRED_IPS"
echo "Available IPs: $FREE_IPS"

if [ "$FREE_IPS" -ge "$REQUIRED_IPS" ]; then
  echo "OK: Sufficient IP capacity available"
else
  DEFICIT=$((REQUIRED_IPS - FREE_IPS))
  echo "WARNING: Need $DEFICIT more IPs. Consider adding an IP pool."
fi
```

## Verification

Verify that the IPAM show output matches actual cluster state:

```bash
# Count running pods with IPs
RUNNING_PODS=$(kubectl get pods -A -o wide --no-headers | grep Running | awk '{print $7}' | grep -v '<none>' | wc -l)
echo "Running pods with IPs: $RUNNING_PODS"

# Compare with IPAM reported usage
calicoctl ipam show
```

The IPs in use count should be close to the number of running pods (some IPs may be used by tunnel interfaces or other Calico components).

## Troubleshooting

- **Numbers do not match**: A small discrepancy between pod count and IPs in use is normal. Calico allocates IPs for tunnel endpoints and may have reserved addresses.
- **Zero IPs shown**: Ensure `calicoctl` is connected to the correct datastore. Check the `DATASTORE_TYPE` environment variable.
- **Blocks with no free IPs**: This indicates the block is fully utilized. If many blocks are full, consider increasing the IP pool or adjusting block size.
- **IPs in use but no pods on node**: Orphaned allocations may exist. Run `calicoctl ipam check` to identify them.

## Conclusion

The `calicoctl ipam show` command is an essential tool for monitoring IP address utilization in a Calico cluster. Regular monitoring of IPAM usage with block-level detail helps you plan capacity, identify uneven distribution, and catch IP exhaustion before it affects pod scheduling. Combined with alerting scripts, it forms a key part of Calico cluster operations.
