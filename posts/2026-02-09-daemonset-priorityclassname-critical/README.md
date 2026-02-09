# How to Implement DaemonSet with priorityClassName for Critical System Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Priority Class, QoS, Resource Management

Description: Learn how to configure priorityClassName in Kubernetes DaemonSets to protect critical system components from eviction and ensure infrastructure services remain operational during resource pressure.

---

When nodes experience resource pressure, Kubernetes evicts pods to reclaim resources. DaemonSets running critical infrastructure must survive these conditions to maintain cluster functionality. Priority classes determine which pods evict first, with system-critical pods receiving the highest protection. This guide demonstrates using priority classes to safeguard essential DaemonSet workloads.

## Understanding Pod Priority and Preemption

Priority classes assign numeric priorities to pods. During scheduling, higher priority pods can preempt lower priority pods if resources are insufficient. During eviction, lower priority pods are killed first. This ensures critical infrastructure remains operational when resources become scarce.

Kubernetes includes built-in priority classes: system-cluster-critical (priority 2000000000) for cluster infrastructure and system-node-critical (priority 2000001000) for node infrastructure. Custom priority classes enable fine-grained control over eviction ordering.

## Deploying kube-proxy with System Priority

kube-proxy is essential for service networking and must use system-node-critical priority:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-proxy
  namespace: kube-system
  labels:
    k8s-app: kube-proxy
spec:
  selector:
    matchLabels:
      k8s-app: kube-proxy
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        k8s-app: kube-proxy
    spec:
      priorityClassName: system-node-critical
      hostNetwork: true
      serviceAccountName: kube-proxy
      tolerations:
      - operator: Exists
      containers:
      - name: kube-proxy
        image: k8s.gcr.io/kube-proxy:v1.28.0
        command:
        - /usr/local/bin/kube-proxy
        - --config=/var/lib/kube-proxy/config.conf
        - --hostname-override=$(NODE_NAME)
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true
        volumeMounts:
        - name: kube-proxy
          mountPath: /var/lib/kube-proxy
        - name: xtables-lock
          mountPath: /run/xtables.lock
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
      volumes:
      - name: kube-proxy
        configMap:
          name: kube-proxy
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: lib-modules
        hostPath:
          path: /lib/modules
```

## Creating Custom Priority Classes

Define custom priorities for different tiers:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: infrastructure-critical
value: 1000000000
globalDefault: false
description: "Critical infrastructure components that must survive resource pressure"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: monitoring-high
value: 100000
globalDefault: false
description: "High-priority monitoring agents"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: monitoring-standard
value: 10000
globalDefault: false
description: "Standard monitoring agents"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: logging-standard
value: 5000
globalDefault: false
description: "Standard logging agents"
```

## Assigning Priorities to CNI DaemonSets

CNI plugins need system-node-critical priority:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  template:
    metadata:
      labels:
        k8s-app: calico-node
    spec:
      priorityClassName: system-node-critical
      hostNetwork: true
      serviceAccountName: calico-node
      tolerations:
      - operator: Exists
      containers:
      - name: calico-node
        image: calico/node:v3.27.0
        env:
        - name: DATASTORE_TYPE
          value: "kubernetes"
        - name: NODENAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
        volumeMounts:
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        - name: var-run-calico
          mountPath: /var/run/calico
        - name: xtables-lock
          mountPath: /run/xtables.lock
      volumes:
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: var-run-calico
        hostPath:
          path: /var/run/calico
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
```

## Configuring Storage Driver Priorities

Storage drivers need high priority to prevent data access interruptions:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: csi-node-driver
  namespace: storage-system
spec:
  selector:
    matchLabels:
      app: csi-driver
  template:
    metadata:
      labels:
        app: csi-driver
    spec:
      priorityClassName: infrastructure-critical
      serviceAccountName: csi-node
      containers:
      - name: driver-registrar
        image: k8s.gcr.io/sig-storage/csi-node-driver-registrar:v2.5.0
        args:
        - --csi-address=/csi/csi.sock
        - --kubelet-registration-path=/var/lib/kubelet/plugins/csi-driver/csi.sock
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
        - name: registration-dir
          mountPath: /registration
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
      - name: csi-driver
        image: csi-driver:latest
        args:
        - --endpoint=unix:///csi/csi.sock
        - --nodeid=$(NODE_ID)
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
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
      volumes:
      - name: socket-dir
        hostPath:
          path: /var/lib/kubelet/plugins/csi-driver/
          type: DirectoryOrCreate
      - name: registration-dir
        hostPath:
          path: /var/lib/kubelet/plugins_registry/
      - name: pods-mount-dir
        hostPath:
          path: /var/lib/kubelet/pods
      - name: plugin-dir
        hostPath:
          path: /var/lib/kubelet/plugins
```

## Setting Monitoring Agent Priorities

