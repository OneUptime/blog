# How to Tune Calico VPP on OpenShift for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Performance, Production

Description: A guide to tuning Calico VPP for production performance on OpenShift, using MCO for OS-level settings and VPP ConfigMaps for data plane tuning.

---

## Introduction

Production tuning for Calico VPP on OpenShift uses the Machine Config Operator (MCO) for all OS-level performance settings - CPU isolation for VPP workers, hugepage allocation, and NUMA topology hints. This MCO-based approach ensures that performance settings persist across node reboots and are applied consistently to all worker nodes that match the MachineConfigPool selector.

VPP data plane tuning - buffer sizes, worker counts, and interface queue configuration - is managed through the VPP ConfigMap and the VPP startup configuration, which are applied as Kubernetes resources without requiring node restarts.

## Prerequisites

- Calico VPP running on OpenShift
- `oc` CLI with cluster admin access
- Nodes with DPDK-compatible NICs and adequate hugepage memory

## Step 1: Configure CPU Isolation for VPP Workers via MCO

```yaml
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  name: 99-worker-vpp-cpu-isolation
  labels:
    machineconfiguration.openshift.io/role: worker
spec:
  kernelArguments:
    - isolcpus=1-4
    - nohz_full=1-4
    - rcu_nocbs=1-4
    - hugepagesz=2M
    - hugepages=1024
```

```bash
oc apply -f vpp-cpu-isolation.yaml
oc get machineconfigpool worker -w
```

## Step 2: Increase VPP Buffer Pool

```bash
oc patch configmap vpp-config -n calico-vpp-dataplane \
  --patch '{"data":{"vpp.conf":"unix {\n  nodaemon\n}\nbuffers {\n  buffers-per-numa 512000\n  page-size 2m\n}\ncpu {\n  workers 4\n  corelist-workers 1-4\n}"}}'
```

## Step 3: Configure DPDK Multi-Queue

```yaml
# In vpp.conf
dpdk {
  dev 0000:01:00.0 {
    num-rx-queues 4
    num-tx-queues 4
    num-rx-desc 1024
    num-tx-desc 1024
  }
}
```

## Step 4: Enable VPP Prometheus Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'
```

Configure OpenShift Monitoring to scrape VPP metrics:

```bash
oc apply -f calico-vpp-servicemonitor.yaml
```

## Step 5: Verify CPU Isolation Is Active

```bash
oc debug node/<worker-node> -- chroot /host cat /sys/devices/system/cpu/isolated
```

Should show the isolated CPU range you configured.

## Step 6: Measure Production Throughput

```bash
oc run iperf-server --image=nicolaka/netshoot -n default -- iperf3 -s
oc run iperf-client --image=nicolaka/netshoot -n default -- iperf3 -c <server-ip> -t 60 -P 8
```

## Conclusion

Production tuning for Calico VPP on OpenShift uses MCO for persistent CPU isolation and hugepage configuration on RHCOS nodes, and VPP ConfigMaps for data plane buffer and queue tuning. The MCO-based CPU isolation ensures VPP worker threads run without interference from other processes, which is the most impactful single optimization for VPP throughput on NUMA-aware server hardware.
