# How to Configure GKE Node Auto-Provisioning for Dynamic Node Pool Sizing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GCP, GKE, Autoscaling, Node Management

Description: Learn how to enable and configure GKE Node Auto-Provisioning to automatically create and manage node pools based on pod requirements, optimizing resource utilization and cost.

---

GKE Node Auto-Provisioning (NAP) automatically creates node pools when existing pools cannot accommodate pending pods. Unlike Cluster Autoscaler which scales existing node pools, NAP provisions entirely new pools with machine types optimized for your workload requirements. This dynamic approach reduces costs by matching node resources to actual pod needs.

## How Node Auto-Provisioning Works

Traditional cluster autoscaling operates within predefined node pool boundaries. You create node pools with specific machine types, and Cluster Autoscaler adds or removes nodes within those constraints. If a pod requires more memory than any existing node pool provides, it stays pending.

Node Auto-Provisioning solves this by creating new node pools on demand. When it detects pending pods, NAP analyzes their resource requests and creates a node pool with an appropriate machine type. The new pool scales up to accommodate the pods, then scales down when they are deleted.

NAP considers CPU, memory, GPU, and other resource requirements when selecting machine types. It also respects constraints like node affinity, taints, and zone requirements.

## Enabling Node Auto-Provisioning

Enable NAP on cluster creation or update existing clusters:

```bash
# Enable NAP on existing cluster
gcloud container clusters update production-cluster \
  --enable-autoprovisioning \
  --autoprovisioning-max-cpu 100 \
  --autoprovisioning-max-memory 1000 \
  --autoprovisioning-min-cpu 1 \
  --autoprovisioning-min-memory 4 \
  --region us-central1

# Verify NAP is enabled
gcloud container clusters describe production-cluster \
  --region us-central1 \
  --format="value(autoscaling.enableNodeAutoprovisioning)"
```

The max and min parameters set cluster-wide resource limits. NAP will not create node pools that would exceed these thresholds.

For new clusters, enable during creation:

```bash
gcloud container clusters create production-cluster \
  --enable-autoprovisioning \
  --autoprovisioning-max-cpu 200 \
  --autoprovisioning-max-memory 2000 \
  --autoprovisioning-min-cpu 2 \
  --autoprovisioning-min-memory 8 \
  --region us-central1 \
  --num-nodes 3
```

## Configuring Resource Limits

Set detailed resource limits to control costs and prevent runaway provisioning:

```bash
# Set comprehensive resource limits
gcloud container clusters update production-cluster \
  --enable-autoprovisioning \
  --autoprovisioning-max-cpu 200 \
  --autoprovisioning-max-memory 2000 \
  --autoprovisioning-max-accelerator type=nvidia-tesla-t4,count=4 \
  --autoprovisioning-min-cpu 4 \
  --autoprovisioning-min-memory 16 \
  --region us-central1
```

These limits apply across all auto-provisioned node pools combined. If your cluster already uses 150 CPUs across auto-provisioned pools, NAP can only add 50 more CPUs before hitting the max limit.

Configure disk size and type for auto-provisioned nodes:

```bash
gcloud container clusters update production-cluster \
  --autoprovisioning-config-file autoprovisioning-config.yaml \
  --region us-central1
```

Create the configuration file:

```yaml
# autoprovisioning-config.yaml
resourceLimits:
- resourceType: cpu
  maximum: 200
  minimum: 4
- resourceType: memory
  maximum: 2000
  minimum: 16
autoProvisioningDefaults:
  bootDiskKmsKey: projects/my-project/locations/us-central1/keyRings/gke-ring/cryptoKeys/gke-key
  diskSizeGb: 100
  diskType: pd-standard
  serviceAccount: gke-node-sa@my-project.iam.gserviceaccount.com
  scopes:
  - https://www.googleapis.com/auth/cloud-platform
  shieldedInstanceConfig:
    enableSecureBoot: true
    enableIntegrityMonitoring: true
  management:
    autoUpgrade: true
    autoRepair: true
```

