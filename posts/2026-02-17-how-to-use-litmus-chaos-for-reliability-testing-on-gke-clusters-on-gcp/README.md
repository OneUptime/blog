# How to Use Litmus Chaos for Reliability Testing on GKE Clusters on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Litmus Chaos, Chaos Engineering, Kubernetes, Reliability Testing

Description: A hands-on guide to installing and using Litmus Chaos on GKE clusters to run chaos experiments and improve the reliability of your Kubernetes workloads on GCP.

---

You have deployed your application on GKE, set up health checks, configured autoscaling, and written your runbooks. But how do you know your system will actually handle a pod crash, a node failure, or a network partition? The answer is chaos engineering - deliberately injecting faults and observing how your system responds.

Litmus Chaos is an open-source chaos engineering framework built for Kubernetes. It integrates naturally with GKE and provides a catalog of pre-built chaos experiments you can run against your clusters. In this post, I will walk through installing Litmus on GKE, running your first experiments, and interpreting the results.

## What Is Litmus Chaos

Litmus is a CNCF project that provides a Kubernetes-native chaos engineering platform. It works by deploying a control plane on your cluster that orchestrates chaos experiments. Each experiment is defined as a Custom Resource (CR), making it easy to version control and automate.

Key concepts in Litmus:
- **ChaosEngine**: The CR that connects your application to a chaos experiment
- **ChaosExperiment**: Defines the fault to inject (pod kill, network loss, CPU stress, etc.)
- **ChaosResult**: Captures the outcome of the experiment (pass/fail, metrics)
- **ChaosHub**: A repository of pre-built experiments

## Prerequisites

You need a GKE cluster with workloads running on it, plus Helm 3 for the Litmus installation. Create a cluster if you do not already have one:

```bash
# Create a GKE cluster for chaos testing

gcloud container clusters create chaos-testing-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --project=my-project

# Get credentials for kubectl
gcloud container clusters get-credentials chaos-testing-cluster \
  --zone=us-central1-a \
  --project=my-project
```

## Installing Litmus on GKE

Install Litmus using Helm. The installation creates a dedicated namespace and deploys the Litmus control plane:

```bash
# Add the Litmus Helm repository
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm repo update

# Create the litmus namespace
kubectl create namespace litmus

# Install Litmus and expose the frontend through a LoadBalancer
helm install chaos litmuschaos/litmus \
  --namespace litmus \
  --set portal.frontend.service.type=LoadBalancer

# Verify the installation
kubectl get pods -n litmus
```

You should see the Litmus portal server, auth server, frontend, and MongoDB pods running. The Litmus portal provides a web UI for managing experiments:

```bash
# Get the external IP
kubectl get svc chaos-litmus-frontend-service -n litmus \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Deploying a Test Application

Before running chaos experiments, deploy a simple application to test against:

```yaml
# test-app.yaml - A simple web application with multiple replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-web-app
  namespace: default
  labels:
    app: test-web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-web-app
  template:
    metadata:
      labels:
        app: test-web-app
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: test-web-app
  namespace: default
spec:
  selector:
    app: test-web-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

Apply it:

```bash
# Deploy the test application
kubectl apply -f test-app.yaml

# Verify it is running
kubectl get pods -l app=test-web-app
```

## Running Your First Chaos Experiment: Pod Delete

The pod-delete experiment kills pods in your application to test whether Kubernetes restarts them and whether your service stays available.

First, install the experiment from the chaos hub:

```bash
# Download the Litmus chaos chart release and install the pod-delete fault
LITMUS_CHART_VERSION=3.29.0
tar -zxvf <(curl -sL https://github.com/litmuschaos/chaos-charts/archive/${LITMUS_CHART_VERSION}.tar.gz)
find chaos-charts-${LITMUS_CHART_VERSION} -name fault.yaml \
  | grep 'kubernetes/pod-delete' \
  | xargs kubectl apply -n default -f
```

Create a service account for the experiment:

```yaml
# rbac.yaml - Service account and permissions for chaos experiments
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-delete-sa
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-delete-role
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "deletecollection"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "get", "list", "patch", "update"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["get", "list", "create"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "replicasets", "daemonsets"]
  verbs: ["list", "get"]
- apiGroups: ["apps.openshift.io"]
  resources: ["deploymentconfigs"]
  verbs: ["list", "get"]
- apiGroups: [""]
  resources: ["replicationcontrollers"]
  verbs: ["get", "list"]
- apiGroups: ["argoproj.io"]
  resources: ["rollouts"]
  verbs: ["list", "get"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["create", "delete", "get", "list", "deletecollection"]
- apiGroups: ["litmuschaos.io"]
  resources: ["chaosengines", "chaosexperiments", "chaosresults"]
  verbs: ["create", "delete", "get", "list", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-delete-binding
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: pod-delete-role
subjects:
- kind: ServiceAccount
  name: pod-delete-sa
  namespace: default
```

