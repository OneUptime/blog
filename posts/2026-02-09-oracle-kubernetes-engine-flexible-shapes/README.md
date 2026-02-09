# How to Set Up Oracle Kubernetes Engine (OKE) with Flexible Compute Shapes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Oracle Cloud, OKE, Compute, Infrastructure

Description: Learn how to create and configure Oracle Kubernetes Engine clusters with flexible compute shapes, enabling customizable CPU and memory configurations for cost-optimized workloads.

---

Oracle Kubernetes Engine (OKE) supports flexible compute shapes that allow precise CPU and memory customization. Unlike fixed shapes with predetermined resource ratios, flexible shapes let you specify exact CPU counts and memory amounts independently. This granular control helps optimize costs by matching node resources to workload requirements without over-provisioning.

## Understanding Flexible Shapes

Traditional compute shapes come in predefined configurations like VM.Standard2.4 (4 OCPUs, 60GB RAM). Flexible shapes use the naming pattern VM.Standard.E4.Flex, where you specify OCPU count and memory amount at creation time.

Flexible shapes provide several advantages: independent CPU and memory sizing, ability to change resources without recreating instances, support for fractional OCPU counts (0.5, 1, 2, etc.), and consistent pricing per OCPU and GB of memory.

The E4.Flex shape uses AMD EPYC processors, while E3.Flex uses Intel processors. Both offer similar performance characteristics with slight variations in single-thread performance and memory bandwidth.

## Creating OKE Cluster with Flexible Node Pools

Create an OKE cluster using OCI CLI:

```bash
# Create VCN for the cluster
oci network vcn create \
  --compartment-id ocid1.compartment.oc1..aaa \
  --cidr-block 10.0.0.0/16 \
  --display-name oke-vcn \
  --dns-label okecluster

# Create subnets (abbreviated for brevity)
# Create worker subnet, load balancer subnet, and service subnet

# Create OKE cluster
oci ce cluster create \
  --compartment-id ocid1.compartment.oc1..aaa \
  --name production-cluster \
  --vcn-id ocid1.vcn.oc1..aaa \
  --kubernetes-version v1.28.2 \
  --service-lb-subnet-ids '["ocid1.subnet.oc1..lb"]' \
  --endpoint-subnet-id ocid1.subnet.oc1..api
```

Add a node pool with flexible shape:

```bash
oci ce node-pool create \
  --cluster-id ocid1.cluster.oc1..aaa \
  --compartment-id ocid1.compartment.oc1..aaa \
  --name flex-node-pool \
  --kubernetes-version v1.28.2 \
  --node-shape VM.Standard.E4.Flex \
  --node-shape-config '{"ocpus": 2, "memoryInGBs": 16}' \
  --node-image-id ocid1.image.oc1..aaa \
  --subnet-ids '["ocid1.subnet.oc1..workers"]' \
  --size 3
```

This creates nodes with 2 OCPUs and 16GB RAM each. The memory-to-CPU ratio is 8:1, which works well for memory-intensive applications.

Verify the cluster:

```bash
# Get cluster details
oci ce cluster get \
  --cluster-id ocid1.cluster.oc1..aaa

# List node pools
oci ce node-pool list \
  --compartment-id ocid1.compartment.oc1..aaa \
  --cluster-id ocid1.cluster.oc1..aaa

# Configure kubectl
oci ce cluster create-kubeconfig \
  --cluster-id ocid1.cluster.oc1..aaa \
  --file $HOME/.kube/config \
  --region us-ashburn-1
```

## Customizing Node Resources

Adjust OCPU and memory for different workload types:

**Compute-Intensive**: More OCPUs with moderate memory.

```bash
oci ce node-pool create \
  --cluster-id ocid1.cluster.oc1..aaa \
  --name compute-pool \
  --node-shape VM.Standard.E4.Flex \
  --node-shape-config '{"ocpus": 8, "memoryInGBs": 32}' \
  --size 2
```

**Memory-Intensive**: More memory per OCPU.

```bash
oci ce node-pool create \
  --cluster-id ocid1.cluster.oc1..aaa \
  --name memory-pool \
  --node-shape VM.Standard.E4.Flex \
  --node-shape-config '{"ocpus": 4, "memoryInGBs": 64}' \
  --size 2
```