This configuration applies default settings to all auto-provisioned node pools.

## Understanding Machine Type Selection

NAP selects machine types based on pod resource requests. When multiple machine types could satisfy requirements, NAP chooses the most cost-effective option.

Deploy a pod with specific resource needs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: high-memory-app
spec:
  containers:
  - name: app
    image: gcr.io/my-project/memory-intensive-app:latest
    resources:
      requests:
        memory: "32Gi"
        cpu: "4"
      limits:
        memory: "32Gi"
        cpu: "4"
```

Apply this pod:

```bash
kubectl apply -f high-memory-pod.yaml

# Watch node pool creation
gcloud container node-pools list \
  --cluster production-cluster \
  --region us-central1
```

NAP creates a node pool with machines that can accommodate 32Gi of memory and 4 CPUs. It might choose n1-highmem-4 or n2-highmem-4 depending on availability and cost.

## Restricting Machine Types

Limit which machine types NAP can provision to control costs and maintain consistency:

```bash
# Allow only cost-optimized machine types
gcloud container clusters update production-cluster \
  --autoprovisioning-config-file restricted-config.yaml \
  --region us-central1
```

Configure allowed machine types:

```yaml
# restricted-config.yaml
resourceLimits:
- resourceType: cpu
  maximum: 200
  minimum: 4
- resourceType: memory
  maximum: 2000
  minimum: 16
autoProvisioningDefaults:
  management:
    autoUpgrade: true
    autoRepair: true
autoprovisioningLocations:
- us-central1-a
- us-central1-b
- us-central1-c
```

Unfortunately, GKE does not provide direct API support for restricting specific machine families. Use resource limits and pod resource requests to indirectly control machine type selection.

## Handling GPU Workloads

NAP automatically provisions GPU nodes when pods request GPU resources:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training-job
spec:
  containers:
  - name: training
    image: gcr.io/my-project/ml-training:latest
    resources:
      requests:
        nvidia.com/gpu: 1
        memory: "16Gi"
        cpu: "8"
      limits:
        nvidia.com/gpu: 1
        memory: "16Gi"
        cpu: "8"
  nodeSelector:
    cloud.google.com/gke-accelerator: nvidia-tesla-t4
```

NAP creates a node pool with T4 GPUs. Ensure you have GPU quota in your project:

```bash
# Check GPU quota
gcloud compute project-info describe \
  --project my-project \
  --format="value(quotas.filter(metric:NVIDIA_T4_GPUS))"

# Request quota increase if needed
gcloud compute quotas update \
  --project my-project \
  --region us-central1 \
  --resource NVIDIA_T4_GPUS \
  --value 4
```

## Combining NAP with Standard Node Pools

Use NAP alongside manually created node pools for predictable base capacity with dynamic overflow:

```bash
# Create standard node pool for baseline workloads
gcloud container node-pools create baseline-pool \
  --cluster production-cluster \
  --machine-type n2-standard-4 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --region us-central1

# Enable NAP for overflow and specialized workloads
gcloud container clusters update production-cluster \
  --enable-autoprovisioning \
  --autoprovisioning-max-cpu 100 \
  --autoprovisioning-max-memory 500 \
  --region us-central1
```

This strategy maintains consistent performance for core applications while allowing NAP to handle spiky or specialized workloads.

Use taints on standard pools to reserve them for specific workloads:

```bash
# Taint baseline pool for production workloads only
gcloud container node-pools update baseline-pool \
  --cluster production-cluster \
  --node-taints workload=production:NoSchedule \
  --region us-central1
```

Pods without the matching toleration use NAP-created pools instead.

## Managing Auto-Provisioned Pool Lifecycle

NAP manages the lifecycle of auto-provisioned pools. Pools scale to zero when pods are deleted and remain empty for a grace period before being removed.

Configure scale-down settings:

