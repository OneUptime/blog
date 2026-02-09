# How to Configure SR-IOV Network Devices for High-Performance Pod Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, SR-IOV, Performance

Description: Configure SR-IOV network device plugin to provide direct hardware access to pod network interfaces, achieving near-native network performance for high-throughput applications like data processing, NFV, and real-time analytics in Kubernetes.

---

Single Root I/O Virtualization (SR-IOV) enables network interfaces to expose multiple virtual functions that can be directly assigned to pods. This bypasses the kernel network stack and software switching, providing near-native network performance with minimal CPU overhead. SR-IOV is essential for applications requiring high throughput, low latency, or guaranteed bandwidth.

## Understanding SR-IOV Architecture

Traditional pod networking uses software bridges and network namespaces, which adds latency and CPU overhead. SR-IOV provides:

- Direct hardware access from pods (bypassing host kernel)
- Near line-rate throughput (10Gbps, 25Gbps, 100Gbps)
- Microsecond-level latency
- Hardware-offloaded packet processing
- Dedicated bandwidth per pod

SR-IOV network cards create Virtual Functions (VFs) that appear as separate network devices. Each VF can be assigned to a pod, giving it direct hardware access.

Use cases:
- Network Function Virtualization (NFV)
- High-frequency trading applications
- Data processing pipelines
- Real-time video streaming
- Scientific computing workloads

## Prerequisites

Verify your hardware supports SR-IOV:

```bash
# Check if network card supports SR-IOV
lspci -v | grep -i "single root"

# List network devices
lspci | grep -i ethernet

# Check specific device capabilities
lspci -v -s 0000:05:00.0 | grep -i SR-IOV
```

Enable SR-IOV in BIOS and kernel:

```bash
# Check if IOMMU is enabled (required for SR-IOV)
dmesg | grep -i iommu

# Enable IOMMU if not enabled (add to kernel parameters)
# For Intel: intel_iommu=on
# For AMD: amd_iommu=on
```

## Enabling SR-IOV Virtual Functions

Create VFs on your network interface:

```bash
# Check current VF count
cat /sys/class/net/ens1f0/device/sriov_numvfs

# Enable 8 VFs (adjust based on your NIC capabilities)
echo 8 > /sys/class/net/ens1f0/device/sriov_numvfs

# Verify VFs created
ip link show | grep vf
```

Make this persistent across reboots:

```bash
# Create udev rule
cat <<EOF > /etc/udev/rules.d/10-sriov.rules
ACTION=="add", SUBSYSTEM=="net", ENV{ID_NET_DRIVER}=="ixgbe", \
  RUN+="/bin/sh -c 'echo 8 > /sys/class/net/\$name/device/sriov_numvfs'"
EOF

# Or use systemd service
cat <<EOF > /etc/systemd/system/sriov-vfs.service
[Unit]
Description=Create SR-IOV VFs
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo 8 > /sys/class/net/ens1f0/device/sriov_numvfs'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable sriov-vfs.service
```

## Installing SR-IOV Network Device Plugin

Deploy the SR-IOV network device plugin:

```bash
# Install SR-IOV Network Operator
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/sriov-network-operator/master/deployment/sriov-network-operator.yaml
```

Or install manually:

```bash
# Clone repository
git clone https://github.com/k8snetworkplumbingwg/sriov-network-device-plugin
cd sriov-network-device-plugin

# Create ConfigMap
cat <<EOF > configMap.yaml
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
          "resourceName": "intel_sriov_netdevice",
          "selectors": {
            "vendors": ["8086"],
            "devices": ["154c", "10ed"],
            "drivers": ["i40evf", "ixgbevf"]
          }
        }
      ]
    }
EOF

kubectl apply -f configMap.yaml

# Deploy device plugin
kubectl apply -f deployments/k8s-v1.16/sriovdp-daemonset.yaml
```

Verify installation:

