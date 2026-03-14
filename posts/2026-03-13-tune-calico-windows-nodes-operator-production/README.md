# How to Tune Calico on Windows Nodes with the Operator for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, CNI, Performance, Production

Description: A guide to tuning operator-managed Calico on Windows nodes for production performance in mixed Linux/Windows Kubernetes clusters.

---

## Introduction

Production tuning for operator-managed Calico on Windows nodes combines operator-level configuration through the Installation CR with Windows OS-level networking tuning. The operator provides cleaner access to some configuration parameters through its CRDs than the manual installation approach, but Windows-specific OS tuning still requires direct node access.

The primary performance levers for Windows Calico are MTU optimization, HNS configuration, Windows TCP stack tuning, and appropriate resource allocation for the Windows DaemonSet pods. These settings together help Windows workloads achieve consistent, low-latency networking in production.

## Prerequisites

- Calico running on Windows and Linux nodes via the Tigera Operator
- `kubectl` with cluster admin access
- PowerShell access to Windows nodes

## Step 1: Configure MTU in the Installation CR

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

## Step 2: Tune the Windows DaemonSet Resources

The Windows calico-node container needs adequate CPU and memory for production clusters.

```bash
kubectl patch daemonset calico-node-windows -n calico-system --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources","value":{"requests":{"cpu":"200m","memory":"256Mi"},"limits":{"cpu":"1","memory":"512Mi"}}}]'
```

## Step 3: Tune Windows OS Networking Stack

On each Windows node:

```powershell
# Increase TCP receive window
netsh int tcp set supplemental Internet cwnd=10

# Enable RSS
Get-NetAdapter | Enable-NetAdapterRss

# Tune socket buffers
netsh int tcp set global autotuninglevel=normal
```

## Step 4: Configure Felix for Windows

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "prometheusMetricsEnabled": true,
    "logSeverityScreen": "Warning"
  }}'
```

## Step 5: Monitor HNS Policy Count

For clusters with many network policies, HNS can have performance issues at high policy counts.

```powershell
# Check HNS policy list count on Windows node
Get-HnsPolicyList | Measure-Object
```

If count is high, consolidate NetworkPolicy objects by using namespace selectors rather than pod selectors where possible.

## Step 6: Check Windows Node Network Performance

```powershell
# Monitor real-time network throughput
Get-Counter '\Network Interface(*)\Bytes Received/sec','\Network Interface(*)\Bytes Sent/sec' -Continuous
```

## Step 7: Verify Operator Status After Tuning

```bash
kubectl get tigerastatus
kubectl get installation default -o yaml | grep -A5 "calicoNetwork"
```

## Conclusion

Production tuning for operator-managed Windows Calico combines Installation CR MTU configuration, Windows DaemonSet resource adjustments, Windows OS TCP stack optimization, and Felix metrics enablement. The operator's centralized configuration model ensures MTU and other network settings are applied consistently, while OS-level tuning must still be performed directly on each Windows node.
