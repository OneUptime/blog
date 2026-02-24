# How to Set Up Istio on GKE with Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GKE, Google Cloud, Kubernetes, Service Mesh

Description: Production-ready guide for installing and configuring Istio on Google Kubernetes Engine with GCP-specific optimizations and best practices.

---

Google Kubernetes Engine has a unique relationship with Istio since Google is one of the original creators of the project. GKE even offers a managed Istio option (now Anthos Service Mesh), but many teams prefer running open-source Istio for full control. Either way, there are GKE-specific considerations that affect how you install, configure, and operate Istio.

## Choosing Between Open-Source Istio and Anthos Service Mesh

GKE gives you three options:

- **Open-source Istio**: You install and manage everything yourself. Full control but you own the upgrades.
- **Anthos Service Mesh (ASM)**: Google's managed distribution of Istio. It is basically Istio with a Google-managed control plane and integrated Cloud Monitoring.
- **GKE Gateway API**: GKE's built-in implementation of the Kubernetes Gateway API, which handles some of what Istio does without a full mesh.

This guide focuses on open-source Istio since that gives you the most flexibility.

## Creating a GKE Cluster for Istio

Create a cluster with enough resources and the right settings:

```bash
gcloud container clusters create istio-cluster \
  --zone us-central1-a \
  --machine-type e2-standard-4 \
  --num-nodes 3 \
  --enable-ip-alias \
  --workload-pool=my-project.svc.id.goog \
  --release-channel regular \
  --enable-network-policy
```

Key settings explained:

- `e2-standard-4` gives you 4 vCPUs and 16GB RAM per node, which provides enough room for Istio sidecars
- `enable-ip-alias` enables VPC-native networking, which is required for proper pod-to-pod communication
- `workload-pool` enables Workload Identity for secure GCP API access
- `enable-network-policy` enables Calico network policies for defense in depth

Get credentials:

```bash
gcloud container clusters get-credentials istio-cluster --zone us-central1-a
```

## Installing Istio on GKE

Download and install istioctl:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
```

Create a GKE-optimized IstioOperator configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-gke
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    enableTracing: true
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
        serviceAnnotations:
          cloud.google.com/neg: '{"ingress": true}'
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
        hpaSpec:
          minReplicas: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
```

Install:

```bash
istioctl install -f istio-gke-config.yaml -y
```

## Integrating with GKE Workload Identity

Workload Identity is GKE's recommended way to give pods access to GCP APIs. It maps Kubernetes service accounts to GCP IAM service accounts.

Set up Workload Identity for your application:

```bash
# Create a GCP service account
gcloud iam service-accounts create my-app-gsa \
  --display-name "My App Service Account"

# Grant it the needed permissions
gcloud projects add-iam-policy-binding my-project \
  --member "serviceAccount:my-app-gsa@my-project.iam.gserviceaccount.com" \
  --role "roles/storage.objectViewer"

# Link the Kubernetes SA to the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  my-app-gsa@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[production/my-app-sa]"
```

Annotate the Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: my-app-gsa@my-project.iam.gserviceaccount.com
```

Istio sidecars work fine with Workload Identity - the token exchange happens through the GKE metadata server which the sidecar proxy does not interfere with.

## Setting Up the Gateway

Configure the Istio gateway for production traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
    hosts:
    - "app.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "app.example.com"
```

## Cloud DNS Integration

Point your domain to the Istio gateway:

```bash
# Get the gateway IP
export GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Create a DNS record
gcloud dns record-sets create app.example.com \
  --zone=my-dns-zone \
  --type=A \
  --ttl=300 \
  --rrdatas=$GATEWAY_IP
```

## Enabling mTLS

Enable strict mTLS across the mesh:

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

## GKE-Specific Network Configuration

GKE's VPC-native networking means pod IPs are routable within the VPC. This is good for Istio because it simplifies multi-cluster setups where clusters in the same VPC can route directly to each other's pods.

However, you need to make sure firewall rules allow Istio traffic between nodes:

```bash
# Allow Istio control plane communication
gcloud compute firewall-rules create allow-istio-control \
  --network default \
  --allow tcp:15010,tcp:15012,tcp:15014,tcp:15017 \
  --source-ranges 10.0.0.0/8 \
  --description "Allow Istio control plane traffic"

# Allow sidecar-to-sidecar mTLS
gcloud compute firewall-rules create allow-istio-mtls \
  --network default \
  --allow tcp:15001,tcp:15006,tcp:15008,tcp:15021,tcp:15090 \
  --source-ranges 10.0.0.0/8 \
  --description "Allow Istio sidecar traffic"
```

## Integrating with Cloud Monitoring

GKE automatically collects metrics through Cloud Monitoring. You can configure Istio to export metrics there too:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10
```

Deploy Prometheus for Istio-specific metrics:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/grafana.yaml
```

You can also set up Cloud Trace for distributed tracing by configuring the trace exporter in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        zipkin:
          address: zipkin.istio-system:9411
```

## Node Auto-Provisioning

If you use GKE's node auto-provisioning, account for the sidecar overhead in your pod resource requests. Each sidecar adds roughly 100m CPU and 128Mi memory. Without proper requests, the autoscaler might schedule too many pods on a node:

```yaml
spec:
  containers:
  - name: my-app
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
  # Sidecar adds ~100m CPU and ~128Mi memory on top
```

## Upgrading Istio on GKE

For upgrades, use canary-based control plane upgrades:

```bash
# Install the new version as a canary
istioctl install --set revision=1-20-0 -f istio-gke-config.yaml

# Migrate namespaces one at a time
kubectl label namespace production istio-injection- istio.io/rev=1-20-0

# Restart workloads
kubectl rollout restart deployment -n production

# Once all namespaces are migrated, remove the old revision
istioctl uninstall --revision default
```

This gives you a zero-downtime upgrade path where you can roll back by switching the namespace label back to the old revision.

Running Istio on GKE is a solid combination. The VPC-native networking, Workload Identity integration, and Cloud Monitoring support make GKE one of the smoother platforms for Istio. Size your nodes appropriately, use Workload Identity instead of JSON key files, and take advantage of GKE's revision-based upgrades for smooth control plane updates.
