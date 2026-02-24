# How to Set Up Istio on Google Anthos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Google Anthos, GKE, Kubernetes, Service Mesh

Description: How to install and configure Istio on Google Anthos clusters including Anthos Service Mesh and manual installation options.

---

Google Anthos is a hybrid and multi-cloud platform built on Kubernetes. It comes with Anthos Service Mesh (ASM), which is Google's managed distribution of Istio. ASM is tightly integrated with Anthos and includes features like managed certificates, fleet-wide mesh configuration, and integration with Google Cloud's monitoring and security tools.

You can use either ASM (recommended for Anthos) or install upstream Istio directly. This guide covers both approaches.

## Understanding Anthos Service Mesh

ASM is based on Istio but adds:
- **Managed control plane** option where Google runs istiod for you
- **Fleet-wide configuration** that works across multiple clusters
- **Integration with Google Cloud Monitoring** and Cloud Trace
- **Certificate Authority Service** integration for certificate management
- **Security dashboards** in the Google Cloud Console

## Prerequisites

Before starting, make sure you have:

```bash
# Verify gcloud is installed and configured
gcloud version
gcloud config get-value project

# Verify kubectl access
kubectl cluster-info

# Verify you have the right IAM permissions
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --filter="bindings.members:$(gcloud auth list --filter=status:ACTIVE --format='value(account)')" \
  --format='table(bindings.role)'
```

Required IAM roles:
- `roles/container.admin`
- `roles/meshconfig.admin`
- `roles/gkehub.admin`

Enable the required APIs:

```bash
gcloud services enable \
  mesh.googleapis.com \
  container.googleapis.com \
  gkehub.googleapis.com \
  monitoring.googleapis.com \
  cloudtrace.googleapis.com
```

## Option 1: Managed Anthos Service Mesh

The managed ASM option is the simplest. Google manages the control plane, and you only need to configure the data plane.

**Register the cluster with a fleet:**

```bash
gcloud container fleet memberships register my-cluster \
  --gke-cluster=us-central1/my-cluster \
  --enable-workload-identity
```

**Enable ASM:**

```bash
gcloud container fleet mesh enable --project=my-project
```

**Apply managed ASM configuration:**

```bash
gcloud container fleet mesh update \
  --management automatic \
  --memberships my-cluster \
  --project my-project
```

Wait for the control plane to be provisioned:

```bash
gcloud container fleet mesh describe --project my-project
```

The managed control plane will show up as pods in the `istio-system` namespace, but they are managed by Google.

**Enable sidecar injection:**

```bash
kubectl label namespace myapp istio-injection=enabled istio.io/rev- --overwrite
```

Or for revision-based injection (recommended for managed ASM):

```bash
# Get the current revision
kubectl get controlplanerevision -n istio-system

# Label namespace with the revision
kubectl label namespace myapp istio.io/rev=asm-managed --overwrite
```

## Option 2: In-Cluster ASM Installation

If you want more control, install ASM in-cluster using the asmcli tool:

```bash
# Download asmcli
curl https://storage.googleapis.com/csm-artifacts/asm/asmcli_1.22 > asmcli
chmod +x asmcli
```

Run the installation:

```bash
./asmcli install \
  --project_id my-project \
  --cluster_name my-cluster \
  --cluster_location us-central1 \
  --fleet_id my-project \
  --output_dir ./asm-output \
  --enable_all \
  --ca mesh_ca
```

The `--ca mesh_ca` option uses Google's managed Certificate Authority. You can also use `citadel` for self-managed certificates.

Verify the installation:

```bash
./asmcli validate \
  --project_id my-project \
  --cluster_name my-cluster \
  --cluster_location us-central1

kubectl get pods -n istio-system
```

## Option 3: Upstream Istio on Anthos

If you need features not available in ASM or want the latest upstream Istio version:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*

istioctl install --set profile=default \
  --set meshConfig.enableAutoMtls=true \
  --set meshConfig.accessLogFile=/dev/stdout
