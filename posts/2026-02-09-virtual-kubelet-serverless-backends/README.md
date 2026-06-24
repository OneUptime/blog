# How to Use Virtual Kubelet to Extend Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Virtual Kubelet, Serverless, AWS Fargate, Azure Container Instances

Description: Learn how to extend Kubernetes clusters with serverless compute capacity using Virtual Kubelet to run pods on AWS Fargate, Azure Container Instances, and other serverless platforms.

---

Virtual Kubelet extends Kubernetes beyond traditional node-based infrastructure by presenting serverless compute platforms as virtual nodes in your cluster. This allows you to schedule pods on serverless backends like Azure Container Instances and other providers while using standard Kubernetes APIs and tools. On Amazon EKS, AWS Fargate provides a similar serverless pod experience through native EKS Fargate profiles rather than a user-installed Virtual Kubelet deployment.

In this guide, you'll learn how to deploy Virtual Kubelet-based virtual nodes and use native serverless integrations to burst workloads to serverless platforms, reducing operational overhead and improving cost efficiency.

## Understanding Virtual Kubelet Architecture

Virtual Kubelet implements the Kubelet API, appearing to Kubernetes as a regular node. However, instead of running containers locally, it translates pod specifications into serverless platform API calls. When you schedule a pod to a Virtual Kubelet node, it creates containers on the backing serverless platform.

This architecture provides several benefits. You gain elastic capacity without managing nodes. You pay only for actual pod runtime. You avoid node management overhead like OS patching and scaling. Applications use standard Kubernetes interfaces without modifications.

## Using AWS Fargate with EKS

AWS Fargate provides serverless compute for containers. On Amazon EKS, you schedule Kubernetes pods directly to Fargate with Fargate profiles.

First, create an EKS cluster with Fargate profile:

```bash
eksctl create cluster \
  --name virtual-kubelet-demo \
  --region us-east-1 \
  --fargate
```

Alternatively, add a Fargate profile to an existing cluster:

```bash
eksctl create fargateprofile \
  --cluster production-cluster \
  --name serverless-workloads \
  --namespace serverless \
  --labels workload=serverless
```

EKS uses managed Fargate controllers in the control plane when you create Fargate profiles. Verify where pods are running:

```bash
kubectl get pods -n serverless -o wide
# Pods that match the Fargate profile should show nodes like fargate-ip-192-168-1-1.ec2.internal
```

Create a namespace for serverless workloads:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: serverless
  labels:
    workload: serverless
```

Deploy a pod to Fargate:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-serverless
  namespace: serverless
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
```

EKS automatically schedules these pods to Fargate based on the Fargate profile's namespace and label selectors.

## Installing Virtual Kubelet for Azure Container Instances

Azure Container Instances (ACI) provides another serverless option for running containers.

For AKS, enable the virtual nodes add-on, which is based on the open source Virtual Kubelet project. Virtual nodes require Azure CNI networking and a delegated subnet for ACI.

```bash
# Register the ACI provider if needed
az provider register --namespace Microsoft.ContainerInstance

# Create the subnet that ACI uses for virtual node pods
az network vnet subnet create \
  --resource-group myResourceGroup \
  --vnet-name myVnet \
  --name myVirtualNodeSubnet \
  --address-prefixes 10.241.0.0/16

# Enable virtual nodes on an AKS cluster that already uses Azure CNI
az aks enable-addons \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --addons virtual-node \
  --subnet-name myVirtualNodeSubnet
```

Verify the virtual node:

```bash
kubectl get nodes
# You should see a node like virtual-node-aci-linux
```

## Scheduling Workloads to Virtual Kubelet Nodes

Use node selectors to explicitly schedule pods to virtual nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: burst-workload
spec:
  replicas: 10
  selector:
    matchLabels:
      app: burst-app
  template:
    metadata:
      labels:
        app: burst-app
    spec:
      nodeSelector:
        type: virtual-kubelet
        kubernetes.io/os: linux
      tolerations:
      - key: virtual-kubelet.io/provider
        operator: Exists
      - key: azure.com/aci
        effect: NoSchedule
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
```

Use tolerations to allow pods to run on tainted virtual nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: serverless-job
spec:
  replicas: 5
  selector:
    matchLabels:
      app: job
  template:
    metadata:
      labels:
        app: job
    spec:
      tolerations:
      - key: virtual-kubelet.io/provider
        operator: Exists
      - key: azure.com/aci
        effect: NoSchedule
      containers:
      - name: worker
        image: worker:latest
```

