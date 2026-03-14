# How to Validate Calico Networking Architecture in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Architecture, CNI, Lab, Testing, Felix, Typha, BIRD

Description: A systematic validation suite for verifying that all Calico architectural components are healthy and functioning correctly in a lab cluster.

---

## Introduction

Validating Calico's architecture means verifying that each component — Felix, BIRD, Typha, confd, and the CNI plugin — is running, healthy, and correctly connected. A component that is running but not functioning correctly (such as Typha that is connected but not receiving updates) requires different diagnostics than one that is simply crashed.

This guide provides component-by-component health checks with the specific commands and expected outputs that indicate a healthy Calico installation.

## Prerequisites

- A Calico lab cluster
- `kubectl` and `calicoctl` configured
- SSH access to nodes for BIRD-level checks

## Validation 1: Calico Operator

The Calico operator manages the lifecycle of all Calico components. Verify it is running and reconciling correctly:

```bash
kubectl get pods -n tigera-operator
# Expected: One pod in Running state

kubectl get tigerastatus
# Expected: all components showing "Available=True, Degraded=False, Progressing=False"
```

## Validation 2: Felix Health

Felix runs on every node as part of the `calico-node` DaemonSet:

```bash
kubectl get pods -n calico-system -l k8s-app=calico-node
# Expected: One pod per node, all in Running state

# Check Felix's self-reported liveness
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- calico-node -felix-live-logging 2>&1 | head -20

# Check Felix metrics endpoint
kubectl port-forward -n calico-system daemonset/calico-node 9091 &
curl http://localhost:9091/metrics | grep felix_cluster_num_hosts
# Expected: Count matching your node count
```

## Validation 3: Typha Health

Typha runs as a Deployment:

```bash
kubectl get pods -n calico-system -l k8s-app=calico-typha
# Expected: At least one pod Running (count varies by cluster size)

# Check Typha connection count (should equal Felix pod count)
kubectl logs -n calico-system -l k8s-app=calico-typha | grep "connection"
```

## Validation 4: BIRD BGP Sessions (BGP mode only)

If using BGP routing mode, verify BIRD sessions are established:

```bash
# Check BGP session status via Felix
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show protocols
# Expected: All sessions show "Established"

# Check using calicoctl
calicoctl node status
# Expected: BGP peer state shows "Established" for all configured peers
```

## Validation 5: CNI Plugin Installation

The CNI plugin should be installed on each node:

```bash
# Verify CNI binary exists on nodes
kubectl get pods -l k8s-app=calico-node -n calico-system -o wide
# Then on each node:
ls /opt/cni/bin/calico*
# Expected: calico and calico-ipam binaries present

ls /etc/cni/net.d/
# Expected: 10-calico.conflist (or similar name)
```

## Validation 6: IPAM Datastore Connectivity

Verify that IPAM is correctly recording pod IP allocations:

```bash
calicoctl ipam show
# Expected: Block allocations visible, utilization > 0 if pods are running

calicoctl get workloadendpoints --all-namespaces
# Expected: One entry per running pod
```

## Validation 7: End-to-End Architecture Test

Verify the full configuration propagation path works:

```bash
# Apply a new policy
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: arch-validation-test
spec:
  order: 999
  selector: run == 'arch-test'
  ingress:
  - action: Pass
EOF

# Verify Felix received and applied the policy
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep "arch-validation-test"
# Expected: Log entry showing policy was programmed

# Clean up
calicoctl delete globalnetworkpolicy arch-validation-test
```

## Architecture Health Checklist

| Component | Check Command | Healthy Indicator |
|---|---|---|
| Tigera Operator | `kubectl get tigerastatus` | All Available=True |
| Felix | `kubectl get pods -n calico-system` | All nodes have Running pod |
| Typha | `kubectl get pods -n calico-system -l k8s-app=calico-typha` | Running |
| BIRD | `calicoctl node status` | BGP Established |
| CNI Plugin | `ls /opt/cni/bin/calico` on nodes | Binaries present |
| IPAM | `calicoctl ipam show` | Allocations present |

## Best Practices

- Run the full architecture validation after every Calico upgrade
- Set up Prometheus alerts for each component's health metrics
- Document the expected Typha pod count for your cluster size (typically 1 per 200 nodes)
- Add architecture health checks to your cluster CI/CD pipeline

## Conclusion

Validating Calico's architecture requires checking each component independently — operator status, Felix health, Typha connections, BIRD BGP sessions, CNI plugin installation, and IPAM datastore connectivity. Running all checks systematically after installation or upgrades ensures the architecture is fully healthy before relying on it for production traffic.
