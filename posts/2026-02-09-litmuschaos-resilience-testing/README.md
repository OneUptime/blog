# How to Configure LitmusChaos Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, LitmusChaos, Chaos Engineering, Testing, Resilience

Description: Learn how to set up LitmusChaos workflows that automate resilience testing for Kubernetes applications with predefined experiments, success criteria, and continuous validation.

---

LitmusChaos brings cloud-native chaos engineering to Kubernetes with a focus on automated resilience testing workflows. Unlike ad-hoc chaos experiments, LitmusChaos workflows define complete test scenarios with hypothesis validation, rollback procedures, and success metrics that execute automatically.

In this guide, we'll configure LitmusChaos workflows that continuously validate application resilience through automated chaos experiments. This approach integrates chaos engineering into your development workflow, catching resilience issues before they reach production.

## Understanding LitmusChaos Workflows

LitmusChaos uses ChaosEngine resources to define individual chaos experiments and Workflow resources (built on Argo Workflows) to orchestrate complex testing scenarios. Workflows combine multiple experiments with conditional logic, parallel execution, and automated validation.

The LitmusChaos architecture includes a control plane that manages experiment execution, chaos operator that injects faults into target applications, and chaos exporter that exposes metrics about experiment results. These components work together to provide automated, repeatable resilience testing.

Workflows define steady-state validation steps that check application health before and after chaos, allowing you to verify that applications recover correctly. This hypothesis-driven approach ensures chaos experiments produce actionable insights rather than just breaking things.

## Installing LitmusChaos

Deploy LitmusChaos using the official Helm chart:

```bash
# Add the LitmusChaos Helm repository
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm repo update

# Install Litmus ChaosCenter and the execution components
kubectl create namespace litmus --dry-run=client -o yaml | kubectl apply -f -
helm install chaos litmuschaos/litmus --namespace litmus

# Verify installation
kubectl get pods -n litmus

# Install Kubernetes chaos experiments from ChaosHub into the target namespace
kubectl apply -n default -f "https://hub.litmuschaos.io/api/chaos/3.28.0?file=faults/kubernetes/experiments.yaml"
```

Access the Litmus portal for visualization:

```bash
# Access portal
kubectl port-forward -n litmus svc/chaos-litmus-frontend-service 9091:9091
```

## Creating Service Accounts for Chaos

Create RBAC resources that allow chaos experiments to interact with your applications:

```yaml
# chaos-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: chaos-runner
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: chaos-runner
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "deletecollection"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "get", "list", "patch", "update"]
- apiGroups: [""]
  resources: ["configmaps", "services", "endpoints"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["get", "list", "create"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
  verbs: ["get", "list"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["create", "list", "get", "delete", "deletecollection"]
- apiGroups: ["litmuschaos.io"]
  resources: ["chaosengines", "chaosexperiments", "chaosresults"]
  verbs: ["create", "list", "get", "patch", "delete", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: chaos-runner
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: chaos-runner
subjects:
- kind: ServiceAccount
  name: chaos-runner
  namespace: default
```

Apply RBAC configuration:

```bash
kubectl apply -f chaos-rbac.yaml
```

## Deploying a Test Application

Create an application to test chaos workflows against:

```yaml
# demo-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: default
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
```

Deploy the application:

```bash
kubectl apply -f demo-app.yaml

# Verify deployment
kubectl get pods -l app=nginx
```

## Creating a Basic ChaosEngine

Define a ChaosEngine that runs a pod delete experiment:

```yaml
# pod-delete-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: nginx-chaos
  namespace: default
spec:
  # Start the chaos run and skip the application annotation prerequisite
  engineState: active
  annotationCheck: "false"

  # Application to target
  appinfo:
    appns: default
    applabel: "app=nginx"
    appkind: deployment

  # Service account for chaos
  chaosServiceAccount: chaos-runner

  # Enable monitoring
  monitoring: true

  # Job cleanup policy
  jobCleanUpPolicy: delete

  # List of experiments to run
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
          # Total chaos duration
          - name: TOTAL_CHAOS_DURATION
            value: "30"

          # Interval between chaos
          - name: CHAOS_INTERVAL
            value: "10"

          # Number of pods to delete
          - name: PODS_AFFECTED_PERC
            value: "50"

          # Force delete pods
          - name: FORCE
            value: "false"

      # Probe to validate steady state
      probe:
      - name: check-nginx-availability
        type: httpProbe
        mode: Continuous
        httpProbe/inputs:
          url: http://nginx-service.default.svc.cluster.local
          method:
            get:
              criteria: ==
              responseCode: "200"
        runProperties:
          probeTimeout: 5
          interval: 2
          retry: 3
          probePollingInterval: 2
```

