# How to Configure SR-IOV Network Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, SR-IOV, Network Operator, Kubernetes, High Performance Networking, GitOps, NFV

Description: Learn how to deploy and configure the SR-IOV Network Operator using Flux CD GitOps for hardware-accelerated networking in Kubernetes.

---

## Introduction

SR-IOV (Single Root I/O Virtualization) allows a single physical NIC to present multiple virtual functions (VFs) to the operating system. In Kubernetes, this enables pods to directly access virtual NIC functions, bypassing the kernel networking stack for ultra-low latency and high-throughput workloads. The SR-IOV Network Operator automates VF configuration and pool management. Managing it through Flux CD ensures consistent hardware configuration across cluster nodes.

## Prerequisites

- Kubernetes nodes with SR-IOV capable NICs (Intel X520/X710, Mellanox ConnectX-4/5, etc.)
- SR-IOV enabled in BIOS and kernel (`iommu` enabled)
- Flux CD bootstrapped
- Multus CNI installed (SR-IOV requires Multus for secondary interfaces)

## Step 1: Verify SR-IOV Hardware Support

```bash
# Check if SR-IOV is supported on nodes
lspci | grep -i eth
# Look for SR-IOV capable adapters

# Check current VF count
cat /sys/bus/pci/devices/0000:02:00.0/sriov_numvfs

# Verify IOMMU is enabled
dmesg | grep -e DMAR -e IOMMU
```

## Step 2: Deploy SR-IOV Network Operator via Flux

```yaml
# clusters/production/sources/sriov-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: sriov-network-operator
  namespace: flux-system
spec:
  interval: 1h
  url: https://k8snetworkplumbingwg.github.io/sriov-network-operator
---
# clusters/production/infrastructure/sriov-operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sriov-network-operator
  namespace: sriov-network-operator
spec:
  interval: 1h
  chart:
    spec:
      chart: sriov-network-operator
      version: "1.3.x"
      sourceRef:
        kind: HelmRepository
        name: sriov-network-operator
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    # Operator configuration
    operator:
      resourcePrefix: k8s.io
    # Enable webhook for resource request validation
    webhook:
      enable: true
    # Node feature discovery integration
    sriovOperatorConfig:
      enableInjector: true
      enableOperatorWebhook: true
```

## Step 3: Configure SR-IOV Node Policy

```yaml
# infrastructure/sriov/node-policy.yaml
apiVersion: sriovnetwork.openshift.io/v1
kind: SriovNetworkNodePolicy
metadata:
  name: intel-x710-policy
  namespace: sriov-network-operator
spec:
  # Node selector - which nodes to configure
  nodeSelector:
    feature.node.kubernetes.io/network-sriov.capable: "true"
  # NIC configuration
  resourceName: intelnics
  priority: 99
  # Physical function device ID
  deviceType: vfio-pci  # or netdevice for kernel-mode VFs
  numVfs: 8              # Number of VFs to create per PF
  nicSelector:
    # Select by PCI vendor and device ID (Intel X710)
    vendor: "8086"
    deviceID: "1572"
    # Or select by NIC name
    # pfNames: ["eth1"]
    # Or by PCI address
    # rootDevices: ["0000:02:00.0"]
  isRdma: false
```

## Step 4: Create SR-IOV Network Resource

```yaml
# infrastructure/sriov/network.yaml
apiVersion: sriovnetwork.openshift.io/v1
kind: SriovNetwork
metadata:
  name: sriov-dpdk-net
  namespace: sriov-network-operator
spec:
  # This creates a NetworkAttachmentDefinition in the target namespace
  networkNamespace: production
  resourceName: intelnics  # Must match SriovNetworkNodePolicy
  ipam: |
    {
      "type": "static"
    }
  # VLAN for this network (optional)
  vlan: 100
  # Spoofchk and trust settings
  spoofChk: "off"
  trust: "on"
  capabilities: |
    { "mac": true, "ips": true }
```

## Step 5: Deploy via Flux with Ordering

```yaml
# clusters/production/infrastructure/sriov-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sriov-operator
  namespace: flux-system
spec:
  interval: 1h
  path: ./infrastructure/sriov-operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: multus-cni  # Multus must be installed first
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: sriov-network-operator
      namespace: sriov-network-operator
  timeout: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sriov-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/sriov
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: sriov-operator  # Operator CRDs must exist
```

## Step 6: Use SR-IOV VFs in Pods

```yaml
# apps/dpdk-workload/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dpdk-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dpdk-app
  template:
    metadata:
      labels:
        app: dpdk-app
      annotations:
        k8s.v1.cni.cncf.io/networks: sriov-dpdk-net
    spec:
      containers:
        - name: dpdk-app
          image: your-org/dpdk-app:1.0.0
          securityContext:
            privileged: true  # Required for DPDK
          resources:
            requests:
              memory: "1Gi"
              cpu: "2"
              k8s.io/intelnics: "1"  # Request 1 SR-IOV VF
            limits:
              memory: "1Gi"
              cpu: "2"
              k8s.io/intelnics: "1"
          volumeMounts:
            - name: hugepages
              mountPath: /dev/hugepages
      volumes:
        - name: hugepages
          emptyDir:
            medium: HugePages
```

## Best Practices

- Enable hugepages on SR-IOV nodes for DPDK workloads: configure via node system settings before Flux manages SR-IOV.
- Use `vfio-pci` driver for DPDK (userspace) workloads and `netdevice` for kernel-mode VF usage.
- Set `numVfs` conservatively initially; too many VFs can cause memory pressure on the node.
- Use node labels (`feature.node.kubernetes.io/network-sriov.capable`) to identify SR-IOV capable nodes via Node Feature Discovery.
- Test SR-IOV configuration changes during maintenance windows; VF reconfiguration may disrupt running workloads.
- Document the PCI addresses and NIC models for each node type; this information is needed for SriovNetworkNodePolicy configuration.

## Conclusion

The SR-IOV Network Operator deployed via Flux CD automates the complex task of virtual function creation and management across Kubernetes nodes. Managing SR-IOV policies and network resources through GitOps ensures that hardware configurations are reproducible and auditable—critical for telco and NFV workloads that depend on deterministic network performance.
