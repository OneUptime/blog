# How to Create the Calico FelixConfiguration Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, FelixConfiguration, Kubernetes, Networking, Security, Dataplane

Description: Learn how to create Calico FelixConfiguration resources to customize the Felix data plane agent behavior for your cluster.

---

## Introduction

Felix is the primary data plane agent in Calico, running on every node to program routes, ACLs, and iptables rules. The FelixConfiguration resource controls Felix's behavior, including logging levels, iptables settings, failsafe ports, and data plane performance tuning.

Every Calico installation includes a default FelixConfiguration resource. You can customize this default resource or create per-node overrides to apply different settings to specific nodes. This flexibility allows you to fine-tune network policy enforcement and data plane behavior across heterogeneous clusters.

This guide walks through creating FelixConfiguration resources for common use cases, from basic logging changes to advanced iptables tuning and failsafe port configuration.

## Prerequisites

- A Kubernetes cluster with Calico CNI installed
- `calicoctl` installed and configured
- `kubectl` with cluster-admin privileges
- Understanding of iptables and Linux networking basics

## Understanding the Default FelixConfiguration

Every Calico cluster has a default FelixConfiguration. View it with:

```bash
calicoctl get felixconfiguration default -o yaml
```

The default resource applies to all nodes unless overridden by a node-specific configuration.

## Creating a Custom Default FelixConfiguration

To customize the cluster-wide Felix settings:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  reportingInterval: 30s
  ipipEnabled: true
  wireguardEnabled: false
  bpfEnabled: false
  chainInsertMode: Insert
  defaultEndpointToHostAction: Drop
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

Apply the configuration:

```bash
calicoctl apply -f felix-default.yaml
```

## Creating a Node-Specific FelixConfiguration

For nodes that need different settings, create a per-node override. The name must match the Calico node name:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: node.worker-gpu-01
spec:
  logSeverityScreen: Warning
  ipipEnabled: true
  chainInsertMode: Insert
  defaultEndpointToHostAction: Drop
```

Apply it:

```bash
calicoctl apply -f felix-gpu-node.yaml
```

## Enabling BPF Data Plane

To create a FelixConfiguration that enables the eBPF data plane:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: true
  bpfExternalServiceMode: DSR
  bpfLogLevel: Off
  bpfDataIfacePattern: "^(en|eth|ens|bond)"
  logSeverityScreen: Info
```

```bash
calicoctl apply -f felix-bpf.yaml
```

## Configuring Prometheus Metrics

Enable Felix to expose Prometheus metrics:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
  prometheusGoMetricsEnabled: true
  prometheusProcessMetricsEnabled: true
  logSeverityScreen: Info
```

```bash
calicoctl apply -f felix-prometheus.yaml
```

Verify the metrics endpoint is available:

```bash
kubectl exec -n kube-system -it $(kubectl get pod -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- wget -qO- http://localhost:9091/metrics | head -20
```

## Verification

Confirm the FelixConfiguration was created or updated:

```bash
calicoctl get felixconfiguration -o wide
```

Check that Felix picked up the new configuration by reviewing its logs:

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=20 | grep -i "felix"
```

Verify specific settings are active:

```bash
calicoctl get felixconfiguration default -o yaml | grep -E "bpfEnabled|ipipEnabled|logSeverity"
```

## Troubleshooting

If Felix fails to start after a configuration change, check the calico-node pod status:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl describe pod -n kube-system -l k8s-app=calico-node | grep -A 5 "State:"
```

If you accidentally removed failsafe ports and lost SSH access, the calico-node container can be restarted with the corrected configuration applied from a machine that still has API access.

For BPF mode issues, check kernel compatibility:

```bash
kubectl exec -n kube-system -it $(kubectl get pod -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- uname -r
```

BPF mode requires Linux kernel 5.3 or later.

## Conclusion

The FelixConfiguration resource gives you fine-grained control over Calico's data plane agent. Whether you need to adjust logging, enable BPF, configure failsafe ports, or expose Prometheus metrics, creating the right FelixConfiguration ensures Felix operates according to your cluster's requirements. Always verify changes take effect by checking Felix logs and testing connectivity after applying new configurations.
