# How to Fix Auto-Instrumentation Init Container Failing in Istio Service Mesh Due to Sidecar Ordering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Istio, Service Mesh, Auto-Instrumentation

Description: Fix OpenTelemetry auto-instrumentation init container failures caused by Istio sidecar proxy ordering conflicts.

Running OpenTelemetry auto-instrumentation alongside Istio creates a subtle ordering problem. The OTel Operator injects an init container that needs network access to download instrumentation libraries, but the Istio sidecar proxy might not be ready yet, blocking all outbound traffic.

## The Problem

Istio injects an init container (`istio-init`) that sets up iptables rules to redirect all traffic through the Envoy sidecar. It also injects the `istio-proxy` sidecar container. The problem is the ordering:

```
Init containers (run sequentially):
  1. istio-init           -> Sets up iptables rules
  2. opentelemetry-auto-instrumentation -> Needs network access!

Containers (run in parallel):
  - my-app
  - istio-proxy          -> Not running yet during init!
```

After `istio-init` runs, all traffic is redirected to the Envoy proxy. But the proxy is a regular container, not an init container, so it is not running yet. The OTel init container tries to reach external registries or the Collector and gets blocked because there is no proxy to handle the traffic.

## Symptoms

```bash
# The OTel init container gets stuck or fails
kubectl describe pod my-app-pod

# Events might show:
# Warning  BackOff  initContainer "opentelemetry-auto-instrumentation" exited with error

# Check the init container logs
kubectl logs my-app-pod -c opentelemetry-auto-instrumentation-python
# Connection timeout errors or network unreachable
```

## Fix 1: Exclude Init Containers from Istio Traffic Capture

Tell Istio to not redirect traffic from init containers. This is done via the `traffic.sidecar.istio.io/excludeOutboundIPRanges` annotation or by using Istio's `holdApplicationUntilProxyStarts` feature:

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

## Fix 2: Exclude the OTel Init Container's Traffic from Istio

Add annotations to bypass Istio's iptables rules for specific ports or IPs:

```yaml
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-java: "true"
    # Exclude the OTel Collector's IP range from Istio interception
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.96.0.0/12"
```

Or exclude specific ports:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "4317,4318"
```

This allows the init container to reach the Collector directly without going through Envoy.

## Fix 3: Use the Istio CNI Plugin

The Istio CNI plugin moves the iptables setup from an init container to the node's CNI chain. This eliminates the ordering problem entirely because the iptables rules are set up before any containers start, and the CNI handles traffic correctly even without the proxy running.

```bash
# Install Istio with the CNI plugin
istioctl install --set components.cni.enabled=true
```

With the CNI plugin, the flow becomes:

```
CNI sets up iptables (before pod starts)
Init containers:
  1. opentelemetry-auto-instrumentation -> Works because CNI handles routing
Containers:
  - my-app
  - istio-proxy
```

## Fix 4: Pre-package Instrumentation Libraries

If the init container's only purpose is to copy instrumentation agent files into a shared volume, make sure those files are bundled in the container image rather than downloaded at runtime:

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

## Fix 5: Reorder Init Containers

You can move the OTel init container to run before the Istio init container:

```yaml
# This requires patching the pod spec
# The OTel init container should run BEFORE istio-init
spec:
  initContainers:
    - name: opentelemetry-auto-instrumentation
      # This runs first, before iptables rules are set
      image: otel/autoinstrumentation-python:latest
    - name: istio-init
      # This runs second, setting up iptables after OTel init is done
      image: docker.io/istio/proxyv2:latest
```

This is tricky to manage because both the Istio and OTel webhooks inject their init containers independently. You may need to configure the webhook ordering:

```yaml
# Set the OTel webhook to run before Istio's webhook
# by adjusting the webhook's reinvocationPolicy and ordering
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: opentelemetry-operator-mutating-webhook-configuration
webhooks:
  - name: mpod.kb.io
    reinvocationPolicy: IfNeeded  # Re-run if another webhook modifies the pod
```

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

Istio and OpenTelemetry both use webhook injection, which makes their interaction complex. The cleanest solution is either the Istio CNI plugin (Fix 3) or excluding OTel traffic from Istio interception (Fix 2). Choose based on what is easier to manage in your environment.
