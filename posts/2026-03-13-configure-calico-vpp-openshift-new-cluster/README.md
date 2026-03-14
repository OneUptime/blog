# How to Configure Calico VPP on OpenShift for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, CNI, Configuration

Description: A guide to configuring Calico VPP for an OpenShift cluster, including MCO-based node configuration and VPP data plane settings.

---

## Introduction

Configuring Calico VPP on OpenShift combines the standard Calico configuration (IP pools, Felix, BGP) with OpenShift-specific settings (SCCs, MCO-managed node configuration) and VPP-specific data plane settings. The configuration hierarchy has three layers: MCO configurations for OS-level settings on RHCOS nodes, Kubernetes manifests and CRDs for Calico and VPP configuration, and VPP startup configuration for the data plane itself.

Understanding which layer controls which settings prevents conflicts and makes ongoing configuration management predictable.

## Prerequisites

- Calico VPP installed on an OpenShift cluster
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Configure IP Pool for OpenShift

```bash
calicoctl get ippool default-ipv4-ippool -o yaml > current-ippool.yaml
```

Align with OpenShift's pod CIDR:

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"cidr":"10.128.0.0/14","encapsulation":"VXLAN","natOutgoing":true}}'
```

## Step 2: Apply OpenShift System Namespace Policy

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-openshift-system
spec:
  namespaceSelector: projectcalico.org/name starts with 'openshift-'
  ingress:
    - action: Allow
  egress:
    - action: Allow
  order: 10
```

```bash
calicoctl apply -f allow-openshift-system.yaml
```

## Step 3: Configure VPP for OpenShift NICs

OpenShift worker nodes often use specific NIC names. Update the VPP manager ConfigMap.

```bash
oc patch configmap calico-vpp-config -n calico-vpp-dataplane \
  --patch '{"data":{
    "CALICOVPP_INTERFACE": "ens3",
    "CALICOVPP_NATIVE_DRIVER": "af_packet"
  }}'
```

## Step 4: Configure Hugepages via MCO (Persistent)

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
  config:
    ignition:
      version: 3.2.0
    systemd:
      units:
        - name: dev-hugepages.mount
          enabled: true
```

```bash
oc apply -f hugepages-mco.yaml
```

## Step 5: Configure Felix for OpenShift+VPP

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true
  }}'
```

## Step 6: Verify Configuration

```bash
oc get tigerastatus
oc exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
calicoctl get ippool -o wide
```

## Conclusion

Configuring Calico VPP on OpenShift uses the Machine Config Operator for persistent OS-level configuration (hugepages), Calico CRDs for control plane settings (IP pools, Felix, GlobalNetworkPolicies for system namespaces), and VPP ConfigMaps for data plane interface settings. This three-layer configuration model reflects OpenShift's immutable node OS requirement while still providing the flexibility to tune VPP's data plane behavior.