## Implementing Hybrid Scheduling

Combine regular nodes with virtual nodes for cost optimization:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      # Prefer regular nodes, but allow scheduling to virtual nodes
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: type
                operator: NotIn
                values:
                - virtual-kubelet
      tolerations:
      - key: virtual-kubelet.io/provider
        operator: Exists
      - key: azure.com/aci
        effect: NoSchedule
      containers:
      - name: web
        image: webapp:latest
```

This configuration prefers regular nodes but allows overflow to virtual nodes when capacity is exhausted.

## Burst Scaling with Horizontal Pod Autoscaler

Configure Horizontal Pod Autoscaler to create additional replicas when demand increases. The scheduler can place those replicas on virtual nodes when regular nodes do not have enough capacity:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Use Cluster Autoscaler or Karpenter for VM-backed node groups, but virtual nodes themselves do not require Cluster Autoscaler to provision more VMs.

## Running Batch Jobs on Serverless

Virtual Kubelet works well for batch processing:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  parallelism: 50
  completions: 1000
  template:
    metadata:
      labels:
        app: data-processor
    spec:
      nodeSelector:
        type: virtual-kubelet
        kubernetes.io/os: linux
      tolerations:
      - key: virtual-kubelet.io/provider
        operator: Exists
      - key: azure.com/aci
        effect: NoSchedule
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: data-processor:latest
        env:
        - name: BATCH_SIZE
          value: "100"
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

Serverless compute eliminates the need to maintain idle capacity for batch workloads.

## Monitoring Virtual Kubelet Workloads

Monitor virtual node health:

```bash
kubectl get nodes -l type=virtual-kubelet
kubectl describe node virtual-node-aci-linux
```

Create alerts for virtual node issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: virtual-kubelet-alerts
spec:
  groups:
  - name: virtual-kubelet
    rules:
    - alert: VirtualKubeletUnhealthy
      expr: up{job="virtual-kubelet"} == 0
      for: 5m
      annotations:
        summary: "Virtual Kubelet is down"

    - alert: HighVirtualNodeUsage
      expr: |
        sum(kube_pod_info{node=~"virtual-node-.*|virtual-kubelet.*"}) /
        sum(kube_node_status_allocatable{node=~"virtual-node-.*|virtual-kubelet.*",resource="pods"}) > 0.8
      for: 10m
      annotations:
        summary: "High usage on virtual nodes"
```

## Cost Optimization Strategies

Implement pod priority to control which workloads use expensive serverless compute:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority-serverless
value: 100
globalDefault: false
description: "Low priority workloads suitable for serverless"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: background-job
spec:
  selector:
    matchLabels:
      app: background-job
  template:
    metadata:
      labels:
        app: background-job
    spec:
      priorityClassName: low-priority-serverless
      nodeSelector:
        type: virtual-kubelet
        kubernetes.io/os: linux
      tolerations:
      - key: virtual-kubelet.io/provider
        operator: Exists
      - key: azure.com/aci
        effect: NoSchedule
      containers:
      - name: worker
        image: background-worker:latest
```

## Limitations and Considerations

Virtual Kubelet has some limitations to be aware of. Not all Kubernetes features work with serverless backends. DaemonSets cannot run on virtual nodes. HostPath volumes are not supported. Some networking features may be limited.

Resource limits matter more with serverless since you pay for what you request. Always set appropriate CPU and memory limits.

Cold start times can be higher than traditional nodes. Plan for this in latency-sensitive applications.

## Best Practices

Use virtual nodes for workloads with variable demand that would otherwise require over-provisioning.

Set appropriate resource requests and limits since you pay for allocated resources.

Test thoroughly before moving production workloads to virtual nodes.

Monitor costs closely as serverless can be more expensive for consistently running workloads.

Use node affinity to prefer regular nodes and only overflow to virtual nodes when needed.

Implement proper monitoring since debugging can be different on serverless platforms.

## Conclusion

Virtual Kubelet extends Kubernetes with serverless compute capacity, providing elastic scaling without node management overhead. Whether using Azure Container Instances, native AWS Fargate profiles on EKS, or other providers, serverless pod backends enable hybrid architectures that balance cost efficiency with operational simplicity.

Start by moving burst workloads and batch jobs to virtual nodes, then expand to other use cases as you gain experience with serverless Kubernetes workloads.