This experiment deletes 50% of nginx pods every 10 seconds for 30 seconds, while continuously checking that the service remains available.

Apply the chaos engine:

```bash
kubectl apply -f pod-delete-chaos.yaml

# Watch experiment execution
kubectl get chaosengine nginx-chaos -w

# Check experiment result
kubectl get chaosresult nginx-chaos-pod-delete -o yaml
```

## Building Automated Resilience Workflows

Create a workflow that runs multiple experiments sequentially:

```yaml
# resilience-workflow.yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: resilience-validation
  namespace: default
spec:
  entrypoint: chaos-workflow
  serviceAccountName: chaos-runner

  templates:
  # Main workflow
  - name: chaos-workflow
    steps:
    # Step 1: Baseline check
    - - name: baseline-check
        template: health-check

    # Step 2: Pod delete chaos
    - - name: pod-delete-experiment
        template: pod-delete-chaos
    - - name: check-pod-delete-result
        template: check-chaos-result
        arguments:
          parameters:
          - name: engine_name
            value: pod-delete-chaos-{{workflow.name}}
          - name: experiment_name
            value: pod-delete

    # Step 3: Verify recovery
    - - name: recovery-check
        template: health-check

    # Step 4: Network delay chaos
    - - name: network-delay-experiment
        template: network-delay-chaos
    - - name: check-network-delay-result
        template: check-chaos-result
        arguments:
          parameters:
          - name: engine_name
            value: network-delay-chaos-{{workflow.name}}
          - name: experiment_name
            value: pod-network-latency

    # Step 5: Final validation
    - - name: final-check
        template: health-check

  # Health check template
  - name: health-check
    container:
      image: curlimages/curl:latest
      command: [sh, -c]
      args:
        - |
          echo "Checking application health..."
          response=$(curl -s -o /dev/null -w "%{http_code}" http://nginx-service.default.svc.cluster.local)

          if [ "$response" != "200" ]; then
            echo "Health check failed with status: $response"
            exit 1
          fi

          echo "Health check passed"

  # Chaos result check template
  - name: check-chaos-result
    inputs:
      parameters:
      - name: engine_name
      - name: experiment_name
    container:
      image: bitnami/kubectl:latest
      command: [sh, -c]
      args:
        - |
          result_name="{{inputs.parameters.engine_name}}-{{inputs.parameters.experiment_name}}"
          verdict=$(kubectl get chaosresult "$result_name" -n default -o jsonpath='{.status.experimentStatus.verdict}')

          if [ "$verdict" != "Pass" ]; then
            echo "Chaos result $result_name failed with verdict: $verdict"
            exit 1
          fi

          echo "Chaos result $result_name passed"

  # Pod delete chaos template
  - name: pod-delete-chaos
    resource:
      action: create
      successCondition: status.engineStatus == completed
      failureCondition: status.engineStatus == stopped
      manifest: |
        apiVersion: litmuschaos.io/v1alpha1
        kind: ChaosEngine
        metadata:
          name: pod-delete-chaos-{{workflow.name}}
          namespace: default
        spec:
          engineState: active
          annotationCheck: "false"
          appinfo:
            appns: default
            applabel: "app=nginx"
            appkind: deployment
          chaosServiceAccount: chaos-runner
          experiments:
          - name: pod-delete
            spec:
              components:
                env:
                - name: TOTAL_CHAOS_DURATION
                  value: "30"
                - name: PODS_AFFECTED_PERC
                  value: "33"

  # Network delay chaos template
  - name: network-delay-chaos
    resource:
      action: create
      successCondition: status.engineStatus == completed
      failureCondition: status.engineStatus == stopped
      manifest: |
        apiVersion: litmuschaos.io/v1alpha1
        kind: ChaosEngine
        metadata:
          name: network-delay-chaos-{{workflow.name}}
          namespace: default
        spec:
          engineState: active
          annotationCheck: "false"
          appinfo:
            appns: default
            applabel: "app=nginx"
            appkind: deployment
          chaosServiceAccount: chaos-runner
          experiments:
          - name: pod-network-latency
            spec:
              components:
                env:
                - name: TOTAL_CHAOS_DURATION
                  value: "60"
                - name: NETWORK_LATENCY
                  value: "2000"
                - name: PODS_AFFECTED_PERC
                  value: "50"
```

