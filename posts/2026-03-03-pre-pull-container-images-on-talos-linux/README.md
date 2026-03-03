# How to Pre-Pull Container Images on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Container Image, Kubernetes, Performance, Deployment

Description: Learn different strategies for pre-pulling container images on Talos Linux nodes to speed up pod startup and improve deployment reliability.

---

When a pod gets scheduled to a node that does not have the required container image cached, the kubelet has to pull it from a registry before the container can start. For large images or slow network connections, this delay can be significant. Pre-pulling images ensures that the images are already on the node when pods are scheduled, resulting in near-instant container starts.

In Talos Linux, where you cannot simply SSH in and run a pull command, pre-pulling requires different strategies. This guide covers multiple approaches to pre-pulling container images on Talos Linux nodes.

## Why Pre-Pull Images

The benefits of pre-pulling go beyond just faster pod starts:

Rolling deployments are faster because new pods start immediately instead of waiting for image pulls. Autoscaled workloads become responsive sooner because the scale-up delay is reduced. Failover scenarios improve because pods can restart on backup nodes without pull delays. And you reduce the chance of failures due to transient registry outages during critical deployments.

## Strategy 1: DaemonSet Pre-Puller

The most common approach is a DaemonSet that pulls images on every node:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepuller
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: image-prepuller
  template:
    metadata:
      labels:
        app: image-prepuller
    spec:
      initContainers:
        # Each init container pulls one image
        - name: pull-app-v2
          image: myregistry.com/myapp:v2.0.0
          command: ["sh", "-c", "echo pulled myapp:v2.0.0"]
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
        - name: pull-redis
          image: redis:7.2
          command: ["sh", "-c", "echo pulled redis:7.2"]
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
        - name: pull-postgres
          image: postgres:16
          command: ["sh", "-c", "echo pulled postgres:16"]
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.9
          resources:
            requests:
              cpu: 1m
              memory: 4Mi
      tolerations:
        # Run on all nodes including control plane
        - operator: Exists
```

Each init container references an image but immediately exits. The kubelet pulls the image as part of creating the init container, and it remains cached on the node.

## Strategy 2: Job-Based Pre-Puller

If you only need to pre-pull on specific nodes or as a one-time operation, use a Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prepull-new-version
  namespace: kube-system
spec:
  parallelism: 10  # Run on multiple nodes simultaneously
  completions: 10  # Match your node count
  template:
    spec:
      initContainers:
        - name: pull-image
          image: myregistry.com/myapp:v3.0.0
          command: ["sh", "-c", "echo Image pre-pulled"]
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
      containers:
        - name: done
          image: registry.k8s.io/pause:3.9
          command: ["sh", "-c", "echo Pre-pull complete"]
      restartPolicy: Never
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  job-name: prepull-new-version
              topologyKey: kubernetes.io/hostname
  backoffLimit: 3
```

The pod anti-affinity rule ensures each job pod runs on a different node, spreading the pre-pull across the cluster.

## Strategy 3: CronJob for Periodic Pre-Pulling

For images that are updated frequently, a CronJob can keep caches fresh:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: periodic-prepull
  namespace: kube-system
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  jobTemplate:
    spec:
      template:
        spec:
          initContainers:
            - name: pull-latest
              image: myregistry.com/myapp:latest
              imagePullPolicy: Always
              command: ["sh", "-c", "echo refreshed"]
              resources:
                requests:
                  cpu: 10m
                  memory: 16Mi
          containers:
            - name: done
              image: registry.k8s.io/pause:3.9
              command: ["sh", "-c", "echo done"]
          restartPolicy: Never
```

Setting `imagePullPolicy: Always` forces a fresh pull even if the image is already cached, ensuring you always have the latest version.

## Strategy 4: Kubernetes Image Puller Operator

For a more automated approach, you can use the Kubernetes Image Puller operator:

```yaml
# Deploy the operator
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubernetes-image-puller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kubernetes-image-puller
  template:
    metadata:
      labels:
        app: kubernetes-image-puller
    spec:
      containers:
        - name: puller
          image: quay.io/eclipse/kubernetes-image-puller:latest
          env:
            - name: IMAGES
              value: "myapp=myregistry.com/myapp:v2.0.0;redis=redis:7.2;postgres=postgres:16"
            - name: CACHING_INTERVAL_HOURS
              value: "4"
            - name: DAEMONSET_NAME
              value: "image-puller-ds"
            - name: NAMESPACE
              value: "kube-system"
```

## Strategy 5: Using Talos Machine Configuration

Talos itself does not have a built-in image pre-pull mechanism, but you can use static pods to trigger pulls during node boot:

```yaml
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: image-prepuller
        namespace: kube-system
      spec:
        initContainers:
          - name: pull-critical-image
            image: myregistry.com/critical-app:v1.0.0
            command: ["sh", "-c", "echo pre-pulled"]
            resources:
              requests:
                cpu: 10m
                memory: 16Mi
        containers:
          - name: pause
            image: registry.k8s.io/pause:3.9
```

This static pod runs on node boot and ensures critical images are available before regular pods are scheduled.

## Managing Pre-Pull Resources

Pre-pulling can consume significant bandwidth and disk space. Here are some tips for managing resources:

```yaml
# Limit bandwidth by setting resource constraints
initContainers:
  - name: pull-image
    image: myregistry.com/large-image:v1.0.0
    command: ["sh", "-c", "echo pulled"]
    resources:
      requests:
        cpu: 10m
        memory: 16Mi
      limits:
        cpu: 100m
        memory: 64Mi
```

For disk space management, configure image garbage collection through the kubelet:

```yaml
machine:
  kubelet:
    extraConfig:
      imageGCHighThresholdPercent: 85
      imageGCLowThresholdPercent: 80
      imageMinimumGCAge: "2m"
```

This ensures that pre-pulled images that are no longer needed get cleaned up automatically.

## Pre-Pull Before a Deployment

Here is a practical workflow for pre-pulling before a new version deployment:

```bash
# Step 1: Create a pre-pull DaemonSet for the new version
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: prepull-v3
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: prepull-v3
  template:
    metadata:
      labels:
        app: prepull-v3
    spec:
      initContainers:
        - name: pull
          image: myregistry.com/myapp:v3.0.0
          command: ["sh", "-c", "echo done"]
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.9
      tolerations:
        - operator: Exists
EOF

# Step 2: Wait for all nodes to pull the image
kubectl rollout status daemonset/prepull-v3 -n kube-system

# Step 3: Now deploy the new version (instant starts)
kubectl set image deployment/myapp myapp=myregistry.com/myapp:v3.0.0

# Step 4: Clean up the pre-puller
kubectl delete daemonset prepull-v3 -n kube-system
```

## Verifying Pre-Pulled Images

Check which images are cached on each node:

```bash
# List images on a specific node
talosctl images --nodes 10.0.0.5

# Check if a specific image is cached
talosctl images --nodes 10.0.0.5 | grep myapp
```

## Conclusion

Pre-pulling container images on Talos Linux nodes eliminates the most common source of deployment delays. DaemonSets are the simplest and most widely used approach. For more control, use Jobs or CronJobs. For critical images that must be available at boot time, use static pods in the Talos machine configuration. Whichever approach you choose, combine it with image garbage collection settings to keep disk usage under control. The small overhead of running a pre-pull DaemonSet is well worth the improvement in deployment speed and reliability.
