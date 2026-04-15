# How to Use Chaos Mesh with Dapr on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Chaos Mesh, Kubernetes, Chaos Engineering, Resilience

Description: Install Chaos Mesh on Kubernetes and inject network faults, pod failures, and latency into Dapr services to validate sidecar resiliency behavior.

---

## What is Chaos Mesh?

Chaos Mesh is a CNCF chaos engineering platform for Kubernetes that provides fine-grained fault injection through Kubernetes CRDs. It integrates naturally with Dapr-enabled pods, allowing you to target Dapr sidecars or app containers independently.

## Install Chaos Mesh

```bash
# Add Chaos Mesh Helm repository
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Install into chaos-testing namespace
kubectl create namespace chaos-testing
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-testing \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock

# Verify pods are running
kubectl get pods -n chaos-testing
```

## Inject Network Latency into a Dapr Service

Target the app container of your Dapr service with network delay:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: dapr-network-latency
  namespace: default
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: orderservice
  delay:
    latency: "500ms"
    correlation: "25"
    jitter: "100ms"
  direction: both
  duration: "2m"
```

Apply and monitor:

```bash
kubectl apply -f network-latency.yaml

# Watch Dapr sidecar retry logs
kubectl logs -l app=callerservice -c daprd -f | grep -i retry
```

## Kill Dapr Sidecar Pods with PodChaos

Inject pod failure targeting only the Dapr sidecar container:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: dapr-sidecar-kill
  namespace: default
spec:
  action: container-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: orderservice
  containerNames:
    - daprd
  duration: "30s"
```

```bash
kubectl apply -f sidecar-kill.yaml
```

## Inject CPU Stress on Dapr App

Simulate compute pressure to trigger timeout policies:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: dapr-app-cpu-stress
  namespace: default
spec:
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: orderservice
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: "3m"
  containerNames:
    - app
```

## Pause and Resume a Chaos Experiment

```bash
# Pause the experiment
kubectl annotate networkchaos dapr-network-latency \
  experiment.chaos-mesh.org/pause=true

# Resume the experiment
kubectl annotate networkchaos dapr-network-latency \
  experiment.chaos-mesh.org/pause-

# Delete the experiment to stop chaos
kubectl delete networkchaos dapr-network-latency
```

## Use Chaos Mesh Dashboard

```bash
# Port-forward the Chaos Mesh dashboard
kubectl port-forward -n chaos-testing svc/chaos-dashboard 2333:2333

# Access at http://localhost:2333
```

The dashboard provides a visual workflow editor, experiment history, and real-time event logs that correlate with Dapr metrics.

## Summary

Chaos Mesh integrates seamlessly with Dapr on Kubernetes, enabling precise fault injection into app containers or Dapr sidecars via Kubernetes CRDs. Using NetworkChaos, PodChaos, and StressChaos experiments against your Dapr services validates that retry and circuit breaker policies activate correctly under realistic failure scenarios.
