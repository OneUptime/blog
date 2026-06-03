# How to Configure Windows Node Taints and Node Selectors for Mixed OS Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Window, Node Selectors, Taints, Toleration, Mixed OS

Description: Learn how to properly configure node taints, tolerations, and selectors to ensure correct pod placement in Kubernetes clusters running both Linux and Windows nodes.

---

Running mixed OS Kubernetes clusters requires careful pod placement configuration. Without proper taints and node selectors, Linux pods might try to schedule on Windows nodes or vice versa, leading to pod failures. Kubernetes provides several mechanisms to control pod placement, ensuring workloads land on compatible nodes.

In this guide, you'll learn how to configure taints, tolerations, and node selectors for reliable pod scheduling in mixed OS environments.

## Understanding the Challenge

Kubernetes doesn't automatically prevent incompatible pod-node assignments. A Linux container scheduled to a Windows node will fail, and vice versa. You need explicit configuration to enforce OS-compatible scheduling.

The solution involves three complementary mechanisms. Node selectors require pods to match specific node labels. Taints mark nodes as special-purpose, requiring explicit tolerations. Node affinity provides flexible, preference-based scheduling rules.

## Labeling Nodes by Operating System

Kubernetes automatically adds OS labels to nodes, but verify they're correct:

```bash
# Check existing labels

kubectl get nodes --show-labels

# Verify OS label on Windows nodes
kubectl get nodes -l kubernetes.io/os=windows

# Verify OS label on Linux nodes
kubectl get nodes -l kubernetes.io/os=linux
```

If labels are missing, add them manually:

```bash
# Label Windows nodes
kubectl label node windows-node-1 kubernetes.io/os=windows
kubectl label node windows-node-1 node.kubernetes.io/windows-build=10.0.20348

# Label Linux nodes (if needed)
kubectl label node linux-node-1 kubernetes.io/os=linux
```

Add custom labels for workload types:

```bash
# Label nodes by workload capability
kubectl label node windows-node-1 workload-type=dotnet
kubectl label node windows-node-2 workload-type=iis
kubectl label node linux-node-1 workload-type=web
kubectl label node linux-node-2 workload-type=database
```

## Implementing Node Selectors for OS Compatibility

Always use node selectors to specify the required OS, and set the Pod OS field to document the intended operating system:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: windows-app
  template:
    metadata:
      labels:
        app: windows-app
    spec:
      os:
        name: windows
      nodeSelector:
        kubernetes.io/os: windows  # Must run on Windows
      containers:
      - name: app
        image: mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022
        ports:
        - containerPort: 80
```

For Linux workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linux-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: linux-app
  template:
    metadata:
      labels:
        app: linux-app
    spec:
      os:
        name: linux
      nodeSelector:
        kubernetes.io/os: linux  # Must run on Linux
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
```

Combine multiple selectors for precise placement:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-dotnet-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: windows-dotnet-app
  template:
    metadata:
      labels:
        app: windows-dotnet-app
    spec:
      os:
        name: windows
      nodeSelector:
        kubernetes.io/os: windows
        workload-type: dotnet
        node.kubernetes.io/windows-build: "10.0.20348"
      containers:
      - name: app
        image: myregistry.io/dotnet-app:v1.0
```

## Tainting Windows Nodes

Apply taints to Windows nodes to prevent Linux pods from scheduling there:

```bash
# Taint Windows nodes
kubectl taint nodes windows-node-1 os=windows:NoSchedule
kubectl taint nodes windows-node-2 os=windows:NoSchedule

# Verify taints
kubectl describe node windows-node-1 | grep Taints
```

This prevents any pod without a matching toleration from scheduling on Windows nodes.

## Adding Tolerations to Windows Workloads

Windows pods need tolerations to schedule on tainted Windows nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: windows-service
  template:
    metadata:
      labels:
        app: windows-service
    spec:
      os:
        name: windows
      nodeSelector:
        kubernetes.io/os: windows
      tolerations:
      - key: os
        operator: Equal
        value: windows
        effect: NoSchedule
      containers:
      - name: service
        image: mcr.microsoft.com/windows/servercore:ltsc2022
```

## Using Node Affinity for Flexible Scheduling

Node affinity provides more sophisticated scheduling rules:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: preferred-windows-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: preferred-windows-app
  template:
    metadata:
      labels:
        app: preferred-windows-app
    spec:
      os:
        name: windows
      affinity:
        nodeAffinity:
          # Hard requirement: Must be Windows
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                - windows

          # Soft preference: Prefer newer Windows builds
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: node.kubernetes.io/windows-build
                operator: In
                values:
                - "10.0.26100"  # Windows Server 2025
          - weight: 50
            preference:
              matchExpressions:
              - key: node.kubernetes.io/windows-build
                operator: In
                values:
                - "10.0.20348"  # Windows Server 2022

      tolerations:
      - key: os
        operator: Equal
        value: windows
        effect: NoSchedule

      containers:
      - name: app
        image: myapp:windows-latest
```

## Setting Default Node Selectors per Namespace

Configure default node selectors at the namespace level with the PodNodeSelector admission controller:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: windows-workloads
  annotations:
    scheduler.alpha.kubernetes.io/node-selector: kubernetes.io/os=windows

---
apiVersion: v1
kind: Namespace
metadata:
  name: linux-workloads
  annotations:
    scheduler.alpha.kubernetes.io/node-selector: kubernetes.io/os=linux
```

