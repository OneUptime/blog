# How to Set Up Chaos Engineering with Litmus on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Litmus, Chaos-engineering, Resilience, Kubernetes

Description: A guide to setting up LitmusChaos on Rancher-managed Kubernetes clusters for chaos engineering experiments to improve application resilience.

## Overview

Chaos engineering is the practice of deliberately introducing failures into systems to test their resilience and identify weaknesses before they cause incidents. LitmusChaos is a CNCF-incubating chaos engineering platform for Kubernetes. This guide covers installing LitmusChaos on Rancher-managed clusters, running chaos experiments, and integrating chaos into CI/CD pipelines.

## What Is LitmusChaos?

LitmusChaos provides a catalog of chaos experiments (ChaosHub) including pod deletion, node drain, CPU stress, network packet loss, disk I/O saturation, and more. It uses Kubernetes CRDs (ChaosEngine, ChaosExperiment, ChaosResult) and provides a web UI (ChaosCenter) for managing experiments.

## Step 1: Install LitmusChaos

```bash
# Add LitmusChaos Helm repository

helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm repo update

# Install the Litmus execution plane
kubectl create namespace litmus

helm install litmus-core litmuschaos/litmus-core \
  --namespace litmus \
  --set operatorMode=admin \
  --set exporter.enabled=true \
  --set exporter.serviceMonitor.enabled=true \
  --set exporter.serviceMonitor.additionalLabels.release=rancher-monitoring

# Install ChaosCenter
helm install chaos litmuschaos/litmus \
  --namespace litmus \
  --set portal.frontend.service.type=LoadBalancer

# Get the ChaosCenter URL
kubectl get svc chaos-litmus-frontend-service -n litmus
```

## Step 2: Access ChaosCenter

```bash
# Default credentials
# Username: admin
# Password: litmus

# Change password immediately after first login
```

## Step 3: Install Chaos Experiments from ChaosHub

```bash
# Install the experiments used in the examples below into the same namespace as the ChaosEngine CRs
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=faults/kubernetes/pod-delete/fault.yaml -n litmus
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=faults/kubernetes/pod-cpu-hog/fault.yaml -n litmus
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=faults/kubernetes/node-drain/fault.yaml -n litmus
```

## Step 4: Create a ChaosEngine

A ChaosEngine defines the target application and the experiments to run:

### Pod Delete Experiment

```yaml
# Test application resilience to pod deletion
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: webapp-pod-delete-chaos
  namespace: litmus
spec:
  engineState: active
  annotationCheck: "false"
  appinfo:
    appns: production
    applabel: "app=webapp"
    appkind: deployment

  chaosServiceAccount: litmus-admin
  jobCleanUpPolicy: retain

  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"     # Run for 60 seconds
            - name: CHAOS_INTERVAL
              value: "10"     # Delete a pod every 10 seconds
            - name: FORCE
              value: "false"  # Graceful deletion
            - name: PODS_AFFECTED_PERC
              value: "50"    # Delete 50% of matching pods
```

### CPU Stress Experiment

```yaml
# Stress CPU on a pod to test resource limits and HPA
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: api-cpu-stress
  namespace: litmus
spec:
  engineState: active
  annotationCheck: "false"
  appinfo:
    appns: production
    applabel: "app=api-service"
    appkind: deployment

  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-cpu-hog
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "120"   # 2 minutes
            - name: CPU_CORES
              value: "2"     # Hog 2 CPU cores
            - name: PODS_AFFECTED_PERC
              value: "100"   # Affect all pods
```

### Node Drain Experiment

```yaml
# Test cluster behavior when a node is drained
# Cordon the target node before applying this ChaosEngine
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: node-drain-test
  namespace: litmus
spec:
  engineState: active
  chaosServiceAccount: litmus-admin

  experiments:
    - name: node-drain
      spec:
        components:
          env:
            - name: TARGET_NODE
              value: "worker-node-02"   # Target specific node
            - name: TOTAL_CHAOS_DURATION
              value: "60"
```

## Step 5: Monitor Chaos Experiments

```yaml
# PrometheusRule to track chaos experiment outcomes
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: chaos-monitoring
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: chaos-experiments
      rules:
        - alert: ChaosExperimentFailed
          expr: litmuschaos_experiment_verdict{chaosresult_verdict="Fail"} > 0
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: "Chaos experiment failed: {{ $labels.chaosengine_name }}"
```

## Step 6: Integrate Chaos into CI/CD

```yaml
# GitHub Actions: Run chaos experiments on staging
name: Chaos Engineering Tests
on:
  schedule:
    - cron: '0 2 * * *'   # Nightly chaos tests

jobs:
  chaos-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          echo "${{ secrets.STAGING_KUBECONFIG }}" | base64 -d > kubeconfig.yaml
          echo "KUBECONFIG=$PWD/kubeconfig.yaml" >> "$GITHUB_ENV"

      - name: Run pod delete chaos
        run: |
          kubectl apply -f chaos/pod-delete-engine.yaml
          kubectl wait --for=jsonpath='{.status.engineStatus}'=completed \
            chaosengine/webapp-pod-delete-chaos \
            -n litmus \
            --timeout=300s

      - name: Check chaos result
        run: |
          VERDICT=$(kubectl get chaosresult \
            webapp-pod-delete-chaos-pod-delete \
            -n litmus \
            -o jsonpath='{.status.experimentStatus.verdict}')

          if [ "${VERDICT}" != "Pass" ]; then
            echo "FAIL: Chaos test failed with verdict: ${VERDICT}"
            exit 1
          fi
          echo "PASS: Application survived pod deletion chaos"

      - name: Cleanup
        if: always()
        run: kubectl delete chaosengine webapp-pod-delete-chaos -n litmus
```

## Step 7: Define SLOs for Chaos Tests

```yaml
# ProbeConfiguration: Define success criteria for chaos experiments
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: webapp-with-probes
  namespace: litmus
spec:
  engineState: active
  annotationCheck: "false"
  appinfo:
    appns: production
    applabel: "app=webapp"
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        probe:
          # HTTP probe: Check API returns 200 during chaos
          - name: api-health-check
            type: httpProbe
            httpProbe/inputs:
              url: "http://webapp.production.svc/health"
              insecureSkipVerify: false
              responseTimeout: 5000
              method:
                get:
                  criteria: "=="
                  responseCode: "200"
            mode: Continuous
            runProperties:
              probeTimeout: 5
              interval: 5
              retry: 3

          # Prometheus probe: Verify error rate stays below 1%
          - name: error-rate-probe
            type: promProbe
            promProbe/inputs:
              endpoint: http://<your-prometheus-service>.cattle-monitoring-system.svc:9090
              query: |
                sum(rate(http_requests_total{status=~"5.."}[1m])) /
                sum(rate(http_requests_total[1m]))
              comparator:
                criteria: "<"
                value: "0.01"    # Error rate must stay below 1%
            mode: Edge
            runProperties:
              probeTimeout: 5
              interval: 5
              retry: 1
```

## Conclusion

LitmusChaos on Rancher provides a powerful platform for testing application resilience through controlled chaos experiments. Starting with simple pod deletion tests and progressing to node drain and network partition experiments helps uncover hidden failure modes. Integrating chaos experiments into your CI/CD pipeline with automated pass/fail verdicts ensures that resilience is maintained as applications evolve. Always start chaos experiments in staging environments and work up to production with careful monitoring and clear rollback procedures.
