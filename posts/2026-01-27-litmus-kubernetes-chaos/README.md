# How to Implement Litmus for Kubernetes Chaos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Chaos Engineering, Litmus, SRE, Reliability, DevOps, Testing, Resilience

Description: A comprehensive guide to implementing Litmus Chaos for Kubernetes, covering installation, experiment configuration, probes, scheduling, and observability integration.

---

> "The best way to build confidence in your system's resilience is to test it in production - safely and methodically. Litmus makes chaos engineering accessible, repeatable, and observable."

## What is Litmus Chaos?

Litmus is an open-source chaos engineering platform for Kubernetes. It helps SRE and DevOps teams discover weaknesses in their infrastructure by injecting controlled failures and observing how the system responds.

Unlike ad-hoc testing, Litmus provides:
- **Declarative chaos experiments** defined as Kubernetes CRDs
- **Built-in hypothesis validation** through probes
- **Scheduling and automation** for continuous resilience testing
- **Observability integration** for monitoring chaos impact

## Installing Litmus

There are multiple ways to install Litmus. We will cover Helm installation, which is the recommended approach for production environments.

### Prerequisites

Before installing Litmus, ensure you have:
- A running Kubernetes cluster (1.17+)
- kubectl configured to access your cluster
- Helm 3.x installed

### Install Litmus Using Helm

```bash
# Add the Litmus Helm repository
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/

# Update your Helm repositories
helm repo update

# Create a namespace for Litmus
kubectl create namespace litmus

# Install Litmus ChaosCenter (the control plane)
helm install chaos litmuschaos/litmus \
  --namespace litmus \
  --set portal.frontend.service.type=LoadBalancer
```

### Verify the Installation

```bash
# Check that all Litmus pods are running
kubectl get pods -n litmus

# Expected output shows these pods in Running state:
# chaos-litmus-frontend-xxx
# chaos-litmus-server-xxx
# chaos-mongodb-xxx

# Get the ChaosCenter URL
kubectl get svc -n litmus chaos-litmus-frontend-service
```

### Install Litmus Agent in Target Cluster

For the cluster where you want to run chaos experiments:

```bash
# Install the chaos operator
kubectl apply -f https://litmuschaos.github.io/litmus/litmus-operator-v3.0.0.yaml

# Verify the operator is running
kubectl get pods -n litmus

# Install generic chaos experiments
kubectl apply -f https://hub.litmuschaos.io/api/chaos/3.0.0?file=charts/generic/experiments.yaml
```

## Understanding ChaosEngine

The ChaosEngine is the main user-facing resource that connects your application to a chaos experiment. It defines what to test, how to test it, and what conditions determine success or failure.

### Basic ChaosEngine Structure

```yaml
# ChaosEngine defines the target application and experiment to run
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: nginx-chaos          # Name of this chaos engine
  namespace: default         # Namespace where the experiment runs
spec:
  # Specify the application under test
  appinfo:
    appns: default           # Namespace of the target application
    applabel: app=nginx      # Label selector for target pods
    appkind: deployment      # Kind of workload (deployment, statefulset, etc.)

  # Enable or disable the engine
  engineState: active

  # Define chaos experiments to run
  experiments:
    - name: pod-delete       # Name of the ChaosExperiment to use
      spec:
        components:
          env:
            # Experiment-specific parameters
            - name: TOTAL_CHAOS_DURATION
              value: "30"    # Duration in seconds
            - name: CHAOS_INTERVAL
              value: "10"    # Interval between chaos actions
            - name: FORCE
              value: "false" # Use graceful termination
```

### ChaosEngine with Probes

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: app-resilience-test
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: app=payment-service
    appkind: deployment

  engineState: active
  chaosServiceAccount: litmus-admin

  experiments:
    - name: pod-delete
      spec:
        # Define probes for hypothesis validation
        probe:
          - name: check-endpoint-health
            type: httpProbe
            mode: Continuous      # Check throughout the experiment
            httpProbe/inputs:
              url: http://payment-service.production.svc:8080/health
              insecureSkipVerify: false
              method:
                get:
                  criteria: ==
                  responseCode: "200"
            runProperties:
              probeTimeout: 5s
              interval: 2s
              retry: 3
              probePollingInterval: 1s

        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"
            - name: PODS_AFFECTED_PERC
              value: "50"        # Kill 50% of pods
