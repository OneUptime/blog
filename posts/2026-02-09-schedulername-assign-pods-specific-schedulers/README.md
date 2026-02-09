# How to Configure schedulerName to Assign Pods to Specific Schedulers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduler, Custom Scheduling

Description: Learn how to use the schedulerName field to route pods to custom schedulers in Kubernetes, enabling specialized scheduling logic for different workload types.

---

Kubernetes allows you to run multiple schedulers simultaneously, each with different logic and policies. By setting the `schedulerName` field in pod specifications, you can route specific workloads to specialized schedulers optimized for their needs.

This enables you to have a GPU-optimized scheduler, a cost-optimized scheduler, a latency-sensitive scheduler, and more, all running in the same cluster.

## Understanding schedulerName

Every pod has a `schedulerName` field that defaults to `default-scheduler`. When you set this to a different value, Kubernetes routes the pod to that scheduler instead. The scheduler you specify must be running in the cluster and watching for pods with its name.

## Running Multiple Schedulers

Deploy a custom scheduler alongside the default:

```yaml
# custom-scheduler.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-scheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: custom-scheduler-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-scheduler
subjects:
- kind: ServiceAccount
  name: custom-scheduler
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: custom-scheduler
  template:
    metadata:
      labels:
        component: custom-scheduler
    spec:
      serviceAccountName: custom-scheduler
      containers:
      - name: scheduler
        image: registry.k8s.io/kube-scheduler:v1.28.0
        command:
        - kube-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --leader-elect=false
        - --scheduler-name=custom-scheduler
        - --v=3
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: custom-scheduler-config
```

## Custom Scheduler Configuration

Configure the scheduler with specific policies:

```yaml
# custom-scheduler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    leaderElection:
      leaderElect: false
    profiles:
    - schedulerName: custom-scheduler
      plugins:
        score:
          enabled:
          - name: NodeResourcesFit
            weight: 5
          - name: ImageLocality
            weight: 3
          disabled:
          - name: NodeResourcesBalancedAllocation
```

Apply the custom scheduler:

```bash
kubectl apply -f custom-scheduler-config.yaml
kubectl apply -f custom-scheduler.yaml

# Verify the scheduler is running
kubectl get pods -n kube-system -l component=custom-scheduler
```

## Using schedulerName in Pods

Route pods to your custom scheduler:

```yaml
# custom-scheduled-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-scheduled-pod
spec:
  schedulerName: custom-scheduler  # Use custom scheduler
  containers:
  - name: nginx
    image: nginx:1.21
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
```

## Deployment with Custom Scheduler

Use custom scheduler for entire deployments:

```yaml
# gpu-optimized-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
  namespace: ml-workloads
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      schedulerName: gpu-scheduler  # Custom GPU-aware scheduler
      containers:
      - name: inference
        image: ml-inference:v1.0
        resources:
          limits:
            nvidia.com/gpu: 1
            cpu: 4000m
            memory: 8Gi
```

## Cost-Optimized Scheduler

Create a scheduler that prioritizes spot instances:

```yaml
# cost-optimizer-scheduler.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-optimizer-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
    - schedulerName: cost-optimizer
      plugins:
        score:
          enabled:
          - name: NodeResourcesFit
            weight: 2
          # Custom plugin that scores spot instances higher
          - name: SpotInstancePriority
            weight: 10
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-optimizer-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: cost-optimizer-scheduler
  template:
    metadata:
      labels:
        component: cost-optimizer-scheduler
    spec:
      serviceAccountName: custom-scheduler
      containers:
      - name: scheduler
        image: cost-optimizer-scheduler:v1.0
        command:
        - /cost-optimizer-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --scheduler-name=cost-optimizer
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
      volumes:
      - name: config
        configMap:
          name: cost-optimizer-config
```

Use the cost-optimized scheduler:

```yaml
# batch-job-cost-optimized.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  parallelism: 10
  completions: 100
  template:
    spec:
      schedulerName: cost-optimizer
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: data-processor:v1.0
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
```

## Latency-Sensitive Scheduler

Configure a scheduler for latency-critical workloads:

```yaml
# latency-scheduler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: latency-scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
    - schedulerName: latency-sensitive
      plugins:
        preFilter:
          enabled:
          - name: NodeResourcesFit
        filter:
          enabled:
          - name: NodeUnschedulable
          - name: TaintToleration
          - name: NodePorts
          # Filter out nodes with high latency
          - name: NetworkLatencyFilter
        score:
          enabled:
          # Prefer nodes with low network latency
          - name: NetworkLatency
            weight: 10
          - name: NodeResourcesFit
            weight: 3
```

