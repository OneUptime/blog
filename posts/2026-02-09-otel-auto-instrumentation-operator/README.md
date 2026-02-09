# How to implement OpenTelemetry auto-instrumentation operator for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Operator, Auto-instrumentation, Observability

Description: Learn how to deploy and configure the OpenTelemetry Operator for Kubernetes to enable automatic instrumentation of applications without modifying container images or deployment manifests.

---

The OpenTelemetry Operator for Kubernetes automates instrumentation injection into application pods. This approach eliminates the need to modify container images or manually configure instrumentation, making it easier to enable observability across your cluster.

## Understanding the OpenTelemetry Operator

The OpenTelemetry Operator is a Kubernetes operator that manages OpenTelemetry Collector deployments and automatic instrumentation. It uses Kubernetes admission webhooks to inject instrumentation libraries into pods at runtime.

The operator watches for pod creation events and injects init containers that copy instrumentation agents into the application container. It also configures environment variables to enable auto-instrumentation automatically.

## Installing the Operator

Deploy the OpenTelemetry Operator using Helm, the recommended installation method. The operator requires cert-manager for managing webhook certificates.

```bash
# Install cert-manager first
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

# Add OpenTelemetry Helm repository
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

# Install the operator
helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --create-namespace \
  --set manager.collectorImage.repository=otel/opentelemetry-collector-k8s
```

The operator installation creates a new namespace and deploys the operator controller with necessary RBAC permissions.

## Creating Instrumentation Resources

Define an Instrumentation custom resource that specifies how to instrument applications. This resource configures the instrumentation for specific languages.

```yaml
# instrumentation.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
  namespace: default
spec:
  # Global configuration
  exporter:
    endpoint: http://otel-collector.observability.svc.cluster.local:4317
  propagators:
    - tracecontext
    - baggage
  sampler:
    type: parentbased_traceidratio
    argument: "0.25"

  # Java auto-instrumentation
  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:latest
    env:
      - name: OTEL_INSTRUMENTATION_JDBC_STATEMENT_SANITIZER_ENABLED
        value: "true"

  # Python auto-instrumentation
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:latest
    env:
      - name: OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED
        value: "true"

  # Node.js auto-instrumentation
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
    env:
      - name: OTEL_NODEJS_DEBUG
        value: "false"

  # .NET auto-instrumentation
  dotnet:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-dotnet:latest
    env:
      - name: OTEL_DOTNET_AUTO_TRACES_ENABLED
        value: "true"
```

Apply the instrumentation resource to your cluster.

```bash
kubectl apply -f instrumentation.yaml
```

This resource defines how the operator should inject instrumentation into pods.

## Instrumenting Java Applications

Enable auto-instrumentation for Java applications by adding an annotation to your deployment. The operator injects the Java agent automatically.

```yaml
# java-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: java-app
  template:
    metadata:
      labels:
        app: java-app
      annotations:
        # Enable Java instrumentation
        instrumentation.opentelemetry.io/inject-java: "true"
    spec:
      containers:
      - name: app
        image: myregistry/java-app:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: OTEL_SERVICE_NAME
          value: "java-app"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "environment=production,team=backend"
```

Deploy the application and verify instrumentation injection.

```bash
# Deploy the application
kubectl apply -f java-deployment.yaml

# Check pod for injected init container
kubectl get pod -l app=java-app -o jsonpath='{.items[0].spec.initContainers[*].name}'

# Expected output: opentelemetry-auto-instrumentation
```

The operator automatically injects an init container that copies the Java agent JAR file into the application container.

## Instrumenting Python Applications

Python applications require a similar annotation to enable auto-instrumentation. The operator handles the bootstrap and installation process.

```yaml
# python-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: python-app
  template:
    metadata:
      labels:
        app: python-app
      annotations:
        # Enable Python instrumentation
        instrumentation.opentelemetry.io/inject-python: "true"
    spec:
      containers:
      - name: app
        image: myregistry/python-app:1.0.0
        ports:
        - containerPort: 5000
        env:
        - name: OTEL_SERVICE_NAME
          value: "python-app"
        command:
        - python
        - app.py
```

The operator injects environment variables and modifies the container command to enable instrumentation.

```bash
# Deploy Python application
kubectl apply -f python-deployment.yaml

# Verify environment variables were injected
kubectl exec -it deploy/python-app -- env | grep OTEL
```

The injected environment variables configure the OpenTelemetry SDK automatically.

## Instrumenting Node.js Applications

Node.js applications use a similar pattern with the nodejs-specific annotation.

```yaml
# nodejs-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nodejs-app
  template:
    metadata:
      labels:
        app: nodejs-app
      annotations:
        # Enable Node.js instrumentation
        instrumentation.opentelemetry.io/inject-nodejs: "true"
    spec:
      containers:
      - name: app
        image: myregistry/nodejs-app:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: OTEL_SERVICE_NAME
          value: "nodejs-app"
```

