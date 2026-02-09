# How to Troubleshoot Operator Sidecar Injection Not Working Due to Wrong Annotation Language Mismatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Operator, Sidecar, Annotations

Description: Troubleshoot and fix OpenTelemetry Operator sidecar injection failures caused by incorrect annotation language values.

You have the OpenTelemetry Operator installed and an Instrumentation CR deployed. You added the annotation to your pod spec, but the auto-instrumentation init container never appears. In many cases, the problem is a mismatch between the annotation you used and the actual language or configuration expected.

## The Annotation System

The Operator uses annotations to decide what type of auto-instrumentation to inject. Each supported language has its own annotation:

```yaml
# Java
instrumentation.opentelemetry.io/inject-java: "true"

# Python
instrumentation.opentelemetry.io/inject-python: "true"

# Node.js
instrumentation.opentelemetry.io/inject-nodejs: "true"

# .NET
instrumentation.opentelemetry.io/inject-dotnet: "true"

# Go (requires a different approach since Go is compiled)
instrumentation.opentelemetry.io/inject-go: "true"

# Apache HTTPD
instrumentation.opentelemetry.io/inject-apache-httpd: "true"

# Nginx
instrumentation.opentelemetry.io/inject-nginx: "true"

# SDK (generic, for already-instrumented apps that need the collector sidecar)
instrumentation.opentelemetry.io/inject-sdk: "true"
```

## Common Mistakes

### Mistake 1: Wrong Language Annotation

Your container runs a Node.js application but you used the Java annotation:

```yaml
# WRONG - Java annotation for a Node.js app
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-java: "true"  # This injects Java agent
```

The Java agent gets injected but does nothing useful because the process is Node.js. You will not see an error, just no telemetry.

```yaml
# CORRECT
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "true"
```

### Mistake 2: Annotation on the Wrong Level

The annotation must be on the pod template, not on the Deployment:

```yaml
# WRONG - annotation on the Deployment metadata
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    instrumentation.opentelemetry.io/inject-python: "true"  # Wrong level!
spec:
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-python: "true"  # Correct level!
    spec:
      containers:
        - name: my-app
          image: my-python-app:latest
```

### Mistake 3: Typo in the Annotation Key

Annotation keys are case-sensitive and must be exact:

```yaml
# WRONG - various typos
instrumentation.opentelemetry.io/inject-node: "true"    # Should be "nodejs"
instrumentation.opentelemetry.io/inject-js: "true"      # Should be "nodejs"
instrumentation.opentelemetry.io/inject-python3: "true"  # Should be "python"
instrumentation.opentelemetry.io/inject-csharp: "true"  # Should be "dotnet"
Instrumentation.opentelemetry.io/inject-java: "true"    # Capital I!
```

### Mistake 4: Value Not "true"

The annotation value must be the string `"true"` or a reference to an Instrumentation CR:

```yaml
# WRONG
instrumentation.opentelemetry.io/inject-java: "yes"
instrumentation.opentelemetry.io/inject-java: "1"
instrumentation.opentelemetry.io/inject-java: true  # Boolean, not string in some contexts

# CORRECT
instrumentation.opentelemetry.io/inject-java: "true"
# Or reference a specific Instrumentation CR
instrumentation.opentelemetry.io/inject-java: "my-instrumentation"
```

## Debugging Steps

```bash
# 1. Check what annotations are on the pod
kubectl get pod my-app-pod -o jsonpath='{.metadata.annotations}' | jq .

# 2. Check if the Instrumentation CR exists in the same namespace
kubectl get instrumentation -n my-app-namespace

# 3. Check the Operator logs for webhook decisions
kubectl logs -n opentelemetry-operator-system \
  deployment/opentelemetry-operator-controller-manager | grep -i "inject\|instrument\|webhook"

# 4. Verify the webhook is actually being called
kubectl get events -n my-app-namespace --sort-by=.lastTimestamp | grep -i "otel\|instrument"
```

## Verifying Successful Injection

When injection works correctly, you should see:

```bash
# The pod should have an init container
kubectl get pod my-app-pod -o jsonpath='{.spec.initContainers[*].name}'
# Output: opentelemetry-auto-instrumentation-python (or similar)

# The main container should have OTel environment variables
kubectl get pod my-app-pod -o jsonpath='{.spec.containers[0].env[*].name}' | tr ' ' '\n' | grep OTEL
# Output should include:
# OTEL_TRACES_EXPORTER
# OTEL_EXPORTER_OTLP_ENDPOINT
# OTEL_SERVICE_NAME
# OTEL_RESOURCE_ATTRIBUTES
```

## Multi-Container Pods

If your pod has multiple containers, you need to specify which container to inject into:

```yaml
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-python: "true"
    instrumentation.opentelemetry.io/container-names: "my-app-container"
```

Without the `container-names` annotation, the Operator injects into the first container, which might be a sidecar or helper container instead of your actual application.

## Namespace-Level Injection

You can also set annotations at the namespace level to inject into all pods:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app-namespace
  annotations:
    instrumentation.opentelemetry.io/inject-java: "true"
```

This applies to all pods in the namespace, so make sure every pod in that namespace actually runs Java. Otherwise, you will get unexpected behavior for non-Java workloads.

The key takeaway: always double-check the exact annotation key and value. A single character difference is enough to silently prevent injection.