**Balanced**: Standard 1:4 or 1:8 ratio.

```bash
oci ce node-pool create \
  --cluster-id ocid1.cluster.oc1..aaa \
  --name balanced-pool \
  --node-shape VM.Standard.E4.Flex \
  --node-shape-config '{"ocpus": 4, "memoryInGBs": 32}' \
  --size 3
```

Flexible shapes support minimum 1 OCPU and 1GB RAM per OCPU, maximum 64 OCPUs and 1024GB RAM total, with memory in 1GB increments.

## Using Node Taints for Workload Placement

Taint node pools to control pod scheduling:

```bash
# Create tainted node pool for database workloads
oci ce node-pool create \
  --cluster-id ocid1.cluster.oc1..aaa \
  --name database-pool \
  --node-shape VM.Standard.E4.Flex \
  --node-shape-config '{"ocpus": 8, "memoryInGBs": 128}' \
  --size 2 \
  --initial-node-labels '[{"key":"workload","value":"database"}]' \
  --node-metadata '{"user_data": "IyEvYmluL2Jhc2gKa3ViZWN0bCB0YWludCBub2RlcyAtLWFsbCB3b3JrbG9hZD1kYXRhYmFzZTpOb1NjaGVkdWxl"}'
```

The user_data contains a base64-encoded script that runs on node startup to apply taints.

Deploy pods with tolerations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-cluster
spec:
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      tolerations:
      - key: workload
        operator: Equal
        value: database
        effect: NoSchedule
      nodeSelector:
        workload: database
      containers:
      - name: postgres
        image: postgres:15
        resources:
          requests:
            memory: "32Gi"
            cpu: "4"
          limits:
            memory: "32Gi"
            cpu: "4"
```

## Implementing Cluster Autoscaler

Enable cluster autoscaling for flexible node pools:

```bash
# Update node pool with autoscaling
oci ce node-pool update \
  --node-pool-id ocid1.nodepool.oc1..aaa \
  --size 3 \
  --enable-autoscaling true \
  --min-size 2 \
  --max-size 10
```

Deploy the cluster autoscaler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --cloud-provider=oci
        - --nodes=2:10:ocid1.nodepool.oc1..aaa
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
        - --skip-nodes-with-system-pods=false
        env:
        - name: OCI_USE_INSTANCE_PRINCIPAL
          value: "true"
        - name: OCI_SDK_DEFAULT_RETRY_ENABLED
          value: "true"
```

