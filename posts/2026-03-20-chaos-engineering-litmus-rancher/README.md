# How to Set Up Chaos Engineering with Litmus on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Chaos Engineering, Litmus, Resilience, Kubernetes, Testing

Description: Set up chaos engineering with LitmusChaos on Rancher to test application and cluster resilience through pod kills, network failures, CPU stress, and node drains in controlled experiments.

## Introduction

Chaos engineering proactively tests how systems behave under failure conditions. Rather than discovering failures during incidents, chaos engineering deliberately introduces controlled failures to identify weaknesses before they impact users. LitmusChaos is a CNCF project that provides Kubernetes-native chaos experiments, integrating naturally with Rancher-managed clusters.

## Step 1: Install LitmusChaos

```bash
# Install Litmus core components via Helm

helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm repo update

helm install litmus litmuschaos/litmus-core \
  --namespace litmus \
  --create-namespace \
  --set operatorMode=admin

# Verify the chaos operator is running
kubectl get pods -n litmus
```

## Step 2: Install Chaos Experiments

```bash
# Install the Kubernetes chaos experiment chart
helm install k8s litmuschaos/kubernetes-chaos \
  --namespace litmus

# Verify experiments are available
kubectl get chaosexperiments -n litmus | head -20
```

## Step 3: Pod Delete Experiment

```yaml
# Test that application recovers from pod failures
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-delete-chaos
  namespace: litmus
spec:
  appinfo:
    appns: production
    applabel: "app=api-server"
    appkind: deployment
  annotationCheck: "false"
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        probe:
          # Verify application stays available during chaos
          - name: api-availability-probe
            type: httpProbe
            mode: Continuous
            runProperties:
              probeTimeout: 5
              interval: 2
              retry: 1
              probePollingInterval: 2
            httpProbe/inputs:
              url: "http://api-server.production.svc/health"
              insecureSkipVerify: false
              responseTimeout: 1000
              method:
                get:
                  criteria: ==
                  responseCode: "200"
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"        # 60 seconds of chaos
            - name: CHAOS_INTERVAL
              value: "10"        # Delete pod every 10 seconds
            - name: FORCE
              value: "false"     # Graceful termination
```

## Step 4: Network Chaos Experiments

```yaml
# Pod network latency - inject 200ms latency
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: network-latency-chaos
  namespace: litmus
spec:
  appinfo:
    appns: production
    applabel: "app=frontend"
    appkind: deployment
  annotationCheck: "false"
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-network-latency
      spec:
        probe:
          - name: latency-tolerance-probe
            type: cmdProbe
            mode: Edge
            cmdProbe/inputs:
              command: "kubectl get deployment frontend -n production -o jsonpath='{.status.availableReplicas}'"
              comparator:
                type: int
                criteria: ">="
                value: "2"
              source:
                image: "litmuschaos/k8s:latest"
            runProperties:
              probeTimeout: 5
              interval: 5
              retry: 1
              initialDelaySeconds: 5
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: NETWORK_LATENCY
              value: "200"     # 200ms latency
            - name: JITTER
              value: "20"      # ±20ms jitter
            - name: DESTINATION_HOSTS
              value: "backend-service.production.svc"
```

## Step 5: Node Drain Experiment

```yaml
# Cordon the target node before applying this engine so the runner pod is not evicted
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: node-drain-chaos
  namespace: litmus
spec:
  appinfo:
    appns: production
    applabel: "app=critical-service"
    appkind: deployment
  annotationCheck: "false"
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: node-drain
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: TARGET_NODE
              value: "worker-node-1"  # Replace with the cordoned worker node name
```

## Step 6: CPU Stress

```yaml
# Simulate CPU resource contention
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: cpu-stress-chaos
  namespace: litmus
spec:
  appinfo:
    appns: production
    applabel: "app=database"
    appkind: statefulset
  annotationCheck: "false"
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-cpu-hog
      spec:
        probe:
          - name: db-ready-replicas-probe
            type: cmdProbe
            mode: Continuous
            cmdProbe/inputs:
              command: "kubectl get statefulset database -n production -o jsonpath='{.status.readyReplicas}'"
              comparator:
                type: int
                criteria: ">="
                value: "1"
              source:
                image: "litmuschaos/k8s:latest"
            runProperties:
              probeTimeout: 5
              interval: 2
              retry: 1
              probePollingInterval: 2
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: CPU_CORES
              value: "2"       # Stress 2 CPU cores
            - name: CPU_LOAD
              value: "80"      # 80% CPU load
```

## Step 7: Chaos Workflow Integration

```yaml
# Run chaos experiments in CI/CD pipeline
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: chaos-test-suite
  namespace: litmus
spec:
  entrypoint: chaos-suite
  serviceAccountName: litmus-admin
  templates:
    - name: chaos-suite
      steps:
        - - name: pod-delete
            template: run-pod-delete
        - - name: network-latency
            template: run-network-latency
    - name: run-pod-delete
      inputs:
        artifacts:
          - name: engine
            path: /tmp/pod-delete-chaos.yaml
            raw:
              data: |
                apiVersion: litmuschaos.io/v1alpha1
                kind: ChaosEngine
                metadata:
                  name: pod-delete-chaos
                  namespace: litmus
                spec:
                  annotationCheck: "false"
                  appinfo:
                    appns: production
                    applabel: "app=api-server"
                    appkind: deployment
                  engineState: active
                  chaosServiceAccount: litmus-admin
                  experiments:
                    - name: pod-delete
      container:
        image: litmuschaos/litmus-checker:latest
        args:
          - "-file=/tmp/pod-delete-chaos.yaml"
          - "-saveName=/tmp/pod-delete-engine"
    - name: run-network-latency
      inputs:
        artifacts:
          - name: engine
            path: /tmp/network-latency-chaos.yaml
            raw:
              data: |
                apiVersion: litmuschaos.io/v1alpha1
                kind: ChaosEngine
                metadata:
                  name: network-latency-chaos
                  namespace: litmus
                spec:
                  annotationCheck: "false"
                  appinfo:
                    appns: production
                    applabel: "app=frontend"
                    appkind: deployment
                  engineState: active
                  chaosServiceAccount: litmus-admin
                  experiments:
                    - name: pod-network-latency
      container:
        image: litmuschaos/litmus-checker:latest
        args:
          - "-file=/tmp/network-latency-chaos.yaml"
          - "-saveName=/tmp/network-latency-engine"
```

## Conclusion

Chaos engineering with LitmusChaos on Rancher transforms disaster preparedness from reactive to proactive. Pod deletion, network latency injection, node drain, and resource stress experiments reveal weaknesses in application resilience, PodDisruptionBudgets, anti-affinity rules, and timeout configurations. Run chaos experiments regularly in staging environments, and for mature applications, introduce controlled chaos in production during low-traffic periods. The insights gained prevent real incidents and build team confidence in system resilience.
