# How to Fix Pod Not Starting with Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Pod Startup, Troubleshooting, Kubernetes

Description: Diagnose and fix pods that fail to start or get stuck when the Istio sidecar proxy is injected, including init container failures and resource issues.

---

Your deployment worked perfectly before you added it to the Istio mesh. Now pods are stuck in Init, CrashLoopBackOff, or they start but the application cannot make any network calls. Adding the Istio sidecar to a pod introduces two extra containers (the init container and the proxy), and either one can cause startup failures.

This guide covers every common reason pods fail to start with the Istio sidecar and how to fix each one.

## Check What is Actually Failing

Start by getting the pod status and events:

```bash
# Get detailed pod status
kubectl describe pod <pod-name> -n production

# Check all container statuses
kubectl get pod <pod-name> -n production -o jsonpath='{.status.containerStatuses[*].name}: {.status.containerStatuses[*].ready}'

# Check init container status
kubectl get pod <pod-name> -n production -o jsonpath='{.status.initContainerStatuses[*]}'
```

The pod has these containers:
- `istio-init` (init container) - Sets up iptables rules
- `istio-proxy` (sidecar container) - The Envoy proxy
- Your application container(s)

## Init Container Failures

If the pod is stuck in `Init:Error` or `Init:CrashLoopBackOff`:

```bash
# Check init container logs
kubectl logs <pod-name> -c istio-init -n production
```

**Cause 1: Missing capabilities**

The `istio-init` container needs NET_ADMIN and NET_RAW capabilities to set up iptables rules:

```
iptables: Permission denied (you must be root)
```

Check if a PodSecurityPolicy, Pod Security Admission, or OPA policy is stripping capabilities:

```bash
# Check if pod security admission is enforcing
kubectl get namespace production -o yaml | grep pod-security
```

If your namespace enforces the `restricted` pod security standard, the istio-init container will fail. You have two options:

Option 1: Use Istio CNI plugin instead of init containers (recommended for restricted environments):

```yaml
# Install Istio with CNI
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
```

Option 2: Allow the init container capabilities in your security policy.

**Cause 2: AppArmor or SELinux blocking iptables**

```bash
# Check for AppArmor annotations
kubectl get pod <pod-name> -n production -o jsonpath='{.metadata.annotations}' | grep apparmor
```

If AppArmor is blocking the init container, add an exception:

```yaml
metadata:
  annotations:
    container.apparmor.security.beta.kubernetes.io/istio-init: unconfined
```

## Sidecar Proxy Not Starting

If the istio-proxy container is in CrashLoopBackOff:

```bash
# Check sidecar logs
kubectl logs <pod-name> -c istio-proxy -n production

# Check previous crash logs
kubectl logs <pod-name> -c istio-proxy -n production --previous
```

**Cause 1: Cannot connect to istiod**

```
failed to fetch bootstrap config: connection refused
```

The sidecar needs to connect to istiod for its initial configuration. Check istiod health:

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl get svc istiod -n istio-system
```

If istiod is down, the sidecar cannot start. Fix istiod first.

**Cause 2: Image pull failure**

```bash
kubectl describe pod <pod-name> -n production | grep "Failed\|Error\|ImagePull"
```

If the proxy image cannot be pulled (common in air-gapped environments):

```bash
# Check what image is being used
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].image}'
```

Mirror the image to your private registry and configure Istio to use it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      hub: my-registry.example.com/istio
      tag: 1.20.0
```

**Cause 3: Resource limits too low**

```bash
# Check resource requests/limits
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}'
```

If the proxy is being OOMKilled:

```bash
kubectl describe pod <pod-name> -n production | grep "OOMKilled"
```

Increase the sidecar resources:

```yaml
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "1000m"
```

## Application Container Cannot Start

Sometimes the init container and proxy are fine, but the application container fails because of the sidecar:

**Cause 1: Application depends on network at startup**

If your application tries to make network calls during startup (like connecting to a database or fetching configuration), and the sidecar is not ready yet, those calls will fail.

The sidecar takes a few seconds to become ready. During that window, all outbound connections from the application are intercepted by iptables but have nowhere to go.

Fix with `holdApplicationUntilProxyStarts`:

```yaml
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
```

This adds a postStart hook to the sidecar that blocks the application container from starting until the proxy is ready.

**Cause 2: Application health checks fail through the sidecar**

If your liveness or readiness probe is an HTTP check, it goes through the sidecar. If the sidecar is not ready when the first probe fires, the probe fails and Kubernetes restarts the container:

```yaml
# Increase the initial delay to give the sidecar time to start
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30  # Give sidecar time to start
  periodSeconds: 10
```

**Cause 3: Port conflict**

The sidecar uses several ports. If your application uses any of these, there will be a conflict:

- 15000 - Envoy admin interface
- 15001 - Envoy outbound
- 15006 - Envoy inbound
- 15020 - Health check
- 15021 - Health check
- 15090 - Prometheus metrics

```bash
# Check if your app uses any of these ports
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.containers[?(@.name!="istio-proxy")].ports[*].containerPort}'
```

If there is a conflict, change your application port.

## Resource Quota Exceeded

If the namespace has resource quotas, the additional sidecar container might push the pod over the limit:

```bash
# Check resource quotas
kubectl get resourcequota -n production
kubectl describe resourcequota -n production
```

The sidecar adds resource requests (typically 100m CPU and 128Mi memory by default). If the quota is tight, either increase the quota or reduce the sidecar resources:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "10m"
    sidecar.istio.io/proxyMemory: "64Mi"
```

## Stuck in Terminating

Sometimes pods with sidecars get stuck in Terminating state. The sidecar might not shut down cleanly:

```bash
# Check if the pod is stuck
kubectl get pod <pod-name> -n production

# Force delete if needed
kubectl delete pod <pod-name> -n production --grace-period=0 --force
```

To prevent this, configure proper termination behavior:

```yaml
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
```

## Debugging Summary

```bash
# 1. What is the pod status?
kubectl describe pod <pod-name> -n production

# 2. Init container ok?
kubectl logs <pod-name> -c istio-init -n production

# 3. Sidecar proxy ok?
kubectl logs <pod-name> -c istio-proxy -n production

# 4. Application container ok?
kubectl logs <pod-name> -c my-app -n production

# 5. Resource issues?
kubectl describe resourcequota -n production

# 6. Security policy blocking?
kubectl get namespace production -o yaml | grep pod-security
```

Most pod startup failures with Istio come down to init container permissions (use CNI instead), resource limits (increase sidecar resources), or application startup timing (use holdApplicationUntilProxyStarts). Work through the containers in order - init, sidecar, application - and you will find the issue.
