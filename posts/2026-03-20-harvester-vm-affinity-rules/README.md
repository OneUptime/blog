# How to Set Up VM Affinity Rules in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Affinity, Scheduling

Description: Learn how to configure VM affinity and anti-affinity rules in Harvester to control VM placement across nodes for performance and high availability.

## Introduction

Affinity rules in Harvester control where VMs are scheduled across cluster nodes. You can use affinity rules to ensure high availability (spread VMs across nodes), performance optimization (co-locate related VMs), or compliance (keep VMs on specific hardware). Harvester inherits Kubernetes pod affinity semantics, making these rules familiar to Kubernetes users.

## Affinity Rule Types

| Rule Type | Description | Example Use Case |
|---|---|---|
| Node Affinity | Prefer/require specific nodes | Pin VMs to nodes with GPUs |
| VM Affinity | Prefer/require co-location with another VM | Keep app + cache on same node |
| VM Anti-Affinity | Prefer/require separation from another VM | Spread HA replicas across nodes |

## Step 1: Node Affinity

Schedule VMs on nodes with specific labels:

### Label Nodes First

```bash
# Add labels to nodes for targeting

kubectl label node harvester-node-01 node-role=storage-heavy
kubectl label node harvester-node-02 node-role=compute-heavy
kubectl label node harvester-node-03 node-role=storage-heavy

# Add hardware-specific labels
kubectl label node harvester-node-01 hardware/nvme-ssd=true
kubectl label node harvester-node-02 hardware/nvme-ssd=true
kubectl label node harvester-node-03 hardware/sata-hdd=true
```

### Required Node Affinity (Hard Rule)

```yaml
# vm-required-node-affinity.yaml
# VM MUST be scheduled on a node with NVMe SSD

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: database-vm
  namespace: default
spec:
  runStrategy: Always
  template:
    spec:
      # Affinity rules go in the template spec
      affinity:
        nodeAffinity:
          # requiredDuringScheduling: hard requirement, VM won't schedule if not met
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: hardware/nvme-ssd
                    operator: In
                    values:
                      - "true"
      domain:
        cpu:
          cores: 8
        resources:
          requests:
            memory: 32Gi
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
            claimName: database-vm-root
```

### Preferred Node Affinity (Soft Rule)

```yaml
# vm-preferred-node-affinity.yaml
# VM prefers nodes labeled as compute-heavy, but will use others if needed

      affinity:
        nodeAffinity:
          # preferredDuringScheduling: soft preference, VM will schedule elsewhere if needed
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100  # Higher weight = stronger preference
              preference:
                matchExpressions:
                  - key: node-role
                    operator: In
                    values:
                      - compute-heavy
            - weight: 50
              preference:
                matchExpressions:
                  - key: hardware/nvme-ssd
                    operator: In
                    values:
                      - "true"
```

## Step 2: VM Anti-Affinity for High Availability

Spread VMs across different nodes to avoid a single point of failure:

```yaml
# ha-vm-antiaffinity.yaml
# Ensure primary and replica VMs run on different nodes

# VM 1: Primary database
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: postgres-primary
  namespace: default
  labels:
    # Label used for anti-affinity rule
    role: postgres
    instance: primary
spec:
  runStrategy: Always
  template:
    metadata:
      labels:
        role: postgres
        instance: primary
    spec:
      affinity:
        podAntiAffinity:
          # Hard anti-affinity: primary MUST NOT run on the same node as any postgres VM
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: role
                    operator: In
                    values:
                      - postgres
              # Spread across nodes
              topologyKey: kubernetes.io/hostname
      domain:
        cpu:
          cores: 8
        resources:
          requests:
            memory: 16Gi
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
            claimName: postgres-primary-root
```

```yaml
# VM 2: Replica database (same anti-affinity rule)
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: postgres-replica
  namespace: default
  labels:
    role: postgres
    instance: replica
spec:
  runStrategy: Always
  template:
    metadata:
      labels:
        role: postgres
        instance: replica
    spec:
      affinity:
        podAntiAffinity:
          # This VM also won't schedule on the same node as other postgres VMs
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: role
                    operator: In
                    values:
                      - postgres
              topologyKey: kubernetes.io/hostname
      domain:
        cpu:
          cores: 8
        resources:
          requests:
            memory: 16Gi
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
            claimName: postgres-replica-root
```

## Step 3: VM Affinity (Co-Location)

Keep related VMs on the same node for low latency:

```yaml
# vm-affinity-colocation.yaml
# Cache VM prefers to run on the same node as the app VM

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: redis-cache
  namespace: default
spec:
  runStrategy: Always
  template:
    metadata:
      labels:
        role: cache
    spec:
      affinity:
        podAffinity:
          # Prefer to run on the same node as the web application
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: role
                      operator: In
                      values:
                        - web-app
                topologyKey: kubernetes.io/hostname
      domain:
        cpu:
          cores: 2
        resources:
          requests:
            memory: 4Gi
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
            claimName: redis-cache-root
```

## Step 4: Configure Affinity via the UI

1. Navigate to **Virtual Machines** → **Create** (or edit an existing VM)
2. Go to the **Node Scheduling** tab to configure node affinity rules based on node labels
3. Go to the **VM Scheduling** tab to configure affinity or anti-affinity rules based on workload labels

## Verifying Affinity Rules

```bash
# Check where VMs are running
kubectl get vmi -n default \
    -o custom-columns='NAME:.metadata.name,NODE:.status.nodeName'

# Verify anti-affinity is working (postgres VMs should be on different nodes)
kubectl get vmi -n default -l role=postgres \
    -o custom-columns='NAME:.metadata.name,NODE:.status.nodeName'

# If a VM is pending due to affinity rules, check why
kubectl describe vmi postgres-primary -n default | grep -A 10 "Events:"

# List nodes and their scheduled VMs
kubectl get vmi -A \
    -o custom-columns='VM:.metadata.name,NS:.metadata.namespace,NODE:.status.nodeName' \
    | sort -k3
```

## Conclusion

Affinity and anti-affinity rules are essential tools for production VM deployments in Harvester. Anti-affinity ensures that your high-availability replicas are actually distributed across different physical nodes - without it, all replicas might end up on the same node, defeating the purpose of HA. Node affinity helps optimize performance by targeting VMs to hardware with the right capabilities (NVMe storage, high-memory nodes). Start with anti-affinity for all HA workloads and add node affinity as you optimize for specific hardware characteristics.
