# How to Implement DaemonSet with Node Selector for Specific Node Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Node Selector, Node Pools, Scheduling

Description: Learn how to use node selectors with Kubernetes DaemonSets to deploy workloads only on specific node pools, enabling targeted deployment of specialized agents and services.

---

Not all nodes in a Kubernetes cluster are identical. You might have GPU nodes, high-memory nodes, or nodes in specific availability zones. Node selectors allow DaemonSets to target specific node pools, ensuring agents only run where needed. This guide demonstrates using node selectors to deploy DaemonSets to particular node groups.

## Understanding Node Selectors in DaemonSets

By default, DaemonSets schedule pods on every node. Node selectors restrict this behavior, matching nodes by labels. When you add a node selector to a DaemonSet, Kubernetes only schedules pods on nodes with matching labels. This enables targeted deployment of specialized workloads.

Common use cases include GPU monitoring agents on GPU nodes, high-performance storage drivers on storage nodes, compliance agents on nodes handling sensitive data, and regional log collectors for geo-specific log routing.

## Labeling Nodes for Selection

First, label your nodes to identify pools:

```bash
# Label nodes by instance type
kubectl label node node-1 node-type=standard
kubectl label node node-2 node-type=standard
kubectl label node node-3 node-type=gpu
kubectl label node node-4 node-type=gpu

# Label nodes by availability zone
kubectl label node node-1 topology.kubernetes.io/zone=us-east-1a
kubectl label node node-2 topology.kubernetes.io/zone=us-east-1b

# Label nodes by workload type
kubectl label node node-5 workload=compute
kubectl label node node-6 workload=storage
kubectl label node node-7 workload=database

# Label nodes by environment
kubectl label node node-8 environment=production
kubectl label node node-9 environment=staging
```

View node labels:

```bash
kubectl get nodes --show-labels
kubectl get nodes -L node-type,workload,environment
```

## Deploying DaemonSet with Simple Node Selector

Deploy to GPU nodes only:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-gpu-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: gpu-exporter
  template:
    metadata:
      labels:
        app: gpu-exporter
    spec:
      nodeSelector:
        node-type: gpu
      hostNetwork: true
      containers:
      - name: gpu-exporter
        image: nvidia/dcgm-exporter:3.1.0
        ports:
        - containerPort: 9400
          name: metrics
        securityContext:
          capabilities:
            add:
            - SYS_ADMIN
        volumeMounts:
        - name: nvidia
          mountPath: /usr/local/nvidia
      volumes:
      - name: nvidia
        hostPath:
          path: /usr/local/nvidia
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
```

This DaemonSet only runs on nodes with `node-type: gpu` label.

## Using Multiple Labels for Precise Selection

Combine multiple labels for fine-grained control:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: prod-compliance-agent
  namespace: security
spec:
  selector:
    matchLabels:
      app: compliance-agent
  template:
    metadata:
      labels:
        app: compliance-agent
    spec:
      nodeSelector:
        environment: production
        workload: database
        compliance: required
      containers:
      - name: agent
        image: compliance-agent:latest
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: audit-log
          mountPath: /var/log/audit
        - name: sys
          mountPath: /sys
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      volumes:
      - name: audit-log
        hostPath:
          path: /var/log/audit
      - name: sys
        hostPath:
          path: /sys
```

All three labels must match for the pod to schedule.

## Implementing Zone-Specific DaemonSets

Deploy different configurations per availability zone:

```yaml
# us-east-1a log collector
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector-us-east-1a
  namespace: logging
spec:
  selector:
    matchLabels:
      app: log-collector
      zone: us-east-1a
  template:
    metadata:
      labels:
        app: log-collector
        zone: us-east-1a
    spec:
      nodeSelector:
        topology.kubernetes.io/zone: us-east-1a
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        env:
        - name: REGION
          value: "us-east-1"
        - name: ZONE
          value: "us-east-1a"
        - name: ELASTICSEARCH_HOST
          value: "es-us-east-1a.example.com"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
---
# us-east-1b log collector
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector-us-east-1b
  namespace: logging
spec:
  selector:
    matchLabels:
      app: log-collector
      zone: us-east-1b
  template:
    metadata:
      labels:
        app: log-collector
        zone: us-east-1b
    spec:
      nodeSelector:
        topology.kubernetes.io/zone: us-east-1b
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        env:
        - name: REGION
          value: "us-east-1"
        - name: ZONE
          value: "us-east-1b"
        - name: ELASTICSEARCH_HOST
          value: "es-us-east-1b.example.com"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

## Deploying to Storage Node Pools

Deploy storage-specific agents only on storage nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ceph-csi-plugin
  namespace: storage
spec:
  selector:
    matchLabels:
      app: ceph-csi
  template:
    metadata:
      labels:
        app: ceph-csi
    spec:
      nodeSelector:
        workload: storage
        storage-type: ceph
      hostNetwork: true
      hostPID: true
      serviceAccountName: ceph-csi
      containers:
      - name: driver-registrar
        image: k8s.gcr.io/sig-storage/csi-node-driver-registrar:v2.5.0
        args:
        - --csi-address=/csi/csi.sock
        - --kubelet-registration-path=/var/lib/kubelet/plugins/ceph.csi.cephfs.k8s.io/csi.sock
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
        - name: registration-dir
          mountPath: /registration
      - name: ceph-csi-plugin
        image: quay.io/cephcsi/cephcsi:v3.8.0
        args:
        - --nodeid=$(NODE_ID)
        - --endpoint=unix:///csi/csi.sock
        - --drivername=ceph.csi.cephfs.k8s.io
        env:
        - name: NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
        - name: pods-mount-dir
          mountPath: /var/lib/kubelet/pods
          mountPropagation: Bidirectional
        - name: plugin-dir
          mountPath: /var/lib/kubelet/plugins
          mountPropagation: Bidirectional
      volumes:
      - name: socket-dir
        hostPath:
          path: /var/lib/kubelet/plugins/ceph.csi.cephfs.k8s.io/
          type: DirectoryOrCreate
      - name: registration-dir
        hostPath:
          path: /var/lib/kubelet/plugins_registry/
      - name: pods-mount-dir
        hostPath:
          path: /var/lib/kubelet/pods
          type: Directory
      - name: plugin-dir
        hostPath:
          path: /var/lib/kubelet/plugins
          type: Directory
```