```bash
# Set scale-down delay to 20 minutes
gcloud container clusters update production-cluster \
  --autoprovisioning-config-file lifecycle-config.yaml \
  --region us-central1
```

```yaml
# lifecycle-config.yaml
resourceLimits:
- resourceType: cpu
  maximum: 200
autoProvisioningDefaults:
  management:
    autoUpgrade: true
    autoRepair: true
  upgradeSettings:
    maxSurge: 1
    maxUnavailable: 0
  scaleDownConfig:
    enabled: true
```

View auto-provisioned pools:

```bash
# List all node pools
gcloud container node-pools list \
  --cluster production-cluster \
  --region us-central1

# Identify auto-provisioned pools (they have nap- prefix)
gcloud container node-pools describe nap-n2-standard-4-12345678 \
  --cluster production-cluster \
  --region us-central1
```

## Monitoring NAP Activity

Track NAP decisions through cluster events:

```bash
# Watch for node pool creation events
kubectl get events --all-namespaces \
  --field-selector reason=TriggeredScaleUp

# Check for pods triggering NAP
kubectl get events --all-namespaces \
  --field-selector reason=NotTriggerScaleUp,reason=TriggeredScaleUp \
  --sort-by='.lastTimestamp'
```

Monitor cluster autoscaling status:

```bash
# Get autoscaler status
kubectl get configmap cluster-autoscaler-status \
  -n kube-system \
  -o yaml
```

Use Cloud Monitoring to track resource utilization:

```bash
# Query CPU utilization across auto-provisioned pools
gcloud monitoring time-series list \
  --filter='metric.type="kubernetes.io/container/cpu/core_usage_time"
    AND resource.labels.cluster_name="production-cluster"' \
  --format=json
```

## Troubleshooting NAP Issues

Common issues include quota exhaustion, failed node creation, and unexpected machine type selection.

Check quota limits:

```bash
# View current quota usage
gcloud compute project-info describe \
  --project my-project \
  --format="table(quotas.metric,quotas.limit,quotas.usage)"
```

If pods remain pending despite NAP being enabled:

```bash
# Describe pending pod to see events
kubectl describe pod pending-pod-name

# Check for resource limit violations
gcloud container clusters describe production-cluster \
  --region us-central1 \
  --format="value(autoscaling.resourceLimits)"
```

Common reasons for NAP not creating pools:

- Cluster already at max resource limits
- Pod resource requests exceed NAP maximums
- No available zones have capacity
- Service account lacks necessary permissions

Verify service account permissions:

```bash
# Check service account roles
gcloud projects get-iam-policy my-project \
  --flatten="bindings[].members" \
  --filter="bindings.members:gke-node-sa@my-project.iam.gserviceaccount.com"
```

The service account needs compute.instanceAdmin.v1 and iam.serviceAccountUser roles for NAP to function.

## Cost Optimization with NAP

NAP optimizes costs by selecting appropriate machine types, but you can improve savings further:

```bash
# Enable auto-provisioning with Spot VMs
gcloud container clusters update production-cluster \
  --autoprovisioning-config-file spot-config.yaml \
  --region us-central1
```

```yaml
# spot-config.yaml
resourceLimits:
- resourceType: cpu
  maximum: 200
autoProvisioningDefaults:
  management:
    autoUpgrade: true
    autoRepair: true
  upgradeSettings:
    maxSurge: 1
    maxUnavailable: 0
  shieldedInstanceConfig:
    enableSecureBoot: true
```

Use pod annotations to prefer Spot instances:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  nodeSelector:
    cloud.google.com/gke-preemptible: "true"
  containers:
  - name: batch
    image: gcr.io/my-project/batch-processor:latest
```

Monitor cost savings through Cloud Billing reports filtered by node pool labels.

Node Auto-Provisioning simplifies cluster management by automatically matching infrastructure to workload requirements. It eliminates manual node pool planning while optimizing resource utilization and costs.
