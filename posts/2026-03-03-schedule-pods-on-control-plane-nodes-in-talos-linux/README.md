# How to Schedule Pods on Control Plane Nodes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pod Scheduling, Control Plane, Kubernetes, Tolerations

Description: Learn multiple approaches to scheduling pods on Talos Linux control plane nodes using tolerations, taints, and cluster configuration.

---

By default, Kubernetes prevents regular pods from running on control plane nodes. This is a sensible security and stability measure - you do not want a runaway application consuming all resources on a node that runs etcd and the API server. But there are legitimate reasons to schedule specific pods on control plane nodes: monitoring agents, log collectors, security scanners, and network plugins all need to run on every node, including control plane nodes.

This guide covers different approaches to scheduling pods on control plane nodes in Talos Linux.

## Understanding Control Plane Taints

Control plane nodes in Kubernetes have a taint that repels pods without matching tolerations:

```text
node-role.kubernetes.io/control-plane:NoSchedule
```

This taint tells the scheduler: do not place any pod on this node unless the pod explicitly tolerates this taint. The control plane system pods (API server, etcd, etc.) have this toleration built in, so they run without issues.

You can verify the taints on your control plane nodes:

```bash
# Check taints on all nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Detailed view of a specific control plane node
kubectl describe node cp-1 | grep -A 5 Taints
```

## Approach 1: Add Tolerations to Specific Pods

The most targeted approach is adding tolerations to the pods that need to run on control plane nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      tolerations:
        # Tolerate the control plane taint
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: agent
          image: prom/node-exporter:v1.7.0
          ports:
            - containerPort: 9100
```

This DaemonSet will run on all nodes, including control plane nodes, because it tolerates the control plane taint. Other pods without this toleration will still be excluded from control plane nodes.

## Approach 2: Tolerate All Taints

For pods that must run on every node regardless of any taints:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: logging
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      tolerations:
        # Tolerate all taints
        - operator: Exists
      containers:
        - name: fluentbit
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

The `operator: Exists` without a `key` matches all taints. Use this carefully because it will schedule the pod even on nodes with `NoExecute` taints.

## Approach 3: Remove Control Plane Taints Cluster-Wide

If you want all pods to be schedulable on control plane nodes (not just specific ones), configure Talos to not apply the taint:

```yaml
cluster:
  allowSchedulingOnControlPlanes: true
```

Apply this to your control plane configuration:

```bash
talosctl patch machineconfig --nodes 10.0.0.2 \
  --patch '{"cluster": {"allowSchedulingOnControlPlanes": true}}'
```

This removes the `NoSchedule` taint entirely, so the scheduler treats control plane nodes the same as worker nodes.

## Approach 4: Target Control Plane Nodes Specifically

Sometimes you want a pod to run only on control plane nodes, not on workers. Use node affinity with tolerations:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: etcd-backup
  template:
    metadata:
      labels:
        app: etcd-backup
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-role.kubernetes.io/control-plane
                    operator: Exists
      containers:
        - name: backup
          image: alpine:latest
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                echo "Running etcd backup..."
                sleep 3600
              done
```

The toleration allows the pod to run on control plane nodes, and the node affinity ensures it only runs on control plane nodes.

## Approach 5: Using nodeSelector

A simpler alternative to node affinity for targeting control plane nodes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cp-only-pod
spec:
  nodeSelector:
    node-role.kubernetes.io/control-plane: ""
  tolerations:
    - key: node-role.kubernetes.io/control-plane
      operator: Exists
      effect: NoSchedule
  containers:
    - name: app
      image: nginx:latest
```

The `nodeSelector` combined with the toleration ensures the pod runs exclusively on control plane nodes.

## Practical Examples

### Monitoring Stack on All Nodes

```yaml
# Prometheus Node Exporter - runs on every node
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: node-exporter
          image: prom/node-exporter:v1.7.0
          args:
            - "--path.procfs=/host/proc"
            - "--path.sysfs=/host/sys"
          ports:
            - containerPort: 9100
              hostPort: 9100
          volumeMounts:
            - name: proc
              mountPath: /host/proc
              readOnly: true
            - name: sys
              mountPath: /host/sys
              readOnly: true
      volumes:
        - name: proc
          hostPath:
            path: /proc
        - name: sys
          hostPath:
            path: /sys
```

### Network Policy Controller

```yaml
# Calico node agent - needs to run on all nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: calico-node
  template:
    metadata:
      labels:
        app: calico-node
    spec:
      hostNetwork: true
      tolerations:
        # Tolerate control plane taint
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
        # Also tolerate not-ready during bootstrap
        - key: node.kubernetes.io/not-ready
          operator: Exists
          effect: NoSchedule
      containers:
        - name: calico-node
          image: calico/node:v3.27.0
```

## Verifying Pod Placement

After deploying pods with tolerations, verify they are running where expected:

```bash
# Check which nodes pods are running on
kubectl get pods -o wide --all-namespaces | grep <pod-name>

# List all pods on a specific control plane node
kubectl get pods --all-namespaces --field-selector spec.nodeName=cp-1

# Check DaemonSet placement
kubectl get daemonset -n monitoring node-exporter -o wide
```

## Resource Considerations

When scheduling pods on control plane nodes, account for the resources already consumed by control plane components:

```bash
# Check resource usage on control plane nodes
kubectl top node cp-1

# Check control plane pod resource consumption
kubectl top pods -n kube-system --sort-by=memory
```

Set resource limits on pods you schedule on control plane nodes to prevent them from interfering with control plane operations:

```yaml
containers:
  - name: monitoring-agent
    image: monitoring:latest
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

## Common Mistakes

A frequent mistake is adding tolerations without understanding the effect. There are three effects:

- `NoSchedule` - prevents new pods from being scheduled
- `PreferNoSchedule` - soft version of NoSchedule
- `NoExecute` - evicts running pods that do not tolerate the taint

Make sure your toleration matches the actual effect on the node. For control plane nodes in Talos, the taint is `NoSchedule`.

Another common mistake is tolerating the taint but forgetting that DaemonSets also need to tolerate `node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable` taints if they need to run during node startup.

## Conclusion

Scheduling pods on control plane nodes in Talos Linux can be done at the pod level with tolerations or cluster-wide by removing the control plane taint. Use tolerations for specific pods like monitoring agents and network plugins. Use the cluster-wide setting for small clusters where all nodes need to run workloads. Always protect control plane resources by setting proper resource limits on any pods you schedule on these nodes.
