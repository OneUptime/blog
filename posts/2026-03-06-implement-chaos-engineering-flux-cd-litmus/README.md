# How to Implement Chaos Engineering with Flux CD and Litmus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Chaos Engineering, Litmus, Kubernetes, GitOps, Resilience, Best Practice

Description: A practical guide to integrating LitmusChaos with Flux CD for automated chaos engineering experiments in your GitOps pipeline.

---

## Introduction

Chaos engineering is the practice of deliberately introducing failures into a system to test its resilience. When combined with GitOps through Flux CD, chaos experiments become reproducible, version-controlled, and automated. LitmusChaos is a CNCF project that provides a framework for running chaos experiments on Kubernetes.

This guide walks you through setting up LitmusChaos with Flux CD so that chaos experiments are managed declaratively alongside your application deployments.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.16+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux
- kubectl access to your cluster

## Installing LitmusChaos via Flux

The first step is to deploy LitmusChaos using Flux HelmRelease resources.

### Add the Litmus Helm Repository

Create a HelmRepository source for LitmusChaos:

```yaml
# clusters/my-cluster/litmus/helm-repository.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: litmuschaos
  namespace: flux-system
spec:
  interval: 1h
  url: https://litmuschaos.github.io/litmus-helm/
```

### Deploy Litmus Control Plane

Create a HelmRelease to install the Litmus control plane:

```yaml
# clusters/my-cluster/litmus/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: litmus
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: litmus
  chart:
    spec:
      chart: litmus
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: litmuschaos
        namespace: flux-system
  install:
    createNamespace: true
  values:
    # Enable the portal for experiment management
    portal:
      frontend:
        replicas: 1
      server:
        replicas: 1
    # Configure MongoDB for experiment storage
    mongodb:
      persistence:
        enabled: true
        storageClass: standard
        accessModes:
          - ReadWriteOnce
        size: 20Gi
```

### Deploy Chaos Infrastructure

The ChaosCenter infrastructure components connect your cluster to the Litmus control plane:

```yaml
# clusters/my-cluster/litmus/chaos-agent.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: litmus-agent
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: litmus
  dependsOn:
    # Ensure Litmus control plane is ready first
    - name: litmus
      namespace: flux-system
  chart:
    spec:
      chart: litmus-agent
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: litmuschaos
        namespace: flux-system
  values:
    # Name for this infrastructure as shown in ChaosCenter
    INFRA_NAME: production-agent
    # Connect to the local Litmus control plane
    LITMUS_URL: "http://litmus-frontend-service.litmus.svc.cluster.local:9091"
    LITMUS_BACKEND_URL: "http://litmus-server-service.litmus.svc.cluster.local:9002"
    LITMUS_USERNAME: "admin"
    LITMUS_PASSWORD: "litmus"
    global:
      INFRA_MODE: "cluster"
```

## Defining Chaos Experiments as GitOps Resources

### Pod Delete Experiment

This experiment randomly deletes pods to test self-healing:

```yaml
# chaos-experiments/pod-delete.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosExperiment
metadata:
  name: pod-delete
  namespace: default
spec:
  definition:
    scope: Namespaced
    permissions:
      - apiGroups: ["", "apps", "apps.openshift.io", "argoproj.io", "batch", "litmuschaos.io"]
        resources: ["deployments", "jobs", "pods", "pods/log", "replicationcontrollers", "statefulsets", "daemonsets", "replicasets", "deploymentconfigs", "rollouts", "pods/exec", "events", "chaosengines", "chaosexperiments", "chaosresults"]
        verbs: ["create", "list", "get", "patch", "update", "delete", "deletecollection"]
    image: "litmuschaos/go-runner:latest"
    imagePullPolicy: Always
    command:
      - /bin/bash
    # Arguments for the chaos experiment
    args:
      - -c
      - ./experiments -name pod-delete
    env:
      # Total duration of the chaos experiment
      - name: TOTAL_CHAOS_DURATION
        value: "30"
      # Interval between successive pod deletions
      - name: CHAOS_INTERVAL
        value: "10"
      # Force delete pods without grace period
      - name: FORCE
        value: "false"
```