```

## Understanding ChaosExperiment

ChaosExperiments are templates that define what type of chaos to inject and the default parameters. Litmus provides many pre-built experiments in the ChaosHub.

### Viewing Available Experiments

```bash
# List all installed chaos experiments
kubectl get chaosexperiments -n litmus

# Describe a specific experiment to see its parameters
kubectl describe chaosexperiment pod-delete -n litmus
```

### Custom ChaosExperiment Definition

```yaml
# ChaosExperiment defines the chaos injection logic and parameters
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosExperiment
metadata:
  name: custom-pod-delete
  namespace: litmus
spec:
  definition:
    # Scope determines where the experiment can run
    scope: Namespaced

    # Permissions required by the experiment
    permissions:
      - apiGroups: [""]
        resources: ["pods"]
        verbs: ["create", "delete", "get", "list", "patch", "update"]
      - apiGroups: [""]
        resources: ["events"]
        verbs: ["create", "get", "list", "patch", "update"]
      - apiGroups: ["apps"]
        resources: ["deployments", "replicasets"]
        verbs: ["get", "list"]

    # Container image that executes the chaos
    image: litmuschaos/go-runner:3.0.0
    imagePullPolicy: Always

    # Arguments passed to the chaos container
    args:
      - -c
      - ./experiments -name pod-delete
    command:
      - /bin/bash

    # Default environment variables (can be overridden in ChaosEngine)
    env:
      - name: TOTAL_CHAOS_DURATION
        value: "30"
      - name: CHAOS_INTERVAL
        value: "10"
      - name: FORCE
        value: "false"
      - name: PODS_AFFECTED_PERC
        value: "100"
      - name: TARGET_PODS
        value: ""
      - name: RAMP_TIME
        value: ""
      - name: SEQUENCE
        value: parallel

    # Labels for the experiment pod
    labels:
      name: pod-delete
      app.kubernetes.io/part-of: litmus
```

## Common Experiment Types

Litmus provides a rich library of chaos experiments. Here are the most commonly used ones for testing Kubernetes resilience.

### Pod Delete Experiment

Simulates pod failures to test how your application handles sudden termination.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-delete-chaos
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=web-server
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            # Total duration of the chaos experiment
            - name: TOTAL_CHAOS_DURATION
              value: "60"

            # Time interval between pod deletions
            - name: CHAOS_INTERVAL
              value: "15"

            # Use force delete (true) or graceful delete (false)
            - name: FORCE
              value: "false"

            # Percentage of pods to delete (0-100)
            - name: PODS_AFFECTED_PERC
              value: "50"

            # Specific pod names to target (comma-separated, optional)
            - name: TARGET_PODS
              value: ""

            # Wait time before starting chaos
            - name: RAMP_TIME
              value: "10"

            # Execute deletions in parallel or serial
            - name: SEQUENCE
              value: "parallel"
```

### Pod Network Loss Experiment

Introduces network packet loss to test application resilience to network degradation.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: network-loss-chaos
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=api-gateway
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-network-loss
      spec:
        components:
          env:
            # Duration of network loss injection
            - name: TOTAL_CHAOS_DURATION
              value: "120"

            # Percentage of packets to drop (0-100)
            - name: NETWORK_PACKET_LOSS_PERCENTAGE
              value: "30"

            # Network interface to target
            - name: NETWORK_INTERFACE
              value: "eth0"

            # Target specific container (optional)
            - name: TARGET_CONTAINER
              value: ""

            # Destination IPs to affect (optional, affects all if empty)
            - name: DESTINATION_IPS
              value: ""

            # Destination hosts to affect (optional)
            - name: DESTINATION_HOSTS
              value: ""

            # Container runtime (containerd, docker, cri-o)
            - name: CONTAINER_RUNTIME
              value: "containerd"

            # Runtime socket path
            - name: SOCKET_PATH
              value: "/run/containerd/containerd.sock"
