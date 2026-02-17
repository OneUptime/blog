# How to Install Cloud Service Mesh on a GKE Cluster Using the Managed Control Plane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Service Mesh, GKE, Istio, Managed Control Plane

Description: A complete guide to installing Google Cloud Service Mesh with the managed control plane on GKE clusters for service-to-service communication, security, and observability.

---

Running a service mesh used to mean managing Istio's control plane yourself - dealing with upgrades, scaling istiod, and debugging configuration issues. Google Cloud Service Mesh with the managed control plane takes that burden off your plate. Google manages the control plane components, handles upgrades, and ensures high availability. You just focus on configuring your mesh policies and deploying your services.

In this guide, I will walk through the complete installation process, from cluster preparation through verification.

## Prerequisites

Before starting, you need:

- A GKE cluster running version 1.25 or later
- The cluster must be in a VPC-native (alias IP) configuration
- Workload Identity must be enabled on the cluster
- The GKE cluster must have at least 4 vCPUs available for the mesh components
- Your Google Cloud project must have the following APIs enabled

Let me cover the setup steps for each prerequisite.

## Step 1: Enable Required APIs

Enable all the APIs that Cloud Service Mesh depends on.

```bash
# Enable required APIs for Cloud Service Mesh
gcloud services enable \
    mesh.googleapis.com \
    container.googleapis.com \
    gkehub.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com \
    cloudtrace.googleapis.com \
    meshca.googleapis.com \
    meshconfig.googleapis.com \
    iamcredentials.googleapis.com \
    --project=YOUR_PROJECT_ID
```

## Step 2: Create or Prepare the GKE Cluster

If you already have a cluster, skip to the verification section. Otherwise, create a new cluster with the required configuration.

This command creates a GKE cluster with all the prerequisites for Cloud Service Mesh.

```bash
# Create a GKE cluster configured for Cloud Service Mesh
gcloud container clusters create mesh-cluster \
    --project=YOUR_PROJECT_ID \
    --zone=us-central1-a \
    --machine-type=e2-standard-4 \
    --num-nodes=3 \
    --workload-pool=YOUR_PROJECT_ID.svc.id.goog \
    --enable-ip-alias \
    --release-channel=regular \
    --labels=mesh_id=proj-YOUR_PROJECT_NUMBER
```

The `mesh_id` label is required. The value must be `proj-` followed by your project number (not project ID).

If you have an existing cluster, verify it meets the requirements.

```bash
# Get the cluster configuration
gcloud container clusters describe mesh-cluster \
    --zone=us-central1-a \
    --project=YOUR_PROJECT_ID \
    --format="yaml(workloadIdentityConfig, ipAllocationPolicy, releaseChannel)"
```

Make sure:
- `workloadIdentityConfig` is set (Workload Identity is enabled)
- `ipAllocationPolicy` shows VPC-native configuration
- `releaseChannel` is set to REGULAR, RAPID, or STABLE

If Workload Identity is not enabled, update the cluster.

```bash
# Enable Workload Identity on an existing cluster
gcloud container clusters update mesh-cluster \
    --zone=us-central1-a \
    --workload-pool=YOUR_PROJECT_ID.svc.id.goog \
    --project=YOUR_PROJECT_ID
```

## Step 3: Register the Cluster with a Fleet

Cloud Service Mesh uses GKE Fleet to manage mesh membership. Register your cluster.

```bash
# Register the cluster with the fleet
gcloud container fleet memberships register mesh-cluster \
    --gke-cluster=us-central1-a/mesh-cluster \
    --enable-workload-identity \
    --project=YOUR_PROJECT_ID
```

Verify the registration.

```bash
# Check fleet membership
gcloud container fleet memberships list --project=YOUR_PROJECT_ID
```

## Step 4: Enable the Service Mesh Feature

Enable the Cloud Service Mesh feature on the fleet.

```bash
# Enable the mesh feature
gcloud container fleet mesh enable --project=YOUR_PROJECT_ID
```

Now apply the managed control plane configuration to your cluster.

```bash
# Apply the managed control plane to the cluster
gcloud container fleet mesh update \
    --management=automatic \
    --memberships=mesh-cluster \
    --project=YOUR_PROJECT_ID
```

The `--management=automatic` flag tells Google to manage the control plane, including automatic upgrades.

## Step 5: Wait for Provisioning

The managed control plane takes a few minutes to provision. Monitor the progress.

```bash
# Check the mesh status
gcloud container fleet mesh describe --project=YOUR_PROJECT_ID
```

You are looking for the control plane state to show `ACTIVE`. The output will look something like this:

