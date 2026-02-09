# How to Implement Container Image Pre-Pulling Strategies for Faster Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Performance, Container Images, Optimization, Pre-Pulling

Description: Learn how to implement effective container image pre-pulling strategies to eliminate image pull latency and enable instant pod startup in Kubernetes clusters.

---

Image pulling is often the longest phase of pod startup, especially for large images or during scaling events. Pre-pulling images to nodes before they're needed eliminates this delay entirely. Strategic pre-pulling combined with cache warming enables near-instant pod startup. This guide shows you how to implement comprehensive pre-pulling strategies for Kubernetes.

## Understanding Pre-Pulling Benefits

Pre-pulling ensures images are cached locally before pods need them. This eliminates pull time from the critical path of pod startup, reducing time-to-ready from minutes to seconds. For auto-scaling workloads, pre-pulling means new pods become available immediately when demand spikes. For deployments, pre-pulling enables true zero-downtime rollouts without waiting for image downloads.

The key is identifying which images to pre-pull and when. Pre-pulling all images wastes storage and bandwidth. Effective strategies balance cache hit rates with resource utilization by focusing on frequently used images and predicting future needs based on deployment patterns.

## Implementing DaemonSet-Based Pre-Pulling

Use DaemonSets to pull critical images on all nodes automatically.

```yaml
# image-prepuller-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepuller
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: image-prepuller
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: image-prepuller
    spec:
      initContainers:
      # Pull base images
      - name: pull-alpine
        image: alpine:3.18
        command: ["true"]
        resources:
          limits:
            cpu: 100m
            memory: 128Mi
      - name: pull-ubuntu
        image: ubuntu:22.04
        command: ["true"]
      # Pull application images
      - name: pull-api-server
        image: mycompany/api-server:v2.1.0
        command: ["true"]
        resources:
          limits:
            cpu: 100m
            memory: 128Mi
      - name: pull-worker
        image: mycompany/worker:v2.1.0
        command: ["true"]
      - name: pull-frontend
        image: mycompany/frontend:v2.1.0
        command: ["true"]
      # Pull sidecar images
      - name: pull-envoy
        image: envoyproxy/envoy:v1.28.0
        command: ["true"]
      - name: pull-fluent-bit
        image: fluent/fluent-bit:2.1
        command: ["true"]
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
        resources:
          limits:
            cpu: 10m
            memory: 20Mi
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
```

This ensures all critical images are cached on every node before workloads need them.

## Building a Dynamic Pre-Puller Controller

Create a controller that automatically discovers and pre-pulls images from running workloads.

```go
// image-prepuller-controller/main.go
package main

import (
    "context"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type ImagePrePuller struct {
    clientset *kubernetes.Clientset
    imageMap  map[string]int // image -> usage count
}

func (ipp *ImagePrePuller) Run(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            ipp.analyzeAndPrePull()
        case <-ctx.Done():
            return
        }
    }
}

func (ipp *ImagePrePuller) analyzeAndPrePull() error {
    // Get all pods across all namespaces
    pods, err := ipp.clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return err
    }

    // Count image usage
    imageCount := make(map[string]int)
    for _, pod := range pods.Items {
        for _, container := range pod.Spec.Containers {
            imageCount[container.Image]++
        }
        for _, initContainer := range pod.Spec.InitContainers {
            imageCount[initContainer.Image]++
        }
    }

    // Find frequently used images
    var frequentImages []string
    for image, count := range imageCount {
        if count >= 3 { // Used by 3+ pods
            frequentImages = append(frequentImages, image)
        }
    }

    // Update pre-puller DaemonSet
    return ipp.updatePrePullerDaemonSet(frequentImages)
}

func (ipp *ImagePrePuller) updatePrePullerDaemonSet(images []string) error {
    // Build init containers for each image
    var initContainers []corev1.Container
    for i, image := range images {
        initContainers = append(initContainers, corev1.Container{
            Name:    fmt.Sprintf("pull-%d", i),
            Image:   image,
            Command: []string{"true"},
            Resources: corev1.ResourceRequirements{
                Limits: corev1.ResourceList{
                    corev1.ResourceCPU:    resource.MustParse("100m"),
                    corev1.ResourceMemory: resource.MustParse("128Mi"),
                },
            },
        })
    }

    // Update DaemonSet
    ds, err := ipp.clientset.AppsV1().DaemonSets("kube-system").Get(
        context.TODO(),
        "image-prepuller",
        metav1.GetOptions{},
    )
    if err != nil {
        return err
    }

    ds.Spec.Template.Spec.InitContainers = initContainers

    _, err = ipp.clientset.AppsV1().DaemonSets("kube-system").Update(
        context.TODO(),
        ds,
        metav1.UpdateOptions{},
    )

    return err
}

func main() {
    config, _ := rest.InClusterConfig()
    clientset, _ := kubernetes.NewForConfig(config)

    controller := &ImagePrePuller{
        clientset: clientset,
        imageMap:  make(map[string]int),
    }

    ctx := context.Background()
    controller.Run(ctx)
}
```

Deploy the controller:

