# How to Configure Calico on Windows Nodes with Rancher for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Rancher, Networking, CNI, Configuration

Description: A guide to configuring Calico networking for Windows nodes when creating a new Rancher-managed mixed Linux/Windows cluster.

---

## Introduction

Creating a new Rancher-managed cluster with Windows nodes and Calico as the CNI involves configuring the cluster at creation time rather than retrofitting an existing cluster. Rancher's cluster creation wizard handles many of the initial configuration steps, but Calico-specific settings - IP pools, encapsulation mode, MTU - require additional configuration through the standard Calico CRDs after the cluster is running.

Rancher passes Calico configuration through Helm chart values during cluster creation, and then the Tigera Operator manages the ongoing configuration. Understanding which settings to configure at creation time (through Rancher) versus post-creation time (through `calicoctl`) is key to a well-configured mixed-OS cluster.

## Prerequisites

- Rancher management server
- RKE2 cluster creation in progress with Windows node pools
- `kubectl` access to the new cluster
- `calicoctl` installed

## Step 1: Configure Calico at Cluster Creation

In Rancher UI when creating a new cluster:

1. Select **Network Provider: Calico**
2. Configure the **Cluster CIDR**: `192.168.0.0/16`
3. Set the **Service CIDR**: `10.96.0.0/12`
4. Under **Advanced Options**, set MTU if needed

For RKE2 YAML-based creation:

```yaml
spec:
  rkeConfig:
    machineGlobalConfig:
      cni: calico
      cluster-cidr: 192.168.0.0/16
      service-cidr: 10.96.0.0/12
    machinePoolDefaults:
      hostnameLengthLimit: 15
```

## Step 2: Post-Creation: Configure IP Pool for Windows

After the cluster is created and Windows nodes are joined:

```bash
calicoctl get ippool default-ipv4-ippool -o yaml
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"encapsulation":"VXLAN","natOutgoing":true}}'
```

## Step 3: Create Windows-Specific IP Pool

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: windows-ippool
spec:
  cidr: 192.168.128.0/17
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: kubernetes.io/os == 'windows'
EOF
```

## Step 4: Configure Felix

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true
  }}'
```

## Step 5: Verify Calico Configuration Through Rancher

In Rancher UI:
- Go to **Cluster** > **Cluster Tools** > **Monitoring**
- Add Calico metrics scraping if using Rancher Monitoring

```bash
# Verify via CLI
calicoctl get ippool -o wide
kubectl get installation default -o yaml
kubectl get tigerastatus
```

## Step 6: Label and Test Windows Nodes

```bash
kubectl get nodes -l kubernetes.io/os=windows
kubectl run win-test --image=mcr.microsoft.com/windows/nanoserver:1809 \
  --overrides='{"spec":{"nodeSelector":{"kubernetes.io/os":"windows"}}}' \
  -- cmd /c "ping -t 127.0.0.1"
kubectl get pod win-test -o wide
```

## Conclusion

Configuring Calico for Windows nodes in a new Rancher cluster involves selecting Calico during cluster creation with the correct CIDRs, then post-creation configuring the IP pool for VXLAN encapsulation, creating Windows-specific IP pools, and tuning Felix. Rancher handles the initial operator deployment, while `calicoctl` manages the ongoing network configuration that the cluster creation wizard does not expose.
