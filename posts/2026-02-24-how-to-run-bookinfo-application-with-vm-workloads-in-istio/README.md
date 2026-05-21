# How to Run Bookinfo Application with VM Workloads in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Bookinfo, Virtual Machine, Service Mesh, Tutorial

Description: A hands-on tutorial for running the Istio Bookinfo sample application with some services deployed on VMs outside Kubernetes.

---

The Bookinfo sample application is the go-to demo for Istio, but most tutorials run it entirely inside Kubernetes. In a real-world scenario, you might have some services running on VMs that need to participate in the mesh. This tutorial walks through deploying parts of the Bookinfo application on VMs while keeping the rest in Kubernetes, showing how the mesh ties everything together.

## Architecture Overview

The Bookinfo application has four microservices: productpage, details, reviews, and ratings. We will run productpage and reviews inside Kubernetes, while moving the ratings and details services to VMs. This simulates a common hybrid deployment where legacy services live on VMs and newer services run in Kubernetes.

## Prerequisites

You need a Kubernetes cluster with Istio installed, and at least one VM that can reach the cluster network. The VM should have a Linux OS (Ubuntu 20.04 or later works well).

Make sure Istio is installed with VM support:

```bash
istioctl install \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=Kubernetes \
  --set values.global.network=kube-network \
  --set values.pilot.env.PILOT_ENABLE_WORKLOAD_ENTRY_AUTOREGISTRATION=true \
  --set values.pilot.env.PILOT_ENABLE_WORKLOAD_ENTRY_HEALTHCHECKS=true
```

## Step 1: Deploy Kubernetes Services

Start by deploying productpage and reviews in Kubernetes:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bookinfo
  labels:
    istio-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: productpage-v1
  namespace: bookinfo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: productpage
      version: v1
  template:
    metadata:
      labels:
        app: productpage
        version: v1
    spec:
      serviceAccountName: bookinfo-productpage
      containers:
      - name: productpage
        image: registry.istio.io/release/examples-bookinfo-productpage-v1:1.20.3
        ports:
        - containerPort: 9080
---
apiVersion: v1
kind: Service
metadata:
  name: productpage
  namespace: bookinfo
spec:
  ports:
  - port: 9080
    name: http
  selector:
    app: productpage
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bookinfo-productpage
  namespace: bookinfo
```

Deploy the reviews service similarly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reviews-v3
  namespace: bookinfo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: reviews
      version: v3
  template:
    metadata:
      labels:
        app: reviews
        version: v3
    spec:
      serviceAccountName: bookinfo-reviews
      containers:
      - name: reviews
        image: registry.istio.io/release/examples-bookinfo-reviews-v3:1.20.3
        ports:
        - containerPort: 9080
---
apiVersion: v1
kind: Service
metadata:
  name: reviews
  namespace: bookinfo
spec:
  ports:
  - port: 9080
    name: http
  selector:
    app: reviews
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bookinfo-reviews
  namespace: bookinfo
```

## Step 2: Create WorkloadGroup for VM Services

Define WorkloadGroups for the ratings and details services that will run on VMs:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: ratings-vm
  namespace: bookinfo
spec:
  metadata:
    labels:
      app: ratings
      version: v1
  template:
    serviceAccount: bookinfo-ratings
    network: vm-network
  probe:
    httpGet:
      port: 9080
      path: /ratings/0
---
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: details-vm
  namespace: bookinfo
spec:
  metadata:
    labels:
      app: details
      version: v1
  template:
    serviceAccount: bookinfo-details
    network: vm-network
  probe:
    httpGet:
      port: 9080
      path: /details/0
```

Apply the WorkloadGroups, then create the service accounts and services:

```bash
kubectl apply -f workloadgroups.yaml
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bookinfo-ratings
  namespace: bookinfo
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bookinfo-details
  namespace: bookinfo
---
apiVersion: v1
kind: Service
metadata:
  name: ratings
  namespace: bookinfo
spec:
  ports:
  - port: 9080
    name: http
  selector:
    app: ratings
---
apiVersion: v1
kind: Service
metadata:
  name: details
  namespace: bookinfo
spec:
  ports:
  - port: 9080
    name: http
  selector:
    app: details
