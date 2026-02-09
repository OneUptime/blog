# How to Set Up Chaos Mesh Experiments for Kubernetes Pod Failure and Network Partition Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Chaos Engineering, Chaos Mesh, Testing, Resilience

Description: Learn how to configure and run Chaos Mesh experiments that test pod failure scenarios and network partitions to validate Kubernetes application resilience and recovery mechanisms.

---

Chaos engineering validates that your Kubernetes applications handle failures gracefully. Chaos Mesh provides a native Kubernetes approach to chaos experiments, allowing you to inject pod failures and network partitions declaratively using custom resources.

In this guide, we'll set up Chaos Mesh and create experiments that test application resilience through pod failures and network partition scenarios. These tests help identify weak points in your architecture before they cause production incidents.

## Understanding Chaos Mesh Architecture

Chaos Mesh runs as a set of controllers in your Kubernetes cluster that watch for chaos experiment resources. When you create a chaos experiment, Chaos Mesh controllers inject the specified fault into targeted pods using various mechanisms depending on the chaos type.

For pod failures, Chaos Mesh terminates pods directly through the Kubernetes API. For network chaos, it uses iptables rules or tc (traffic control) to manipulate network behavior at the kernel level. This approach requires no modification to application code or container images.

Chaos experiments are defined as Kubernetes custom resources with selectors that target specific pods, duration settings that control how long the chaos runs, and scheduler specifications for recurring experiments.

## Installing Chaos Mesh

Deploy Chaos Mesh using Helm for the easiest installation:

```bash
# Add Chaos Mesh repository
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Create namespace
kubectl create namespace chaos-mesh

# Install Chaos Mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set dashboard.create=true \
  --set dashboard.securityMode=false
```

Verify the installation:

```bash
# Check Chaos Mesh components
kubectl get pods -n chaos-mesh

# Expected components:
# - chaos-controller-manager
# - chaos-daemon (DaemonSet)
# - chaos-dashboard
```

Access the Chaos Mesh dashboard:

```bash
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333

# Open browser to http://localhost:2333
```

## Creating a Test Application

Deploy a sample application to test chaos experiments against:

```yaml
# test-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
  labels:
    app: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 3
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

Deploy the application:

```bash
kubectl apply -f test-app.yaml

# Verify deployment
kubectl get pods -l app=web-app
```

## Implementing Pod Failure Experiments

Create a PodChaos experiment that kills pods to test application recovery:

```yaml
# pod-failure-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-experiment
  namespace: default
spec:
  # Type of pod chaos
  action: pod-kill

  # How to select target pods
  selector:
    namespaces:
      - default
    labelSelectors:
      app: web-app

  # Kill one pod at a time
  mode: one

  # Run for 5 minutes
  duration: "5m"

  # Schedule (optional)
  scheduler:
    cron: "@every 1h"
```

This experiment kills one pod every hour for 5 minutes, testing that your application maintains availability during pod failures.

Apply the experiment:

```bash
kubectl apply -f pod-failure-experiment.yaml

# Watch pods being killed and recreated
kubectl get pods -l app=web-app -w

# Check experiment status
kubectl get podchaos pod-kill-experiment -o yaml
```

## Testing Multiple Pod Failures

Increase the blast radius to test handling of multiple simultaneous failures:

```yaml
# multi-pod-failure.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: multi-pod-kill
  namespace: default
spec:
  action: pod-kill

  selector:
    namespaces:
      - default
    labelSelectors:
      app: web-app

  # Kill 2 pods simultaneously
  mode: fixed
  value: "2"

  duration: "2m"
```

This tests whether your application maintains availability when losing multiple replicas:

```bash
kubectl apply -f multi-pod-failure.yaml

# Monitor service availability during experiment
while true; do
  kubectl run curl-test --image=curlimages/curl --rm -i --restart=Never -- \
    curl -s -o /dev/null -w "%{http_code}\n" http://web-app.default.svc.cluster.local
  sleep 1
done
```

## Implementing Network Partition Experiments

Test network partition scenarios using NetworkChaos to simulate split-brain conditions:

```yaml
# network-partition-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-partition
  namespace: default
spec:
  # Type of network chaos
  action: partition

  # Source pods (isolated from target)
  selector:
    namespaces:
      - default
    labelSelectors:
      app: web-app

  # Target pods (cannot reach source)
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        component: database

  # Partition direction
  direction: both

  # How many pods to affect
  mode: one

  duration: "3m"
```

This creates a network partition between your application and database, testing how the application handles loss of database connectivity.

## Testing Network Delay and Packet Loss

Inject network latency to test application behavior under degraded network conditions:

```yaml
# network-delay-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
  namespace: default
spec:
  action: delay

  selector:
    namespaces:
      - default
    labelSelectors:
      app: web-app

  mode: all

  # Add 500ms latency
  delay:
    latency: "500ms"
    jitter: "100ms"
    correlation: "50"

  duration: "5m"
```

Test packet loss scenarios:

```yaml
# packet-loss-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: packet-loss
  namespace: default
spec:
  action: loss

  selector:
    namespaces:
      - default
    labelSelectors:
      app: web-app

  mode: all

  # Drop 10% of packets
  loss:
    loss: "10"
    correlation: "25"

  duration: "3m"