```

### Pod Network Latency Experiment

Adds network latency to test timeout handling and circuit breaker patterns.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: network-latency-chaos
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=order-service
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-network-latency
      spec:
        components:
          env:
            # Duration of latency injection
            - name: TOTAL_CHAOS_DURATION
              value: "180"

            # Latency to add in milliseconds
            - name: NETWORK_LATENCY
              value: "500"

            # Jitter in milliseconds (randomness in latency)
            - name: JITTER
              value: "100"

            # Network interface
            - name: NETWORK_INTERFACE
              value: "eth0"

            # Target specific IPs for latency
            - name: DESTINATION_IPS
              value: "10.96.0.1"    # Target API server

            # Container runtime
            - name: CONTAINER_RUNTIME
              value: "containerd"

            - name: SOCKET_PATH
              value: "/run/containerd/containerd.sock"
```

### Pod CPU Hog Experiment

Stresses CPU resources to test behavior under high load.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: cpu-hog-chaos
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=compute-service
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-cpu-hog
      spec:
        components:
          env:
            # Duration of CPU stress
            - name: TOTAL_CHAOS_DURATION
              value: "120"

            # Number of CPU cores to stress
            - name: CPU_CORES
              value: "2"

            # CPU load percentage (0-100)
            - name: CPU_LOAD
              value: "80"

            # Target specific pods
            - name: TARGET_PODS
              value: ""

            # Percentage of pods to target
            - name: PODS_AFFECTED_PERC
              value: "100"

            # Container runtime
            - name: CONTAINER_RUNTIME
              value: "containerd"

            - name: SOCKET_PATH
              value: "/run/containerd/containerd.sock"
```

### Pod Memory Hog Experiment

Consumes memory to test OOM handling and memory limits.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: memory-hog-chaos
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=data-processor
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-memory-hog
      spec:
        components:
          env:
            # Duration of memory stress
            - name: TOTAL_CHAOS_DURATION
              value: "120"

            # Memory to consume in megabytes
            - name: MEMORY_CONSUMPTION
              value: "500"

            # Number of workers spawning memory consumption
            - name: NUMBER_OF_WORKERS
              value: "1"

            # Target container name (optional)
            - name: TARGET_CONTAINER
              value: ""

            # Percentage of pods to target
            - name: PODS_AFFECTED_PERC
              value: "100"

            # Container runtime
            - name: CONTAINER_RUNTIME
              value: "containerd"

            - name: SOCKET_PATH
              value: "/run/containerd/containerd.sock"
```

### Node Drain Experiment

Simulates node maintenance by draining workloads.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: node-drain-chaos
  namespace: default
spec:
  # Node experiments use empty appinfo
  appinfo:
    appns: ""
    applabel: ""
    appkind: ""
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: node-drain
      spec:
        components:
          env:
            # Duration before uncordoning the node
            - name: TOTAL_CHAOS_DURATION
              value: "120"

            # Target node name (or use label selector)
            - name: TARGET_NODE
              value: "worker-node-1"

            # Alternative: select node by label
            - name: NODE_LABEL
              value: ""

            # App namespace for identifying affected workloads
            - name: APP_NAMESPACE
              value: "production"

            # App label for identifying affected workloads
            - name: APP_LABEL
              value: "app=critical-service"
```

## Configuring Probes

Probes are the mechanism for validating your hypothesis during chaos experiments. They help you determine if your system maintained its expected behavior while under stress.

### HTTP Probe

Validates that HTTP endpoints remain accessible and return expected responses.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: http-probe-test
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=web-app
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        probe:
          # HTTP probe to check endpoint health
          - name: api-health-check
            type: httpProbe
            mode: Continuous          # SOT, EOT, Edge, Continuous, OnChaos
            httpProbe/inputs:
              url: http://web-app.default.svc:8080/health
              insecureSkipVerify: false
              responseTimeout: 5000   # Timeout in milliseconds
              method:
                get:
                  criteria: ==        # ==, !=, oneOf
                  responseCode: "200"
            runProperties:
              probeTimeout: 10s       # Total time to wait for probe
              interval: 5s            # Time between probe attempts
              retry: 3                # Number of retries on failure
              probePollingInterval: 2s
              initialDelay: 5s        # Wait before first probe
              stopOnFailure: false    # Continue experiment on probe failure

          # HTTP probe with body validation
          - name: api-response-check
            type: httpProbe
            mode: Edge                # Check at start and end of chaos
            httpProbe/inputs:
              url: http://web-app.default.svc:8080/api/status
              insecureSkipVerify: false
              method:
                get:
                  criteria: contains
                  responseCode: "200"
              # Validate response body
              responseBody:
                criteria: contains
                value: '"status":"healthy"'
            runProperties:
              probeTimeout: 10s
              interval: 5s
              retry: 2
```

