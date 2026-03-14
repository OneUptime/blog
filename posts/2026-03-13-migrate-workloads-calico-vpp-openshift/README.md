# How to Migrate Existing Workloads to Calico VPP on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Migration

Description: A guide to migrating OpenShift workloads from standard Calico to the Calico VPP high-performance data plane.

---

## Introduction

Migrating OpenShift workloads from standard Calico to Calico VPP is a data plane migration — the Calico control plane, network policies, and IP addressing remain unchanged. The migration replaces the iptables or eBPF packet processing path with VPP's user-space processing pipeline. This is a lower-risk migration than a full CNI replacement because the network policy model, pod IPs, and service discovery are all preserved.

On OpenShift, the migration requires additional preparation: configuring hugepages through MCO (which triggers node reboots), applying the VPP SCC, and deploying the VPP manifests alongside the existing Calico installation. The VPP components start processing traffic on each node as they become ready, with only brief connectivity disruption during the VPP handoff.

## Prerequisites

- OpenShift cluster with Calico installed (standard data plane)
- `oc` CLI with cluster admin access
- Maintenance window planned for MCO-induced node reboots

## Step 1: Document Pre-Migration Workload State

```bash
oc get all -A -o yaml > pre-migration-workloads.yaml
oc get networkpolicies -A -o yaml > pre-migration-policies.yaml
```

## Step 2: Configure Hugepages via MCO

```yaml
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  name: 99-worker-hugepages
  labels:
    machineconfiguration.openshift.io/role: worker
spec:
  kernelArguments:
    - hugepagesz=2M
    - hugepages=512
```

```bash
oc apply -f hugepages-mco.yaml
oc get machineconfigpool worker -w
# Wait for all workers to complete - this triggers rolling reboots
```

## Step 3: Apply VPP SCC

```bash
oc apply -f calico-vpp-scc.yaml
```

## Step 4: Deploy VPP Components

```bash
git clone https://github.com/projectcalico/vpp-dataplane.git
cd vpp-dataplane

# Set interface name
sed -i 's/CALICOVPP_INTERFACE.*/CALICOVPP_INTERFACE: ens3/' yaml/calico-vpp.yaml

oc apply -f yaml/calico-vpp.yaml
```

## Step 5: Monitor VPP Rollout

```bash
oc get pods -n calico-vpp-dataplane -w
```

## Step 6: Verify Workload Continuity

```bash
oc get pods -A | grep -v Running | grep -v Completed
oc get pods -n openshift-ingress
oc get nodes
```

Test that existing Routes still work:

```bash
curl -k https://$(oc get route console -n openshift-console -o jsonpath='{.spec.host}') -o /dev/null -s -w "%{http_code}"
```

## Step 7: Measure Performance Improvement

```bash
kubectl run iperf-a --image=nicolaka/netshoot -- sleep 300
kubectl run iperf-b --image=nicolaka/netshoot -- sleep 300
kubectl exec iperf-b -- iperf3 -s &
kubectl exec iperf-a -- iperf3 -c $(kubectl get pod iperf-b -o jsonpath='{.status.podIP}') -t 30
```

## Conclusion

Migrating OpenShift workloads to Calico VPP requires MCO-managed hugepage configuration (with associated node reboots), VPP SCC creation, and VPP component deployment alongside the existing Calico installation. The data plane migration preserves all network policies, pod IPs, and Routes, making it transparent to workloads while delivering the throughput improvements that VPP provides.
