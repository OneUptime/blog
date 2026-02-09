# How to Use Virtual Kubelet to Extend Kubernetes Clusters with Serverless Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Virtual Kubelet, Serverless, AWS Fargate, Azure Container Instances

Description: Learn how to extend Kubernetes clusters with serverless compute capacity using Virtual Kubelet to run pods on AWS Fargate, Azure Container Instances, and other serverless platforms.

---

Virtual Kubelet extends Kubernetes beyond traditional node-based infrastructure by presenting serverless compute platforms as virtual nodes in your cluster. This allows you to schedule pods on serverless backends like AWS Fargate or Azure Container Instances while using standard Kubernetes APIs and tools.

In this guide, you'll learn how to deploy Virtual Kubelet and use it to burst workloads to serverless platforms, reducing operational overhead and improving cost efficiency.

## Understanding Virtual Kubelet Architecture

Virtual Kubelet implements the Kubelet API, appearing to Kubernetes as a regular node. However, instead of running containers locally, it translates pod specifications into serverless platform API calls. When you schedule a pod to a Virtual Kubelet node, it creates containers on the backing serverless platform.

This architecture provides several benefits. You gain elastic capacity without managing nodes. You pay only for actual pod runtime. You avoid node management overhead like OS patching and scaling. Applications use standard Kubernetes interfaces without modifications.

## Installing Virtual Kubelet for AWS Fargate

AWS Fargate provides serverless compute for containers. Virtual Kubelet allows you to schedule Kubernetes pods directly to Fargate.

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

EKS automatically deploys Virtual Kubelet when you create Fargate profiles. Verify the virtual nodes:

```bash
kubectl get nodes
# You should see nodes like fargate-192.168.1.1
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

Kubernetes automatically schedules these pods to Fargate virtual nodes based on the namespace labels.

## Installing Virtual Kubelet for Azure Container Instances

Azure Container Instances (ACI) provides another serverless option for running containers.

Install the ACI Virtual Kubelet provider:

```bash
# Install using Helm
helm repo add virtual-kubelet https://github.com/virtual-kubelet/azure-aci/raw/master/charts
helm install virtual-kubelet virtual-kubelet/virtual-kubelet \
  --set provider=azure \
  --set nodeName=virtual-kubelet-aci \
  --set nodeOsType=Linux
```

Configure Azure credentials:

```bash
# Create service principal
az ad sp create-for-rbac --name virtual-kubelet-sp

# Create secret with credentials
kubectl create secret generic azure-credentials \
  --from-literal=AZURE_TENANT_ID=<tenant-id> \
  --from-literal=AZURE_CLIENT_ID=<client-id> \
  --from-literal=AZURE_CLIENT_SECRET=<client-secret> \
  --from-literal=AZURE_SUBSCRIPTION_ID=<subscription-id>
```

Deploy Virtual Kubelet with ACI provider:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: virtual-kubelet-aci
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: virtual-kubelet
  template:
    metadata:
      labels:
        app: virtual-kubelet
    spec:
      serviceAccountName: virtual-kubelet
      containers:
      - name: virtual-kubelet
        image: mcr.microsoft.com/oss/virtual-kubelet/virtual-kubelet:1.10.0
        env:
        - name: KUBELET_PORT
          value: "10250"
        - name: APISERVER_CERT_LOCATION
          value: /etc/virtual-kubelet/cert.pem
        - name: APISERVER_KEY_LOCATION
          value: /etc/virtual-kubelet/key.pem
        - name: VKUBELET_POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: ACI_REGION
          value: eastus
        - name: ACI_RESOURCE_GROUP
          value: virtual-kubelet-rg
        envFrom:
        - secretRef:
            name: azure-credentials
        volumeMounts:
        - name: credentials
          mountPath: /etc/virtual-kubelet
      volumes:
      - name: credentials
        secret:
          secretName: virtual-kubelet-cert
```

Verify the virtual node:

```bash
kubectl get nodes
# You should see virtual-kubelet-aci node
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
        operator: Equal
        value: azure
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
        effect: NoSchedule
      containers:
      - name: web
        image: webapp:latest
```

This configuration prefers regular nodes but allows overflow to virtual nodes when capacity is exhausted.

## Burst Scaling with Cluster Autoscaler

Configure Cluster Autoscaler to use virtual nodes for burst capacity:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --namespace=kube-system
        - --nodes=1:10:regular-node-group
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=5m
        - --skip-nodes-with-local-storage=false
        # Prioritize regular nodes over virtual nodes
        - --expander=priority
```

Create priority expander config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    10:
      - .*-regular-.*
    5:
      - .*-spot-.*
    1:
      - .*-virtual-.*
```

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
kubectl describe node virtual-kubelet-aci
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
        sum(kube_pod_info{node=~"virtual-kubelet.*"}) /
        sum(kube_node_status_allocatable{node=~"virtual-kubelet.*"}) > 0.8
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
  template:
    spec:
      priorityClassName: low-priority-serverless
      nodeSelector:
        type: virtual-kubelet
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

Virtual Kubelet extends Kubernetes with serverless compute capacity, providing elastic scaling without node management overhead. Whether using AWS Fargate, Azure Container Instances, or other providers, Virtual Kubelet enables hybrid architectures that balance cost efficiency with operational simplicity.

Start by moving burst workloads and batch jobs to virtual nodes, then expand to other use cases as you gain experience with serverless Kubernetes workloads.