Now create the ChaosEngine to run the experiment:

```yaml
# pod-delete-chaos.yaml - ChaosEngine for pod-delete experiment
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: test-web-app-pod-delete
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=test-web-app
    appkind: deployment
  engineState: active
  chaosServiceAccount: pod-delete-sa
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        # Kill one pod at a time
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        # Delete one pod every 15 seconds
        - name: CHAOS_INTERVAL
          value: "15"
        # Force delete the pod
        - name: FORCE
          value: "true"
        # Number of pods to delete at once
        - name: PODS_AFFECTED_PERC
          value: "33"
```

Apply and watch the experiment:

```bash
# Start the chaos experiment
kubectl apply -f pod-delete-chaos.yaml

# Watch the pods being killed and restarted
kubectl get pods -l app=test-web-app -w

# Check the chaos result after the experiment completes
kubectl get chaosresult test-web-app-pod-delete-pod-delete -n default -o yaml
```

## Running a Node Drain Experiment

This experiment simulates a node failure by draining a cordoned GKE node. Install the `node-drain` fault, create the `node-drain-sa` service account and ClusterRole permissions from the Litmus node-drain documentation, then cordon the target node before applying the ChaosEngine:

```bash
# Install the node-drain fault
find chaos-charts-${LITMUS_CHART_VERSION} -name fault.yaml \
  | grep 'kubernetes/node-drain' \
  | xargs kubectl apply -n default -f

# Pick the node that is running one of the test application pods
kubectl get pods -l app=test-web-app -o wide

# Cordon the target node before running node-drain
kubectl cordon NODE_NAME
```

```yaml
# node-drain-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: test-node-drain
  namespace: default
spec:
  engineState: active
  chaosServiceAccount: node-drain-sa
  experiments:
  - name: node-drain
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "120"
        - name: TARGET_NODE
          value: "NODE_NAME"
```

## Running a Network Chaos Experiment

Test how your application handles network issues. Install the `pod-network-loss` fault and create the `pod-network-loss-sa` service account with the RBAC permissions from the Litmus pod-network-loss documentation before applying the ChaosEngine:

```bash
# Install the pod-network-loss fault
find chaos-charts-${LITMUS_CHART_VERSION} -name fault.yaml \
  | grep 'kubernetes/pod-network-loss' \
  | xargs kubectl apply -n default -f
```

```yaml
# pod-network-loss-chaos.yaml - Simulate network packet loss
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: test-network-loss
  namespace: default
spec:
  appinfo:
    appns: default
    applabel: app=test-web-app
    appkind: deployment
  engineState: active
  chaosServiceAccount: pod-network-loss-sa
  experiments:
  - name: pod-network-loss
    spec:
      components:
        env:
        # Percentage of packets to drop
        - name: NETWORK_PACKET_LOSS_PERCENTAGE
          value: "50"
        # Duration of the network loss
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        # Target container name
        - name: TARGET_CONTAINER
          value: "nginx"
        # GKE nodes use containerd by default
        - name: CONTAINER_RUNTIME
          value: "containerd"
        - name: SOCKET_PATH
          value: "/run/containerd/containerd.sock"
        # Number of pods to affect
        - name: PODS_AFFECTED_PERC
          value: "33"
```

## Interpreting Results

After each experiment, check the ChaosResult to see if it passed or failed:

```bash
# Get all chaos results
kubectl get chaosresults -n default

# Get detailed results for a specific experiment
kubectl get chaosresult test-web-app-pod-delete-pod-delete -n default \
  -o jsonpath='{.status.experimentStatus.verdict}'
```

The verdict will be one of: "Pass" (the application stayed healthy during chaos), "Fail" (the application was impacted), or "Stopped" (the experiment was interrupted).

## Integrating with Cloud Monitoring

Connect your chaos experiments with Cloud Monitoring to see the impact on your metrics. During experiments, watch your Cloud Monitoring dashboards for changes in error rate, latency, and availability. This validates that your monitoring is actually detecting the issues that chaos experiments create.

```bash
# Create a Cloud Monitoring alert that fires during chaos experiments
# to validate monitoring detection
gcloud alpha monitoring policies create \
  --display-name="Chaos Validation: Pod Restart Rate" \
  --condition-display-name="Pod restarts > 0" \
  --condition-filter='resource.type="k8s_container" AND metric.type="kubernetes.io/container/restart_count"' \
  --if='> 0' \
  --duration=60s \
  --project=my-project
```

## Summary

Litmus Chaos on GKE gives you a structured way to test the resilience of your Kubernetes workloads. Start with simple experiments like pod deletion, progress to node-level faults, and eventually test network chaos and resource stress. The key takeaway from chaos engineering is not whether your experiments pass or fail - it is what you learn from them. Every failed experiment is a gap in your resilience that you can fix before it becomes a real incident.