```

Note that upstream Istio on Anthos will not integrate with Google Cloud's monitoring tools as seamlessly as ASM.

## Configuring the Ingress Gateway

For Anthos clusters running on GKE, the ingress gateway automatically gets a Google Cloud Load Balancer:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: gateway-tls
    hosts:
    - "app.example.com"
```

For Anthos on bare metal or VMware, configure the gateway for your load balancer:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: LoadBalancer
          annotations:
            # For MetalLB on bare metal
            metallb.universe.tf/address-pool: production
```

## Integrating with Google Cloud Monitoring

ASM automatically sends metrics to Google Cloud Monitoring. For upstream Istio, you need to configure the Stackdriver adapter.

For ASM, verify metrics are flowing:

```bash
gcloud monitoring dashboards list --filter="displayName:Anthos Service Mesh"
```

For upstream Istio, enable Stackdriver telemetry:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: stackdriver
  tracing:
  - providers:
    - name: stackdriver
    randomSamplingPercentage: 10.0
```

## Multi-Cluster Mesh on Anthos

One of Anthos's biggest strengths is multi-cluster mesh support. Set up a mesh across multiple Anthos clusters:

```bash
# Register both clusters to the same fleet
gcloud container fleet memberships register cluster-a \
  --gke-cluster=us-central1/cluster-a \
  --enable-workload-identity

gcloud container fleet memberships register cluster-b \
  --gke-cluster=europe-west1/cluster-b \
  --enable-workload-identity

# Enable mesh on both
gcloud container fleet mesh update \
  --management automatic \
  --memberships cluster-a,cluster-b
```

Verify cross-cluster connectivity:

```bash
# Check fleet membership status
gcloud container fleet memberships list

# Check mesh status
gcloud container fleet mesh describe
```

## Security Configuration

**Enable strict mTLS:**

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

**Authorization policies:**

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: frontend-to-backend
  namespace: myapp
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "my-project.svc.id.goog/ns/myapp/sa/frontend"
    to:
    - operation:
        methods: ["GET", "POST"]
```

Note the principal format for Anthos: `PROJECT.svc.id.goog/ns/NAMESPACE/sa/SERVICE_ACCOUNT`. This is different from upstream Istio's `cluster.local/ns/NAMESPACE/sa/SERVICE_ACCOUNT`.

## Using Certificate Authority Service

For production deployments, use Google's Certificate Authority Service instead of the default mesh CA:

```bash
# Create a CA pool
gcloud privateca pools create mesh-ca-pool \
  --location us-central1 \
  --tier enterprise

# Create a root CA
gcloud privateca roots create mesh-root-ca \
  --pool mesh-ca-pool \
  --location us-central1 \
  --subject "CN=Mesh Root CA, O=My Org"

# Install ASM with CAS
./asmcli install \
  --project_id my-project \
  --cluster_name my-cluster \
  --cluster_location us-central1 \
  --fleet_id my-project \
  --ca gcp_cas \
  --ca_pool projects/my-project/locations/us-central1/caPools/mesh-ca-pool
```

## Deploying a Test Application

```bash
kubectl create namespace bookinfo
kubectl label namespace bookinfo istio-injection=enabled

kubectl apply -n bookinfo -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml

# Wait for pods
kubectl get pods -n bookinfo -w

# Create gateway
kubectl apply -n bookinfo -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/bookinfo-gateway.yaml

# Get the gateway IP
kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Viewing the Service Mesh Dashboard

With ASM, you get a dedicated dashboard in the Google Cloud Console:

1. Go to the Google Cloud Console
2. Navigate to Anthos > Service Mesh
3. You will see the service topology, metrics, and SLOs

The dashboard shows:
- Service-level request rates and error rates
- Latency percentiles
- mTLS status
- Security policy compliance

Setting up Istio on Anthos is straightforward, especially with the managed ASM option. The tight integration with Google Cloud's monitoring, security, and certificate management tools makes it a compelling choice for organizations already invested in the Google Cloud ecosystem. The main decision is whether to use managed ASM (simpler but less flexible) or in-cluster ASM (more control but more operational overhead).
