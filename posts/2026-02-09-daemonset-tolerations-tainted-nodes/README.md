# How to Configure DaemonSet Tolerations for Running on Tainted Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Tolerations, Taints, Node Scheduling

Description: Learn how to configure tolerations in Kubernetes DaemonSets to ensure critical node-level agents run on tainted nodes including master nodes, GPU nodes, and specialized workload nodes.

---

Kubernetes taints prevent regular pods from scheduling on nodes with special requirements. However, DaemonSet workloads like monitoring agents and log collectors must run on ALL nodes, including tainted ones. Tolerations allow DaemonSets to bypass taints and ensure comprehensive node coverage. This guide demonstrates configuring tolerations for various taint scenarios.

## Understanding Taints and Tolerations

Nodes receive taints to mark them as special, such as master nodes, GPU nodes, or nodes undergoing maintenance. Taints have three effects: NoSchedule prevents new pods from scheduling, PreferNoSchedule suggests avoiding the node, and NoExecute evicts existing pods.

DaemonSets need tolerations matching node taints to schedule successfully. Without proper tolerations, critical agents won't run on tainted nodes, creating monitoring blind spots and operational gaps.

## Tolerating Master Node Taints

Control plane nodes have taints preventing regular workloads. System DaemonSets must tolerate these:

```yaml
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
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        ports:
        - containerPort: 9100
          name: metrics
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
      tolerations:
      - key: node-role.kubernetes.io/master
        operator: Exists
        effect: NoSchedule
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
```

The `Exists` operator matches any value, allowing the pod to tolerate master/control-plane taints regardless of their values.

## Tolerating All NoSchedule Taints

For critical system components, tolerate any NoSchedule taint:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-proxy
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: kube-proxy
  template:
    metadata:
      labels:
        app: kube-proxy
    spec:
      hostNetwork: true
      containers:
      - name: kube-proxy
        image: k8s.gcr.io/kube-proxy:v1.28.0
        command:
        - /usr/local/bin/kube-proxy
        - --config=/var/lib/kube-proxy/config.conf
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
      tolerations:
      - operator: Exists
        effect: NoSchedule
```

This wildcard toleration allows scheduling on any node with NoSchedule taints.

## Tolerating GPU Node Taints

GPU nodes often have taints to prevent non-GPU workloads from consuming expensive resources:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: nvidia-device-plugin
  template:
    metadata:
      labels:
        app: nvidia-device-plugin
    spec:
      nodeSelector:
        accelerator: nvidia
      containers:
      - name: nvidia-device-plugin
        image: nvidia/k8s-device-plugin:v0.14.0
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoExecute
```

Both NoSchedule and NoExecute tolerations ensure the plugin persists even if the taint changes.

## Handling NoExecute Taints

NoExecute taints evict existing pods. Configure tolerations with duration limits:

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
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      tolerations:
      - key: node.kubernetes.io/not-ready
        operator: Exists
        effect: NoExecute
        tolerationSeconds: 300
      - key: node.kubernetes.io/unreachable
        operator: Exists
        effect: NoExecute
        tolerationSeconds: 300
      - key: node.kubernetes.io/disk-pressure
        operator: Exists
        effect: NoExecute
        tolerationSeconds: 60
```

The `tolerationSeconds` field defines how long pods tolerate the condition before eviction. This allows temporary issues to resolve while eventually clearing unhealthy nodes.

## Tolerating Maintenance Taints

When draining nodes for maintenance, add temporary taints:

```bash
# Taint node for maintenance
kubectl taint node node-1 maintenance=scheduled:NoExecute

# DaemonSet tolerating maintenance
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
      containers:
      - name: agent
        image: monitoring-agent:latest
      tolerations:
      - key: maintenance
        operator: Equal
        value: scheduled
        effect: NoExecute
        tolerationSeconds: 3600  # Tolerate for 1 hour
      - operator: Exists
        effect: NoSchedule
```

After maintenance completes, remove the taint:

```bash
kubectl taint node node-1 maintenance-
```

## Creating Dynamic Toleration Policies

Use admission webhooks to inject tolerations automatically:

```go
package main

import (
    "encoding/json"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/api/admission/v1"
)

type patchOperation struct {
    Op    string      `json:"op"`
    Path  string      `json:"path"`
    Value interface{} `json:"value,omitempty"`
}