Run the workflow:

```bash
kubectl apply -f resilience-workflow.yaml

# Monitor workflow progress
kubectl get workflow resilience-validation -w

# View workflow logs
kubectl logs -l workflows.argoproj.io/workflow=resilience-validation
```

## Implementing Steady-State Hypothesis Testing

Add probes that validate your hypothesis about application behavior:

```yaml
# hypothesis-driven-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: hypothesis-test
  namespace: default
spec:
  engineState: active
  annotationCheck: "false"
  appinfo:
    appns: default
    applabel: "app=nginx"
    appkind: deployment
  chaosServiceAccount: chaos-runner

  experiments:
  - name: pod-delete
    spec:
      probe:
      # Probe 1: Service must remain available
      - name: service-availability-probe
        type: httpProbe
        mode: Continuous
        httpProbe/inputs:
          url: http://nginx-service.default.svc.cluster.local
          method:
            get:
              criteria: ==
              responseCode: "200"
        runProperties:
          probeTimeout: 5
          interval: 1
          retry: 3

      # Probe 2: Response time must stay under 500ms
      - name: response-time-probe
        type: cmdProbe
        mode: Edge
        cmdProbe/inputs:
          command: curl -w '%{time_total}' -o /dev/null -s http://nginx-service.default.svc.cluster.local
          comparator:
            type: float
            criteria: <
            value: "0.5"
        runProperties:
          probeTimeout: 5
          interval: 2
          retry: 2

      # Probe 3: At least 2 pods must be running
      - name: pod-count-probe
        type: k8sProbe
        mode: Continuous
        k8sProbe/inputs:
          group: ""
          version: v1
          resource: pods
          namespace: default
          fieldSelector: status.phase=Running
          labelSelector: app=nginx
          operation: present
        runProperties:
          probeTimeout: 5
          interval: 2
```

## Creating Scheduled Chaos Workflows

Run chaos experiments on a schedule using CronWorkflow:

