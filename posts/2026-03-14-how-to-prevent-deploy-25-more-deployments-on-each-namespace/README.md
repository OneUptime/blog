# How to Prevent Deploy 25 more deployments on each namespace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Performance, Kubernetes

Description: A practical guide covering how to prevent deploy 25 more deployments on each namespace in cilium performance with step-by-step instructions and real-world examples for production Kubernetes clusters.

---

## Introduction

Large-scale deployments across multiple namespaces stress-test Cilium's identity management, policy computation, and endpoint programming capabilities. Understanding the behavior at scale is essential for capacity planning.

In this guide, we cover managing multi-namespace deployments with Cilium in a Kubernetes environment. Cilium leverages eBPF technology to provide high-performance networking, security, and observability for cloud-native workloads. The eBPF programs are loaded directly into the Linux kernel, enabling efficient packet processing without the overhead of traditional iptables-based networking stacks.

Whether you are running a small development cluster or a large production environment with thousands of pods, the techniques in this guide will help you maintain a reliable Cilium deployment. We provide step-by-step instructions with real commands and configuration examples that you can adapt to your environment.

## Prerequisites

- A running Kubernetes cluster with a Cilium version compatible with your Kubernetes version
- `kubectl` configured for cluster access
- `cilium` CLI installed (matching your Cilium version)
- Helm 3.x for configuration management
- Basic familiarity with Kubernetes networking concepts
- Access to cluster nodes for troubleshooting (recommended)
- Prometheus and Grafana for metrics visualization (recommended)

## Prevention Strategy

Preventing issues is more effective than reactive troubleshooting. This section covers proactive measures to avoid common problems related to managing multi-namespace deployments with Cilium.

```bash
# Establish baseline metrics for your cluster

kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg metrics list | grep -E "endpoint|identity|endpoint_regenerations" > /tmp/cilium-baseline-$(date +%Y%m%d).txt

# Document current resource usage
kubectl top pods -n kube-system -l k8s-app=cilium > /tmp/cilium-resources-$(date +%Y%m%d).txt

# Record current configuration
cilium config view > /tmp/cilium-config-$(date +%Y%m%d).txt
```

## Implementing Preventive Controls

Resource Limits and Requests

```yaml
# cilium-preventive-values.yaml
# Set appropriate resource limits to prevent OOM and throttling
resources:
  limits:
    cpu: "2000m"
    memory: "2Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"

operator:
  resources:
    limits:
      cpu: "1000m"
      memory: "1Gi"
    requests:
      cpu: "200m"
      memory: "256Mi"
  prometheus:
    serviceMonitor:
      enabled: true

# Optimize identity management to prevent identity churn from job labels
labels: "!job-name"

# Enable monitoring for early detection
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true
```

```bash
# Apply preventive configuration
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-preventive-values.yaml
```

### Monitoring and Alerting

```yaml
# cilium-prevention-alerts.yaml
# PrometheusRule for early warning detection
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-prevention
  namespace: kube-system
spec:
  groups:
    - name: cilium-prevention
      rules:
        - alert: CiliumHighIdentityCount
          expr: sum(cilium_identity) > 5000
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Cilium identity count is growing - investigate label exclusion"
        - alert: CiliumAgentHighCPU
          expr: rate(container_cpu_usage_seconds_total{namespace="kube-system",container="cilium-agent"}[5m]) > 1.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Cilium agent CPU usage is elevated"
```

```bash
# Apply alerting rules
kubectl apply -f cilium-prevention-alerts.yaml
```

```mermaid
flowchart TD
    A[Prevention Strategy] --> B[Resource Limits]
    A --> C[Label Exclusion]
    A --> D[Monitoring Alerts]
    A --> E[Regular Audits]
    B --> F[Stable Agent Performance]
    C --> F
    D --> G[Early Issue Detection]
    E --> G
    F --> H[Reliable Cluster Networking]
    G --> H
```

## Regular Maintenance Schedule

