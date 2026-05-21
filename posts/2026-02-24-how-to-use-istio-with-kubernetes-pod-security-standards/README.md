# How to Use Istio with Kubernetes Pod Security Standards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Pod Security, Security, Service Mesh

Description: How to configure Istio to work with Kubernetes Pod Security Standards and Pod Security Admission, including handling the init container and sidecar requirements.

---

Kubernetes Pod Security Standards (PSS) define three security levels: Privileged, Baseline, and Restricted. If you are running Istio in a cluster that enforces these standards through Pod Security Admission (PSA), you need to make sure the Istio sidecar and init containers meet the security requirements. Otherwise, your pods will be rejected at admission time.

This guide covers how to make Istio work seamlessly with each PSS level.

## Understanding the Conflict

By default, Istio's sidecar injection adds an init container (`istio-init`) and a sidecar container (`istio-proxy`) to pods in the mesh. The init container requires the `NET_ADMIN` and `NET_RAW` capabilities to set up iptables rules for traffic interception. These capabilities violate both the Baseline and Restricted PSS levels.

The Istio CNI plugin is the recommended approach for clusters that enforce strict pod security. The CNI plugin handles the iptables setup at the node level, eliminating the need for the privileged `istio-init` container in application pods.

## Checking Your Current PSS Configuration

First, check what PSS level your namespaces enforce:

```bash
kubectl get namespaces --show-labels | grep pod-security
```

Look for labels like:

```text
pod-security.kubernetes.io/enforce=restricted
pod-security.kubernetes.io/warn=restricted
pod-security.kubernetes.io/audit=restricted
```

## Running Istio with Baseline PSS

The Baseline level prohibits privileged containers and only allows a limited set of added capabilities. Istio sidecar injection works with Baseline if you use the Istio CNI plugin so application pods do not need `NET_ADMIN` or `NET_RAW`.

Install Istio with the CNI plugin:

```bash
istioctl install --set profile=default \
  --set components.cni.enabled=true \
  --set values.cni.cniBinDir=/opt/cni/bin \
  --set values.cni.cniConfDir=/etc/cni/net.d
```

Or use an IstioOperator manifest:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
spec:
  profile: default
  components:
    cni:
      enabled: true
  values:
    cni:
      cniBinDir: /opt/cni/bin
      cniConfDir: /etc/cni/net.d
```

Label your namespace for Baseline enforcement:

```bash
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=baseline \
  istio-injection=enabled
```

## Running Istio with Restricted PSS

The Restricted level is the strictest. It requires:

- No privilege escalation
- Running as non-root
- Specific seccomp profile
- No host networking or host ports
- Read-only root filesystem (optional but recommended)

To make Istio work with Restricted PSS, you need the CNI plugin and additional sidecar configuration.

Install Istio with CNI and configure the proxy for restricted mode:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
spec:
  profile: default
  components:
    cni:
      enabled: true
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    cni:
      cniBinDir: /opt/cni/bin
      cniConfDir: /etc/cni/net.d
    global:
      proxy:
        seccompProfile:
          type: RuntimeDefault
```

Your application pods also need to meet the Restricted requirements. Here is an example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: restricted-ns
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          runAsNonRoot: true
          readOnlyRootFilesystem: true
```

The Istio sidecar injector will add the `istio-proxy` container with compatible security settings when the CNI plugin is handling traffic interception.

## Verifying Sidecar Security Context

After deploying a pod with sidecar injection, check the security context of the injected containers:

```bash
kubectl get pod -n restricted-ns -l app=my-app -o json | \
  python3 -c "
import json, sys
pod = json.load(sys.stdin)['items'][0]
for c in pod['spec']['containers'] + pod['spec'].get('initContainers', []):
    print(f\"Container: {c['name']}\")
    sc = c.get('securityContext', {})
    print(f\"  allowPrivilegeEscalation: {sc.get('allowPrivilegeEscalation', 'not set')}\")
    print(f\"  runAsNonRoot: {sc.get('runAsNonRoot', 'not set')}\")
    caps = sc.get('capabilities', {})
    print(f\"  capabilities.drop: {caps.get('drop', [])}\")
    print(f\"  capabilities.add: {caps.get('add', [])}\")
"
```

With the CNI plugin, the privileged `istio-init` container should not be injected. You may see an `istio-validation` init container instead, and it should not require `NET_ADMIN` or `NET_RAW`.

## Handling the istio-system Namespace

The `istio-system` namespace needs to be exempt from strict PSS enforcement because the Istio CNI DaemonSet requires host-level access that the Baseline and Restricted levels do not allow:

```bash
kubectl label namespace istio-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=privileged
```

This is a common and accepted pattern. The control plane namespace runs trusted infrastructure components.

## Configuring Istio CNI as a DaemonSet

The Istio CNI plugin runs as a DaemonSet in the `istio-system` namespace. It needs appropriate security permissions:

```bash
kubectl get daemonset istio-cni-node -n istio-system -o yaml | \
  grep -A 20 securityContext
```

The CNI DaemonSet typically runs with elevated privileges because it modifies node-level networking configuration. This is why the `istio-system` namespace needs the Privileged PSS level.

## Testing PSS Compliance

Use the `--dry-run=server` flag to test if your pods would be admitted:

```bash
kubectl apply -f my-pod.yaml --dry-run=server -n restricted-ns
```

If the pod violates the PSS level, you will see an error like:

```text
Error from server (Forbidden): pods "my-app" is forbidden: violates PodSecurity "restricted:latest":
allowPrivilegeEscalation != false (container "istio-init" must set securityContext.allowPrivilegeEscalation=false)
```

## Audit Mode for Gradual Migration

If you are migrating to stricter PSS levels, start with audit and warn modes before enforcing:

```bash
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted
```

This enforces Baseline but logs warnings and audit events for Restricted violations. You can check the audit logs to see what would break before switching to enforce Restricted.

## Common Issues and Solutions

**Problem**: istio-init container fails with "operation not permitted"

Solution: Enable the Istio CNI plugin. The init container is trying to run iptables, which requires NET_ADMIN.

**Problem**: istio-proxy container fails PSS checks

Solution: Ensure you are running a recent Istio version with the CNI plugin, and set `global.proxy.seccompProfile.type=RuntimeDefault` if your Istio version does not set a seccomp profile on `istio-proxy` and `istio-validation` by default.

**Problem**: Application container cannot write to temp directories

Solution: If using readOnlyRootFilesystem, mount an emptyDir volume for temporary files:

```yaml
containers:
- name: my-app
  volumeMounts:
  - name: tmp
    mountPath: /tmp
volumes:
- name: tmp
  emptyDir: {}
```

## Wrapping Up

Running Istio with Kubernetes Pod Security Standards requires the Istio CNI plugin for Baseline and Restricted levels. The CNI plugin moves the privileged iptables setup from the pod to the node, letting your application pods run with minimal privileges. Set up the `istio-system` namespace as Privileged, install the CNI plugin, and progressively tighten your application namespaces from Baseline to Restricted. Test with dry-run and audit modes before enforcing to avoid surprise pod admission failures.