The operator modifies the NODE_OPTIONS environment variable to load instrumentation automatically.

```bash
# Deploy and verify
kubectl apply -f nodejs-deployment.yaml

# Check NODE_OPTIONS injection
kubectl exec -it deploy/nodejs-app -- sh -c 'echo $NODE_OPTIONS'

# Expected output includes: --require /otel-auto-instrumentation/autoinstrumentation.js
```

## Multi-Language Application Support

Applications with multiple language containers in a single pod can specify instrumentation per container.

```yaml
# multi-language-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-lang-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: multi-lang-app
  template:
    metadata:
      labels:
        app: multi-lang-app
      annotations:
        # Specify instrumentation per container
        instrumentation.opentelemetry.io/inject-java: "java-container"
        instrumentation.opentelemetry.io/inject-python: "python-container"
    spec:
      containers:
      - name: java-container
        image: myregistry/java-service:1.0.0
        ports:
        - containerPort: 8080
      - name: python-container
        image: myregistry/python-service:1.0.0
        ports:
        - containerPort: 5000
```

The operator injects appropriate instrumentation into each specified container.

## Deploying the OpenTelemetry Collector

Deploy a collector to receive telemetry data from instrumented applications. The operator can manage collector instances.

```yaml
# collector.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: observability
spec:
  mode: deployment
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 5s
        limit_mib: 512
        spike_limit_mib: 128

    exporters:
      logging:
        loglevel: debug
      otlp:
        endpoint: tempo:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [logging, otlp]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [logging]
```

Deploy the collector using kubectl.

```bash
# Create namespace
kubectl create namespace observability

# Deploy collector
kubectl apply -f collector.yaml

# Verify collector is running
kubectl get pods -n observability
```

## Configuring Resource Attributes

Add Kubernetes-specific resource attributes automatically by configuring the instrumentation resource.

```yaml
# instrumentation-with-resources.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: instrumentation-with-resources
  namespace: default
spec:
  exporter:
    endpoint: http://otel-collector.observability.svc.cluster.local:4317

  # Add Kubernetes resource attributes
  resource:
    addK8sUIDAttributes: true

  # Common environment variables for all languages
  env:
    - name: OTEL_RESOURCE_ATTRIBUTES
      value: "cluster.name=production-cluster,deployment.environment=production"

  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:latest
    env:
      - name: OTEL_JAVAAGENT_EXTENSIONS
        value: "/otel-extensions/extensions.jar"
```

These resource attributes enrich telemetry data with Kubernetes context.

## Namespace-Specific Instrumentation

Deploy different instrumentation configurations for different namespaces.

```yaml
# staging-instrumentation.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: staging-instrumentation
  namespace: staging
spec:
  exporter:
    endpoint: http://otel-collector-staging.observability.svc.cluster.local:4317
  sampler:
    type: always_on  # Sample all traces in staging

---
# production-instrumentation.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: production-instrumentation
  namespace: production
spec:
  exporter:
    endpoint: http://otel-collector-production.observability.svc.cluster.local:4317
  sampler:
    type: parentbased_traceidratio
    argument: "0.1"  # Sample 10% of traces in production
```

This approach allows environment-specific configuration without changing application deployments.

## Troubleshooting Instrumentation

When instrumentation doesn't work as expected, check several areas.

First, verify the operator is running correctly.

```bash
# Check operator status
kubectl get pods -n opentelemetry-operator-system

# Check operator logs
kubectl logs -n opentelemetry-operator-system deploy/opentelemetry-operator -f
```

Second, verify the instrumentation resource exists and is valid.

```bash
# List instrumentation resources
kubectl get instrumentation -A

# Describe instrumentation for details
kubectl describe instrumentation my-instrumentation -n default
```

Third, check if the webhook is injecting instrumentation correctly.

```bash
# Describe pod to see injected init containers
kubectl describe pod <pod-name>

# Look for init container named: opentelemetry-auto-instrumentation
```

Fourth, verify environment variables were injected.

```bash
# Check environment variables in running pod
kubectl exec -it <pod-name> -- env | grep OTEL
```

Fifth, check application logs for instrumentation initialization messages.

```bash
# View application logs
kubectl logs <pod-name> | grep -i opentelemetry
```

## Best Practices

Follow these best practices when using the OpenTelemetry Operator.

First, create separate instrumentation resources for different environments. This allows environment-specific sampling rates and configurations.

Second, use resource attributes to add context about your Kubernetes environment. Include cluster name, namespace, and deployment information.

Third, monitor operator health and resource usage. The operator itself should be observable.

Fourth, test instrumentation in non-production environments first. Verify telemetry data quality before enabling in production.

Fifth, use selective instrumentation. Not all applications need the same level of observability. Apply annotations only where needed.

The OpenTelemetry Operator simplifies auto-instrumentation in Kubernetes by handling injection automatically. This approach provides consistent observability across applications without requiring image modifications or complex deployment changes.
