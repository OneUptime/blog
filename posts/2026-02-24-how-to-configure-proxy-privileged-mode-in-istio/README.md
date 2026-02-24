# How to Configure Proxy Privileged Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Privileged Mode, Security, Kubernetes, Container Security

Description: Understanding and configuring privileged mode for Istio sidecar proxy and init containers, including security implications and alternatives.

---

By default, the Istio sidecar proxy container runs as a non-privileged container, while the init container requires elevated capabilities to set up iptables rules. There are scenarios where you might need to change these security settings, for example when running on platforms with specific security constraints, when debugging network issues, or when using advanced networking features. This post covers how to configure privileged mode and capabilities for Istio proxy containers.

## Default Security Context

When Istio injects a sidecar, the containers get specific security contexts:

**The istio-init container:**

```yaml
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    add:
    - NET_ADMIN
    - NET_RAW
    drop:
    - ALL
  privileged: false
  readOnlyRootFilesystem: false
  runAsGroup: 0
  runAsNonRoot: false
  runAsUser: 0
```

The init container runs as root with `NET_ADMIN` and `NET_RAW` capabilities because it needs to modify iptables rules in the pod's network namespace.

**The istio-proxy container:**

```yaml
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  privileged: false
  readOnlyRootFilesystem: true
  runAsGroup: 1337
  runAsNonRoot: true
  runAsUser: 1337
```

The proxy runs as a non-root user (UID 1337) with no additional capabilities and a read-only root filesystem. This is a secure default.

## When Privileged Mode Is Needed

There are a few situations where you might need to modify these defaults:

1. **TPROXY interception mode** - requires additional capabilities
2. **Debugging network issues** - temporarily enabling capabilities for troubleshooting
3. **Platform restrictions** - some platforms don't allow certain capabilities
4. **Custom networking** - advanced scenarios like modifying network interfaces

## Configuring Privileged Mode for the Init Container

If you need the init container to run in full privileged mode (not just with specific capabilities):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy_init:
        resources:
          requests:
            cpu: "10m"
            memory: "40Mi"
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
```

For per-pod control, you can use the custom injection template approach. However, it's better to avoid full privileged mode and use the minimum necessary capabilities instead.

## Using Istio CNI to Avoid Privileged Init Containers

The cleanest way to avoid privileged init containers is to use the Istio CNI plugin. It moves the iptables setup out of the pod entirely:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
    global:
      proxy_init:
        resources:
          requests:
            cpu: "10m"
            memory: "10Mi"
```

```bash
istioctl install -f istio-cni.yaml
```

With the CNI plugin:
- No init container is injected
- No `NET_ADMIN` or `NET_RAW` capabilities needed on any pod container
- The iptables rules are set up by the CNI plugin on the node
- The proxy container can run with minimal security privileges

Verify CNI is working:

```bash
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=20
```

## TPROXY Mode and Capabilities

TPROXY is an alternative interception mode that preserves the original source IP address. It requires additional capabilities:

```yaml
metadata:
  annotations:
    sidecar.istio.io/interceptionMode: TPROXY
```

When TPROXY is enabled, the init container needs the same `NET_ADMIN` and `NET_RAW` capabilities, but it sets up different iptables rules. The proxy container also needs `NET_ADMIN` capability to use TPROXY sockets:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      interceptionMode: TPROXY
```

TPROXY mode is less common and only needed when source IP preservation is required (for example, when implementing IP-based access control at the application level).

## Running the Proxy as Root

While not recommended, some debugging scenarios require running the proxy as root temporarily:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debug-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: debug-service
        image: my-app:1.0
```

To run the proxy as root, you would need to modify the injection template or use a custom template. However, this is strongly discouraged in production. Instead, use `kubectl exec` with the proxy container for debugging:

```bash
POD=$(kubectl get pod -l app=debug-service -o jsonpath='{.items[0].metadata.name}')

# Check iptables rules (from the proxy container)
kubectl exec $POD -c istio-proxy -- iptables -t nat -L -n -v

# Check network configuration
kubectl exec $POD -c istio-proxy -- ss -tlnp
kubectl exec $POD -c istio-proxy -- netstat -tlnp
```

## Pod Security Standards and Istio

Kubernetes Pod Security Standards (PSS) define three levels: Privileged, Baseline, and Restricted. Istio's default security context is compatible with the Baseline level but not the Restricted level.

**Baseline level compatibility (default Istio):**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    istio-injection: enabled
    pod-security.kubernetes.io/enforce: baseline
```

This works because Baseline allows `NET_ADMIN` and `NET_RAW` capabilities on init containers.

**Restricted level requires CNI:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    istio-injection: enabled
    pod-security.kubernetes.io/enforce: restricted
```

For the Restricted level, you must use the Istio CNI plugin because:
- No containers can have `NET_ADMIN` or `NET_RAW` capabilities
- All containers must run as non-root
- `allowPrivilegeEscalation` must be false
- `seccompProfile` must be set

## Configuring seccomp Profiles

For enhanced security, you can set seccomp profiles on the proxy:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        seccompProfile:
          type: RuntimeDefault
```

The `RuntimeDefault` profile restricts the system calls the proxy can make, adding another layer of security.

## OpenShift Considerations

OpenShift uses Security Context Constraints (SCCs) instead of Pod Security Standards. The default `restricted` SCC doesn't allow the capabilities Istio's init container needs.

For OpenShift, use the CNI plugin:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      cniBinDir: /var/lib/cni/bin
      cniConfDir: /etc/cni/multus/net.d
      chained: false
```

This allows Istio to work within OpenShift's default SCC without any additional privileges.

## Auditing Proxy Security

Check the security context of running proxies:

```bash
# Check security context of all istio-proxy containers
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[?(@.name=="istio-proxy")].securityContext}{"\n"}{end}'

# Check capabilities
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.initContainers[?(@.name=="istio-init")].securityContext.capabilities}{"\n"}{end}'

# Verify no containers run as privileged
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}:{.securityContext.privileged}{" "}{end}{"\n"}{end}'
```

## Best Practices

1. **Use Istio CNI in production** - it eliminates the need for elevated capabilities entirely
2. **Never run the proxy in full privileged mode in production** - use specific capabilities instead
3. **Use Pod Security Standards** - enforce Baseline or Restricted levels
4. **Audit regularly** - check that no pods have unexpected security contexts
5. **Keep the proxy running as UID 1337** - don't change the default non-root user unless absolutely necessary
6. **Use read-only root filesystem** - the default, keeps the proxy container immutable

The default security configuration of Istio's sidecar is already pretty good. The main decision you need to make is whether to use the init container approach (simpler setup, needs `NET_ADMIN`) or the CNI plugin (no extra capabilities needed, slightly more complex infrastructure). For most production environments, the CNI plugin is the better choice.
