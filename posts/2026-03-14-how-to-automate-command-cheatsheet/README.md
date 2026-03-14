# How to Automate Command Cheatsheet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Automation, CLI

Description: A practical guide covering how to automate command cheatsheet with step-by-step instructions and real-world examples for production Kubernetes clusters.

---

## Introduction

The Cilium CLI provides a comprehensive set of commands for managing, monitoring, and troubleshooting your Cilium deployment. Mastering these commands is essential for efficient day-to-day operations.

In this guide, we cover Cilium CLI command operations in a Kubernetes environment. Cilium leverages eBPF technology to provide high-performance networking, security, and observability for cloud-native workloads. The eBPF programs are loaded directly into the Linux kernel, enabling efficient packet processing without the overhead of traditional iptables-based networking stacks.

Whether you are running a small development cluster or a large production environment with thousands of pods, the techniques in this guide will help you maintain a reliable Cilium deployment. We provide step-by-step instructions with real commands and configuration examples that you can adapt to your environment.

## Prerequisites

- A running Kubernetes cluster (v1.21+) with Cilium installed (v1.14+)
- `kubectl` configured for cluster access
- `cilium` CLI installed (matching your Cilium version)
- Helm 3.x for configuration management
- Basic familiarity with Kubernetes networking concepts
- Access to cluster nodes for troubleshooting (recommended)
- Prometheus and Grafana for metrics visualization (recommended)

## Automation Approach

Automating Cilium CLI command operations reduces operational overhead and ensures consistency across environments.

```bash
# Create an automation script for common operations
cat > /tmp/cilium-automation.sh << 'SCRIPT'
#!/bin/bash
# Cilium automation script
# This script automates common Cilium operational tasks

set -euo pipefail

# Function: Health check
health_check() {
    echo "Running Cilium health check..."
    cilium status --brief
    cilium health status 2>/dev/null || echo "Health check requires running cluster"
    echo "Identity count: $(cilium identity list 2>/dev/null | wc -l || echo 'N/A')"
    echo "Endpoint count: $(cilium endpoint list 2>/dev/null | wc -l || echo 'N/A')"
}

# Function: Collect diagnostics
collect_diagnostics() {
    local output_dir="${1:-/tmp/cilium-diagnostics}"
    mkdir -p "$output_dir"
    
    cilium status --verbose > "$output_dir/status.txt" 2>&1
    cilium endpoint list > "$output_dir/endpoints.txt" 2>&1
    cilium identity list > "$output_dir/identities.txt" 2>&1
    cilium metrics list > "$output_dir/metrics.txt" 2>&1
    kubectl top pods -n kube-system -l k8s-app=cilium > "$output_dir/resources.txt" 2>&1
    
    echo "Diagnostics collected in $output_dir"
}

# Function: Validate configuration
validate_config() {
    echo "Validating Cilium configuration..."
    cilium config view > /dev/null 2>&1 && echo "Config: OK" || echo "Config: FAILED"
    cilium status > /dev/null 2>&1 && echo "Status: OK" || echo "Status: FAILED"
}

# Main
case "${1:-help}" in
    health) health_check ;;
    diagnostics) collect_diagnostics "${2:-}" ;;
    validate) validate_config ;;
    *) echo "Usage: $0 {health|diagnostics|validate}" ;;
esac
SCRIPT
chmod +x /tmp/cilium-automation.sh
```

## CI/CD Integration

Integrate Cilium validation into your CI/CD pipeline:

```yaml
# .github/workflows/cilium-validation.yaml
# GitHub Actions workflow for Cilium validation
name: Cilium Validation
on:
  push:
    paths:
      - 'k8s/cilium/**'
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Cilium CLI
        run: |
          CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
          CLI_ARCH=amd64
          curl -L --fail --remote-name-all "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz"
          sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
      - name: Validate Helm Template
        run: |
          helm template cilium cilium/cilium -f k8s/cilium/values.yaml > /dev/null
```

## Scheduled Automation

```bash
# Create a cron job for regular health checks
# Add to crontab: crontab -e
# Run health check every hour
# 0 * * * * /tmp/cilium-automation.sh health >> /var/log/cilium-health.log 2>&1

# Run diagnostics collection daily
# 0 2 * * * /tmp/cilium-automation.sh diagnostics /tmp/cilium-daily-$(date +\%Y\%m\%d)
```

```mermaid
flowchart TD
    A[Automation Script] --> B{Trigger}
    B -->|Scheduled| C[Cron Job]
    B -->|CI/CD| D[Pipeline Step]
    B -->|Manual| E[CLI Invocation]
    C --> F[Health Check]
    D --> G[Validate Config]
    E --> H[Collect Diagnostics]
    F --> I[Log Results]
    G --> I
    H --> I
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

This guide covered Cilium CLI command operations with practical steps you can apply to your Kubernetes cluster. Regular monitoring, systematic validation, and proactive management are essential for maintaining a healthy Cilium deployment at any scale.

Key takeaways from this guide:

- Always assess the current state before making changes to your Cilium configuration
- Use Helm for configuration management to ensure consistency and reproducibility across environments
- Monitor Cilium metrics through Prometheus to detect issues before they impact workloads
- Test changes in a staging environment before applying them to production clusters
- Maintain runbooks documenting your Cilium configuration decisions and operational procedures
- Use `cilium sysdump` to collect comprehensive diagnostic data when investigating issues

As your cluster grows and evolves, revisit these configurations periodically and adjust them to match your current requirements. The Cilium community and documentation are excellent resources for staying current with best practices and new features.
