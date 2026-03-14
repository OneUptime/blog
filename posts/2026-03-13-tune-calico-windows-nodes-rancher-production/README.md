# How to Tune Calico on Windows Nodes with Rancher for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Rancher, Networking, CNI, Performance, Production

Description: A guide to performance-tuning Calico on Windows nodes in a Rancher-managed cluster for production workloads.

---

## Introduction

Production tuning for Calico on Windows nodes in Rancher-managed clusters follows the same Windows-specific tuning parameters as non-Rancher deployments, with the additional consideration that some tuning changes - particularly those that modify the Installation CR - should be reviewed to ensure they don't conflict with Rancher's cluster lifecycle management. Rancher may overwrite Installation CR changes during cluster upgrades if those changes are not compatible with Rancher's expected configuration.

To avoid conflicts, prefer making configuration changes through `calicoctl` (for Felix and IP pool settings) rather than patching the Installation CR directly, unless you have confirmed that Rancher will not revert those changes.

## Prerequisites

- Rancher-managed cluster with Windows and Linux nodes running Calico
- Access to Rancher UI and kubectl
- `calicoctl` installed
- PowerShell access to Windows nodes

## Step 1: Tune MTU (Rancher-Safe Method)

Instead of patching the Installation CR, configure MTU through Felix.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"vxlanMTU":1450}}'
```

## Step 2: Tune Felix for Production

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true,
    "prometheusMetricsPort": 9091,
    "routeRefreshInterval": "60s",
    "iptablesRefreshInterval": "90s"
  }}'
```

## Step 3: Tune Windows OS Networking

On each Windows node:

```powershell
# Enable RSS for multi-core NIC utilization
Get-NetAdapter | Enable-NetAdapterRss

# Tune TCP
netsh int tcp set global autotuninglevel=normal
netsh int tcp set supplemental Internet cwnd=10

# Increase netfilter connection tracking (if applicable)
```

## Step 4: Configure Rancher Monitoring for Calico

If Rancher Monitoring (Prometheus + Grafana) is installed:

```bash
# Create ServiceMonitor for Calico Felix
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-felix
  namespace: cattle-monitoring-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: calico-node
  endpoints:
  - port: metrics
    interval: 30s
EOF
```

## Step 5: Optimize IPAM for Windows

```bash
calicoctl patch ippool windows-ippool \
  --patch '{"spec":{"blockSize":24}}'
```

Larger blocks reduce IPAM API calls for clusters with many short-lived Windows pods.

## Step 6: Verify Tuning with Rancher Monitoring

In Rancher UI:
- Navigate to **Cluster** > **Monitoring**
- Check the Calico Felix metrics dashboard for `felix_exec_time_seconds`

## Conclusion

Production tuning for Calico on Windows nodes in Rancher uses `calicoctl` for Felix and IP pool settings to avoid conflicts with Rancher's cluster lifecycle management, while Windows OS tuning is applied directly on each node. Rancher Monitoring integration provides ongoing visibility into Calico's performance metrics through the Grafana dashboards built into Rancher's monitoring stack.