```

Apply network chaos experiments:

```bash
kubectl apply -f network-delay-experiment.yaml
kubectl apply -f packet-loss-experiment.yaml

# Monitor network metrics during experiment
kubectl exec -it deployment/web-app -- sh -c "ping -c 100 database.default.svc.cluster.local"
```

## Creating Targeted Network Partition Tests

Test specific network failure scenarios like API server communication loss:

```yaml
# api-server-partition.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-server-partition
  namespace: default
spec:
  action: partition

  selector:
    namespaces:
      - default
    labelSelectors:
      app: web-app

  # Block access to Kubernetes API
  target:
    mode: all
    selector:
      namespaces:
        - kube-system
      labelSelectors:
        component: kube-apiserver

  direction: to

  mode: all
  duration: "2m"
```

This tests how your application behaves when it cannot communicate with the Kubernetes API server.

## Implementing Chaos Workflows

Combine multiple chaos types in a workflow to test complex failure scenarios:

```yaml
# chaos-workflow.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: resilience-test
  namespace: default
spec:
  entry: entry
  templates:
    - name: entry
      templateType: Serial
      deadline: 10m
      children:
        - pod-failure-phase
        - network-delay-phase
        - network-partition-phase

    - name: pod-failure-phase
      templateType: PodChaos
      deadline: 3m
      podChaos:
        action: pod-kill
        selector:
          namespaces:
            - default
          labelSelectors:
            app: web-app
        mode: one

    - name: network-delay-phase
      templateType: NetworkChaos
      deadline: 3m
      networkChaos:
        action: delay
        selector:
          namespaces:
            - default
          labelSelectors:
            app: web-app
        mode: all
        delay:
          latency: "1000ms"

    - name: network-partition-phase
      templateType: NetworkChaos
      deadline: 3m
      networkChaos:
        action: partition
        selector:
          namespaces:
            - default
          labelSelectors:
            app: web-app
        target:
          selector:
            namespaces:
              - default
            labelSelectors:
              component: database
        direction: both
        mode: one
```

This workflow runs a sequence of chaos experiments that progressively stress your application.

Run the workflow:

```bash
kubectl apply -f chaos-workflow.yaml

# Monitor workflow progress
kubectl get workflow resilience-test -w

# View detailed workflow status
kubectl describe workflow resilience-test
```

## Monitoring Chaos Experiments

Track chaos experiments and their impact:

```bash
# List all active chaos experiments
kubectl get podchaos,networkchaos -A

# View experiment events
kubectl describe podchaos pod-kill-experiment

# Check chaos-mesh logs
kubectl logs -n chaos-mesh -l app.kubernetes.io/component=controller-manager

# Monitor chaos-daemon logs on specific node
kubectl logs -n chaos-mesh -l app.kubernetes.io/component=chaos-daemon --all-containers
```

## Pausing and Resuming Experiments

Pause a running experiment without deleting it:

```yaml
# Update experiment with paused annotation
kubectl annotate podchaos pod-kill-experiment \
  chaos-mesh.org/pause=true

# Resume experiment
kubectl annotate podchaos pod-kill-experiment \
  chaos-mesh.org/pause-
```

## Testing Application Metrics During Chaos

Verify that your application maintains acceptable performance during chaos:

```bash
# Install metrics-checking script
cat << 'EOF' > check-metrics.sh
#!/bin/bash

# Function to check service availability
check_availability() {
  http_code=$(kubectl run curl-test --image=curlimages/curl --rm -i --restart=Never -- \
    curl -s -o /dev/null -w "%{http_code}" http://web-app.default.svc.cluster.local 2>/dev/null)
  echo $http_code
}

# Monitor during experiment
echo "Starting chaos experiment monitoring"
kubectl apply -f pod-failure-experiment.yaml

success=0
total=0

for i in {1..300}; do
  code=$(check_availability)
  total=$((total + 1))

  if [ "$code" = "200" ]; then
    success=$((success + 1))
  fi

  sleep 1
done

availability=$(echo "scale=2; $success * 100 / $total" | bc)
echo "Availability during chaos: ${availability}%"

# Clean up experiment
kubectl delete podchaos pod-kill-experiment
EOF

chmod +x check-metrics.sh
./check-metrics.sh
```

## Implementing Safety Controls

Add safeguards to prevent chaos experiments from affecting production:

```yaml
# protected-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    # Prevent chaos experiments in this namespace
    chaos-mesh.org/inject: "false"
```

Use selectors carefully to avoid unintended targets:

```yaml
# safe-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: safe-pod-kill
  namespace: default
spec:
  action: pod-kill

  selector:
    # Require explicit chaos-test label
    namespaces:
      - default
    labelSelectors:
      app: web-app
      chaos-test: "enabled"

  mode: one
  duration: "2m"
```

## Conclusion

Chaos Mesh provides powerful tools for validating Kubernetes application resilience through pod failure and network partition experiments. By regularly testing how your applications respond to failures, you build confidence in their ability to handle production incidents.

The declarative nature of Chaos Mesh experiments makes chaos engineering a repeatable part of your testing workflow. Integrate these experiments into CI/CD pipelines to ensure that every change maintains application resilience standards.

For production readiness, start with small-scale experiments in non-production environments, gradually increase the blast radius as confidence grows, and establish clear success criteria that define acceptable application behavior during chaos.
