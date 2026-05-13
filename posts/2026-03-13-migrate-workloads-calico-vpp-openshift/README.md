# How to Migrate Existing Workloads to Calico VPP on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Migration

Description: A guide to migrating OpenShift workloads from standard Calico to the Calico VPP high-performance data plane.

---

## Introduction

Migrating OpenShift workloads from standard Calico to Calico VPP is a data plane migration - the Calico control plane, network policy model, and IPAM remain Calico-managed. The migration replaces the iptables or eBPF packet processing path with VPP's user-space processing pipeline. This is a lower-risk migration than a full CNI replacement because the network policy model and service discovery are preserved.

On OpenShift, the migration requires additional preparation: applying the OpenShift-specific VPP namespace, RBAC, service account, VPP configuration, and VPP DaemonSet manifests alongside the existing Calico installation. Hugepages are only required when you choose a VPP driver that needs them, such as DPDK or a native device driver. The VPP components start processing traffic on each node as they become ready, with brief connectivity disruption possible during the VPP handoff.

## Prerequisites

- OpenShift cluster with Calico installed (standard data plane)
- `oc` CLI with cluster admin access
- Maintenance window planned for the data plane rollout and any node reboots required by optional hugepage or driver changes

## Step 1: Document Pre-Migration Workload State

```bash
oc get all -A -o yaml > pre-migration-workloads.yaml
oc get networkpolicies -A -o yaml > pre-migration-policies.yaml
oc get globalnetworkpolicies,networkpolicies.projectcalico.org,globalnetworksets,networksets.projectcalico.org -A -o yaml > pre-migration-calico-policies.yaml
```

## Step 2: Configure Hugepages via MCO, If Your VPP Driver Requires Them

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

Skip this step if you are using the OpenShift `04-calico-vpp-nohuge.yaml` manifest with the default `af_packet` driver.

## Step 3: Download the OpenShift VPP Manifests

```bash
git clone https://github.com/projectcalico/vpp-dataplane.git
cd vpp-dataplane

cp yaml/platforms/openshift/00-namespace-calico-vpp-dataplane.yaml .
cp yaml/platforms/openshift/03-configmap-calico-vpp-resources.yaml .
cp yaml/platforms/openshift/03-role-calico-vpp-dataplane.yaml .
cp yaml/platforms/openshift/03-rolebinding-calico-vpp-dataplane.yaml .
cp yaml/platforms/openshift/03-serviceaccount-calico-vpp-dataplane.yaml .
cp yaml/platforms/openshift/04-calico-vpp-nohuge.yaml .
```

## Step 4: Deploy VPP Components

```bash
SERVICE_CIDR=$(oc get network.config.openshift.io cluster -o jsonpath='{.spec.serviceNetwork[0]}')

# Set service CIDR and primary interface name
sed -i "s#SERVICE_PREFIX:.*#SERVICE_PREFIX: ${SERVICE_CIDR}#" 03-configmap-calico-vpp-resources.yaml
sed -i 's/"interfaceName": "ens5"/"interfaceName": "ens3"/' 03-configmap-calico-vpp-resources.yaml

oc apply -f 00-namespace-calico-vpp-dataplane.yaml
oc apply -f 03-configmap-calico-vpp-resources.yaml
oc apply -f 03-role-calico-vpp-dataplane.yaml
oc apply -f 03-rolebinding-calico-vpp-dataplane.yaml
oc apply -f 03-serviceaccount-calico-vpp-dataplane.yaml
oc patch installation.operator.tigera.io default --type=merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"VPP"}}}'
oc apply -f 04-calico-vpp-nohuge.yaml
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

Migrating OpenShift workloads to Calico VPP requires the OpenShift-specific Calico VPP manifests and, only for drivers that require them, MCO-managed hugepage configuration with associated node reboots. The data plane migration preserves the Calico network policy model and Routes, making it mostly transparent to workloads while delivering the throughput improvements that VPP provides.
