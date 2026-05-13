# How to Install Calico VPP on OpenShift Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico with the VPP high-performance data plane on OpenShift clusters.

---

## Introduction

Installing Calico VPP on OpenShift combines the requirements of Calico on OpenShift (OpenShift-specific manifests, network operator management, OpenShift-specific configuration) with the optional hardware and OS requirements of VPP acceleration (hugepages, DPDK-compatible NICs, kernel hugepage configuration). OpenShift's immutable node OS (RHEL CoreOS) adds additional constraints for low-level OS configuration like hugepage setup, which must be done declaratively rather than by direct node modification.

OpenShift provides declarative node configuration through the Node Tuning Operator and Machine Config Operator, making those the correct tools for preparing RHCOS nodes when a VPP deployment needs hugepages.

## Prerequisites

- A new self-managed OpenShift 4.13 or later install on AWS
- Nodes that meet Calico's OpenShift and VPP requirements
- `oc` CLI with cluster admin access
- OpenShift installer access and a generated `manifests/` directory

## Step 1: Configure Hugepages if Needed

Hugepages are optional for Calico VPP. If your VPP configuration needs hugepages, configure them declaratively before deploying workloads. OpenShift documentation recommends the Node Tuning Operator for boot-time hugepage allocation on RHCOS worker nodes.

```yaml
apiVersion: tuned.openshift.io/v1
kind: Tuned
metadata:
  name: hugepages
  namespace: openshift-cluster-node-tuning-operator
spec:
  profile:
    - name: openshift-node-hugepages
      data: |
        [main]
        summary=Boot time configuration for hugepages
        include=openshift-node
        [bootloader]
        cmdline_openshift_node_hugepages=hugepagesz=2M hugepages=512
  recommend:
    - machineConfigLabels:
        machineconfiguration.openshift.io/role: "worker"
      priority: 30
      profile: openshift-node-hugepages
```

```bash
oc apply -f hugepages-tuned-boottime.yaml
# Wait for nodes to cycle through the Machine Config Pool update

oc get machineconfigpool worker -w
```

## Step 2: Add OpenShift VPP Manifests

VPP requires privileged access to bind to interfaces and manage host networking. Use the OpenShift-specific Calico VPP manifests, which include the namespace, RBAC, service account, VPP configuration, and DaemonSet resources expected by OpenShift.

```bash
mkdir vpp
cd vpp

curl -O "https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/00-namespace-calico-vpp-dataplane.yaml"
curl -o 03-cr-installation.yaml "https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/01-cr-installation.yaml"
curl -o 02-configmap-calico-vpp-resources.yaml "https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/03-configmap-calico-vpp-resources.yaml"
curl -o 02-role-calico-vpp-dataplane.yaml "https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/03-role-calico-vpp-dataplane.yaml"
curl -o 02-rolebinding-calico-vpp-dataplane.yaml "https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/03-rolebinding-calico-vpp-dataplane.yaml"
curl -o 02-serviceaccount-calico-vpp-dataplane.yaml "https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/03-serviceaccount-calico-vpp-dataplane.yaml"
curl -O "https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/04-calico-vpp-nohuge.yaml"

cd ..
cp vpp/* manifests/
```

## Step 3: Install Calico VPP

```bash
# Make sure SERVICE_PREFIX matches the OpenShift service network
SERVICE_CIDR=$(grep -A1 serviceNetwork: ./manifests/cluster-config.yaml | tail -n1 | cut -d '-' -f2)
sed -i "s#SERVICE_PREFIX:.*#SERVICE_PREFIX: $SERVICE_CIDR#" ./manifests/02-configmap-calico-vpp-resources.yaml

# Update the primary uplink interface name for your nodes
sed -i 's/"interfaceName": "ens5"/"interfaceName": "eth1"/' ./manifests/02-configmap-calico-vpp-resources.yaml

openshift-install create cluster
```

## Step 4: Monitor Deployment

```bash
oc get pods -n calico-vpp-dataplane -w
oc logs -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp --tail=30
```

## Step 5: Verify VPP Is Running

```bash
oc exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show interface
oc exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show version
```

## Step 6: Verify OpenShift System Pods

```bash
oc get pods -n openshift-ingress
oc get pods -n openshift-dns
```

System pods must remain healthy after the VPP installation.

## Conclusion

Installing Calico VPP on OpenShift requires using the OpenShift-specific Calico VPP manifests and configuring the VPP service CIDR and uplink interface correctly. When hugepages are required, OpenShift's declarative node configuration ensures that hugepages persist across node reboots without manual intervention on individual nodes.
