# How to Fix Auto-Instrumentation Init Container Failing in Istio Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Istio, Service Mesh, Auto-Instrumentation

Description: Fix OpenTelemetry auto-instrumentation init container failures caused by Istio sidecar proxy ordering conflicts.

Running OpenTelemetry auto-instrumentation alongside Istio can expose a subtle ordering problem. The OTel Operator injects an init container that normally copies instrumentation libraries from its image into a shared volume. That init container usually does not need runtime network access, but any init container that does make outbound calls can be affected after Istio traffic redirection is configured and before the Istio sidecar proxy is ready.

## The Problem

Istio injects an init container (`istio-init`) that sets up iptables rules to redirect all traffic through the Envoy sidecar. It also injects the `istio-proxy` sidecar container. The problem is the ordering:

```text
Init containers (run sequentially):
  1. istio-init           -> Sets up iptables rules
  2. opentelemetry-auto-instrumentation -> Copies instrumentation files

Containers (run in parallel):
  - my-app
  - istio-proxy          -> Not running yet during init!
```

After `istio-init` runs, traffic is redirected to the Envoy proxy. But the proxy is a regular container in non-native-sidecar mode, so it is not running yet. If the OTel instrumentation init container, a custom instrumentation image, or an application init container targeted for instrumentation tries to reach an external service, it can get blocked because there is no proxy to handle the traffic.

## Symptoms

```bash
# An init container gets stuck or fails

kubectl describe pod my-app-pod

# Events might show:
# Warning  BackOff  initContainer "opentelemetry-auto-instrumentation" exited with error

# Check the init container logs
kubectl logs my-app-pod -c opentelemetry-auto-instrumentation
# Connection timeout errors or network unreachable
```

## Fix 1: Do Not Rely on `holdApplicationUntilProxyStarts` for Init Containers

Istio's `holdApplicationUntilProxyStarts` feature makes regular application containers wait until the Envoy proxy is ready:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-python: "true"
        # Tell Istio to let the proxy start before app containers
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
        - name: my-app
          image: my-python-app:latest
```

The `holdApplicationUntilProxyStarts` setting makes the application containers wait until the Envoy proxy is ready. However, this only affects regular containers, not init containers.

## Fix 2: Exclude the Init Container's Traffic from Istio

Add annotations to bypass Istio's traffic redirection for the specific ports or IPs that the init container must reach:

```yaml
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-java: "true"
    # Exclude the destination CIDR the init container must reach
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.96.0.0/12"
```

Or exclude specific ports:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "4317,4318"
```

This allows the init container to reach the required destination directly without going through Envoy.
These annotations apply to the whole pod, not only init containers, so application traffic to the same CIDRs or ports will also bypass the Istio sidecar.

## Fix 3: Use the Istio CNI Plugin

The Istio CNI plugin moves the traffic redirection setup from the `istio-init` container to the node's CNI chain. This removes the privileged `istio-init` container, but it does not by itself make init-container network traffic work before the proxy starts. Istio's own CNI documentation recommends using the same exclusions from Fix 2, or running the init container as the sidecar proxy user ID (`1337`) when that is appropriate for your environment.

```bash
# Install Istio with the CNI plugin
istioctl install --set components.cni.enabled=true
```

With the CNI plugin, the flow becomes:

```text
CNI sets up iptables (before pod starts)
Init containers:
  1. opentelemetry-auto-instrumentation -> Copies files; outbound traffic still needs an exclusion if used
Containers:
  - my-app
  - istio-proxy
```

## Fix 4: Pre-package Instrumentation Libraries

If you use a customized instrumentation image, make sure the agent files are bundled in that image rather than downloaded at runtime:

```yaml
# Custom Instrumentation CR that uses a pre-built image
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
spec:
  java:
    image: my-registry/otel-java-agent:latest  # Pre-built with the agent jar
  python:
    image: my-registry/otel-python-agent:latest
```

If the init container only copies files (no network needed), the Istio traffic interception does not matter.

## Fix 5: Use Istio Native Sidecars Where Available

On Kubernetes versions with native sidecar support and an Istio version that supports it, you can run `istio-proxy` as a native sidecar. In that mode, Istio injects the proxy as a restartable init container so later init containers can wait for the proxy to be ready:

```yaml
metadata:
  annotations:
    sidecar.istio.io/nativeSidecar: "true"
```

Do not depend on mutating webhook order to reorder injected containers. Kubernetes does not guarantee a stable invocation order for mutating admission webhooks, and `reinvocationPolicy: IfNeeded` only allows a webhook to run again after later mutations; it does not force the OTel webhook to run before Istio.

## Verification

After applying your fix, verify the pod starts correctly:

```bash
# Watch the pod creation
kubectl get pod -w -l app=my-app

# Check all init containers completed
kubectl get pod my-app-pod -o jsonpath='{range .status.initContainerStatuses[*]}{.name}: {.state}{"\n"}{end}'

# Verify telemetry is flowing
kubectl logs my-app-pod -c my-app | grep -i "otel\|opentelemetry"
```

Istio and OpenTelemetry both use webhook injection, which makes their interaction complex. The cleanest solution is usually excluding only the init-container destinations that need direct access (Fix 2), or using native sidecars where your Kubernetes and Istio versions support them (Fix 5). Choose based on what is easier to manage in your environment.