```yaml
# prepuller-controller-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-prepuller-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prepuller-controller
  template:
    metadata:
      labels:
        app: prepuller-controller
    spec:
      serviceAccountName: prepuller-controller
      containers:
      - name: controller
        image: mycompany/prepuller-controller:latest
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prepuller-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prepuller-controller
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["list", "watch"]
- apiGroups: ["apps"]
  resources: ["daemonsets"]
  verbs: ["get", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prepuller-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prepuller-controller
subjects:
- kind: ServiceAccount
  name: prepuller-controller
  namespace: kube-system
```

## Implementing Version-Aware Pre-Pulling

Pre-pull new versions before deployments to enable zero-downtime updates.

```bash
#!/bin/bash
# pre-pull-deployment.sh

NAMESPACE=$1
DEPLOYMENT=$2
NEW_IMAGE=$3

echo "Pre-pulling image: $NEW_IMAGE"

# Get all nodes
NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

# Create pre-pull jobs on each node
for NODE in $NODES; do
  kubectl run prepull-${NODE}-$(date +%s) \
    --image=$NEW_IMAGE \
    --restart=Never \
    --overrides="{
      \"apiVersion\": \"v1\",
      \"spec\": {
        \"nodeName\": \"$NODE\",
        \"containers\": [{
          \"name\": \"prepull\",
          \"image\": \"$NEW_IMAGE\",
          \"command\": [\"true\"]
        }]
      }
    }" \
    --namespace=kube-system &
done

# Wait for all pre-pull pods to complete
echo "Waiting for pre-pull to complete..."
sleep 30

# Clean up pre-pull pods
kubectl delete pods -n kube-system -l job=prepull --field-selector=status.phase=Succeeded

# Now update the deployment
echo "Updating deployment..."
kubectl set image deployment/$DEPLOYMENT -n $NAMESPACE app=$NEW_IMAGE

echo "Deployment updated with pre-pulled image!"
```

Integrate with CI/CD:

```yaml
# .github/workflows/deploy-with-prepull.yml
name: Deploy with Pre-Pull

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Build and push image
      run: |
        docker build -t mycompany/app:${{ github.sha }} .
        docker push mycompany/app:${{ github.sha }}

    - name: Pre-pull image to all nodes
      run: |
        ./scripts/pre-pull-deployment.sh production api-server mycompany/app:${{ github.sha }}

    - name: Update deployment
      run: |
        kubectl set image deployment/api-server api=mycompany/app:${{ github.sha }} -n production
```

## Creating Node-Specific Pre-Pull Strategies

Optimize pre-pulling based on node characteristics and workload patterns.

```yaml
# targeted-prepuller.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prepull-config
  namespace: kube-system
data:
  config.yaml: |
    strategies:
      - name: gpu-nodes
        nodeSelector:
          nvidia.com/gpu: "true"
        images:
          - tensorflow/tensorflow:latest-gpu
          - pytorch/pytorch:latest

      - name: memory-intensive-nodes
        nodeSelector:
          node-type: memory-optimized
        images:
          - redis:7-alpine
          - memcached:1.6-alpine

      - name: production-nodes
        nodeSelector:
          environment: production
        images:
          - mycompany/api:latest
          - mycompany/worker:latest
          - envoyproxy/envoy:latest
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: targeted-prepuller
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: targeted-prepuller
  template:
    metadata:
      labels:
        app: targeted-prepuller
    spec:
      nodeSelector:
        environment: production
      initContainers:
      - name: pull-production-images
        image: alpine:3.18
        command:
        - sh
        - -c
        - |
          # Read config and pull appropriate images
          for image in $(cat /config/config.yaml | yq '.strategies[] | select(.name == "production-nodes") | .images[]'); do
            echo "Pulling $image"
          done
        volumeMounts:
        - name: config
          mountPath: /config
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
      volumes:
      - name: config
        configMap:
          name: prepull-config
```

## Monitoring Pre-Pull Effectiveness

Track cache hit rates and pre-pull performance.

```yaml
# prepull-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prepull-metrics
data:
  queries.yml: |
    groups:
    - name: image-prepull
      rules:
      - record: image_pull_skip_rate
        expr: |
          sum(rate(kubelet_image_pull_skipped_total[5m])) /
          sum(rate(kubelet_image_pull_total[5m]))

      - record: prepull_coverage
        expr: |
          count(kubelet_image_cached{prepulled="true"}) /
          count(kubelet_image_total)

      - record: pod_startup_without_pull_seconds
        expr: |
          histogram_quantile(0.99,
            rate(kubelet_pod_start_duration_seconds_bucket{image_pulled="false"}[5m])
          )
```

Query metrics:

```bash
# Check cache hit rate
kubectl top nodes --sort-by=image-cache-hit-rate

# View prepull pod status
kubectl get pods -n kube-system -l app=image-prepuller

# Analyze image pull times
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep "Pulling image"
```

Implementing comprehensive image pre-pulling strategies eliminates one of the largest contributors to pod startup latency. By identifying frequently used images, pre-pulling before deployments, and continuously warming caches based on usage patterns, you enable near-instant pod startup. This optimization is critical for auto-scaling responsiveness, zero-downtime deployments, and improving overall cluster efficiency. Monitor cache hit rates and adjust strategies as workload patterns evolve to maintain optimal performance.
