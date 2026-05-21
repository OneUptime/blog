# How to Install Istio with Pod Security Admission Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pod Security, Kubernetes, Security, Service Mesh

Description: Learn how to install and configure Istio to work properly with Kubernetes Pod Security Admission controller at restricted and baseline levels.

---

Kubernetes Pod Security Admission (PSA) replaced the old PodSecurityPolicy in Kubernetes 1.25. If your cluster enforces pod security standards, installing Istio requires some adjustments because the init container used for sidecar traffic redirection needs specific capabilities that the restricted profile does not allow by default.

This guide shows you how to get Istio running cleanly with PSA enforcement.

## Understanding Pod Security Standards

Kubernetes defines three security levels:

- **Privileged** - No restrictions at all
- **Baseline** - Prevents known privilege escalations
- **Restricted** - Follows current pod hardening best practices

The tricky part with Istio is that the `istio-init` container needs `NET_ADMIN` and `NET_RAW` capabilities to set up iptables rules for traffic interception. These capabilities are not allowed under the restricted or baseline profiles.

## Checking Your Current PSA Configuration

See what labels are set on your namespaces:

```bash
kubectl get namespaces --show-labels | grep pod-security
```

Or check a specific namespace:

```bash
kubectl get namespace istio-system -o yaml | grep -A 3 "pod-security"
```

## Option 1: Using Istio CNI Plugin (Recommended)

The cleanest solution is to use the Istio CNI plugin, which eliminates the need for `istio-init` containers entirely. The CNI plugin runs as a DaemonSet with elevated privileges at the node level, so your application pods do not need any special capabilities.

```yaml
# istio-cni-psa.yaml

apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      cniBinDir: /opt/cni/bin
      cniConfDir: /etc/cni/net.d
      excludeNamespaces:
        - istio-system
        - kube-system
    sidecarInjectorWebhook:
      injectedAnnotations: {}
```

Install:

```bash
istioctl install -f istio-cni-psa.yaml -y
```

The CNI DaemonSet itself is privileged, so the namespace where you install it must allow privileged pods or be exempted from PSA. If you install it in `istio-system`, label that namespace accordingly:

```bash
kubectl label namespace istio-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=baseline \
  pod-security.kubernetes.io/audit=baseline
```

And your application namespaces can use the restricted level:

```bash
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted
```

## Option 2: Configuring PSA Labels for Standard Istio

If you cannot use the CNI plugin, you need to relax the security level for namespaces that run Istio sidecars.

For the istio-system namespace (needed regardless):

```bash
kubectl label namespace istio-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=privileged \
  pod-security.kubernetes.io/audit=privileged
```

For application namespaces with sidecars:

```bash
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted
```

This configuration allows `istio-init` to request `NET_ADMIN` and `NET_RAW`, but warns and audits against the restricted standard so you can track how far off you are.

## Helm Installation with CNI for PSA Compliance

Using Helm, the process involves installing the CNI component alongside istiod:

```bash
# Install base CRDs
helm install istio-base istio/base -n istio-system --create-namespace

# Install CNI DaemonSet
helm install istio-cni istio/cni -n istio-system \
  --set cniBinDir=/opt/cni/bin \
  --set cniConfDir=/etc/cni/net.d

# Install istiod with CNI enabled
helm install istiod istio/istiod -n istio-system \
  --set pilot.cni.enabled=true
```

Label the namespace:

```bash
kubectl label namespace istio-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=baseline
```

## Configuring Proxy Security Context

Even with CNI, you might need to adjust the sidecar proxy's security context for strict PSA enforcement. Add these settings to your mesh config:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata: {}

global:
  proxy:
    privileged: false
    readinessInitialDelaySeconds: 0
```

For the restricted profile with CNI, you can set the proxy to run as non-root:

```yaml
# values-restricted.yaml
global:
  proxy:
    privileged: false

sidecarInjectorWebhook:
  injectedAnnotations: {}

meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
```

## Handling the Gateway

Gateways also need appropriate security contexts. With the Gateway chart:

```yaml
# values-gateway-psa.yaml
securityContext:
  runAsUser: 1337
  runAsGroup: 1337
  runAsNonRoot: true
  fsGroup: 1337
  seccompProfile:
    type: RuntimeDefault

containerSecurityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1337
```

```bash
helm install istio-ingress istio/gateway \
  -n istio-ingress --create-namespace \
  -f values-gateway-psa.yaml
```

Label the gateway namespace:

```bash
kubectl label namespace istio-ingress \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Verifying PSA Compliance

After installation, check for any PSA warnings:

```bash
kubectl get events -n istio-system --field-selector reason=FailedCreate
```

Run a server-side dry-run to test if pods would be admitted:

```bash
kubectl label --dry-run=server --overwrite namespace my-app \
  pod-security.kubernetes.io/enforce=restricted
```

Deploy a test pod and watch for warnings:

```bash
kubectl create namespace psa-test
kubectl label namespace psa-test \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted \
  istio-injection=enabled

kubectl apply --dry-run=server -n psa-test -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: test
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: test
      image: busybox:1.36
      command: ["sleep", "3600"]
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
        runAsNonRoot: true
        runAsUser: 1000
EOF
```

If the dry-run is accepted without warnings, your setup is clean.

## Audit Mode for Gradual Migration

If you are migrating an existing cluster to stricter security, use audit and warn modes first:

```bash
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted
```

Preview restricted enforcement with a server-side dry-run:

```bash
kubectl label --dry-run=server --overwrite namespace my-app \
  pod-security.kubernetes.io/enforce=restricted
```

This lets you see what would break before actually enforcing the restricted level.

## Common PSA Violations with Istio

Here are the most frequent violations you will encounter and how to fix them:

**1. Running as root**: Istio proxy runs as UID 1337 by default, which is fine. But make sure your app containers are also not running as root.

**2. Privilege escalation**: The `istio-init` container needs `allowPrivilegeEscalation: true` for iptables. Using CNI eliminates this.

**3. Capabilities**: Without CNI, `NET_ADMIN` and `NET_RAW` are required by `istio-init`. With CNI, application pods do not need those Istio-specific capabilities.

**4. Read-only root filesystem**: Envoy needs to write to `/etc/istio/proxy` for certificates and configuration. This path is typically a mounted volume, so read-only root filesystem should still work.

## Summary

The cleanest path to running Istio with strict Pod Security Admission is to use the Istio CNI plugin. It removes the need for init containers with elevated privileges, letting your application namespaces run at the restricted security level. If CNI is not an option, privileged enforcement with restricted auditing gives you a migration path while still flagging potential issues.
