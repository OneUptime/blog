# How to Update the Calico BGPConfiguration Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, Kubernetes, Networking, BGPConfiguration, Operations, DevOps

Description: Safely update the Calico BGPConfiguration resource without disrupting existing BGP sessions or causing route advertisement failures.

---

## Introduction

Updating the BGPConfiguration resource in Calico requires care because changes directly affect BGP sessions across the entire cluster. A misconfigured AS number or accidentally disabling the node-to-node mesh can cause network partitions and pod connectivity failures. Understanding how to make safe, incremental changes is essential for production operations.

Unlike many Kubernetes resources, the BGPConfiguration named `default` is applied globally. Any modification takes effect on all Calico nodes immediately. There is no rolling update mechanism built in, so you must plan changes carefully and verify them incrementally.

This guide covers safe update strategies, rollback procedures, and validation steps to minimize the risk of BGP-related outages during configuration changes.

## Prerequisites

- Running Kubernetes cluster with Calico and existing BGPConfiguration
- `calicoctl` and `kubectl` with cluster-admin access
- Current BGP configuration backed up
- Maintenance window scheduled for disruptive changes

## Backing Up the Current Configuration

Always export the current configuration before making changes:

```bash
calicoctl get bgpconfiguration default -o yaml > bgp-config-backup.yaml
```

Store this backup in version control or a secure location. You can restore it instantly if an update causes problems:

```bash
calicoctl apply -f bgp-config-backup.yaml
```

## Reviewing Current State

Before any update, check the current BGP status across all nodes:

```bash
calicoctl node status
```

Record the number of established BGP sessions and advertised routes:

```bash
calicoctl get bgpconfiguration default -o yaml
```

```bash
kubectl get nodes -o wide
```

## Safe Update: Changing the AS Number

Changing the AS number is a disruptive operation. All existing BGP sessions will be torn down and re-established. Follow this process:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64513
  nodeToNodeMeshEnabled: true
  logSeverityScreen: Info
  serviceClusterIPs:
    - cidr: 10.96.0.0/12
```

Apply the updated configuration:

```bash
calicoctl apply -f bgp-config-updated.yaml
```

Monitor BGP session re-establishment:

```bash
watch calicoctl node status
```

## Safe Update: Adding Service Advertisement CIDRs

Adding new CIDRs for service advertisement is non-disruptive. Existing sessions remain active while new routes are propagated:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: true
  serviceClusterIPs:
    - cidr: 10.96.0.0/12
  serviceExternalIPs:
    - cidr: 203.0.113.0/24
  serviceLoadBalancerIPs:
    - cidr: 198.51.100.0/24
```

```bash
calicoctl apply -f bgp-config-updated.yaml
```

## Safe Update: Disabling Node-to-Node Mesh

Disabling the node-to-node mesh requires that BGP route reflectors or external peers are already configured. Do not disable the mesh without alternative route distribution:

```bash
# First verify route reflectors are configured
calicoctl get bgppeer -o wide

# Then update the configuration
calicoctl patch bgpconfiguration default -p '{"spec": {"nodeToNodeMeshEnabled": false}}'
```

## Safe Update: Modifying Communities

Updating community values is non-disruptive to BGP sessions but changes how routes are tagged:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: true
  communities:
    - name: production-routes
      value: "64512:100"
    - name: staging-routes
      value: "64512:150"
  prefixAdvertisements:
    - cidr: 10.96.0.0/12
      communities:
        - production-routes
```

```bash
calicoctl apply -f bgp-config-updated.yaml
```

## Verification

After every update, run through this checklist:

```bash
# Check BGP configuration was applied
calicoctl get bgpconfiguration default -o yaml

# Verify BGP sessions are established
calicoctl node status

# Check calico-node logs for errors
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i bgp

# Verify pod connectivity
kubectl run test-pod --image=busybox --rm -it --restart=Never -- ping -c 3 <target-pod-ip>
```

## Troubleshooting

If BGP sessions drop after an update:

- Immediately restore the backup: `calicoctl apply -f bgp-config-backup.yaml`
- Check if AS number mismatch occurred between peers: `calicoctl get bgppeer -o yaml`
- Verify that node-to-node mesh was not disabled without route reflectors in place
- Examine calico-node pod logs: `kubectl logs -n calico-system <calico-node-pod> | grep -i "session\|error\|bgp"`
- Confirm the CRD was updated: `kubectl get bgpconfigurations.crd.projectcalico.org default -o jsonpath='{.spec}'`

## Conclusion

Updating the BGPConfiguration resource safely requires a disciplined approach: back up first, validate changes with dry-run, apply incrementally, and verify immediately. Non-disruptive changes like adding CIDRs or communities can be applied at any time, while disruptive changes like AS number modifications or mesh toggling require a maintenance window and pre-configured alternatives. Always keep a backup ready for instant rollback.