Create the service account with instance principal authentication:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
rules:
- apiGroups: [""]
  resources: ["events", "endpoints"]
  verbs: ["create", "patch"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs: ["create"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["update"]
- apiGroups: [""]
  resources: ["endpoints"]
  resourceNames: ["cluster-autoscaler"]
  verbs: ["get", "update"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["watch", "list", "get", "update"]
- apiGroups: [""]
  resources: ["pods", "services", "replicationcontrollers", "persistentvolumeclaims", "persistentvolumes"]
  verbs: ["watch", "list", "get"]
- apiGroups: ["extensions"]
  resources: ["replicasets", "daemonsets"]
  verbs: ["watch", "list", "get"]
- apiGroups: ["policy"]
  resources: ["poddisruptionbudgets"]
  verbs: ["watch", "list"]
- apiGroups: ["apps"]
  resources: ["statefulsets", "replicasets", "daemonsets"]
  verbs: ["watch", "list", "get"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses", "csinodes", "csidrivers", "csistoragecapacities"]
  verbs: ["watch", "list", "get"]
- apiGroups: ["batch", "extensions"]
  resources: ["jobs"]
  verbs: ["get", "list", "watch", "patch"]
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["create"]
- apiGroups: ["coordination.k8s.io"]
  resourceNames: ["cluster-autoscaler"]
  resources: ["leases"]
  verbs: ["get", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-autoscaler
subjects:
- kind: ServiceAccount
  name: cluster-autoscaler
  namespace: kube-system
```

## Cost Optimization with Flexible Shapes

Calculate optimal configurations based on workload requirements:

```bash
# Analyze current resource usage
kubectl top nodes
kubectl top pods --all-namespaces

# Identify over-provisioned nodes
kubectl describe nodes | grep -A 5 "Allocated resources"
```

Right-size node pools:

```python
# Calculate optimal OCPU/memory ratio
def calculate_optimal_shape(cpu_request_sum, memory_request_sum):
    # Add 20% overhead for system components
    total_cpu = cpu_request_sum * 1.2
    total_memory = memory_request_sum * 1.2

    # Calculate memory-to-CPU ratio
    ratio = total_memory / total_cpu

    # Round up to next OCPU
    ocpus = math.ceil(total_cpu)

    # Calculate memory based on ratio
    memory = ocpus * ratio

    # Ensure minimum 1GB per OCPU
    memory = max(memory, ocpus * 1)

    return ocpus, memory

# Example: 12 CPU cores requested, 80GB memory requested
ocpus, memory = calculate_optimal_shape(12, 80)
print(f"Recommended shape: {ocpus} OCPUs, {memory}GB memory")
```

Update node pool with optimized configuration:

```bash
oci ce node-pool update \
  --node-pool-id ocid1.nodepool.oc1..aaa \
  --node-shape-config '{"ocpus": 4, "memoryInGBs": 28}'
```

## Monitoring Node Performance

Track node resource utilization:

```bash
# Deploy metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check node metrics
kubectl top nodes

# Monitor over time
watch kubectl top nodes
```

Use Oracle Cloud Monitoring for detailed metrics:

```bash
# Query compute instance metrics
oci monitoring metric-data summarize-metrics-data \
  --compartment-id ocid1.compartment.oc1..aaa \
  --namespace oci_computeagent \
  --query-text 'CpuUtilization[5m]{resourceId = "ocid1.instance.oc1..aaa"}.mean()'
```

Set up alarms for resource constraints:

```bash
# Create alarm for high CPU
oci monitoring alarm create \
  --compartment-id ocid1.compartment.oc1..aaa \
  --display-name "High CPU Usage" \
  --metric-compartment-id ocid1.compartment.oc1..aaa \
  --namespace oci_computeagent \
  --query-text 'CpuUtilization[5m].mean() > 80' \
  --severity WARNING \
  --destinations '["ocid1.onstopic.oc1..aaa"]'
```

## Upgrading and Cycling Nodes

Change node shape by creating a new pool and migrating workloads:

```bash
# Create new node pool with updated shape
oci ce node-pool create \
  --cluster-id ocid1.cluster.oc1..aaa \
  --name upgraded-pool \
  --node-shape VM.Standard.E4.Flex \
  --node-shape-config '{"ocpus": 6, "memoryInGBs": 48}' \
  --size 3

# Cordon old nodes
kubectl cordon -l oke.node-pool.id=ocid1.nodepool.oc1..old

# Drain nodes one by one
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Delete old node pool
oci ce node-pool delete \
  --node-pool-id ocid1.nodepool.oc1..old \
  --force
```

For in-place updates of non-shape configuration:

```bash
# Update node pool labels
oci ce node-pool update \
  --node-pool-id ocid1.nodepool.oc1..aaa \
  --node-metadata '{"user_data": "..."}'
```

## Troubleshooting Flexible Shape Issues

Common issues include incorrect resource requests and OCI quota limits.

Check OCI service limits:

```bash
# View compute quotas
oci limits value list \
  --compartment-id ocid1.tenancy.oc1..aaa \
  --service-name compute \
  --scope-type AVAILABILITY_DOMAIN \
  --availability-domain <AD-name>

# Check specific limit
oci limits value get \
  --compartment-id ocid1.tenancy.oc1..aaa \
  --service-name compute \
  --scope-type AVAILABILITY_DOMAIN \
  --availability-domain <AD-name> \
  --limit-name standard-e4-core-count
```

Request limit increase if needed:

```bash
oci support ticket create \
  --summary "Increase E4 Flex OCPU limit" \
  --description "Need 200 OCPUs for OKE cluster expansion"
```

Debug node creation failures:

```bash
# Check node pool events
oci ce work-request list \
  --compartment-id ocid1.compartment.oc1..aaa \
  --resource-id ocid1.nodepool.oc1..aaa

# View error details
oci ce work-request get \
  --work-request-id ocid1.workrequest.oc1..aaa
```

Oracle Kubernetes Engine with flexible compute shapes provides fine-grained control over node resources, enabling precise cost optimization while maintaining performance for diverse workload requirements.