```yaml
# latency-critical-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trading-engine
  template:
    spec:
      schedulerName: latency-sensitive
      containers:
      - name: engine
        image: trading-engine:v2.0
        resources:
          requests:
            cpu: 8000m
            memory: 16Gi
```

## Bin-Packing Scheduler

Create a scheduler that optimizes for resource utilization:

```yaml
# binpacking-scheduler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: binpacking-scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
    - schedulerName: binpacking
      plugins:
        score:
          enabled:
          # Maximize node utilization
          - name: MostAllocated
            weight: 10
          disabled:
          # Disable balanced allocation
          - name: NodeResourcesBalancedAllocation
          - name: NodeResourcesLeastAllocated
```

## Multi-Scheduler Namespace Policy

Automatically assign schedulers based on namespace labels:

```yaml
# scheduler-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: scheduler-selector
webhooks:
- name: scheduler-selector.example.com
  admissionReviewVersions: ["v1"]
  clientConfig:
    service:
      name: scheduler-webhook
      namespace: kube-system
      path: /mutate
    caBundle: BASE64_ENCODED_CA_CERT
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  sideEffects: None
  namespaceSelector:
    matchExpressions:
    - key: scheduler-policy
      operator: Exists
```

The webhook automatically sets schedulerName based on namespace labels:

```bash
# Label namespace for GPU scheduler
kubectl label namespace ml-workloads scheduler-policy=gpu-optimized

# Label namespace for cost optimization
kubectl label namespace batch-jobs scheduler-policy=cost-optimized
```

## Scheduler Observability

Monitor which schedulers are handling pods:

```bash
# Count pods by scheduler
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | .spec.schedulerName // "default-scheduler"' | \
  sort | uniq -c

# Find pods using custom scheduler
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.schedulerName != "default-scheduler") | {namespace: .metadata.namespace, name: .metadata.name, scheduler: .spec.schedulerName}'

# Check scheduler logs
kubectl logs -n kube-system deployment/custom-scheduler
```

## Scheduler Metrics

Export metrics from custom schedulers:

```yaml
# scheduler-service-monitor.yaml
apiVersion: v1
kind: Service
metadata:
  name: custom-scheduler-metrics
  namespace: kube-system
  labels:
    component: custom-scheduler
spec:
  ports:
  - name: metrics
    port: 10259
    protocol: TCP
  selector:
    component: custom-scheduler
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: custom-scheduler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      component: custom-scheduler
  endpoints:
  - port: metrics
    interval: 30s
```

## Debugging Scheduler Assignment

Troubleshoot pods not being scheduled:

```bash
# Check if custom scheduler is running
kubectl get pods -n kube-system -l component=custom-scheduler

# View pod events
kubectl describe pod <pod-name> | grep -A 10 Events

# Check scheduler logs for specific pod
kubectl logs -n kube-system -l component=custom-scheduler | grep <pod-name>

# Verify schedulerName is set correctly
kubectl get pod <pod-name> -o jsonpath='{.spec.schedulerName}'
```

## Best Practices

1. **Use Default for Most Workloads**: Only use custom schedulers when default doesn't meet requirements
2. **Name Schedulers Descriptively**: Use names like `gpu-scheduler`, `cost-optimizer` that indicate purpose
3. **Monitor Both Schedulers**: Track metrics for all schedulers to identify issues
4. **Test Thoroughly**: Validate custom scheduler logic before production use
5. **Handle Failures**: Ensure pods don't get stuck if custom scheduler fails
6. **Document Policies**: Clearly document when to use each scheduler
7. **Avoid Conflicts**: Ensure custom schedulers don't compete with default scheduler
8. **Version Compatibility**: Keep custom schedulers compatible with Kubernetes version

## Fallback Mechanisms

If a custom scheduler fails, pods will remain pending. Implement fallback:

```yaml
# scheduler-fallback-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scheduler-fallback
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: scheduler-fallback
  template:
    spec:
      serviceAccountName: scheduler-fallback
      containers:
      - name: controller
        image: scheduler-fallback:v1.0
        env:
        - name: FALLBACK_TIMEOUT
          value: "300"  # 5 minutes
        - name: FALLBACK_SCHEDULER
          value: "default-scheduler"
        command:
        - /fallback-controller
        # Watches pending pods and changes schedulerName after timeout
```

The schedulerName field provides a powerful way to route workloads to specialized schedulers. Whether you need GPU optimization, cost efficiency, latency sensitivity, or custom placement logic, multiple schedulers enable you to optimize scheduling for different workload types while keeping the default scheduler for standard workloads.

