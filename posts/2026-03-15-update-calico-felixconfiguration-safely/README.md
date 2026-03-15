# How to Update the Calico FelixConfiguration Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, FelixConfiguration, Kubernetes, Networking, Security, Operations

Description: Safely update FelixConfiguration resources to modify Felix data plane behavior without disrupting cluster networking.

---

## Introduction

The FelixConfiguration resource controls critical data plane behavior in Calico, including iptables rule management, failsafe ports, and protocol settings. Unlike many Kubernetes resources, changes to FelixConfiguration take effect immediately across all affected nodes, which means a misconfiguration can instantly disrupt cluster networking.

Certain FelixConfiguration fields are particularly dangerous to modify. Removing failsafe ports can lock you out of nodes, changing the chain insert mode can break policy enforcement, and toggling the BPF data plane requires careful coordination. Understanding which fields are safe to change at runtime versus which require a maintenance window is essential.

This guide provides a systematic approach to updating FelixConfiguration safely, including pre-change validation, rollback procedures, and field-specific guidance.

## Prerequisites

- A running Kubernetes cluster with Calico CNI
- `calicoctl` installed and configured
- `kubectl` with cluster-admin privileges
- A backup of your current FelixConfiguration

## Backing Up the Current Configuration

Always back up before making changes:

```bash
calicoctl get felixconfiguration default -o yaml > felix-backup-$(date +%Y%m%d-%H%M%S).yaml
```

If you have per-node overrides, back up all configurations:

```bash
calicoctl get felixconfiguration -o yaml > felix-all-backup-$(date +%Y%m%d-%H%M%S).yaml
```

## Identifying Safe vs Risky Fields

Fields that are safe to change at runtime with minimal risk:

```yaml
# Safe to update
spec:
  logSeverityScreen: Debug          # Changes logging only
  reportingInterval: 60s            # Adjusts reporting frequency
  prometheusMetricsEnabled: true    # Enables metrics endpoint
  prometheusMetricsPort: 9091       # Changes metrics port
```

Fields that require caution and should be tested first:

```yaml
# Requires caution
spec:
  chainInsertMode: Append           # Can break policy enforcement
  defaultEndpointToHostAction: Drop # Affects host connectivity
  bpfEnabled: true                  # Switches entire data plane
  ipipEnabled: false                # Disables overlay networking
```

## Updating Logging Configuration Safely

Changing log levels is the safest type of update:

```bash
calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Debug"}}'
```

Verify the change:

```bash
calicoctl get felixconfiguration default -o yaml | grep logSeverity
```

Remember to revert after debugging:

```bash
calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Info"}}'
```

## Updating Failsafe Ports Safely

Failsafe ports prevent you from being locked out of nodes. Always add new ports before removing old ones:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  failsafeInboundHostPorts:
    - protocol: tcp
      port: 22
    - protocol: tcp
      port: 53
    - protocol: udp
      port: 53
    - protocol: tcp
      port: 179
    - protocol: udp
      port: 67
    - protocol: tcp
      port: 10250
  failsafeOutboundHostPorts:
    - protocol: tcp
      port: 53
    - protocol: udp
      port: 53
    - protocol: tcp
      port: 179
    - protocol: tcp
      port: 443
    - protocol: udp
      port: 67
```

Apply and immediately verify SSH access to a node:

```bash
calicoctl apply -f felix-failsafe-updated.yaml
ssh node01 "echo 'SSH access confirmed'"
```

## Testing Changes on a Single Node First

Before applying changes cluster-wide, test on one node using a per-node override:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: node.test-node-01
spec:
  defaultEndpointToHostAction: Accept
```

```bash
calicoctl apply -f felix-test-node.yaml
```

Verify the test node is functioning correctly before applying to the default:

```bash
kubectl run test --image=busybox --restart=Never --overrides='{"spec":{"nodeName":"test-node-01"}}' -- wget -qO- http://kubernetes.default.svc
kubectl delete pod test
```

## Rolling Back a Bad Change

If a change causes issues, restore immediately from your backup:

```bash
calicoctl apply -f felix-backup-20260315-120000.yaml
```

If you cannot access the API server, restart the calico-node pods to pick up the reverted configuration:

```bash
kubectl rollout restart daemonset -n kube-system calico-node
```

## Verification

After any update, run these checks:

```bash
# Verify configuration applied
calicoctl get felixconfiguration default -o yaml

# Check Felix is healthy
kubectl get pods -n kube-system -l k8s-app=calico-node

# Test pod connectivity
kubectl run verify --image=busybox --restart=Never -- wget -qO- --timeout=5 http://kubernetes.default.svc
kubectl delete pod verify
```

## Troubleshooting

If nodes lose connectivity after a FelixConfiguration change, check Felix logs for errors:

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=50
```

If iptables rules are inconsistent, trigger a resync:

```bash
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -c calico-node -- calico-node -felix-live
```

If you are locked out of nodes due to failsafe port changes, access the node through the cloud provider console and fix the FelixConfiguration from there.

## Conclusion

Updating FelixConfiguration requires understanding the impact of each field on the data plane. Always back up before changes, test on individual nodes when possible, and verify connectivity immediately after applying updates. Having a rollback plan ready before making changes ensures you can recover quickly from misconfigurations that affect cluster-wide networking.