### Command Probe

Executes commands inside a container to validate state.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: cmd-probe-test
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=database
    appkind: statefulset
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        probe:
          # Command probe to check database connectivity
          - name: database-connectivity
            type: cmdProbe
            mode: Edge
            cmdProbe/inputs:
              # Command to execute
              command: "pg_isready -h localhost -p 5432"
              # Where to run the command
              source:
                image: postgres:15
                hostNetwork: false
              # Expected comparison
              comparator:
                type: int             # int, float, string
                criteria: ==
                value: "0"            # Exit code 0 means healthy
            runProperties:
              probeTimeout: 30s
              interval: 10s
              retry: 3

          # Command probe to verify data integrity
          - name: data-integrity-check
            type: cmdProbe
            mode: EOT                 # End of Test
            cmdProbe/inputs:
              command: |
                psql -h localhost -U postgres -d mydb \
                  -c "SELECT COUNT(*) FROM critical_table" \
                  -t | xargs
              source:
                image: postgres:15
              comparator:
                type: int
                criteria: ">="
                value: "1000"         # Expect at least 1000 rows
            runProperties:
              probeTimeout: 60s
              interval: 5s
              retry: 2
```

### Kubernetes Probe

Validates Kubernetes resource states during chaos.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: k8s-probe-test
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=critical-service
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        probe:
          # Verify minimum replicas are always running
          - name: min-replicas-check
            type: k8sProbe
            mode: Continuous
            k8sProbe/inputs:
              group: ""
              version: v1
              resource: pods
              namespace: default
              fieldSelector: "status.phase=Running"
              labelSelector: "app=critical-service"
              operation: present      # present, absent, create, delete
            runProperties:
              probeTimeout: 10s
              interval: 5s
              retry: 3

          # Verify deployment is not in failed state
          - name: deployment-health
            type: k8sProbe
            mode: Continuous
            k8sProbe/inputs:
              group: apps
              version: v1
              resource: deployments
              namespace: default
              labelSelector: "app=critical-service"
              operation: present
            runProperties:
              probeTimeout: 10s
              interval: 10s
              retry: 2
```

### Prometheus Probe

Validates metrics during chaos to ensure SLOs are maintained.

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: prometheus-probe-test
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=api-server
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        probe:
          # Check error rate stays below threshold
          - name: error-rate-slo
            type: promProbe
            mode: Continuous
            promProbe/inputs:
              endpoint: http://prometheus.monitoring.svc:9090
              query: |
                sum(rate(http_requests_total{status=~"5.*",app="api-server"}[1m])) /
                sum(rate(http_requests_total{app="api-server"}[1m])) * 100
              comparator:
                type: float
                criteria: "<="
                value: "1"            # Error rate should be <= 1%
            runProperties:
              probeTimeout: 30s
              interval: 15s
              retry: 2

          # Check latency P99 stays below threshold
          - name: latency-slo
            type: promProbe
            mode: Continuous
            promProbe/inputs:
              endpoint: http://prometheus.monitoring.svc:9090
              query: |
                histogram_quantile(0.99,
                  sum(rate(http_request_duration_seconds_bucket{app="api-server"}[1m]))
                  by (le)
                )
              comparator:
                type: float
                criteria: "<="
                value: "0.5"          # P99 latency should be <= 500ms
            runProperties:
              probeTimeout: 30s
              interval: 15s
              retry: 2
```

## Scheduling Chaos Experiments

For continuous resilience testing, you can schedule chaos experiments to run automatically using CronWorkflows or Litmus ChaosSchedules.

### Using ChaosSchedule

```yaml
# ChaosSchedule runs experiments on a cron schedule
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosSchedule
metadata:
  name: weekly-resilience-test
  namespace: litmus
