# How to Set Up Rancher for Telecommunications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Telecommunications, Telco, 5G, CNF, DPDK, SR-IOV, Kubernetes

Description: Configure Rancher for telecommunications workloads including Cloud Native Functions (CNFs), 5G core network deployments, SR-IOV for packet processing, DPDK, and ultra-low latency networking...

## Introduction

Telecommunications is one of the most demanding use cases for Kubernetes. 5G network functions require sub-millisecond latency, high throughput packet processing, and telco-grade five-nines availability. Rancher with RKE2 running on bare-metal servers with SR-IOV NICs and DPDK provides the performance required for Cloud Native Network Functions (CNFs).

## Telco Architecture with Rancher

```text
                    ┌────────────────────────┐
                    │  Rancher Management     │
                    └────────────┬───────────┘
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
  ┌───────▼────────┐  ┌─────────▼───────┐   ┌─────────▼───────┐
  │  5G Core       │  │  RAN Controller │   │  Edge Cluster   │
  │  Cluster       │  │  Cluster        │   │  (Far Edge)     │
  │                │  │                 │   │                 │
  │ AMF, SMF, UPF  │  │ CU/DU control   │   │ MEC workloads   │
  └────────────────┘  └─────────────────┘   └─────────────────┘
  SR-IOV + DPDK         SR-IOV               K3s + low-latency
```

## Step 1: Configure Real-Time Kernel

```bash
# Install real-time kernel on telco worker nodes

# RHEL-based systems (enable the RT/NFV repositories first on RHEL if needed)
yum install -y kernel-rt kernel-rt-devel tuned-profiles-realtime

# Enable real-time profile
tuned-adm profile realtime

# Disable CPU frequency scaling for consistent latency
for governor in /sys/devices/system/cpu/cpu[0-9]*/cpufreq/scaling_governor; do [ -f "$governor" ] && echo performance > "$governor"; done

# Isolate CPUs for DPDK/SR-IOV (reserve CPUs 2-15 from OS)
# In /etc/default/grub:
# GRUB_CMDLINE_LINUX="isolcpus=2-15 nohz_full=2-15 rcu_nocbs=2-15 intel_iommu=on iommu=pt"
```

## Step 2: Configure SR-IOV for Data Plane

```yaml
# Deploy SR-IOV Network Device Plugin
apiVersion: v1
kind: ConfigMap
metadata:
  name: sriovdp-config
  namespace: kube-system
data:
  config.json: |
    {
      "resourceList": [
        {
          "resourceName": "intel_sriov_dpdk",
          "resourcePrefix": "intel.com",
          "selectors": {
            "vendors": ["8086"],
            "devices": ["1583"],
            "drivers": ["vfio-pci"],
            "pfNames": ["ens3f0"]
          }
        },
        {
          "resourceName": "intel_sriov_netdevice",
          "resourcePrefix": "intel.com",
          "selectors": {
            "vendors": ["8086"],
            "devices": ["154c"],
            "drivers": ["i40evf", "iavf"]
          }
        }
      ]
    }
```

## Step 3: Deploy 5G Core Components

```yaml
# User Plane Function (UPF) with SR-IOV and DPDK
apiVersion: v1
kind: Pod
metadata:
  name: upf-instance-1
  namespace: 5g-core
  labels:
    app: upf
  # Assumes Multus NetworkAttachmentDefinition objects named sriov-n3 and sriov-n6 already exist.
  annotations:
    k8s.v1.cni.cncf.io/networks: |
      [{
        "name": "sriov-n3",
        "namespace": "5g-core",
        "interface": "n3"
      },{
        "name": "sriov-n6",
        "namespace": "5g-core",
        "interface": "n6"
      }]
spec:
  runtimeClassName: kata-containers    # Optional: requires a matching RuntimeClass to be installed
  containers:
    - name: upf
      image: myregistry/free5gc-upf:3.3.0
      securityContext:
        privileged: true
      resources:
        requests:
          intel.com/intel_sriov_dpdk: "2"    # 2 DPDK VFs
          memory: "4Gi"
          cpu: "4"
          hugepages-1Gi: "4Gi"               # DPDK requires hugepages
        limits:
          intel.com/intel_sriov_dpdk: "2"
          memory: "4Gi"
          cpu: "4"
          hugepages-1Gi: "4Gi"
      volumeMounts:
        - name: hugepages
          mountPath: /hugepages
  volumes:
    - name: hugepages
      emptyDir:
        medium: HugePages-1Gi
```

## Step 4: Configure HugePages

```bash
# Enable default-size hugepages on worker nodes (persistent)
echo "vm.nr_hugepages = 1024" >> /etc/sysctl.d/hugepages.conf
sysctl -p /etc/sysctl.d/hugepages.conf

# Or, if the workload is configured to request 1Gi hugepages, reserve them at boot:
# hugepagesz=1G hugepages=16

# Verify hugepages
cat /proc/meminfo | grep HugePages
```

## Step 5: CPU Pinning for CNFs

```yaml
# Configure CPU Manager for guaranteed QoS
# In /etc/rancher/rke2/config.yaml on agent nodes:
kubelet-arg:
  - "cpu-manager-policy=static"
  - "topology-manager-policy=single-numa-node"
  - "reserved-cpus=0-1"    # Reserve CPUs 0-1 for OS

---

# Pod requesting guaranteed CPU pinning
spec:
  containers:
    - name: upf
      resources:
        requests:
          cpu: "4"          # Whole CPU request/limit on a Guaranteed pod
          memory: "4Gi"
        limits:
          cpu: "4"
          memory: "4Gi"
```

## Step 6: Telco-Grade High Availability

```yaml
# Pod Anti-Affinity to spread CNF instances
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: upf
        topologyKey: kubernetes.io/hostname

---

# PodDisruptionBudget for CNF availability
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: upf-pdb
  namespace: 5g-core
spec:
  minAvailable: 2    # Always maintain 2 UPF instances
  selector:
    matchLabels:
      app: upf
```

## Conclusion

Rancher provides the management layer for telco-grade Kubernetes deployments running 5G CNFs. The performance requirements (SR-IOV, DPDK, hugepages, CPU pinning, real-time kernel) are supported in RKE2 when combined with the right hardware (Intel X710, Mellanox ConnectX) and OS configuration. SUSE's Telco Edge portfolio includes pre-validated configurations for common telco use cases including vRAN, 5G Core, and MEC workloads.