```yaml
# scheduled-chaos.yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: scheduled-resilience-test
  namespace: default
spec:
  # Run every day at 2 AM
  schedule: "0 2 * * *"

  # Keep last 3 workflow runs
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3

  workflowSpec:
    entrypoint: chaos-test
    serviceAccountName: chaos-runner

    templates:
    - name: chaos-test
      steps:
      # Morning resilience check
      - - name: pod-failure-test
          template: pod-delete-experiment
      - - name: check-pod-failure-result
          template: check-chaos-result
          arguments:
            parameters:
            - name: engine_name
              value: scheduled-pod-delete-{{workflow.name}}
            - name: experiment_name
              value: pod-delete

      - - name: network-chaos-test
          template: network-delay-experiment
      - - name: check-network-chaos-result
          template: check-chaos-result
          arguments:
            parameters:
            - name: engine_name
              value: scheduled-network-delay-{{workflow.name}}
            - name: experiment_name
              value: pod-network-latency

    - name: check-chaos-result
      inputs:
        parameters:
        - name: engine_name
        - name: experiment_name
      container:
        image: bitnami/kubectl:latest
        command: [sh, -c]
        args:
          - |
            result_name="{{inputs.parameters.engine_name}}-{{inputs.parameters.experiment_name}}"
            verdict=$(kubectl get chaosresult "$result_name" -n default -o jsonpath='{.status.experimentStatus.verdict}')

            if [ "$verdict" != "Pass" ]; then
              echo "Chaos result $result_name failed with verdict: $verdict"
              exit 1
            fi

            echo "Chaos result $result_name passed"

    - name: pod-delete-experiment
      resource:
        action: create
        successCondition: status.engineStatus == completed
        failureCondition: status.engineStatus == stopped
        manifest: |
          apiVersion: litmuschaos.io/v1alpha1
          kind: ChaosEngine
          metadata:
            name: scheduled-pod-delete-{{workflow.name}}
            namespace: default
          spec:
            engineState: active
            annotationCheck: "false"
            appinfo:
              appns: default
              applabel: "app=nginx"
              appkind: deployment
            chaosServiceAccount: chaos-runner
            experiments:
            - name: pod-delete
              spec:
                components:
                  env:
                  - name: TOTAL_CHAOS_DURATION
                    value: "60"

    - name: network-delay-experiment
      resource:
        action: create
        successCondition: status.engineStatus == completed
        failureCondition: status.engineStatus == stopped
        manifest: |
          apiVersion: litmuschaos.io/v1alpha1
          kind: ChaosEngine
          metadata:
            name: scheduled-network-delay-{{workflow.name}}
            namespace: default
          spec:
            engineState: active
            annotationCheck: "false"
            appinfo:
              appns: default
              applabel: "app=nginx"
              appkind: deployment
            chaosServiceAccount: chaos-runner
            experiments:
            - name: pod-network-latency
              spec:
                components:
                  env:
                  - name: TOTAL_CHAOS_DURATION
                    value: "60"
                  - name: NETWORK_LATENCY
                    value: "1000"
```

## Monitoring Chaos Metrics

LitmusChaos exports metrics about experiment execution:

```bash
# Port forward chaos exporter
kubectl port-forward -n litmus svc/chaos-exporter 8080:8080

# View available metrics
curl http://localhost:8080/metrics | grep litmuschaos

# Key metrics:
# - litmuschaos_experiment_verdict (Pass/Fail)
# - litmuschaos_experiment_start_time
# - litmuschaos_experiment_end_time
# - litmuschaos_probe_success_percentage
```

Create Prometheus scrape config:

```yaml
# prometheus-chaos-scrape.yaml
scrape_configs:
- job_name: 'litmus-chaos'
  kubernetes_sd_configs:
  - role: service
    namespaces:
      names:
      - litmus
  relabel_configs:
  - source_labels: [__meta_kubernetes_service_label_app]
    regex: chaos-exporter
    action: keep
```

## Integrating with CI/CD Pipelines

Run chaos experiments as part of your deployment pipeline:

```yaml
# .github/workflows/chaos-test.yml
name: Resilience Testing

on:
  push:
    branches: [main]

jobs:
  chaos-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Deploy application
      run: |
        kubectl apply -f k8s/

    - name: Wait for deployment
      run: |
        kubectl wait --for=condition=available --timeout=300s deployment/nginx-deployment

    - name: Run chaos workflow
      run: |
        kubectl apply -f chaos/resilience-workflow.yaml

    - name: Wait for workflow completion
      run: |
        kubectl wait --for=jsonpath='{.status.phase}'=Succeeded --timeout=600s workflow/resilience-validation

    - name: Check workflow result
      run: |
        if kubectl get workflow resilience-validation -o jsonpath='{.status.phase}' | grep -q Succeeded; then
          echo "Resilience test passed"
          exit 0
        else
          echo "Resilience test failed"
          exit 1
        fi
```

## Conclusion

LitmusChaos workflows automate resilience testing by combining chaos experiments with hypothesis validation and continuous monitoring. This approach transforms chaos engineering from manual experimentation into a repeatable testing discipline that catches resilience issues early.

The workflow-based architecture enables complex testing scenarios that validate not just individual component resilience but also system-level recovery behavior. By running these workflows continuously, you maintain confidence that your applications handle failures gracefully.

For production adoption, start with simple experiments in non-production environments, gradually increase complexity as you validate success criteria, and integrate chaos workflows into CI/CD pipelines to make resilience testing a standard part of your release process.
