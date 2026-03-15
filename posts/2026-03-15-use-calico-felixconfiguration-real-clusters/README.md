# How to Use the Calico FelixConfiguration Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, FelixConfiguration, Kubernetes, Networking, Production, Performance

Description: Practical guide to leveraging FelixConfiguration in production clusters for performance tuning, security hardening, and operational management.

---

## Introduction

In production Kubernetes clusters, the default Calico FelixConfiguration works for many scenarios but rarely provides optimal performance or security posture. Real-world deployments benefit from tuning Felix to match specific workload patterns, compliance requirements, and infrastructure constraints.

FelixConfiguration settings affect everything from iptables rule generation speed to flow log collection and host endpoint protection. Getting these settings right can significantly improve network policy enforcement performance, reduce CPU usage on nodes, and enable observability features that are disabled by default.

This guide covers production-tested FelixConfiguration patterns for common scenarios including high-throughput workloads, security-sensitive environments, and large-scale clusters.

## Prerequisites

- A production Kubernetes cluster running Calico v3.20 or later
- `calicoctl` installed and configured
- `kubectl` with cluster-admin access
- Familiarity with Linux networking and iptables

## Performance Tuning for High-Throughput Clusters

For clusters running latency-sensitive workloads, optimize Felix's iptables refresh interval and rule rendering:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  iptablesRefreshInterval: 90s
  iptablesPostWriteCheckInterval: 5s
  iptablesLockTimeout: 10s
  iptablesLockProbeInterval: 100ms
  routeRefreshInterval: 90s
  logSeverityScreen: Warning
  reportingInterval: 60s
```

Apply and monitor CPU usage before and after:

```bash
calicoctl apply -f felix-performance.yaml
kubectl top pods -n kube-system -l k8s-app=calico-node
```

## Security Hardening Configuration

For clusters requiring strict security posture:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  defaultEndpointToHostAction: Drop
  chainInsertMode: Insert
  logSeverityScreen: Info
  ipipEnabled: true
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
      port: 6443
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
    - protocol: tcp
      port: 6443
```

```bash
calicoctl apply -f felix-security.yaml
```

## Enabling Flow Logs for Compliance

Configure Felix to export flow logs for audit and compliance:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  flowLogsFlushInterval: 15s
  flowLogsFileEnabled: true
  flowLogsFileDirectory: /var/log/calico/flowlogs
  flowLogsFileMaxFiles: 5
  flowLogsFileMaxFileSizeMB: 100
  logSeverityScreen: Info
```

```bash
calicoctl apply -f felix-flowlogs.yaml
```

Verify flow logs are being written:

```bash
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -c calico-node -- ls -la /var/log/calico/flowlogs/
```

## Configuring Different Settings for Node Roles

Use per-node overrides to apply different configurations based on node role. For control plane nodes that need lighter monitoring:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: node.control-plane-01
spec:
  logSeverityScreen: Warning
  reportingInterval: 120s
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
```

For worker nodes handling high traffic:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: node.worker-high-traffic-01
spec:
  iptablesRefreshInterval: 120s
  routeRefreshInterval: 120s
  logSeverityScreen: Error
  reportingInterval: 30s
```

Apply both:

```bash
calicoctl apply -f felix-control-plane.yaml
calicoctl apply -f felix-worker.yaml
```

## Monitoring Felix Health in Production

Set up a script to check Felix status across all nodes:

```bash
#!/bin/bash
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[*].metadata.name}'); do
  node=$(kubectl get pod -n kube-system "$pod" -o jsonpath='{.spec.nodeName}')
  ready=$(kubectl get pod -n kube-system "$pod" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  echo "Node: $node | Pod: $pod | Ready: $ready"
done
```

## Verification

Confirm the active configuration on each node:

```bash
calicoctl get felixconfiguration -o wide
```

Verify Felix is applying the correct settings by checking iptables rules:

```bash
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -c calico-node -- iptables-save | grep -c cali
```

Test network policy enforcement is working:

```bash
kubectl run policy-test --image=busybox --restart=Never -- wget -qO- --timeout=5 http://kubernetes.default.svc
kubectl delete pod policy-test
```

## Troubleshooting

If Felix CPU usage is high, check the iptables refresh interval and rule count:

```bash
kubectl top pods -n kube-system -l k8s-app=calico-node --sort-by=cpu
```

If network policies are not being enforced, verify the chain insert mode:

```bash
calicoctl get felixconfiguration default -o yaml | grep chainInsertMode
```

If flow logs are not appearing, check the calico-node container has write access to the log directory:

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=20 | grep -i "flow"
```

## Conclusion

FelixConfiguration is the primary lever for tuning Calico's data plane behavior in production. By applying targeted configurations for performance, security, and observability, you can optimize Felix for your specific workload requirements. Use per-node overrides when different node roles require different settings, and always monitor Felix health metrics after making configuration changes.
