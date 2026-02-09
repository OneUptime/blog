# How to Debug Pods Stuck in Pending State with Event and Scheduler Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Troubleshooting

Description: Learn systematic techniques to debug Kubernetes pods stuck in Pending state, including event analysis, scheduler logs, resource constraints, and node selector issues for effective troubleshooting.

---

When pods get stuck in Pending state, they cannot start running. No containers are created, no work gets done, and your application stays unavailable. Pods remain pending when the scheduler cannot find a suitable node or when pre-scheduling conditions are not met.

Debugging pending pods requires systematic analysis of events, resource availability, node selectors, taints and tolerations, and scheduler behavior. This guide shows you how to diagnose and fix the most common causes of pending pods.

## Understanding the Pending State

A pod enters Pending state when it has been accepted by Kubernetes but cannot be scheduled onto a node. The scheduler continuously tries to find a suitable node until it succeeds or the pod is deleted.

Common reasons for pending pods:
- Insufficient resources (CPU, memory)
- Node selector mismatch
- Taints without corresponding tolerations
- Pod affinity or anti-affinity rules blocking placement
- Persistent volume claim issues
- Image pull secrets missing
- Resource quotas exceeded

## Quick Diagnostic Commands

Start with these essential commands to gather information:

```bash
# Check pod status
kubectl get pod my-pod

# View detailed pod information
kubectl describe pod my-pod

# Check events for the pod
kubectl get events --field-selector involvedObject.name=my-pod

# View all pod events sorted by time
kubectl get events --sort-by='.lastTimestamp'
```

The describe output includes a crucial "Events" section that often reveals the exact reason for pending status.

## Analyzing Pod Events

Events provide the most direct clues about why a pod is pending.

View events for a pending pod:

```bash
kubectl describe pod pending-pod
```

Look for messages like:

```
Events:
  Type     Reason            Message
  ----     ------            -------
  Warning  FailedScheduling  0/3 nodes are available: 3 Insufficient cpu.
```

This tells you exactly what is wrong: no nodes have enough CPU.

Other common event messages:

```
0/3 nodes are available: 3 node(s) didn't match node selector.
```
Node selector mismatch.

```
0/3 nodes are available: 3 node(s) had taints that the pod didn't tolerate.
```
Taint/toleration issue.

```
0/3 nodes are available: 1 Insufficient memory, 2 node(s) didn't match pod affinity rules.
```
Multiple issues: some nodes lack memory, others do not match affinity rules.

## Checking Resource Availability

Insufficient resources are the most common cause of pending pods.

Check node resource capacity:

```bash
kubectl top nodes
```

Output:

```
NAME           CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
worker-node-1  1900m        95%    7500Mi          93%
worker-node-2  1950m        97%    7800Mi          97%
worker-node-3  1850m        92%    7200Mi          90%
```

All nodes are nearly full, explaining why a pod with significant resource requests cannot be scheduled.

Check detailed node allocatable resources:

```bash
kubectl describe node worker-node-1
```

Look for the "Allocated resources" section:

```
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests      Limits
  --------           --------      ------
  cpu                1900m (95%)   3800m (190%)
  memory             7500Mi (93%)  15000Mi (186%)
```

Compare the pod's resource requests to available capacity:

```bash
# Check pod resource requests
kubectl get pod pending-pod -o jsonpath='{.spec.containers[*].resources.requests}'
```

If the pod requests 500m CPU but all nodes only have <500m available, the pod stays pending.

## Resolving Resource Constraints

Add nodes to the cluster:

```bash
# For cloud providers with cluster autoscaler
kubectl get deployment cluster-autoscaler -n kube-system

# Manually add nodes (cloud-specific)
# AWS
eksctl scale nodegroup --cluster=my-cluster --nodes=5 my-nodegroup

# GKE
gcloud container clusters resize my-cluster --num-nodes=5
```

Reduce pod resource requests:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        memory: "256Mi"  # Reduced from 1Gi
        cpu: "250m"      # Reduced from 1000m
```

Delete unused pods to free resources:

```bash
# Find pods using the most resources
kubectl top pods --all-namespaces --sort-by=memory

# Delete unnecessary pods
kubectl delete pod unused-pod
```

## Debugging Node Selector Issues

Node selectors restrict which nodes a pod can run on. Mismatched selectors cause pending pods.

Check pod node selector:

```bash
kubectl get pod my-pod -o jsonpath='{.spec.nodeSelector}'
```

Output:

```json
{"disktype":"ssd"}
```

List nodes with matching labels:

```bash
kubectl get nodes -l disktype=ssd
```

If no nodes match, the pod stays pending.

Fix by adding labels to nodes:

```bash
kubectl label nodes worker-node-1 disktype=ssd
```

Or remove the node selector from the pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  # nodeSelector:  # Removed
  #   disktype: ssd
  containers:
  - name: app
    image: app:latest
```

## Debugging Taint and Toleration Issues

Taints prevent pods from scheduling on nodes unless they have matching tolerations.

Check node taints:

```bash
kubectl describe node worker-node-1 | grep Taints
```

Output:

```
Taints:  gpu=true:NoSchedule
```

This node rejects pods without a toleration for the gpu taint.

Check pod tolerations:

```bash
kubectl get pod my-pod -o jsonpath='{.spec.tolerations}'
```

If the pod lacks the necessary toleration, add it:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  tolerations:
  - key: "gpu"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
  containers:
  - name: app
    image: app:latest