```
membershipStates:
  projects/YOUR_PROJECT_NUMBER/locations/us-central1-a/memberships/mesh-cluster:
    servicemesh:
      controlPlaneManagement:
        details:
        - code: REVISION_READY
          details: 'Ready: asm-managed'
        state: ACTIVE
      dataPlaneManagement:
        details:
        - code: OK
        state: ACTIVE
```

## Step 6: Verify the Installation

Get credentials for your cluster and verify the mesh components are running.

```bash
# Get cluster credentials
gcloud container clusters get-credentials mesh-cluster \
    --zone=us-central1-a \
    --project=YOUR_PROJECT_ID

# Check that the control plane revision is installed
kubectl get controlplanerevision -n istio-system
```

You should see an `asm-managed` revision with a `RECONCILED` condition.

Verify the mutating webhook configuration is in place (this handles sidecar injection).

```bash
# Check the webhook configuration
kubectl get mutatingwebhookconfiguration | grep istio
```

## Step 7: Label Namespaces for Sidecar Injection

For the mesh to work, your application pods need Envoy sidecar proxies. Enable automatic injection by labeling your namespaces.

```bash
# Get the revision label from the control plane
REVISION=$(kubectl get controlplanerevision -n istio-system -o jsonpath='{.items[0].metadata.name}')

# Label your application namespace for automatic injection
kubectl label namespace default istio.io/rev=$REVISION --overwrite
```

For the managed control plane, the revision label is typically `asm-managed`.

```bash
# Alternative: use the managed revision label directly
kubectl label namespace default istio.io/rev=asm-managed --overwrite
```

## Step 8: Deploy a Test Application

Deploy a simple application to verify the mesh is working. I will use the Bookinfo sample application that Istio provides.

```bash
# Deploy the Bookinfo sample application
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/bookinfo/platform/kube/bookinfo.yaml

# Wait for pods to be ready
kubectl get pods -w
```

Check that each pod has 2 containers (the application container plus the Envoy sidecar).

```bash
# Verify sidecar injection
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{", "}{end}{"\n"}{end}'
```

You should see `istio-proxy` listed as a container in each pod.

## Step 9: Configure the Ingress Gateway (Optional)

If you need external traffic to reach your mesh services, deploy an ingress gateway.

```yaml
# ingress-gateway.yaml
# Deploys an Istio ingress gateway for external traffic
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: istio-ingressgateway
      istio: ingressgateway
  template:
    metadata:
      annotations:
        inject.istio.io/templates: gateway
      labels:
        app: istio-ingressgateway
        istio: ingressgateway
    spec:
      containers:
      - name: istio-proxy
        image: auto
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 2000m
            memory: 1024Mi
---
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  selector:
    app: istio-ingressgateway
    istio: ingressgateway
  ports:
  - port: 80
    name: http
  - port: 443
    name: https
```

```bash
# Deploy the ingress gateway
kubectl apply -f ingress-gateway.yaml

# Wait for the load balancer IP
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Monitoring the Mesh

With the managed control plane, telemetry data automatically flows to Google Cloud's operations suite. You can view:

- **Service mesh topology** in the Cloud Service Mesh dashboard
- **Request metrics** (latency, error rates, request volumes) in Cloud Monitoring
- **Distributed traces** in Cloud Trace
- **Envoy access logs** in Cloud Logging

Navigate to the Cloud Service Mesh section in the Google Cloud console to see the topology view, which shows all your services and the traffic flowing between them.

## Upgrading

One of the biggest benefits of the managed control plane is automatic upgrades. Google handles upgrading the control plane components on a regular cadence, following the GKE release channels.

When a new version is available, Google rolls it out to the control plane first. Your data plane (sidecar proxies) can be upgraded by restarting your pods.

```bash
# Restart deployments to pick up new sidecar proxy versions
kubectl rollout restart deployment -n default
```

## Troubleshooting

**Control plane state stuck in PROVISIONING**: Check that all required APIs are enabled and the cluster meets all prerequisites. The most common issue is missing the `mesh_id` label or not having Workload Identity enabled.

**Sidecar not injected into pods**: Verify the namespace label matches the control plane revision. Check that the mutating webhook configuration exists. If pods were created before labeling the namespace, restart them.

**Mesh dashboard shows no data**: It can take 5-10 minutes for telemetry to start appearing. Verify that your pods have the sidecar by checking the container count.

The managed control plane gives you all the benefits of a service mesh - mTLS, traffic management, observability - without the operational overhead of running the control plane yourself. It is the recommended approach for most GKE deployments.
