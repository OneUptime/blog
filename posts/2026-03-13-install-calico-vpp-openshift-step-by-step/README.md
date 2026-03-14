# How to Install Calico VPP on OpenShift Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico with the VPP high-performance data plane on OpenShift clusters.

---

## Introduction

Installing Calico VPP on OpenShift combines the requirements of Calico on OpenShift (SCCs, network operator management, OpenShift-specific configuration) with the hardware and OS requirements of VPP (hugepages, DPDK-compatible NICs, kernel hugepage configuration). OpenShift's immutable node OS (RHEL CoreOS) adds additional constraints for low-level OS configuration like hugepage setup, which must be done through the Machine Config Operator (MCO) rather than direct node modification.

OpenShift's MCO provides a declarative way to configure hugepages and kernel parameters on RHCOS nodes, making it the correct tool for preparing OpenShift nodes for VPP deployment.

## Prerequisites

- A self-managed OpenShift 4.x cluster with Calico installed
- Nodes with DPDK-compatible NICs
- `oc` CLI with cluster admin access
- MCO access for hugepage configuration

## Step 1: Configure Hugepages via MCO

OpenShift's MCO manages RHCOS node configuration. Apply a MachineConfig for hugepages.

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
oc apply -f hugepages-machineconfig.yaml
# Wait for nodes to cycle through the MCO
oc get machineconfigpool worker -w
```

## Step 2: Create SCC for VPP

VPP requires privileged access to bind to interfaces and manage hugepages.

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: calico-vpp-scc
allowPrivilegedContainer: true
allowHostNetwork: true
allowHostPID: false
allowHostPorts: true
users:
  - system:serviceaccount:calico-vpp-dataplane:calico-vpp-node
groups: []
```

```bash
oc apply -f calico-vpp-scc.yaml
```

## Step 3: Install Calico VPP

```bash
git clone https://github.com/projectcalico/vpp-dataplane.git
cd vpp-dataplane

# Update the interface name in the manifest
sed -i 's/CALICOVPP_INTERFACE.*/CALICOVPP_INTERFACE: eth1/' yaml/calico-vpp.yaml

oc apply -f yaml/calico-vpp.yaml
```

## Step 4: Monitor Deployment

```bash
oc get pods -n calico-vpp-dataplane -w
oc logs -n calico-vpp-dataplane <vpp-manager-pod> --tail=30
```

## Step 5: Verify VPP Is Running

```bash
oc exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
oc exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show version
```

## Step 6: Verify OpenShift System Pods

```bash
oc get pods -n openshift-ingress
oc get pods -n openshift-dns
```

System pods must remain healthy after the VPP installation.

## Conclusion

Installing Calico VPP on OpenShift requires using the Machine Config Operator for hugepage configuration on immutable RHCOS nodes, creating an appropriate SCC for VPP's privileged requirements, and deploying the VPP manifests. OpenShift's MCO-based node configuration ensures that hugepages persist across node reboots without manual intervention on individual nodes.
