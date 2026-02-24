# How to Set Up Istio on Google Kubernetes Engine (GKE)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GKE, Google Cloud, Kubernetes, Service Mesh

Description: Step-by-step instructions for deploying Istio on Google Kubernetes Engine with GCP-specific configurations and best practices.

---

Google Cloud and Istio have a close relationship - Google was one of the original creators of Istio. That said, setting up Istio on GKE yourself (rather than using the managed Anthos Service Mesh) gives you more control and keeps you on the upstream Istio release.

This guide covers setting up a GKE cluster and installing open-source Istio on it, with all the GCP-specific tweaks you need along the way.

## Prerequisites

You need:

- A Google Cloud account with billing enabled
- gcloud CLI installed and authenticated
- kubectl
- istioctl

Authenticate and set your project:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

## Step 1: Create a GKE Cluster

Create a cluster with enough resources for Istio:

```bash
gcloud container clusters create istio-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-ip-alias \
  --release-channel regular
```

The `--enable-ip-alias` flag enables VPC-native networking, which is recommended for Istio. The cluster creation takes about 5-10 minutes.

Get credentials for kubectl:

```bash
gcloud container clusters get-credentials istio-cluster --zone us-central1-a
```

Verify:

```bash
kubectl get nodes
```

## Step 2: Grant Cluster Admin Permissions

On GKE, you need to grant yourself cluster-admin before installing Istio:

```bash
kubectl create clusterrolebinding cluster-admin-binding \
  --clusterrole=cluster-admin \
  --user=$(gcloud config get-value core/account)
```

## Step 3: Download and Install Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Run pre-checks:

```bash
istioctl x precheck
```

Install Istio with a GKE-optimized configuration:

```yaml
# istio-gke.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            cloud.google.com/neg: '{"ingress": true}'
```

```bash
istioctl install -f istio-gke.yaml -y
```

## Step 4: Verify the Installation

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

On GKE, the istio-ingressgateway service gets an external IP from Google's load balancer. It shows up within a minute or two:

```bash
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Step 5: Enable Sidecar Injection

```bash
kubectl label namespace default istio-injection=enabled
```

## Step 6: Deploy and Test

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Get the external IP:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s http://$INGRESS_HOST/productpage | head -5
```

## Using GKE's Built-in Features with Istio

### Network Endpoint Groups (NEGs)

GKE supports NEGs, which allow the Google Cloud load balancer to connect directly to pod IPs instead of going through NodePort. This reduces latency and improves load distribution.

To use NEGs with Istio's ingress gateway, add the annotation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            cloud.google.com/neg: '{"ingress": true}'
            cloud.google.com/backend-config: '{"default": "istio-backendconfig"}'
```

### Workload Identity

If your mesh services need to access GCP APIs (like Cloud Storage or BigQuery), use Workload Identity instead of service account keys:

```bash
gcloud container clusters update istio-cluster \
  --zone us-central1-a \
  --workload-pool=YOUR_PROJECT_ID.svc.id.goog
```

Create a Kubernetes service account and bind it to a GCP service account:

```bash
kubectl create serviceaccount my-app-sa -n default

gcloud iam service-accounts add-iam-policy-binding \
  my-gcp-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:YOUR_PROJECT_ID.svc.id.goog[default/my-app-sa]"

kubectl annotate serviceaccount my-app-sa \
  -n default \
  iam.gke.io/gcp-service-account=my-gcp-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Setting Up Observability

GKE makes it easy to send Istio telemetry to Google Cloud's operations suite (formerly Stackdriver).

Install the Istio telemetry addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/jaeger.yaml
```

Access Kiali for service mesh visualization:

```bash
istioctl dashboard kiali
```

Access Grafana for metrics:

```bash
istioctl dashboard grafana
```

You can also configure Istio to export traces to Google Cloud Trace by updating the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
      - name: cloud-trace
        stackdriver:
          maxNumberOfAnnotations: 200
          maxNumberOfAttributes: 200
          maxNumberOfMessageEvents: 200
```

## TLS with Google-Managed Certificates

You can use Google-managed SSL certificates for your Istio ingress. Create a ManagedCertificate resource:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: istio-cert
spec:
  domains:
    - myapp.example.com
```

Then configure the Istio Gateway to use it through the appropriate annotations and gateway configuration.

## Scaling Considerations

GKE's cluster autoscaler works well with Istio. When pods scale up and new nodes are added, Istio sidecars are automatically injected. A few things to keep in mind:

- Set appropriate resource requests for sidecars so the autoscaler can make good decisions
- Use Pod Disruption Budgets for istiod to prevent control plane disruption during node scaling
- Consider using GKE Autopilot for hands-off node management

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
```

## Troubleshooting GKE-Specific Issues

If the external IP takes too long or never appears, check your GKE quotas:

```bash
gcloud compute project-info describe --project YOUR_PROJECT_ID
```

If you get RBAC errors during installation, make sure you ran the cluster-admin binding command. GKE doesn't automatically give you full admin access even if you created the cluster.

If sidecars aren't injecting on Autopilot clusters, note that Autopilot has specific restrictions on mutating webhooks. Make sure you're running a compatible Autopilot version.

Getting Istio running on GKE is a smooth experience overall. The tight integration between GKE's networking features and Kubernetes standards means most things work out of the box with minimal GCP-specific configuration.
