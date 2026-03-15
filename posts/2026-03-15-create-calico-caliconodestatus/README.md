# How to Create the Calico CalicoNodeStatus Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, CalicoNodeStatus, Monitoring, Kubernetes, Networking, BGP

Description: Learn how to create CalicoNodeStatus resources to monitor node-level networking state including BGP peers and route information.

---

## Introduction

The CalicoNodeStatus resource provides a way to request and view real-time networking status for individual nodes in your Calico cluster. When you create a CalicoNodeStatus resource, Calico populates it with current information about the node's BGP sessions, learned routes, and interface status.

This resource is particularly valuable for debugging connectivity issues, verifying BGP peering configurations, and monitoring the health of your network data plane. Rather than logging into individual nodes, you can query the status through the Kubernetes API.

This guide covers how to create CalicoNodeStatus resources, configure their update intervals, and interpret the status information they provide.

## Prerequisites

- A Kubernetes cluster with Calico v3.20 or later
- `calicoctl` installed and configured
- `kubectl` with cluster-admin privileges
- BGP networking enabled (for BGP-related status fields)

## Creating a Basic CalicoNodeStatus Resource

Create a CalicoNodeStatus resource for a specific node:

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

Save this to a file and apply it:

```bash
calicoctl apply -f node01-status.yaml
```

The `classes` field determines what types of status information Calico collects. Available classes are `Agent`, `BGP`, and `Routes`.

## Creating Status Resources for Multiple Nodes

Generate CalicoNodeStatus resources for all nodes in your cluster:

```bash
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: ${node}-status
spec:
  node: ${node}
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 60
EOF
done
```

## Configuring Update Frequency

The `updatePeriodSeconds` field controls how often the status is refreshed. For production monitoring, a 60-second interval balances freshness with resource usage:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node02-status
spec:
  node: node02
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 60
```

For active troubleshooting, use a shorter interval:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node02-debug-status
spec:
  node: node02
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 10
```

## Reading the Status Output

Once created, the resource is populated with status data. Retrieve it with:

```bash
calicoctl get caliconodestatus node01-status -o yaml
```

The status section will contain information like BGP peer state, route counts, and agent health. Key fields to look for in the output include `status.bgp.peersV4`, `status.bgp.numberEstablishedV4`, and `status.routes.routesV4`.

## Creating Status with Selective Classes

If you only need BGP session information without route details:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node03-bgp-only
spec:
  node: node03
  classes:
    - BGP
  updatePeriodSeconds: 30
```

For route monitoring without BGP details:

```yaml
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: node03-routes-only
spec:
  node: node03
  classes:
    - Routes
  updatePeriodSeconds: 30
```

## Verification

Confirm the CalicoNodeStatus resources were created:

```bash
calicoctl get caliconodestatus -o wide
```

Check that the status fields are being populated:

```bash
calicoctl get caliconodestatus node01-status -o yaml | grep -A 20 "status:"
```

Verify the last update timestamp is recent:

```bash
calicoctl get caliconodestatus node01-status -o yaml | grep "lastUpdated"
```

## Troubleshooting

If the status fields remain empty after creation, check that the calico-node pod is running on the target node:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide | grep node01
```

If BGP status shows no peers, verify your BGPPeer configuration:

```bash
calicoctl get bgppeers -o yaml
```

If the `lastUpdated` timestamp is stale, the calico-node agent may not be processing the status request. Check its logs:

```bash
kubectl logs -n kube-system -l k8s-app=calico-node --field-selector spec.nodeName=node01 --tail=30
```

To remove a CalicoNodeStatus resource when it is no longer needed:

```bash
calicoctl delete caliconodestatus node01-status
```

## Conclusion

CalicoNodeStatus resources provide a declarative way to monitor node-level networking state in your Calico cluster. By creating these resources with appropriate classes and update intervals, you gain visibility into BGP sessions, routes, and agent health without needing direct node access. Use shorter update intervals during debugging and longer intervals for ongoing production monitoring.
