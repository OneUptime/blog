# How to Set Up a GKE Windows Node Pool for Running Windows Container Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Windows Containers, Kubernetes, Node Pools, Windows Server

Description: Step-by-step guide to creating a GKE Windows node pool and deploying Windows container workloads alongside your Linux containers in the same cluster.

---

Not everything runs on Linux. If you have .NET Framework applications, legacy Windows services, or software that only runs on Windows, you need Windows containers. GKE supports running Windows and Linux workloads in the same cluster by using separate node pools for each operating system.

Setting up a Windows node pool is not complicated, but there are some nuances you need to know about. Windows nodes have different behavior than Linux nodes, and understanding the differences saves you from frustrating debugging sessions.

## Prerequisites

Before creating a Windows node pool, your cluster needs a few things in place:

- The cluster must be running GKE version 1.16 or later
- You need at least one Linux node pool (the default pool) for system components
- The cluster must use VPC-native networking (alias IPs)

Windows nodes cannot run Kubernetes system components like kube-proxy and kube-dns. Those always run on Linux nodes. The Windows node pool is exclusively for your Windows application workloads.

## Creating a Cluster with Windows Support

If you are creating a new cluster, enable Windows node support from the start:

```bash
# Create a GKE cluster with the Windows node support addon
gcloud container clusters create my-cluster \
  --zone us-central1-a \
  --num-nodes=2 \
  --enable-ip-alias \
  --addons=HorizontalPodAutoscaling,HttpLoadBalancing
```

Now add a Windows node pool:

```bash
# Create a Windows Server node pool
gcloud container node-pools create windows-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --image-type=WINDOWS_LTSC_CONTAINERD \
  --num-nodes=2 \
  --machine-type=e2-standard-4 \
  --no-enable-autoupgrade
```

The `--image-type=WINDOWS_LTSC_CONTAINERD` flag specifies Windows Server Long Term Servicing Channel with containerd as the runtime. You can also use `WINDOWS_SAC_CONTAINERD` for the Semi-Annual Channel if you need newer Windows features.

## Adding a Windows Pool to an Existing Cluster

If you already have a GKE cluster, just add the Windows node pool:

```bash
# Add a Windows node pool to an existing cluster
gcloud container node-pools create windows-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --image-type=WINDOWS_LTSC_CONTAINERD \
  --num-nodes=2 \
  --machine-type=e2-standard-4 \
  --scopes="https://www.googleapis.com/auth/cloud-platform"
```

Verify the Windows nodes are ready:

```bash
# Check node status and OS
kubectl get nodes -o wide
```

Windows nodes will show `Windows` in the OS column and have a taint applied automatically.

## Understanding Windows Node Taints

GKE automatically applies a taint to Windows nodes:

```
node.kubernetes.io/os=windows:NoSchedule
```

This prevents Linux pods from being accidentally scheduled on Windows nodes. Your Windows workloads need a corresponding toleration, and you should also use a node selector to ensure they land on Windows nodes.

## Deploying a Windows Container Workload

Here is a deployment for a Windows container with the required toleration and node selector:

```yaml
# windows-deployment.yaml - Windows container deployment with proper scheduling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-web
  labels:
    app: iis-web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: iis-web
  template:
    metadata:
      labels:
        app: iis-web
    spec:
      # Select Windows nodes
      nodeSelector:
        kubernetes.io/os: windows
      # Tolerate the Windows node taint
      tolerations:
        - key: "node.kubernetes.io/os"
          operator: "Equal"
          value: "windows"
          effect: "NoSchedule"
      containers:
        - name: iis
          image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "1"
              memory: 2Gi
```

Apply and expose the deployment:

```bash
# Deploy the Windows workload
kubectl apply -f windows-deployment.yaml

# Create a LoadBalancer service to expose it
kubectl expose deployment iis-web --type=LoadBalancer --port=80 --target-port=80
```

## Deploying a .NET Application

For a custom .NET application, build your container image and deploy it:

```dockerfile
# Dockerfile for a .NET Framework 4.8 application
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Copy the published application
COPY ./publish/ /inetpub/wwwroot/

# IIS will serve the application automatically
```

The deployment looks the same as the IIS example, just with your custom image:

```yaml
# dotnet-deployment.yaml - .NET Framework application on Windows containers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dotnet-app
  template:
    metadata:
      labels:
        app: dotnet-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      tolerations:
        - key: "node.kubernetes.io/os"
          operator: "Equal"
          value: "windows"
          effect: "NoSchedule"
      containers:
        - name: app
          image: us-docker.pkg.dev/my-project/my-repo/dotnet-app:v1.0
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
          # Health checks
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 5
```

## Windows Container Image Compatibility

This is a common source of confusion. The Windows container OS version must match the Windows host OS version. If your node runs Windows Server 2022 LTSC, your container image must be based on the `ltsc2022` tag.

Check your node's Windows version:

```bash
# Check the Windows Server version on your nodes
kubectl get nodes -l kubernetes.io/os=windows \
  -o jsonpath='{.items[0].status.nodeInfo.kernelVersion}'
```

Use the matching base image in your Dockerfile. Here is a quick reference:

- WINDOWS_LTSC_CONTAINERD nodes use `windowsservercore-ltsc2022`
- WINDOWS_SAC_CONTAINERD nodes use the corresponding SAC version

## Scaling the Windows Node Pool

Windows nodes take longer to start than Linux nodes because the Windows boot process and image pulling are slower. Plan for this in your scaling configuration:

```bash
# Enable autoscaling on the Windows node pool
gcloud container node-pools update windows-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10
```

Be aware that Windows node startup can take 5-10 minutes, so aggressive autoscaling might not react fast enough for sudden traffic spikes. Keep a baseline capacity that handles your steady-state load.

## Storage and Networking Differences

Windows containers on GKE have some networking and storage limitations:

- Host networking is not supported
- Persistent volumes work, but only ReadWriteOnce with PD CSI driver
- Node port ranges are limited
- Some Linux-specific features like init containers work but have caveats

For persistent storage:

```yaml
# windows-pvc.yaml - PVC for a Windows container workload
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: windows-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard-rwo
  resources:
    requests:
      storage: 50Gi
```

## Monitoring Windows Workloads

Cloud Monitoring works with Windows nodes and pods. GKE collects node-level metrics automatically. For application-level metrics, you can expose Prometheus-format metrics from your .NET application and scrape them with GMP just like Linux workloads.

Check Windows node health:

```bash
# View Windows node resource usage
kubectl top nodes -l kubernetes.io/os=windows

# View Windows pod resource usage
kubectl top pods -l app=iis-web
```

## Cost Considerations

Windows nodes cost more than equivalent Linux nodes because of Windows Server licensing. Google Cloud includes the Windows Server license in the VM cost, so you pay a premium for each node.

To optimize costs:

- Right-size your Windows node pool machine type
- Use autoscaling to avoid paying for idle Windows nodes
- Consider using committed use discounts for Windows VMs
- Keep only genuinely Windows-dependent workloads on Windows nodes and move everything else to Linux

Running Windows containers on GKE gives you the flexibility to modernize legacy Windows applications while leveraging Kubernetes orchestration. The setup requires attention to OS compatibility and scheduling, but once configured, it works reliably alongside your Linux workloads.