## Using Node Affinity for Advanced Selection

Node affinity provides more expressive matching than node selectors:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: performance-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: perf-monitor
  template:
    metadata:
      labels:
        app: perf-monitor
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-type
                operator: In
                values:
                - compute
                - gpu
              - key: performance
                operator: NotIn
                values:
                - low
            - matchExpressions:
              - key: special-hardware
                operator: Exists
      containers:
      - name: monitor
        image: performance-monitor:latest
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

This matches nodes that are either compute/gpu types with performance != low, OR nodes with the special-hardware label.

## Automating Node Labeling

Create a controller to automatically label nodes:

```go
package main

import (
    "context"
    "strings"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func labelNodesByInstanceType(clientset *kubernetes.Clientset) error {
    nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return err
    }

    for _, node := range nodes.Items {
        // Extract instance type from node labels
        instanceType := node.Labels["node.kubernetes.io/instance-type"]

        // Determine node category
        var nodeType string
        if strings.Contains(instanceType, "gpu") || strings.HasPrefix(instanceType, "p3") {
            nodeType = "gpu"
        } else if strings.Contains(instanceType, "storage") || strings.HasPrefix(instanceType, "d2") {
            nodeType = "storage"
        } else if strings.Contains(instanceType, "memory") || strings.HasPrefix(instanceType, "r5") {
            nodeType = "memory"
        } else {
            nodeType = "standard"
        }

        // Apply label
        node.Labels["node-category"] = nodeType

        _, err := clientset.CoreV1().Nodes().Update(context.TODO(), &node, metav1.UpdateOptions{})
        if err != nil {
            return err
        }
    }

    return nil
}
```

Deploy as a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: node-labeler
  namespace: kube-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: node-labeler
          containers:
          - name: labeler
            image: node-labeler:latest
          restartPolicy: OnFailure
```

## Monitoring Node Selector Coverage

Track which nodes have DaemonSet pods:

```bash
# Check DaemonSet coverage
kubectl get daemonset gpu-exporter -n monitoring -o wide

# List nodes matching selector
kubectl get nodes -l node-type=gpu

# Verify pods are scheduled correctly
kubectl get pods -n monitoring -l app=gpu-exporter -o wide
```

Create alerts for missing coverage:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: daemonset-coverage-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: daemonset-node-coverage
      rules:
      - alert: DaemonSetNotOnAllTargetNodes
        expr: |
          kube_daemonset_status_desired_number_scheduled{daemonset="gpu-exporter"}
          != kube_node_labels{label_node_type="gpu"}
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "GPU exporter not running on all GPU nodes"
```

## Best Practices

Use consistent labeling schemes across your infrastructure. Document which labels trigger which DaemonSets to avoid confusion.

Automate node labeling rather than manual maintenance. As nodes scale, manual labeling becomes error-prone.

Test node selectors in staging environments. Incorrect selectors can leave critical agents undeployed.

Monitor DaemonSet desired vs ready pod counts. Gaps indicate nodes that should have pods but don't.

Consider using node affinity for complex selection logic. It provides more flexibility than simple node selectors.

## Conclusion

Node selectors enable precise control over DaemonSet placement, ensuring specialized agents only run on appropriate nodes. By combining node labels with DaemonSet node selectors, you can deploy GPU monitors only on GPU nodes, storage drivers only on storage nodes, and compliance agents only on regulated workloads. This targeted deployment reduces resource waste while ensuring critical node-level services run exactly where needed.

Implement node selectors to optimize DaemonSet deployment across heterogeneous node pools.
