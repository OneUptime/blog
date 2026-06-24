# How to Tune Calico on Windows Nodes with the Operator for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Operator, Networking, CNI, Performance, Production

Description: A guide to tuning operator-managed Calico on Windows nodes for production performance in mixed Linux/Windows Kubernetes clusters.

---

## Introduction

Production tuning for operator-managed Calico on Windows nodes combines operator-level configuration through the Installation CR with Windows OS-level networking tuning. The operator provides cleaner access to some configuration parameters through its CRDs than the manual installation approach, but Windows-specific OS tuning still requires direct node access.

The primary performance levers for Windows Calico are supported MTU optimization, HNS configuration, Windows TCP stack tuning, and appropriate resource allocation for the Windows DaemonSet pods. These settings together help Windows workloads achieve consistent, low-latency networking in production.

## Prerequisites

- Calico running on Windows and Linux nodes via the Tigera Operator
- `kubectl` with cluster admin access
- PowerShell access to Windows nodes

## Step 1: Configure MTU in the Installation CR

For supported dataplanes, set the pod network MTU through the Installation CR. If your Windows nodes use Calico VXLAN, check the current Windows limitations first because Calico documents VXLAN MTU settings as unsupported on Windows.

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

## Step 2: Tune the Windows DaemonSet Resources

The Windows node and Felix containers need adequate CPU and memory for production clusters. In an operator-managed installation, set these resources in the Installation CR so the operator reconciles them onto the `calico-node-windows` DaemonSet.

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNodeWindowsDaemonSet":{"spec":{"template":{"spec":{"containers":[{"name":"node","resources":{"requests":{"cpu":"200m","memory":"256Mi"},"limits":{"cpu":"1","memory":"512Mi"}}},{"name":"felix","resources":{"requests":{"cpu":"200m","memory":"256Mi"},"limits":{"cpu":"1","memory":"512Mi"}}}]}}}}}}'
```

## Step 3: Tune Windows OS Networking Stack

On each Windows node, run PowerShell as Administrator:

```powershell
# Review the active Internet TCP template
netsh int tcp show supplemental template=internet

# Enable RSS
Enable-NetAdapterRss -Name "*"

# Enable receive window auto-tuning
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

If count is high, avoid policies with rules that use both source and destination selectors. Where possible, move destination matching into the policy selector so fewer Windows data plane rules need to be programmed.

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