Differentiate critical vs nice-to-have monitoring:

```yaml
# Critical metrics collector
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
      priorityClassName: monitoring-high
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        ports:
        - containerPort: 9100
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
---
# Standard log collector
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
      priorityClassName: logging-standard
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        resources:
          requests:
            cpu: 100m
            memory: 200Mi
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

## Implementing Priority-Based Eviction Strategy

Configure kubelet eviction thresholds with priority awareness:

```yaml
# kubelet-config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "100Mi"
  nodefs.available: "10%"
  imagefs.available: "15%"
evictionSoft:
  memory.available: "500Mi"
  nodefs.available: "15%"
  imagefs.available: "20%"
evictionSoftGracePeriod:
  memory.available: "1m"
  nodefs.available: "1m"
  imagefs.available: "1m"
evictionMaxPodGracePeriod: 30
evictionPressureTransitionPeriod: 30s
```

## Testing Priority Behavior

Simulate resource pressure to verify priorities:

```bash
#!/bin/bash
# Create memory pressure

# Deploy memory hog
kubectl run memory-hog --image=polinux/stress --restart=Never -- \
    stress --vm 1 --vm-bytes 8G --vm-hang 0

# Watch pod evictions
kubectl get events --sort-by='.lastTimestamp' | grep -i evict

# Verify DaemonSet pods survived
kubectl get pods -n kube-system -l k8s-app=kube-proxy
kubectl get pods -n monitoring -l app=node-exporter

# Check priority of running pods
kubectl get pods -A -o custom-columns=NAME:.metadata.name,PRIORITY:.spec.priorityClassName,STATUS:.status.phase

# Clean up
kubectl delete pod memory-hog
```

## Monitoring Priority Class Usage

Track priority class assignments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: priority-monitoring
  namespace: monitoring
data:
  queries.yaml: |
    # Count pods by priority class
    count by (priority_class) (kube_pod_info)

    # Identify pods without priority class
    kube_pod_info{priority_class=""}

    # Track evictions by priority
    sum by (priority_class) (
      rate(kube_pod_container_status_terminated_reason{reason="Evicted"}[5m])
    )
  alerts.yaml: |
    groups:
    - name: priority-classes
      rules:
      - alert: CriticalPodEvicted
        expr: |
          kube_pod_container_status_terminated_reason{
            reason="Evicted",
            priority_class=~"system-.*-critical"
          } > 0
        labels:
          severity: critical
        annotations:
          summary: "Critical system pod evicted: {{ $labels.pod }}"

      - alert: DaemonSetMissingPriority
        expr: |
          kube_daemonset_labels{priority_class=""} > 0
        labels:
          severity: warning
        annotations:
          summary: "DaemonSet {{ $labels.daemonset }} missing priority class"
```

## Implementing Admission Control

Enforce priority class requirements:

```go
package main

import (
    "fmt"
    corev1 "k8s.io/api/core/v1"
    appsv1 "k8s.io/api/apps/v1"
)

func validateDaemonSetPriority(ds *appsv1.DaemonSet) error {
    priorityClass := ds.Spec.Template.Spec.PriorityClassName

    // Require priority class for DaemonSets
    if priorityClass == "" {
        return fmt.Errorf("DaemonSet must have priorityClassName set")
    }

    // Validate namespace-specific requirements
    namespace := ds.Namespace
    if namespace == "kube-system" {
        // kube-system DaemonSets must use system priority
        if !strings.HasPrefix(priorityClass, "system-") {
            return fmt.Errorf("kube-system DaemonSets must use system-* priority class")
        }
    }

    return nil
}
```

Deploy validation webhook:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: daemonset-priority-validator
webhooks:
- name: validate-daemonset-priority.example.com
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["daemonsets"]
  clientConfig:
    service:
      name: priority-validator
      namespace: kube-system
      path: "/validate"
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

## Best Practices

Use system-node-critical only for components essential to node functionality like kube-proxy, CNI plugins, and CSI node drivers.

Create organization-specific priority classes for different tiers of infrastructure rather than overusing system priorities.

Document priority class usage and rationale. Clear guidelines prevent misuse and ensure consistent application.

Test eviction behavior under simulated resource pressure. Verify priority classes provide expected protection.

Monitor for critical pod evictions. These indicate insufficient node capacity or misconfigured priorities.

Implement admission control to enforce priority class requirements. Prevention is better than debugging eviction issues in production.

## Conclusion

Priority classes protect critical DaemonSet workloads from eviction during resource pressure. By assigning appropriate priorities based on criticality, you ensure essential infrastructure like networking, storage, and monitoring survives when nodes become resource-constrained. This layered approach to resource management maintains cluster functionality even under adverse conditions.

Implement priority classes thoughtfully to safeguard infrastructure DaemonSets from eviction.