### Pod Network Latency Experiment

Inject network latency to test timeout handling:

```yaml
# chaos-experiments/pod-network-latency.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosExperiment
metadata:
  name: pod-network-latency
  namespace: default
spec:
  definition:
    scope: Namespaced
    permissions:
      - apiGroups: ["", "apps", "apps.openshift.io", "argoproj.io", "batch", "litmuschaos.io"]
        resources: ["deployments", "jobs", "pods", "pods/log", "replicationcontrollers", "statefulsets", "daemonsets", "replicasets", "deploymentconfigs", "rollouts", "pods/exec", "events", "chaosengines", "chaosexperiments", "chaosresults"]
        verbs: ["create", "list", "get", "patch", "update", "delete", "deletecollection"]
    image: "litmuschaos/go-runner:latest"
    imagePullPolicy: Always
    command:
      - /bin/bash
    args:
      - -c
      - ./experiments -name pod-network-latency
    env:
      # Latency to inject in milliseconds
      - name: NETWORK_LATENCY
        value: "200"
      # Duration of the chaos
      - name: TOTAL_CHAOS_DURATION
        value: "60"
      # Container runtime (containerd, crio, docker)
      - name: CONTAINER_RUNTIME
        value: "containerd"
      # Socket path for the container runtime
      - name: SOCKET_PATH
        value: "/run/containerd/containerd.sock"
```

## Creating a Chaos Engine

The ChaosEngine ties experiments to target applications:

```yaml
# chaos-experiments/chaos-engine.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: app-chaos
  namespace: default
spec:
  # Set to active to start, stop to halt
  engineState: "active"
  # Target application details
  appinfo:
    appns: "default"
    applabel: "app=my-web-app"
    appkind: "deployment"
  # Service account used by the chaos runner and experiment jobs
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            # Override default chaos duration
            - name: TOTAL_CHAOS_DURATION
              value: "60"
            # Percentage of pods to target
            - name: PODS_AFFECTED_PERC
              value: "50"
        # Define pass/fail criteria
        probe:
          - name: "check-app-health"
            type: "httpProbe"
            httpProbe/inputs:
              # Health endpoint to verify during chaos
              url: "http://my-web-app.default.svc:8080/health"
              method:
                get:
                  criteria: "=="
                  responseCode: "200"
            mode: "Continuous"
            runProperties:
              # Check every 5 seconds during chaos
              probeTimeout: 5
              interval: 5
              retry: 3
```

## Automating Chaos with Flux Kustomization

Organize your chaos experiments to run after deployments:

```yaml
# clusters/my-cluster/chaos-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: chaos-experiments
  namespace: flux-system
spec:
  interval: 10m
  # Only run chaos after the app is deployed
  dependsOn:
    - name: my-web-app
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./chaos-experiments
  prune: true
  # Health checks to validate chaos results
  healthChecks:
    - apiVersion: litmuschaos.io/v1alpha1
      kind: ChaosResult
      name: app-chaos-pod-delete
      namespace: default
  healthCheckExprs:
    - apiVersion: litmuschaos.io/v1alpha1
      kind: ChaosResult
      failed: status.experimentStatus.verdict in ['Fail', 'Stopped']
      current: status.experimentStatus.verdict == 'Pass'
  # Timeout for chaos experiments to complete
  timeout: 10m
```

## Scheduled Chaos with CronWorkflows

Run chaos experiments on a schedule using an Argo CronWorkflow:

```yaml
# chaos-experiments/scheduled-chaos.yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: weekly-pod-chaos
  namespace: litmus
spec:
  # Run every Wednesday at 2 AM UTC
  schedule: "0 2 * * 3"
  timezone: UTC
  concurrencyPolicy: Forbid
  workflowSpec:
    entrypoint: pod-chaos
    serviceAccountName: argo-chaos
    arguments:
      parameters:
        - name: adminModeNamespace
          value: default
    templates:
      - name: pod-chaos
        inputs:
          artifacts:
            - name: chaos-engine
              path: /tmp/chaosengine.yaml
              raw:
                data: |
                  apiVersion: litmuschaos.io/v1alpha1
                  kind: ChaosEngine
                  metadata:
                    generateName: weekly-pod-chaos-
                    namespace: "{{workflow.parameters.adminModeNamespace}}"
                  spec:
                    engineState: "active"
                    appinfo:
                      appns: "default"
                      applabel: "app=my-web-app"
                      appkind: "deployment"
                    chaosServiceAccount: litmus-admin
                    experiments:
                      - name: pod-delete
                        spec:
                          components:
                            env:
                              - name: TOTAL_CHAOS_DURATION
                                value: "120"
                              - name: PODS_AFFECTED_PERC
                                value: "30"
        container:
          image: litmuschaos/litmus-checker:latest
          args:
            - -file=/tmp/chaosengine.yaml
            - -saveName=/tmp/engine-name
```

## Setting Up RBAC for Chaos Experiments

Proper RBAC is critical for running chaos safely:

```yaml
# chaos-experiments/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: litmus-admin
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: litmus-admin
  namespace: default
rules:
  # Permissions to manage pods for chaos
  - apiGroups: [""]
    resources: ["pods", "pods/exec", "pods/log"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete", "deletecollection"]
  # Permissions to read ConfigMaps and replication controllers
  - apiGroups: [""]
    resources: ["configmaps", "replicationcontrollers"]
    verbs: ["get", "list", "watch"]
  # Permissions to create and monitor experiment jobs
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch", "create", "delete", "deletecollection"]
  # Permissions to read deployments
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]
  # Permissions to read OpenShift DeploymentConfigs and Argo Rollouts when used
  - apiGroups: ["apps.openshift.io"]
    resources: ["deploymentconfigs"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["argoproj.io"]
    resources: ["rollouts"]
    verbs: ["get", "list", "watch"]
  # Permissions to manage chaos resources
  - apiGroups: ["litmuschaos.io"]
    resources: ["chaosengines", "chaosexperiments", "chaosresults"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Permissions to emit events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "get", "list", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: litmus-admin
  namespace: default
subjects:
  - kind: ServiceAccount
    name: litmus-admin
    namespace: default
roleRef:
  kind: Role
  name: litmus-admin
  apiGroup: rbac.authorization.k8s.io
```

## Monitoring Chaos Results

### Check Chaos Results via kubectl

```bash
# View chaos experiment results
kubectl get chaosresults -n default

# Get detailed result for a specific experiment
kubectl describe chaosresult app-chaos-pod-delete -n default
```

### Create an Alert for Chaos Failures

Use Flux's notification system to alert on chaos failures:

```yaml
# clusters/my-cluster/litmus/chaos-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: chaos-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: chaos-experiments
      namespace: flux-system
  summary: "Chaos experiment failed - application may not be resilient"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: chaos-alerts
  secretRef:
    name: slack-webhook-url
```

## Best Practices

### Start Small and Expand Gradually

Begin with simple experiments like pod deletion in non-production environments. As confidence grows, introduce more complex chaos such as network partitions and node failures.

### Always Define Steady-State Hypotheses

Before running any experiment, define what "normal" looks like. Use Litmus probes to validate that your application meets its SLOs during chaos.

### Use Blast Radius Controls

Limit the impact of chaos experiments:

- Target specific pods using labels
- Set `PODS_AFFECTED_PERC` to less than 100%
- Use short `TOTAL_CHAOS_DURATION` values initially
- Run experiments during low-traffic periods first

### Integrate with CI/CD Gates

Use Flux dependencies to ensure chaos experiments pass before promoting to production:

```yaml
# clusters/production/app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-app
  namespace: flux-system
spec:
  # Only deploy to production after staging chaos passes
  dependsOn:
    - name: staging-chaos-experiments
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./production/app
  prune: true
```

## Conclusion

Combining Flux CD with LitmusChaos gives you a fully GitOps-driven chaos engineering practice. Every experiment is version-controlled, peer-reviewed, and automatically executed. This approach ensures your applications are continuously validated for resilience while maintaining the auditability and reproducibility that GitOps provides.
