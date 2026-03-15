# How to Update the Calico CalicoNodeStatus Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, CalicoNodeStatus, Monitoring, Kubernetes, Networking, Operations

Description: Safely update CalicoNodeStatus resources to adjust monitoring parameters without losing visibility into node networking state.

---

## Introduction

The CalicoNodeStatus resource provides real-time networking telemetry for individual nodes. Over time you may need to update these resources to change the update frequency, add or remove status classes, or retarget the resource to a different node after a replacement.

Updating CalicoNodeStatus resources is generally low-risk compared to other Calico resources, since they are read-only status objects that do not affect the data plane. However, careless updates can create gaps in monitoring coverage or introduce unnecessary load on the calico-node agent if update intervals are set too aggressively.

This guide covers the safe process for modifying CalicoNodeStatus resources, including adjusting update periods, changing status classes, and handling node migration scenarios.

## Prerequisites

- A Kubernetes cluster with Calico v3.20 or later
- Existing CalicoNodeStatus resources to update
- `calicoctl` installed and configured
- `kubectl` with cluster-admin privileges

## Reviewing Current CalicoNodeStatus Configuration

Before making changes, review the existing CalicoNodeStatus resources:

```bash
calicoctl get caliconodestatus -o yaml
```

Check the current update period and classes for the resource you plan to modify:

```bash
calicoctl get caliconodestatus node01-status -o yaml
```

Example existing resource:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node01-status
spec:
  node: node01
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 30
```

## Adjusting the Update Period

To reduce monitoring overhead in production, increase the update interval:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node01-status
spec:
  node: node01
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 120
```

Apply the change:

```bash
calicoctl apply -f node01-status-updated.yaml
```

For active incident investigation, temporarily decrease the interval:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node01-status
spec:
  node: node01
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 10
```

Remember to revert the interval after troubleshooting to avoid unnecessary resource consumption.

## Adding or Removing Status Classes

To add route monitoring to a resource that only tracked BGP:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node01-status
spec:
  node: node01
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 60
```

To reduce overhead by removing classes you no longer need:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node01-status
spec:
  node: node01
  classes:
    - BGP
  updatePeriodSeconds: 60
```

Apply with:

```bash
calicoctl apply -f node01-status-updated.yaml
```

## Batch Updating All CalicoNodeStatus Resources

To update the update period for all existing CalicoNodeStatus resources:

```bash
for status in $(calicoctl get caliconodestatus -o jsonpath='{.items[*].metadata.name}'); do
  calicoctl patch caliconodestatus "$status" -p '{"spec":{"updatePeriodSeconds":120}}'
done
```

## Handling Node Replacement

When replacing a node, delete the old CalicoNodeStatus and create one for the new node:

```bash
calicoctl delete caliconodestatus old-node-status
```

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: new-node-status
spec:
  node: new-node
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 60
```

```bash
calicoctl apply -f new-node-status.yaml
```

## Verification

Confirm the update was applied:

```bash
calicoctl get caliconodestatus node01-status -o yaml | grep updatePeriodSeconds
```

Verify the status is still being populated after the change:

```bash
calicoctl get caliconodestatus node01-status -o yaml | grep lastUpdated
```

Watch for a few update cycles to confirm the new interval:

```bash
watch -n 10 'calicoctl get caliconodestatus node01-status -o yaml | grep lastUpdated'
```

## Troubleshooting

If status updates stop after modifying the resource, check that the `node` field still references a valid node:

```bash
kubectl get nodes | grep node01
```

If the calico-node pod restarted during the update, it may take one update cycle to resume:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide | grep node01
```

If you accidentally set a very short update period and it is causing load, patch it immediately:

```bash
calicoctl patch caliconodestatus node01-status -p '{"spec":{"updatePeriodSeconds":300}}'
```

Check calico-node resource usage if you suspect monitoring overhead:

```bash
kubectl top pod -n kube-system -l k8s-app=calico-node
```

## Conclusion

Updating CalicoNodeStatus resources is a safe operation that does not impact the networking data plane. The main considerations are avoiding excessively short update intervals in production and ensuring monitoring coverage is maintained during node replacement events. Always verify that status updates resume after making changes, and revert aggressive intervals once troubleshooting is complete.
