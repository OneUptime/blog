# How to Fix Provision 2 worker nodes in Cilium performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Performance, Kubernetes

Description: A practical guide covering how to fix provision 2 worker nodes in cilium performance with step-by-step instructions and real-world examples for production Kubernetes clusters.

---

## Introduction

Worker node management is critical for Cilium performance testing. Each node runs a cilium-agent instance that must be properly configured and healthy for accurate benchmark results and reliable networking.

In this guide, we cover managing worker nodes in Cilium environments in a Kubernetes environment. Cilium leverages eBPF technology to provide high-performance networking, security, and observability for cloud-native workloads. The eBPF programs are loaded directly into the Linux kernel, enabling efficient packet processing without the overhead of traditional iptables-based networking stacks.

Whether you are running a small development cluster or a large production environment with thousands of pods, the techniques in this guide will help you maintain a reliable Cilium deployment. We provide step-by-step instructions with real commands and configuration examples that you can adapt to your environment.

## Prerequisites

- A running Kubernetes cluster (v1.21+) with Cilium installed (v1.14+)
- `kubectl` configured for cluster access
- `cilium` CLI installed (matching your Cilium version)
- Helm 3.x for configuration management
- Basic familiarity with Kubernetes networking concepts
- Access to cluster nodes for troubleshooting (recommended)
- Prometheus and Grafana for metrics visualization (recommended)

## Identifying the Issue

Before applying a fix, confirm the exact nature of the problem through systematic diagnosis.

```bash
# Check Cilium status for immediate issues
cilium status --verbose

# Review recent agent logs for error patterns
kubectl logs -n kube-system -l k8s-app=cilium --tail=200 -c cilium-agent | grep -i error | tail -20

# Check for pod scheduling or resource issues
kubectl get pods -n kube-system -l k8s-app=cilium -o wide
kubectl describe pods -n kube-system -l k8s-app=cilium | grep -A 5 "Events:"
```

## Applying the Fix

Based on the identified issue, apply the appropriate fix. Always make changes through Helm to maintain configuration consistency.

```yaml
# cilium-fix-values.yaml
# Adjust Cilium configuration to resolve the identified issue
# Increase resource limits for agent stability
resources:
  limits:
    cpu: "2000m"
    memory: "2Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"

# Optimize identity management
labels:
  exclude:
    - "k8s:pod-template-hash"
    - "k8s:controller-revision-hash"
    - "k8s:job-name"

# Enable monitoring for ongoing visibility
prometheus:
  enabled: true
```

```bash
# Apply the fix through Helm
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-fix-values.yaml

# Wait for the rollout to complete
kubectl rollout status daemonset/cilium -n kube-system --timeout=300s

# Verify the fix was applied
cilium config view | head -20
```

## Post-Fix Validation

After applying the fix, validate that the issue is resolved and no new issues were introduced.

```bash
# Run connectivity tests
cilium connectivity test --single-node

# Check endpoint health
cilium endpoint list | grep -v ready | grep -v ENDPOINT

# Verify no error patterns in logs after the fix
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 --since=5m | grep -i error | wc -l

# Check resource usage is within expected bounds
kubectl top pods -n kube-system -l k8s-app=cilium
```

```mermaid
flowchart TD
    A[Issue Confirmed] --> B[Plan Fix]
    B --> C[Update Helm Values]
    C --> D[Apply via Helm Upgrade]
    D --> E[Wait for Rollout]
    E --> F[Run Connectivity Test]
    F --> G{Tests Pass?}
    G -->|Yes| H[Monitor for Recurrence]
    G -->|No| I[Rollback and Investigate]
    I --> B
```

## Preventing Recurrence

Implement monitoring and alerting to catch similar issues before they impact production.

```yaml
# cilium-alerts.yaml
# PrometheusRule to detect similar issues early
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-preventive-alerts
  namespace: kube-system
spec:
  groups:
    - name: cilium-health
      rules:
        - alert: CiliumAgentHighMemory
          expr: container_memory_working_set_bytes{namespace="kube-system",container="cilium-agent"} > 1.5e9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Cilium agent memory usage exceeds 1.5GB"
```


## Verification

After completing the steps above, run a comprehensive verification to confirm everything is working as expected.

```bash
# Check overall Cilium deployment health
cilium status --verbose

# Verify inter-node connectivity
cilium health status

# Confirm all Cilium pods are running and ready
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Verify the Cilium operator is healthy
kubectl get pods -n kube-system -l name=cilium-operator

# Check for recent error events
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10

# Run a connectivity test to validate the data plane
cilium connectivity test --single-node

# Verify endpoint count matches expected pod count
echo "Cilium endpoints: $(cilium endpoint list -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
```

## Troubleshooting

If you encounter issues during or after the steps in this guide, use the following troubleshooting procedures:

- **Cilium agent not starting**: Check resource limits and node capacity with `kubectl describe pod -n kube-system -l k8s-app=cilium`. Verify the BPF filesystem is mounted at `/sys/fs/bpf` and the kernel version is 4.19 or later. Check init container logs with `kubectl logs -n kube-system <pod> -c cilium-init`.

- **Connectivity failures**: Run `cilium connectivity test` and inspect the specific failing test case. Check for conflicting network policies with `cilium policy get`. Verify inter-node tunnel connectivity with `cilium bpf tunnel list`.

- **Configuration not applied**: Verify the Helm values or ConfigMap are correctly formatted. Run `kubectl rollout restart daemonset/cilium -n kube-system` and wait for the rollout to complete. Confirm with `cilium config view`.

- **High resource usage**: Review resource consumption with `kubectl top pods -n kube-system -l k8s-app=cilium`. Consider tuning label exclusion to reduce identity count. Increase agent memory limits if needed. Check `cilium metrics list | grep process_resident_memory`.

- **Endpoints stuck in regenerating state**: This usually indicates the agent is overloaded or encountering errors during BPF program compilation. Check agent logs with `kubectl logs -n kube-system -l k8s-app=cilium --tail=200 | grep -i error`.

- **Policy not being enforced**: Verify the policy selectors match the intended pods using `cilium endpoint list`. Confirm the policy is applied with `cilium policy get`. Check that the endpoint has the correct identity with `cilium endpoint get <id>`.

To collect a comprehensive diagnostic bundle for further analysis:

```bash
# Generate a Cilium sysdump containing all diagnostic information
# This collects logs, configs, BPF maps, and cluster state
cilium sysdump --output-filename cilium-diag-$(date +%Y%m%d)
```

## Conclusion

This guide covered managing worker nodes in Cilium environments with practical steps you can apply to your Kubernetes cluster. Regular monitoring, systematic validation, and proactive management are essential for maintaining a healthy Cilium deployment at any scale.

Key takeaways from this guide:

- Always assess the current state before making changes to your Cilium configuration
- Use Helm for configuration management to ensure consistency and reproducibility across environments
- Monitor Cilium metrics through Prometheus to detect issues before they impact workloads
- Test changes in a staging environment before applying them to production clusters
- Maintain runbooks documenting your Cilium configuration decisions and operational procedures
- Use `cilium sysdump` to collect comprehensive diagnostic data when investigating issues

As your cluster grows and evolves, revisit these configurations periodically and adjust them to match your current requirements. The Cilium community and documentation are excellent resources for staying current with best practices and new features.
