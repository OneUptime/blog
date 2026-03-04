# How to Configure Security Context for Istio Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Kubernetes, Pod Security, Containers

Description: How to properly configure Kubernetes security contexts for Istio sidecar proxies and application pods in the service mesh.

---

Every pod in an Istio mesh runs at least two containers: your application and the Envoy sidecar proxy. Both need proper security context configuration. The sidecar also has an init container that sets up iptables rules for traffic interception. Each of these containers has different security requirements, and getting them right is important for both security and functionality.

This guide explains what security context settings you need, why you need them, and how to configure them without breaking Istio.

## Understanding the Containers

A typical Istio-injected pod has:

1. **istio-init** (init container) - Sets up iptables rules to redirect traffic through the sidecar. Requires `NET_ADMIN` and `NET_RAW` capabilities.
2. **istio-proxy** (sidecar container) - The Envoy proxy that handles all traffic. Runs as user 1337.
3. **Your application** (main container) - Your actual workload.

Check the current security context of an Istio-injected pod:

```bash
kubectl get pod -l app=myapp -o json | \
  jq '.items[0].spec | {
    initContainers: [.initContainers[] | {name: .name, securityContext}],
    containers: [.containers[] | {name: .name, securityContext}]
  }'
```

## Default Security Context

When Istio injects a sidecar, the default security context looks something like this:

```yaml
initContainers:
- name: istio-init
  securityContext:
    allowPrivilegeEscalation: false
    capabilities:
      add:
      - NET_ADMIN
      - NET_RAW
      drop:
      - ALL
    privileged: false
    runAsGroup: 0
    runAsNonRoot: false
    runAsUser: 0
containers:
- name: istio-proxy
  securityContext:
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
    privileged: false
    runAsGroup: 1337
    runAsNonRoot: true
    runAsUser: 1337
```

The init container runs as root because iptables operations require it. The sidecar proxy runs as user 1337, which is the default Istio proxy user.

## Eliminating Root with Istio CNI

The biggest security improvement you can make is removing the need for the privileged init container by using the Istio CNI plugin. The CNI plugin handles traffic interception at the node level, so pods do not need `NET_ADMIN` capabilities.

Enable the CNI plugin:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
      namespace: kube-system
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
```

With CNI enabled, the init container is no longer injected, and you can apply much stricter security contexts to your pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: myapp
        image: myregistry/myapp:v1
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

## Configuring Security Context via Annotations

You can customize the sidecar's security context using pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "500m"
    spec:
      containers:
      - name: myapp
        image: myregistry/myapp:v1
```

## Global Security Context via IstioOperator

Set default security context for all sidecar proxies globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
  values:
    global:
      proxy:
        privileged: false
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

## Pod Security Admission (PSA) Compatibility

Kubernetes Pod Security Admission enforces security standards at three levels: Privileged, Baseline, and Restricted. Here is how Istio works with each.

**Baseline level** (works with default Istio):

```bash
kubectl label namespace myapp pod-security.kubernetes.io/enforce=baseline
```

The baseline level allows the init container's `NET_ADMIN` capability, so standard Istio injection works.

**Restricted level** (requires Istio CNI):

```bash
kubectl label namespace myapp \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted
```

The restricted level does not allow `NET_ADMIN`, so you must use the Istio CNI plugin. Also, all containers must run as non-root with no privilege escalation.

Verify your pods meet the restricted standard:

```bash
kubectl apply --dry-run=server -f deployment.yaml
```

If there are violations, you will see warning messages.

## Security Context for Gateway Pods

Gateway pods have different requirements than sidecar proxies. Configure their security context through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        securityContext:
          runAsNonRoot: true
          runAsUser: 1337
          runAsGroup: 1337
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi
```

## Read-Only Root Filesystem

Running with a read-only root filesystem prevents attacks that write malicious files to the container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        securityContext:
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
```

The Istio sidecar proxy does need some writable directories for its configuration. Istio handles this by mounting emptyDir volumes for `/etc/istio/proxy` and other paths.

## Seccomp Profiles

Apply seccomp profiles to limit the system calls available to containers:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: myapp
        image: myregistry/myapp:v1
        securityContext:
          seccompProfile:
            type: RuntimeDefault
```

The `RuntimeDefault` profile works well for both application containers and the Istio sidecar. It blocks dangerous system calls while allowing everything Envoy needs to function.

## Verifying Security Context

After configuring everything, verify the actual security context of running pods:

```bash
# Check all containers in a pod
kubectl get pod -l app=myapp -o json | \
  jq '.items[0].spec.containers[] | {
    name: .name,
    runAsUser: .securityContext.runAsUser,
    runAsNonRoot: .securityContext.runAsNonRoot,
    readOnly: .securityContext.readOnlyRootFilesystem,
    privileged: .securityContext.privileged,
    capabilities: .securityContext.capabilities
  }'

# Check init containers
kubectl get pod -l app=myapp -o json | \
  jq '.items[0].spec.initContainers[]? | {
    name: .name,
    capabilities: .securityContext.capabilities
  }'

# Verify from inside the container
kubectl exec deploy/myapp -c istio-proxy -- id
kubectl exec deploy/myapp -c istio-proxy -- cat /proc/1/status | grep Cap
```

## Common Problems

**Problem**: Pod fails to start with "operation not permitted" after adding security context.

Solution: Make sure you have the Istio CNI plugin installed if you are using the restricted PSA level.

**Problem**: Application cannot write to filesystem.

Solution: Mount writable emptyDir volumes for directories your app needs to write to.

**Problem**: Sidecar proxy crashes with restricted capabilities.

Solution: Verify the sidecar is running as user 1337 and has the minimum required capabilities. With Istio CNI, no special capabilities should be needed.

Properly configuring security contexts for Istio pods is a balancing act between security and functionality. Start with the Istio CNI plugin to eliminate the biggest security concern (privileged init containers), then apply the restricted PSA level and tighten individual container security contexts from there.
