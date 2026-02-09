# How to Use RuntimeClass to Route Pods to Windows vs Linux Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, RuntimeClass

Description: Configure RuntimeClass to automatically route pods to appropriate Windows or Linux nodes based on container runtime requirements in mixed-OS clusters.

---

RuntimeClass is a Kubernetes feature that allows you to select different container runtime configurations for pods. In mixed-OS clusters, RuntimeClass provides an elegant way to route pods to the correct OS nodes without manually adding node selectors to every pod specification. This guide explains how to configure and use RuntimeClass for automatic Windows and Linux pod routing.

## Understanding RuntimeClass

RuntimeClass defines which container runtime handler should process a pod. Each RuntimeClass can include scheduling directives that automatically apply to pods using that runtime class. This allows you to centrally manage OS-specific scheduling logic.

For Windows nodes, RuntimeClass ensures pods use Windows-compatible runtime configurations and automatically adds node selectors for Windows nodes. This simplifies pod manifests and reduces configuration errors.

## Creating RuntimeClass for Windows

Define RuntimeClasses for both Windows and Linux:

```yaml
# runtimeclass-windows.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: windows-2022
handler: runhcs-wcow-process
scheduling:
  nodeSelector:
    kubernetes.io/os: windows
    kubernetes.io/arch: amd64
    node.kubernetes.io/windows-build: "10.0.20348"
  tolerations:
  - key: os
    operator: Equal
    value: windows
    effect: NoSchedule
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: windows-2019
handler: runhcs-wcow-process
scheduling:
  nodeSelector:
    kubernetes.io/os: windows
    kubernetes.io/arch: amd64
    node.kubernetes.io/windows-build: "10.0.17763"
  tolerations:
  - key: os
    operator: Equal
    value: windows
    effect: NoSchedule
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: linux
handler: runc
scheduling:
  nodeSelector:
    kubernetes.io/os: linux
    kubernetes.io/arch: amd64
```

Apply the RuntimeClasses:

```bash
kubectl apply -f runtimeclass-windows.yaml

# Verify RuntimeClasses
kubectl get runtimeclass
```

## Using RuntimeClass in Pod Specifications

Instead of specifying node selectors, reference the RuntimeClass:

```yaml
# pod-with-runtimeclass.yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-app
spec:
  runtimeClassName: windows-2022  # Automatically routes to Windows nodes
  containers:
  - name: iis
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
    ports:
    - containerPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: linux-app
spec:
  runtimeClassName: linux  # Automatically routes to Linux nodes
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

The RuntimeClass automatically applies the node selector and tolerations without you specifying them in each pod.

## RuntimeClass in Deployments

Use RuntimeClass in Deployments:

```yaml
# windows-deployment-runtimeclass.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      runtimeClassName: windows-2022
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
```

## RuntimeClass with Different Windows Versions

Handle multiple Windows versions:

```yaml
# multi-version-runtimeclasses.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: windows-ltsc2022
handler: runhcs-wcow-process
scheduling:
  nodeSelector:
    kubernetes.io/os: windows
    windows.build: ltsc2022
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: windows-ltsc2019
handler: runhcs-wcow-process
scheduling:
  nodeSelector:
    kubernetes.io/os: windows
    windows.build: ltsc2019
```

Label Windows nodes appropriately:

```bash
# Label Windows 2022 nodes
kubectl label nodes <node-name> windows.build=ltsc2022

# Label Windows 2019 nodes
kubectl label nodes <node-name> windows.build=ltsc2019
```

Use in pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-for-2022
spec:
  runtimeClassName: windows-ltsc2022
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
```

## RuntimeClass for Specialized Runtimes

Configure RuntimeClass for specialized container runtimes:

```yaml
# specialized-runtimeclasses.yaml
# Hyper-V isolated containers for Windows
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: windows-hyperv
handler: runhcs-wcow-hypervisor
scheduling:
  nodeSelector:
    kubernetes.io/os: windows
    hyperv.enabled: "true"
overhead:
  podFixed:
    memory: "512Mi"
    cpu: "500m"
---
# gVisor for Linux (sandboxed runtime)
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
scheduling:
  nodeSelector:
    kubernetes.io/os: linux
    runtime: gvisor
---
# Kata Containers for Linux (VM-based isolation)
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
scheduling:
  nodeSelector:
    kubernetes.io/os: linux
    runtime: kata
overhead:
  podFixed:
    memory: "300Mi"
    cpu: "250m"
```