```bash
kubectl get pods -n kube-system | grep sriov
kubectl get node <node-name> -o json | jq '.status.allocatable'
```

You should see resources like `intel.com/intel_sriov_netdevice: 8`.

## Creating SR-IOV Network Attachment

Define an SR-IOV network using Multus:

```yaml
# sriov-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: sriov-net1
  namespace: default
  annotations:
    k8s.v1.cni.cncf.io/resourceName: intel.com/intel_sriov_netdevice
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "sriov",
    "ipam": {
      "type": "host-local",
      "subnet": "10.56.217.0/24",
      "rangeStart": "10.56.217.100",
      "rangeEnd": "10.56.217.200",
      "routes": [{
        "dst": "0.0.0.0/0"
      }],
      "gateway": "10.56.217.1"
    }
  }'
```

Apply the network definition:

```bash
kubectl apply -f sriov-network.yaml
```

## Deploying Pods with SR-IOV

Create a pod using SR-IOV:

```yaml
# sriov-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: sriov-test-pod
  annotations:
    k8s.v1.cni.cncf.io/networks: sriov-net1
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command: ['sh', '-c', 'sleep 3600']
    resources:
      requests:
        intel.com/intel_sriov_netdevice: '1'
      limits:
        intel.com/intel_sriov_netdevice: '1'
    securityContext:
      capabilities:
        add: ["IPC_LOCK", "NET_ADMIN"]
```

Deploy and verify:

```bash
kubectl apply -f sriov-pod.yaml
kubectl wait --for=condition=ready pod/sriov-test-pod --timeout=60s

# Check network interfaces
kubectl exec sriov-test-pod -- ip link show

# Verify SR-IOV interface
kubectl exec sriov-test-pod -- ip addr show net1

# Check PCI device assignment
kubectl exec sriov-test-pod -- lspci | grep Ethernet
```

## High-Performance Application Deployment

Deploy a data processing application with SR-IOV:

```yaml
# dpdk-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dpdk-config
data:
  start.sh: |
    #!/bin/bash
    # Bind interface to DPDK
    dpdk-devbind.py --status
    # Start DPDK application
    ./dpdk-app
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dpdk-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dpdk
  template:
    metadata:
      labels:
        app: dpdk
      annotations:
        k8s.v1.cni.cncf.io/networks: sriov-net1
    spec:
      containers:
      - name: dpdk
        image: dpdk/dpdk:latest
        command: ["/bin/bash", "/config/start.sh"]
        resources:
          requests:
            memory: "4Gi"
            hugepages-1Gi: "2Gi"
            intel.com/intel_sriov_netdevice: '1'
          limits:
            memory: "4Gi"
            hugepages-1Gi: "2Gi"
            intel.com/intel_sriov_netdevice: '1'
        securityContext:
          privileged: true
          capabilities:
            add:
            - IPC_LOCK
            - NET_ADMIN
            - NET_RAW
        volumeMounts:
        - name: hugepages
          mountPath: /dev/hugepages
        - name: config
          mountPath: /config
      volumes:
      - name: hugepages
        emptyDir:
          medium: HugePages
      - name: config
        configMap:
          name: dpdk-config
          defaultMode: 0755
```

## NFV Workload with Multiple SR-IOV Interfaces

Network functions often need multiple high-performance interfaces:

```yaml
# nfv-vnf.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: sriov-net2
  annotations:
    k8s.v1.cni.cncf.io/resourceName: intel.com/intel_sriov_netdevice
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "sriov",
    "ipam": {
      "type": "host-local",
      "subnet": "10.56.218.0/24"
    }
  }'
---
apiVersion: v1
kind: Pod
metadata:
  name: vnf-pod
  annotations:
    k8s.v1.cni.cncf.io/networks: sriov-net1, sriov-net2
spec:
  containers:
  - name: vnf
    image: mycompany/vnf:latest
    resources:
      requests:
        intel.com/intel_sriov_netdevice: '2'
      limits:
        intel.com/intel_sriov_netdevice: '2'
    securityContext:
      privileged: true
```