```

## Step 3: Set Up the East-West Gateway

VMs on a different network need the east-west gateway to communicate with the cluster:

```bash
# Install the east-west gateway for the cluster network
samples/multicluster/gen-eastwest-gateway.sh --network kube-network | istioctl install -y -f -

# Expose istiod and cluster services through the east-west gateway
kubectl apply -n istio-system -f samples/multicluster/expose-istiod.yaml
kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml
kubectl label namespace istio-system topology.istio.io/network=kube-network --overwrite
```

Verify the gateway is running:

```bash
kubectl get svc -n istio-system istio-eastwestgateway
```

## Step 4: Generate VM Configuration

Generate the bootstrap files for each VM:

```bash
# For the ratings VM
istioctl x workload entry configure \
  --name ratings-vm \
  --namespace bookinfo \
  --clusterID Kubernetes \
  --autoregister \
  --output ratings-vm-files

# For the details VM
istioctl x workload entry configure \
  --name details-vm \
  --namespace bookinfo \
  --clusterID Kubernetes \
  --autoregister \
  --output details-vm-files
```

This creates configuration files including `cluster.env`, `mesh.yaml`, `root-cert.pem`, `istio-token`, and `hosts` in the output directories.

## Step 5: Set Up the VMs

Copy the generated files to each VM and install the Istio sidecar. On the ratings VM:

```bash
# Install the Istio sidecar
curl -LO https://storage.googleapis.com/istio-release/releases/1.30.0/deb/istio-sidecar.deb
sudo dpkg -i istio-sidecar.deb

# Copy the configuration files
sudo mkdir -p /etc/certs /var/run/secrets/tokens /etc/istio/proxy
sudo cp root-cert.pem /etc/certs/root-cert.pem
sudo cp istio-token /var/run/secrets/tokens/istio-token
sudo cp cluster.env /var/lib/istio/envoy/cluster.env
sudo cp mesh.yaml /etc/istio/config/mesh
sudo sh -c 'cat hosts >> /etc/hosts'

# Set ownership
sudo chown -R istio-proxy /etc/certs /var/run/secrets /var/lib/istio /etc/istio/proxy /etc/istio/config

# Start the sidecar
sudo systemctl start istio
sudo systemctl enable istio
```

## Step 6: Run the Bookinfo Services on VMs

On the ratings VM, run the ratings service. You can use Docker or run it directly:

```bash
# Using Docker
docker run -d --name ratings \
  --network host \
  registry.istio.io/release/examples-bookinfo-ratings-v1:1.20.3

# Or if running the binary directly
# Download and run the ratings service
# The service must listen on port 9080
```

Do the same on the details VM with the details service:

```bash
docker run -d --name details \
  --network host \
  registry.istio.io/release/examples-bookinfo-details-v1:1.20.3
```

## Step 7: Verify the Setup

Check that all WorkloadEntries are created (if using auto-registration) or create them manually:

```bash
kubectl get workloadentries -n bookinfo
```

Verify proxy status for all workloads:

```bash
istioctl proxy-status
```

You should see entries for both VMs showing as SYNCED.

Test the application end-to-end:

```bash
# Port-forward the productpage service
kubectl port-forward svc/productpage -n bookinfo 9080:9080

# Test the page
curl http://localhost:9080/productpage
```

If everything is working, you should see the full Bookinfo page with ratings (stars) and details (book information) being served from the VMs.

## Step 8: Apply Traffic Policies

Now you can apply Istio traffic policies that span both Kubernetes and VM workloads:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-route
  namespace: bookinfo
spec:
  hosts:
  - ratings
  http:
  - route:
    - destination:
        host: ratings
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
```

## Troubleshooting

If the productpage cannot reach the VM-based services, check these common issues:

```bash
# Check VM sidecar logs
sudo journalctl -u istio -f

# Verify the east-west gateway is reachable from the VM
curl -v https://<eastwest-gateway-ip>:15443

# Check if the services are resolving correctly
istioctl proxy-config endpoint deploy/productpage-v1 -n bookinfo | grep ratings
```

Running the Bookinfo application across Kubernetes and VMs demonstrates how Istio can unify traffic management, security, and observability for hybrid deployments. The same VirtualService, DestinationRule, and AuthorizationPolicy resources work regardless of whether the workload is a pod or a VM process.