Use specialized runtimes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-windows-app
spec:
  runtimeClassName: windows-hyperv
  containers:
  - name: app
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
```

## Default RuntimeClass

Set a default RuntimeClass for pods that don't specify one:

```bash
# Configure kubelet to use default RuntimeClass
# On each node, edit kubelet config
cat <<EOF > /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
defaultRuntimeClassName: linux
EOF

# Restart kubelet
systemctl restart kubelet
```

Now pods without runtimeClassName will use the default.

## RuntimeClass with Pod Security

Combine RuntimeClass with Pod Security Standards:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: windows-restricted
handler: runhcs-wcow-process
scheduling:
  nodeSelector:
    kubernetes.io/os: windows
    security-level: restricted
  tolerations:
  - key: security
    operator: Equal
    value: restricted
    effect: NoSchedule
```

Use in security-conscious deployments:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: restricted-namespace
spec:
  runtimeClassName: windows-restricted
  securityContext:
    windowsOptions:
      runAsUserName: "ContainerUser"
  containers:
  - name: app
    image: myregistry.azurecr.io/secure-app:v1
    securityContext:
      allowPrivilegeEscalation: false
```

## Migrating from Node Selectors to RuntimeClass

Migrate existing workloads:

```yaml
# Old approach - manual node selector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: old-windows-app
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      tolerations:
      - key: os
        value: windows
        effect: NoSchedule
      containers:
      - name: app
        image: myapp:v1
---
# New approach - RuntimeClass
apiVersion: apps/v1
kind: Deployment
metadata:
  name: new-windows-app
spec:
  template:
    spec:
      runtimeClassName: windows-2022  # Replaces nodeSelector and tolerations
      containers:
      - name: app
        image: myapp:v1
```

## Monitoring RuntimeClass Usage

Check RuntimeClass assignment:

```bash
# List all RuntimeClasses
kubectl get runtimeclass

# View RuntimeClass details
kubectl describe runtimeclass windows-2022

# Find pods using specific RuntimeClass
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.runtimeClassName}{"\n"}{end}' | grep windows-2022

# Check node labels for RuntimeClass routing
kubectl get nodes --show-labels | grep windows

# View RuntimeClass on specific pod
kubectl get pod <pod-name> -o jsonpath='{.spec.runtimeClassName}'
```

## Troubleshooting RuntimeClass

Common issues:

```bash
# Pod stuck in Pending
kubectl describe pod <pod-name>
# Look for: "0/N nodes are available: N node(s) didn't match node selector"

# Verify RuntimeClass exists
kubectl get runtimeclass <name>

# Check if nodes have required labels
kubectl get nodes -l kubernetes.io/os=windows --show-labels

# Verify runtime handler is installed on nodes
# SSH to node and check
kubectl get nodes -o wide
ssh user@node-ip
# Check container runtime configuration
crictl info
```

Debugging RuntimeClass scheduling:

```yaml
# Test pod to verify RuntimeClass routing
apiVersion: v1
kind: Pod
metadata:
  name: runtimeclass-test
spec:
  runtimeClassName: windows-2022
  containers:
  - name: test
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command:
    - powershell
    - -Command
    - |
      Write-Host "Node name: $env:COMPUTERNAME"
      Write-Host "OS: $env:OS"
      Start-Sleep 3600
```

## Best Practices

1. Create RuntimeClasses for each Windows and Linux variant
2. Use descriptive names (windows-ltsc2022, linux-gvisor)
3. Include tolerations in RuntimeClass for tainted nodes
4. Set resource overhead for runtimes with extra requirements
5. Document RuntimeClass usage in your deployment guides
6. Migrate gradually from node selectors to RuntimeClass
7. Test RuntimeClass configurations in dev before production

## Conclusion

RuntimeClass simplifies OS-specific pod routing in mixed Kubernetes clusters. By centralizing scheduling logic in RuntimeClass definitions, you reduce duplication in pod specs and minimize configuration errors. Use RuntimeClass to automatically route Windows pods to Windows nodes and Linux pods to Linux nodes. This approach scales better than manual node selectors and provides flexibility for specialized container runtimes like Hyper-V isolated containers or gVisor sandboxes.