Establish a regular maintenance routine to keep your Cilium deployment healthy:

```bash
# Weekly: Check Cilium health and resource trends
cilium status
kubectl top pods -n kube-system -l k8s-app=cilium

# Monthly: Review identity count trends and label exclusion effectiveness
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg identity list | wc -l
cilium config view | grep labels

# Quarterly: Review and update Cilium version
cilium version
helm list -n kube-system | grep cilium
```


## Verification

After completing the steps above, run a comprehensive verification to confirm everything is working as expected.

```bash
# Check overall Cilium deployment health
cilium status --verbose

# Verify inter-node connectivity
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-health status

# Confirm all Cilium pods are running and ready
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Verify the Cilium operator is healthy
kubectl get pods -n kube-system -l name=cilium-operator

# Check for recent error events
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10

# Run a connectivity test to validate the data plane
cilium connectivity test --single-node

# Verify endpoint count matches expected pod count
echo "Cilium endpoints: $(kubectl get ciliumendpoints --all-namespaces --no-headers 2>/dev/null | wc -l || echo 'N/A')"
```

## Troubleshooting

If you encounter issues during or after the steps in this guide, use the following troubleshooting procedures:

- **Cilium agent not starting**: Check resource limits and node capacity with `kubectl describe pod -n kube-system -l k8s-app=cilium`. Verify the BPF filesystem is mounted at `/sys/fs/bpf` and the host kernel meets the requirements for your Cilium version. Check the failing init container logs with `kubectl logs -n kube-system <pod> -c <init-container-name>`.

- **Connectivity failures**: Run `cilium connectivity test` and inspect the specific failing test case. Check for conflicting network policies with `kubectl get networkpolicies,ciliumnetworkpolicies --all-namespaces`. Verify node-to-node health with `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-health status`.

- **Configuration not applied**: Verify the Helm values or ConfigMap are correctly formatted. Run `kubectl rollout restart daemonset/cilium -n kube-system` and wait for the rollout to complete. Confirm with `cilium config view`.

- **High resource usage**: Review resource consumption with `kubectl top pods -n kube-system -l k8s-app=cilium`. Consider tuning label exclusion to reduce identity count. Increase agent memory limits if needed. Check agent metrics with `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg metrics list`.

- **Endpoints stuck in regenerating state**: This usually indicates the agent is overloaded or encountering errors during BPF program compilation. Check agent logs with `kubectl logs -n kube-system -l k8s-app=cilium -c cilium-agent --tail=200 | grep -i error`.

- **Policy not being enforced**: Verify the policy selectors match the intended pods using `kubectl get ciliumendpoints --all-namespaces`. Confirm the policy is applied with `kubectl get networkpolicies,ciliumnetworkpolicies --all-namespaces`. Check endpoint identity details with `kubectl get ciliumendpoint -n <namespace> <pod-name> -o yaml`.

To collect a comprehensive diagnostic bundle for further analysis:

```bash
# Generate a Cilium sysdump containing all diagnostic information
# This collects logs, configs, BPF maps, and cluster state
cilium sysdump --output-filename cilium-diag-$(date +%Y%m%d)
```

## Conclusion

This guide covered managing multi-namespace deployments with Cilium with practical steps you can apply to your Kubernetes cluster. Regular monitoring, systematic validation, and proactive management are essential for maintaining a healthy Cilium deployment at any scale.

Key takeaways from this guide:

- Always assess the current state before making changes to your Cilium configuration
- Use Helm for configuration management to ensure consistency and reproducibility across environments
- Monitor Cilium metrics through Prometheus to detect issues before they impact workloads
- Test changes in a staging environment before applying them to production clusters
- Maintain runbooks documenting your Cilium configuration decisions and operational procedures
- Use `cilium sysdump` to collect comprehensive diagnostic data when investigating issues

As your cluster grows and evolves, revisit these configurations periodically and adjust them to match your current requirements. The Cilium community and documentation are excellent resources for staying current with best practices and new features.