func addTolerations(pod *corev1.Pod) ([]patchOperation, error) {
    var patches []patchOperation

    // Default tolerations for DaemonSet pods
    defaultTolerations := []corev1.Toleration{
        {
            Key:      "node-role.kubernetes.io/master",
            Operator: corev1.TolerationOpExists,
            Effect:   corev1.TaintEffectNoSchedule,
        },
        {
            Key:      "node-role.kubernetes.io/control-plane",
            Operator: corev1.TolerationOpExists,
            Effect:   corev1.TaintEffectNoSchedule,
        },
        {
            Key:               "node.kubernetes.io/not-ready",
            Operator:          corev1.TolerationOpExists,
            Effect:            corev1.TaintEffectNoExecute,
            TolerationSeconds: int64Ptr(300),
        },
    }

    // Check if pod already has tolerations
    if len(pod.Spec.Tolerations) == 0 {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/spec/tolerations",
            Value: defaultTolerations,
        })
    } else {
        // Merge with existing tolerations
        for _, toleration := range defaultTolerations {
            patches = append(patches, patchOperation{
                Op:    "add",
                Path:  "/spec/tolerations/-",
                Value: toleration,
            })
        }
    }

    return patches, nil
}

func int64Ptr(i int64) *int64 {
    return &i
}
```

Deploy the webhook:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: toleration-injector
webhooks:
- name: inject-tolerations.example.com
  clientConfig:
    service:
      name: toleration-injector
      namespace: kube-system
      path: "/mutate"
    caBundle: <base64-encoded-ca-cert>
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  namespaceSelector:
    matchLabels:
      inject-tolerations: enabled
```

## Monitoring Taint Coverage

Track DaemonSet pods on tainted nodes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: taint-coverage-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: tainted-node-coverage
      rules:
      - alert: DaemonSetNotOnTaintedNodes
        expr: |
          count(kube_node_spec_taint{effect="NoSchedule"})
          != count(kube_pod_info{created_by_kind="DaemonSet"})
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "DaemonSet missing on tainted nodes"

      - alert: MasterNodeMissingMonitoring
        expr: |
          count(kube_node_role{role="master"})
          > count(kube_pod_info{created_by_kind="DaemonSet",pod=~"node-exporter.*",node=~".*master.*"})
        labels:
          severity: critical
        annotations:
          summary: "Master nodes missing monitoring agents"
```

Query tainted nodes and DaemonSet coverage:

```bash
# List tainted nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Check DaemonSet pods on masters
kubectl get pods -n monitoring -o wide | grep master

# Verify tolerations
kubectl get daemonset node-exporter -n monitoring -o yaml | grep -A 10 tolerations
```

## Handling Custom Taints

Organizations often create custom taints for specific purposes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: security-scanner
  namespace: security
spec:
  selector:
    matchLabels:
      app: security-scanner
  template:
    metadata:
      labels:
        app: security-scanner
    spec:
      containers:
      - name: scanner
        image: security-scanner:latest
        securityContext:
          privileged: true
      tolerations:
      # Tolerate compliance taints
      - key: compliance
        operator: Equal
        value: pci-dss
        effect: NoSchedule
      - key: compliance
        operator: Equal
        value: hipaa
        effect: NoSchedule
      # Tolerate dedicated node pool taints
      - key: dedicated
        operator: Equal
        value: database
        effect: NoSchedule
      # Tolerate high-security taints
      - key: security-level
        operator: Equal
        value: high
        effect: NoExecute
      # Wildcard for unknown taints
      - operator: Exists
        effect: NoSchedule
```

## Best Practices

Use wildcard tolerations (`operator: Exists`) for critical system components that must run everywhere. This ensures coverage even when new taint types are added.

Set appropriate `tolerationSeconds` for NoExecute effects. Too short causes premature evictions. Too long delays response to genuine failures.

Document custom taints and their intended tolerations. Clear documentation prevents accidental scheduling gaps.

Test DaemonSet deployment on tainted nodes. Verify pods actually schedule and function correctly on nodes with expected taints.

Monitor for tainted nodes missing DaemonSet pods. Metrics and alerts catch misconfigured tolerations before they impact operations.

Consider using admission webhooks to inject common tolerations automatically, reducing configuration duplication across DaemonSets.

## Conclusion

Tolerations ensure DaemonSets achieve complete node coverage despite taints. By properly configuring tolerations for master nodes, GPU nodes, and custom taint scenarios, you guarantee critical node-level services run everywhere they're needed. This comprehensive coverage is essential for monitoring, logging, security scanning, and other infrastructure components that must operate on every node regardless of specialization or restrictions.

Implement proper tolerations to ensure DaemonSet workloads run on all nodes in your cluster.