```

List all node taints in the cluster:

```bash
kubectl get nodes -o json | jq -r '.items[] | {name: .metadata.name, taints: .spec.taints}'
```

## Debugging Affinity and Anti-Affinity Rules

Pod affinity and anti-affinity rules control pod placement based on other pods or node properties.

Check pod affinity rules:

```bash
kubectl get pod my-pod -o jsonpath='{.spec.affinity}'
```

Pod affinity example that might cause pending:

```yaml
affinity:
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - cache
      topologyKey: kubernetes.io/hostname
```

This pod requires a pod with label app=cache on the same node. If no such pod exists, this pod stays pending.

Find pods matching the affinity selector:

```bash
kubectl get pods -l app=cache -o wide
```

If no matching pods exist, you cannot schedule this pod with required affinity.

Fix by changing to preferred affinity:

```yaml
affinity:
  podAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:  # Preferred instead of required
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - cache
        topologyKey: kubernetes.io/hostname
```

## Debugging PersistentVolumeClaim Issues

Pods with PersistentVolumeClaims stay pending if the claim cannot be satisfied.

Check PVC status:

```bash
kubectl get pvc my-pvc
```

Output:

```
NAME     STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
my-pvc   Pending                                      standard       5m
```

Pending PVC prevents pod from scheduling.

Describe the PVC for details:

```bash
kubectl describe pvc my-pvc
```

Look for events:

```
Events:
  Type     Reason              Message
  ----     ------              -------
  Warning  ProvisioningFailed  Failed to provision volume: no available storage
```

Common PVC issues:

No available PersistentVolumes:

```bash
kubectl get pv
```

Create appropriate PersistentVolume or configure dynamic provisioning.

StorageClass does not exist:

```bash
kubectl get storageclass
```

Create missing StorageClass or use existing one:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard  # Use existing class
```

## Checking Resource Quotas

ResourceQuotas can prevent pod creation if namespace limits are exceeded.

Check namespace quotas:

```bash
kubectl get resourcequota -n my-namespace
```

Describe quota for details:

```bash
kubectl describe resourcequota my-quota -n my-namespace
```

Output:

```
Name:            my-quota
Resource         Used   Hard
--------         ----   ----
requests.cpu     2000m  2000m
requests.memory  8Gi    8Gi
```

The namespace has reached quota limits. New pods cannot be created.

Delete unused pods or increase quota:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: my-quota
  namespace: my-namespace
spec:
  hard:
    requests.cpu: "4000m"     # Increased from 2000m
    requests.memory: "16Gi"   # Increased from 8Gi
```

## Analyzing Scheduler Logs

When events do not reveal the cause, check scheduler logs.

Find the scheduler pod:

```bash
kubectl get pods -n kube-system -l component=kube-scheduler
```

View scheduler logs:

```bash
kubectl logs -n kube-system kube-scheduler-master-node
```

Look for messages about your pending pod:

```
I0209 10:15:30.123456 1 schedule_one.go:100] "Attempting to schedule pod" pod="default/my-pod"
I0209 10:15:30.234567 1 schedule_one.go:200] "Pod cannot be scheduled" pod="default/my-pod" err="0/3 nodes available: insufficient cpu"
```

Increase scheduler verbosity for more details:

```bash
kubectl edit deployment kube-scheduler -n kube-system
```

Add --v=4 flag for verbose logging:

```yaml
spec:
  containers:
  - command:
    - kube-scheduler
    - --v=4  # Increase verbosity
```

## Debugging with a Test Pod

Create a minimal test pod to isolate the issue:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pending
spec:
  containers:
  - name: test
    image: nginx
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
```

Apply and check if it schedules:

```bash
kubectl apply -f test-pod.yaml
kubectl get pod test-pending
```

If the test pod schedules successfully, the issue is specific to your original pod configuration. Compare configurations to find the difference.

## Common Solutions Summary

For insufficient resources:
- Add more nodes
- Reduce resource requests
- Delete unused pods
- Enable cluster autoscaler

For node selector issues:
- Add labels to nodes
- Remove or adjust node selectors
- Verify label spelling

For taint/toleration issues:
- Add tolerations to pod
- Remove unnecessary taints from nodes
- Use correct taint key/value/effect

For affinity issues:
- Change required affinity to preferred
- Ensure matching pods exist
- Adjust topology keys

For PVC issues:
- Create PersistentVolumes
- Configure StorageClass
- Check storage provisioner

For quota issues:
- Delete unused resources
- Increase quota limits
- Move pods to different namespace

## Monitoring and Alerting

Set up alerts for pending pods:

```yaml
# PrometheusRule
groups:
- name: pod-alerts
  rules:
  - alert: PodStuckPending
    expr: |
      kube_pod_status_phase{phase="Pending"} > 0
    for: 5m
    annotations:
      summary: "Pod {{ $labels.pod }} stuck in Pending state"
      description: "Pod has been pending for 5+ minutes"
```

Track pending pod metrics:

```bash
kubectl get pods --all-namespaces --field-selector status.phase=Pending
```

## Best Practices

Always check events first with kubectl describe. This solves 80% of pending pod issues.

Use appropriate resource requests. Do not over-request resources.

Ensure node labels match node selectors before deploying pods.

Test pod configurations in development before production deployment.

Monitor cluster resource usage and capacity. Add nodes before reaching capacity.

Document node selectors, taints, and affinity rules. Complex rules are hard to debug.

Use cluster autoscaler to handle temporary resource constraints automatically.

Set up alerts for pods pending longer than expected.

## Conclusion

Debugging pending pods requires systematic analysis of events, resources, node selectors, taints, affinity rules, and PVCs. Start with kubectl describe to check events, then investigate the specific issue identified.

Master these diagnostic techniques to quickly resolve pending pod issues and keep your applications running. Combine reactive debugging with proactive monitoring to prevent pending pods from impacting service availability.