spec:
  # Schedule in cron format
  schedule:
    now: false
    # Run every Monday at 2 AM
    repeat:
      timeRange:
        startTime: "2024-01-01T00:00:00Z"
        endTime: "2025-12-31T23:59:59Z"
      properties:
        minChaosInterval: 1h      # Minimum time between runs
      workDays:
        includedDays: "Mon"       # Mon,Tue,Wed,Thu,Fri,Sat,Sun
      workHours:
        includedHours: "2-3"      # Run between 2 AM and 3 AM

  # Execution policy
  executionType: kubernetes
  concurrencyPolicy: Forbid       # Forbid, Allow, Replace

  # ChaosEngine template
  engineTemplateSpec:
    appinfo:
      appns: production
      applabel: app=critical-service
      appkind: deployment
    engineState: active
    chaosServiceAccount: litmus-admin
    experiments:
      - name: pod-delete
        spec:
          probe:
            - name: health-check
              type: httpProbe
              mode: Continuous
              httpProbe/inputs:
                url: http://critical-service.production.svc:8080/health
                method:
                  get:
                    criteria: ==
                    responseCode: "200"
              runProperties:
                probeTimeout: 10s
                interval: 5s
                retry: 3
          components:
            env:
              - name: TOTAL_CHAOS_DURATION
                value: "300"
              - name: PODS_AFFECTED_PERC
                value: "30"
```

### Using Kubernetes CronJob with Litmus

```yaml
# CronJob that triggers chaos experiments
apiVersion: batch/v1
kind: CronJob
metadata:
  name: chaos-scheduler
  namespace: litmus
spec:
  # Run daily at 3 AM
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: litmus-admin
          containers:
            - name: chaos-trigger
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Apply the chaos engine
                  kubectl apply -f - <<EOF
                  apiVersion: litmuschaos.io/v1alpha1
                  kind: ChaosEngine
                  metadata:
                    name: daily-chaos-$(date +%Y%m%d)
                    namespace: production
                  spec:
                    appinfo:
                      appns: production
                      applabel: app=api-service
                      appkind: deployment
                    engineState: active
                    chaosServiceAccount: litmus-admin
                    experiments:
                      - name: pod-delete
                        spec:
                          components:
                            env:
                              - name: TOTAL_CHAOS_DURATION
                                value: "180"
                              - name: PODS_AFFECTED_PERC
                                value: "25"
                  EOF

                  # Wait for experiment to complete
                  sleep 300

                  # Check results
                  kubectl get chaosresult -n production
          restartPolicy: OnFailure
```

### Argo Workflows Integration

```yaml
# Argo Workflow for complex chaos scenarios
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: chaos-test-suite-
  namespace: litmus
spec:
  entrypoint: chaos-suite
  templates:
    - name: chaos-suite
      steps:
        # Step 1: Run pod delete chaos
        - - name: pod-delete-test
            template: run-chaos
            arguments:
              parameters:
                - name: experiment
                  value: pod-delete
                - name: duration
                  value: "120"

        # Step 2: Run network chaos (after pod delete completes)
        - - name: network-latency-test
            template: run-chaos
            arguments:
              parameters:
                - name: experiment
                  value: pod-network-latency
                - name: duration
                  value: "180"

        # Step 3: Validate overall system health
        - - name: final-validation
            template: validate-health

    - name: run-chaos
      inputs:
        parameters:
          - name: experiment
          - name: duration
      resource:
        action: create
        manifest: |
          apiVersion: litmuschaos.io/v1alpha1
          kind: ChaosEngine
          metadata:
            generateName: "{{inputs.parameters.experiment}}-"
            namespace: production
          spec:
            appinfo:
              appns: production
              applabel: app=target-app
              appkind: deployment
            engineState: active
            chaosServiceAccount: litmus-admin
            experiments:
              - name: "{{inputs.parameters.experiment}}"
                spec:
                  components:
                    env:
                      - name: TOTAL_CHAOS_DURATION
                        value: "{{inputs.parameters.duration}}"

    - name: validate-health
      container:
        image: curlimages/curl:latest
        command: ["/bin/sh", "-c"]
        args:
          - |
            # Check all critical endpoints
            curl -f http://api-service.production.svc:8080/health || exit 1
            curl -f http://web-app.production.svc:80/health || exit 1
            echo "All health checks passed"
```

## Observability Integration

Integrating Litmus with your observability stack helps you understand the impact of chaos experiments and correlate failures.

### Prometheus Metrics

Litmus exposes metrics that can be scraped by Prometheus.

```yaml
# ServiceMonitor for Litmus metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: litmus-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: chaos-exporter
  namespaceSelector:
    matchNames:
      - litmus
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Grafana Dashboard Queries

