# How to Configure VM Resource Limits in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Resource, CPU, Memory

Description: Learn how to configure CPU, memory, and storage resource limits for virtual machines in Harvester to ensure fair resource allocation and prevent resource contention.

## Introduction

Resource management in Harvester VMs involves configuring vCPU topology, guest memory, CPU pinning, and hugepages. Proper resource configuration ensures VMs get the resources they need while preventing any single VM from consuming resources that starve other workloads. Harvester translates VM CPU and memory settings into Kubernetes pod requests and limits, so understanding Kubernetes requests and limits is helpful.

Resource Configuration Concepts

| Setting | Description | Impact |
|---|---|---|
| CPU Cores | Number of virtual CPU cores | Determines guest vCPU count |
| CPU Sockets/Threads | vCPU topology | Affects guest topology and placement |
| Memory Requests | Scheduler reservation | Minimum reserved on the node |
| Memory Limits | Configured VM memory | Harvester adds overhead when translating to pod limits |
| CPU Pinning | Dedicated physical CPUs | Eliminates CPU contention |
| Hugepages | Large memory pages | Reduces TLB pressure |

## Step 1: Configure Basic CPU and Memory

```yaml
# vm-resource-config.yaml

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: production-vm-01
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        # CPU configuration
        cpu:
          # Number of virtual CPU cores
          cores: 8
          # Number of CPU sockets (usually 1)
          sockets: 1
          # Number of threads per core
          threads: 1
          # Total vCPUs = cores * sockets * threads = 8 * 1 * 1 = 8
        # Memory configuration
        memory:
          # Memory visible to the guest OS
          guest: 16Gi
        resources:
          # In Harvester, limits define the VM's configured CPU and memory.
          # Requests are derived from these limits and the overcommit settings unless overridden.
          limits:
            memory: 16Gi
            cpu: "8"
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: production-vm-01-root
```

## Step 2: Configure CPU Pinning for Low-Latency Workloads

CPU pinning dedicates physical CPU cores exclusively to a VM, eliminating CPU scheduling noise:

```yaml
# vm-cpu-pinning.yaml
# CPU pinning for latency-sensitive workloads (databases, real-time apps)

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: latency-sensitive-vm
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        cpu:
          cores: 4
          sockets: 1
          threads: 1
          # Enable CPU pinning - dedicates physical cores to this VM
          dedicatedCpuPlacement: true
        memory:
          guest: 8Gi
        resources:
          # Harvester automatically sets requests equal to limits for CPU-pinned VMs.
          limits:
            memory: 8Gi
            cpu: "4"
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: latency-sensitive-vm-root
```

**Prerequisite for CPU pinning:**
```bash
# CPU Manager must be enabled on the target node in Harvester.
# In the Harvester UI: Hosts > <node> > Enable CPU Manager

# Verify the node is labeled as CPU-manager-capable:
kubectl get nodes --show-labels | grep cpumanager=true
```

## Step 3: Configure Hugepages for Memory Performance

Hugepages reduce TLB pressure and improve memory performance for large-memory VMs:

```yaml
# vm-hugepages.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: database-vm-01
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        cpu:
          cores: 8
          sockets: 1
          threads: 1
          dedicatedCpuPlacement: true
        # Configure hugepages
        memory:
          # Guest memory size must be divisible by the hugepage size
          guest: 32Gi
          # Use 1Gi hugepages
          hugepages:
            pageSize: 1Gi
        resources:
          # Harvester automatically sets requests equal to limits for CPU-pinned VMs.
          limits:
            memory: 32Gi
            cpu: "8"
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: database-vm-01-root
```

```bash
# Check hugepage availability on nodes
kubectl describe node harvester-node-01 | grep -i hugepages

# Pre-allocate 1Gi hugepages on the node at boot time, then reboot
# Example kernel command line:
# hugepagesz=1G hugepages=32
```

## Step 4: Set Resource Limits via the UI

When creating a VM in the Harvester UI:

1. **CPU**: Set the number of cores in the **CPU** field
2. **Memory**: Set the memory in Gi or Mi in the **Memory** field
3. Click **Advanced Options** for CPU pinning options

## Step 5: Check Resource Utilization

```bash
# View configured CPU and memory limits for all VMs
kubectl get vm -n default \
    -o custom-columns=\
'NAME:.metadata.name,CPU_LIMIT:.spec.template.spec.domain.resources.limits.cpu,MEM_LIMIT:.spec.template.spec.domain.resources.limits.memory'

# Check actual resource consumption of the virt-launcher pod
kubectl top pods -n default \
    -l vm.kubevirt.io/name=production-vm-01

# View node capacity vs allocated resources
kubectl describe node harvester-node-01 | grep -A 10 "Allocated resources"

# Example output:
# Resource           Requests    Limits
# cpu                24 (60%)    24 (60%)
# memory             64Gi (80%)  64Gi (80%)
```

## Step 6: Implement Resource Quotas

Use Kubernetes ResourceQuotas to limit total VM resources per namespace. Account for Harvester's VM memory overhead when sizing memory quotas:

```yaml
# vm-resource-quota.yaml
# Limit total VM resources in the 'development' namespace

apiVersion: v1
kind: ResourceQuota
metadata:
  name: vm-resource-quota
  namespace: development
spec:
  hard:
    # Maximum total vCPUs across all VMs in this namespace
    requests.cpu: "32"
    limits.cpu: "32"
    # Maximum total memory
    requests.memory: 128Gi
    limits.memory: 128Gi
    # Maximum number of PVCs (VM disks)
    persistentvolumeclaims: "20"
    # Maximum total PVC storage
    requests.storage: 2Ti
```

```bash
kubectl apply -f vm-resource-quota.yaml

# Check quota usage
kubectl describe resourcequota vm-resource-quota -n development
```

## Step 7: VM Vertical Scaling

To change resources on an existing VM:

```bash
# If CPU and memory hotplug is not enabled for this VM, stop it first
kubectl patch vm production-vm-01 -n default \
    --type merge \
    -p '{"spec":{"running":false}}'

# Wait for VM to stop
kubectl wait vmi/production-vm-01 -n default \
    --for=delete --timeout=120s

# Update CPU and memory
kubectl patch vm production-vm-01 -n default \
    --type merge \
    -p '{
        "spec": {
            "template": {
                "spec": {
                    "domain": {
                        "cpu": {"cores": 16, "sockets": 1, "threads": 1},
                        "memory": {"guest": "32Gi"},
                        "resources": {
                            "limits": {"memory": "32Gi", "cpu": "16"}
                        }
                    }
                }
            }
        }
    }'

# Start the VM with new resources
kubectl patch vm production-vm-01 -n default \
    --type merge \
    -p '{"spec":{"running":true}}'
```

## Conclusion

Proper resource configuration in Harvester ensures VMs get the performance they need while maintaining cluster-wide stability. For most workloads, setting appropriate CPU and memory allocations is sufficient. For high-performance databases and latency-sensitive applications, CPU pinning and hugepages provide the dedicated, predictable resources needed. ResourceQuotas help prevent runaway resource consumption in shared environments. Always monitor actual resource utilization and adjust configurations based on real workload patterns rather than guesses.