This pod gets two SR-IOV interfaces for separate data planes.

## Performance Testing

Test SR-IOV network performance:

```bash
# Deploy iperf3 server with SR-IOV
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: iperf3-server
  annotations:
    k8s.v1.cni.cncf.io/networks: sriov-net1
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    args: ['-s']
    resources:
      limits:
        intel.com/intel_sriov_netdevice: '1'
EOF

# Deploy iperf3 client
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: iperf3-client
  annotations:
    k8s.v1.cni.cncf.io/networks: sriov-net1
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    command: ['sh', '-c', 'sleep 3600']
    resources:
      limits:
        intel.com/intel_sriov_netdevice: '1'
EOF

# Get server IP
SERVER_IP=$(kubectl exec iperf3-server -- ip -o -4 addr show net1 | awk '{print $4}' | cut -d/ -f1)

# Run throughput test
kubectl exec iperf3-client -- iperf3 -c $SERVER_IP -t 60 -P 4

# Test latency
kubectl exec iperf3-client -- ping -c 100 $SERVER_IP
```

Expected results:
- Throughput: 9+ Gbps on 10GbE, 20+ Gbps on 25GbE
- Latency: <100 microseconds
- CPU usage: Significantly lower than software networking

## Troubleshooting SR-IOV

Check VF allocation:

```bash
# View VF configuration
ip link show ens1f0

# Check which VFs are assigned
ls -la /sys/class/net/ens1f0/device/virtfn*

# Check device plugin logs
kubectl logs -n kube-system -l app=sriovdp --tail=100
```

Verify pod has VF assigned:

```bash
# Check environment variables
kubectl exec sriov-test-pod -- env | grep PCIDEVICE

# Check network status
kubectl get pod sriov-test-pod -o jsonpath='{.metadata.annotations.k8s\.v1\.cni\.cncf\.io/network-status}'
```

Common issues:

**No SR-IOV resources available**:

```bash
kubectl get node <node-name> -o json | jq '.status.allocatable | with_entries(select(.key | contains("sriov")))'
```

Solution: Create more VFs or reduce pod requests.

**Pod fails to start**:

Check device plugin configuration:

```bash
kubectl get configmap sriovdp-config -n kube-system -o yaml
```

Verify PCI device IDs match your hardware.

## Security Considerations

SR-IOV bypasses kernel network security:

1. **Network policies don't apply**: Traffic goes directly to hardware
2. **Privileged access required**: Pods need elevated capabilities
3. **Hardware access**: Pods can potentially access other VFs

Mitigations:

- Use SR-IOV only for trusted workloads
- Implement network security at switch/firewall level
- Use separate physical networks for different security zones
- Enable PCI passthrough only on specific nodes

Label nodes with SR-IOV:

```bash
kubectl label node worker-1 sriov=enabled
```

Use node affinity:

```yaml
spec:
  nodeSelector:
    sriov: enabled
```

## Resource Management

Monitor SR-IOV resource usage:

```bash
# Check available resources
kubectl describe node <node-name> | grep -A 5 "Allocated resources"

# View pod resource usage
kubectl top pods -l app=dpdk
```

Prevent resource exhaustion with resource quotas:

```yaml
# sriov-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: sriov-quota
  namespace: nfv
spec:
  hard:
    intel.com/intel_sriov_netdevice: "4"  # Max 4 VFs per namespace
```

SR-IOV network devices provide the highest possible network performance for Kubernetes pods by enabling direct hardware access. Use SR-IOV for applications requiring multi-gigabit throughput, microsecond latency, or guaranteed bandwidth like NFV, HPC, financial trading systems, and real-time data processing. While it requires compatible hardware and adds operational complexity, the performance benefits make it essential for demanding network-intensive workloads.