```promql
# Active chaos experiments
sum(litmuschaos_experiment_running_status)

# Experiment success rate
sum(litmuschaos_experiment_verdict{verdict="Pass"}) /
sum(litmuschaos_experiment_verdict) * 100

# Average experiment duration
avg(litmuschaos_experiment_duration_seconds)

# Failed probes by experiment
sum by (experiment_name) (litmuschaos_probe_status{status="Failed"})
```

### Alerting on Chaos Experiment Failures

```yaml
# PrometheusRule for chaos experiment alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: litmus-chaos-alerts
  namespace: monitoring
spec:
  groups:
    - name: chaos-experiments
      rules:
        # Alert when a chaos experiment fails
        - alert: ChaosExperimentFailed
          expr: |
            litmuschaos_experiment_verdict{verdict="Fail"} == 1
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Chaos experiment failed"
            description: |
              Experiment {{ $labels.experiment_name }} in namespace
              {{ $labels.namespace }} has failed. This indicates a
              potential resilience issue.

        # Alert when probe validation fails
        - alert: ChaosProbeValidationFailed
          expr: |
            litmuschaos_probe_status{status="Failed"} == 1
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Chaos probe validation failed"
            description: |
              Probe {{ $labels.probe_name }} for experiment
              {{ $labels.experiment_name }} failed. SLO violation detected.
```

### OpenTelemetry Integration

```yaml
# Configure Litmus to export traces
apiVersion: v1
kind: ConfigMap
metadata:
  name: litmus-otel-config
  namespace: litmus
data:
  config.yaml: |
    exporters:
      otlp:
        endpoint: "otel-collector.observability.svc:4317"
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          exporters: [otlp]
```

### Logging Integration

```yaml
# Fluent Bit configuration for Litmus logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-litmus
  namespace: logging
data:
  litmus.conf: |
    [INPUT]
        Name              tail
        Tag               litmus.*
        Path              /var/log/containers/*litmus*.log
        Parser            docker
        Refresh_Interval  5
        Mem_Buf_Limit     5MB

    [FILTER]
        Name              kubernetes
        Match             litmus.*
        Kube_URL          https://kubernetes.default.svc:443
        Kube_Tag_Prefix   litmus.var.log.containers.
        Merge_Log         On
        Keep_Log          Off

    [OUTPUT]
        Name              forward
        Match             litmus.*
        Host              fluentd.logging.svc
        Port              24224
```

## Best Practices Summary

### Experiment Design

1. **Start small** - Begin with non-destructive experiments like network latency before trying pod deletion or node failures.

2. **Define clear hypotheses** - Every experiment should test a specific assumption about system behavior.

3. **Use probes extensively** - Probes validate that your system maintains expected behavior during chaos.

4. **Test in lower environments first** - Run experiments in staging before production.

5. **Limit blast radius** - Use `PODS_AFFECTED_PERC` and specific pod selectors to control impact.

### Operational Excellence

1. **Schedule during low traffic** - Run chaos experiments during maintenance windows or low-traffic periods.

2. **Have rollback procedures** - Know how to stop experiments and recover quickly.

3. **Communicate with stakeholders** - Notify teams before running chaos in shared environments.

4. **Document findings** - Record what you learn from each experiment.

5. **Iterate and expand** - Gradually increase experiment complexity as confidence grows.

### Security Considerations

1. **Use RBAC** - Create dedicated service accounts with minimal permissions.

2. **Namespace isolation** - Run chaos operators in isolated namespaces.

3. **Audit logging** - Enable audit logs to track who ran what experiments.

4. **Network policies** - Restrict chaos operator network access.

### Integration

1. **CI/CD pipelines** - Include chaos tests in deployment pipelines.

2. **Observability** - Integrate with Prometheus, Grafana, and alerting systems.

3. **Incident management** - Link chaos findings to incident postmortems.

4. **SLO tracking** - Validate SLOs are maintained during chaos experiments.

---

Chaos engineering is essential for building truly resilient systems. Litmus makes it accessible by providing a Kubernetes-native, declarative approach to chaos experiments. Start with simple pod deletion tests, add probes to validate your hypotheses, and gradually expand to more complex scenarios.

For comprehensive monitoring of your chaos experiments and overall system health, check out [OneUptime](https://oneuptime.com) - an open-source observability platform that helps you monitor, debug, and maintain reliable systems.