When the PodNodeSelector admission controller is enabled, pods in these namespaces receive the namespace node selector. Pods with conflicting selectors are rejected rather than overridden.

## Creating Admission Webhooks for Common Configurations

Use admission webhooks to automatically inject selectors and tolerations:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: pod-os-injector
webhooks:
- name: inject-os-selector.example.com
  admissionReviewVersions: ["v1"]
  clientConfig:
    service:
      name: pod-os-injector
      namespace: kube-system
      path: "/inject"
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  sideEffects: None
```

The webhook can inject OS-specific configurations based on image registry or other criteria.

## Handling DaemonSets in Mixed OS Clusters

DaemonSets need OS-specific configurations:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: windows-monitoring-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: monitoring-agent
      os: windows
  template:
    metadata:
      labels:
        app: monitoring-agent
        os: windows
    spec:
      os:
        name: windows
      nodeSelector:
        kubernetes.io/os: windows
      tolerations:
      - key: os
        operator: Equal
        value: windows
        effect: NoSchedule
      - operator: Exists
        effect: NoSchedule  # Tolerate any NoSchedule taint; narrow this in production
      containers:
      - name: agent
        image: monitoring-agent:windows
        resources:
          requests:
            cpu: 100m
            memory: 128Mi

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: linux-monitoring-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: monitoring-agent
      os: linux
  template:
    metadata:
      labels:
        app: monitoring-agent
        os: linux
    spec:
      os:
        name: linux
      nodeSelector:
        kubernetes.io/os: linux
      containers:
      - name: agent
        image: monitoring-agent:linux
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

## Pod Disruption Budgets for Windows Workloads

Configure PDBs considering OS constraints:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: windows-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: windows-app
```

## Automating Configuration with Kyverno Policies

Use Kyverno to automatically enforce OS-compatible scheduling based on pod labels:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-os-node-selector
spec:
  rules:
  - name: add-windows-selector
    match:
      any:
      - resources:
          kinds:
          - Pod
    mutate:
      patchStrategicMerge:
        spec:
          os:
            +(name): windows
          nodeSelector:
            +(kubernetes.io/os): windows
          tolerations:
          - key: os
            operator: Equal
            value: windows
            effect: NoSchedule
    preconditions:
      all:
      - key: "{{ request.object.metadata.labels.os || '' }}"
        operator: Equals
        value: windows

  - name: add-linux-selector
    match:
      any:
      - resources:
          kinds:
          - Pod
    mutate:
      patchStrategicMerge:
        spec:
          os:
            +(name): linux
          nodeSelector:
            +(kubernetes.io/os): linux
    preconditions:
      all:
      - key: "{{ request.object.spec.nodeSelector.\"kubernetes.io/os\" || '' }}"
        operator: Equals
        value: ""
      - key: "{{ request.object.metadata.labels.os || '' }}"
        operator: Equals
        value: linux
```

## Validating Pod Placement

Create a validation script:

```bash
#!/bin/bash
# validate-pod-placement.sh

echo "Checking for pods on incorrect OS nodes..."

# Get all pods with node assignments
kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(.spec.nodeName != null) |
  [
    .metadata.namespace,
    .metadata.name,
    .spec.nodeName,
    (.spec.os.name // ""),
    (.spec.nodeSelector["kubernetes.io/os"] // "")
  ] |
  @tsv
' | while IFS=$'\t' read -r namespace pod node pod_os selector_os; do
  # Get node OS
  node_os=$(kubectl get node "$node" -o jsonpath='{.metadata.labels.kubernetes\.io/os}')
  desired_os="${pod_os:-$selector_os}"

  # Check whether the assigned node matches the pod's declared OS.
  if [[ -n "$desired_os" && "$desired_os" != "$node_os" ]]; then
    echo "ERROR: $desired_os pod $namespace/$pod on $node_os node $node"
  fi
done
```

## Monitoring and Alerting

Create alerts for scheduling failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-scheduling-alerts
spec:
  groups:
  - name: scheduling
    rules:
    - alert: PodsStuckPending
      expr: |
        kube_pod_status_phase{phase="Pending"} > 0
      for: 5m
      annotations:
        summary: "Pods stuck in pending state"

    - alert: WindowsNodeTaintViolation
      expr: |
        count by (pod, namespace) (
          kube_pod_info
          * on(node) group_left(label_kubernetes_io_os)
            kube_node_labels{label_kubernetes_io_os="windows"}
        )
        unless on(pod, namespace)
        count by (pod, namespace) (
          kube_pod_tolerations{key="os",value="windows",effect="NoSchedule"}
        )
      for: 1m
      annotations:
        summary: "Pod on Windows node without proper toleration"
```

## Best Practices

Always specify OS node selectors explicitly in pod specs. Never rely on default behavior.

Taint all Windows nodes to prevent accidental Linux pod placement.

Use namespace-level defaults for teams working exclusively with one OS.

Implement admission webhooks or policy engines to enforce OS compatibility automatically.

Document OS requirements clearly in deployment documentation.

Test scheduling configurations thoroughly before deploying to production.

Monitor for pods in Pending state which may indicate selector/taint misconfigurations.

## Conclusion

Proper configuration of node selectors, taints, and tolerations is essential for reliable mixed OS Kubernetes clusters. By explicitly declaring OS requirements and implementing protective taints, you prevent scheduling errors and ensure workloads run on compatible nodes.

Automate enforcement through admission controllers and policies to reduce human error and make OS-compatible scheduling the default behavior in your cluster.
