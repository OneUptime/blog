# How to Configure Istio with GKE CNI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GKE, CNI, Kubernetes, Google Cloud, Networking

Description: A practical guide to running Istio service mesh on Google Kubernetes Engine with GKE's native CNI networking plugin.

---

Google Kubernetes Engine has its own CNI plugin that manages pod networking, and it works a bit differently from other Kubernetes environments. If you're deploying Istio on GKE, there are specific configurations you need to get right. This guide covers the full setup from cluster creation to a working Istio mesh on GKE.

## How GKE CNI Works

GKE uses a custom CNI plugin based on its VPC-native networking. When you create a VPC-native cluster, GKE assigns pod IPs from a secondary range on the subnet. This is different from routes-based clusters where GKE creates custom routes for pod CIDRs.

Istio needs to intercept traffic between pods using iptables rules injected by the sidecar. On GKE, the VPC-native networking doesn't interfere with this because Istio operates at the pod level, after the CNI has already set up the pod's network namespace.

## Prerequisites

You'll need:

- A GKE Standard cluster running a Kubernetes version supported by your Istio release, with VPC-native networking
- gcloud CLI configured
- istioctl installed
- kubectl configured to your GKE cluster

## Step 1: Create a VPC-Native GKE Cluster

If you don't have a cluster yet, create one with VPC-native networking:

```bash
gcloud container clusters create istio-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-ip-alias \
  --cluster-ipv4-cidr /16 \
  --services-ipv4-cidr /22 \
  --workload-pool=my-project.svc.id.goog
```

The `--enable-ip-alias` flag enables VPC-native networking. The workload identity pool is optional but recommended for production.

Get credentials for your cluster:

```bash
gcloud container clusters get-credentials istio-cluster --zone us-central1-a
```

## Step 2: Decide on Cloud Service Mesh vs. Open Source

Google offers Cloud Service Mesh, the successor to Anthos Service Mesh, as its managed service mesh for GKE. But if you want to run open-source Istio directly, you have full control. This guide covers the open-source approach.

This guide is for GKE Standard clusters. The Istio CNI node agent requires elevated node-level privileges and isn't available on GKE Autopilot.

## Step 3: Install Istio with the CNI Plugin

Create your IstioOperator configuration for GKE:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-gke
spec:
  profile: default
  components:
    cni:
      enabled: true
      namespace: kube-system
  values:
    cni:
      cniBinDir: /home/kubernetes/bin
      cniConfDir: /etc/cni/net.d
      chained: true
      excludeNamespaces:
        - kube-system
        - istio-system
        - gke-managed-system
    global:
      platform: gke
    pilot:
      cni:
        enabled: true
```

The critical settings here are `cniBinDir` and `cniConfDir`. GKE puts its CNI binaries in `/home/kubernetes/bin` instead of the standard `/opt/cni/bin`. If you get this wrong, the Istio CNI plugin won't install correctly.

Install with istioctl:

```bash
istioctl install -f istio-gke.yaml -y
```

## Step 4: Handle GKE-Specific Firewall Rules

GKE creates firewall rules for your cluster automatically, but private clusters can need an additional rule so the GKE control plane can reach Istio's webhook port.

```bash
# Find the existing GKE master firewall rule and copy its source range
# and target tag values.
gcloud compute firewall-rules list \
  --filter 'name~gke-istio-cluster-[0-9a-z]*-master' \
  --format 'table(
      name,
      network,
      direction,
      sourceRanges.list():label=SRC_RANGES,
      allowed[].map().firewall_rule().list():label=ALLOW,
      targetTags.list():label=TARGET_TAGS
  )'

# Create firewall rule for Istio webhooks
gcloud compute firewall-rules create allow-api-server-to-webhook-istio-cluster \
  --network default \
  --action ALLOW \
  --direction INGRESS \
  --rules tcp:15017 \
  --source-ranges CONTROL_PLANE_RANGE \
  --target-tags TARGET_TAG
```

Without this firewall rule on a private cluster, sidecar injection can fail because the GKE control plane can't reach the Istio webhook.

## Step 5: Configure for GKE Dataplane V2

If your cluster runs GKE Dataplane V2, the setup is slightly different. Dataplane V2 uses eBPF and Cilium instead of kube-proxy to implement Kubernetes Services, and it handles network policy enforcement differently.

Check if Dataplane V2 is enabled:

```bash
gcloud container clusters describe istio-cluster \
  --zone us-central1-a \
  --format="get(networkConfig.datapathProvider)"
```

If it returns `ADVANCED_DATAPATH`, you're on Dataplane V2. In this case, you should be aware that both GKE Dataplane V2 and Istio participate in traffic handling. They can coexist, but you should use Istio for L7 policies and Kubernetes NetworkPolicy for L3/L4 policies.

## Step 6: Set Up the Ingress Gateway

GKE has its own ingress controller, but when running Istio, you'll typically use the Istio ingress gateway instead:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: example-tls-cert
      hosts:
        - "*.example.com"
```

The Istio ingress gateway Service creates a GCP Layer 4 passthrough Network Load Balancer when it uses `type: LoadBalancer`. You can customize it with GCP-specific Service annotations:

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
            cloud.google.com/l4-rbs: "enabled"
            networking.gke.io/load-balancer-type: "Internal"
```

## Step 7: Enable Workload Identity

If you're using GKE Workload Identity (and you should), make sure the Istio service accounts have the right bindings:

```bash
# Bind the Istio service account to a GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  istio-sa@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[istio-system/istiod]"
```

Then annotate the Kubernetes service account:

```bash
kubectl annotate serviceaccount istiod -n istio-system \
  iam.gke.io/gcp-service-account=istio-sa@my-project.iam.gserviceaccount.com
```

## Step 8: Verify Everything Works

Run through the verification steps:

```bash
# Check Istio pods
kubectl get pods -n istio-system

# Verify CNI plugin is running
kubectl get daemonset -n kube-system istio-cni-node

# Check the CNI config was written correctly
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=istio-cni-node -o jsonpath='{.items[0].metadata.name}') -- ls /etc/cni/net.d/
```

Deploy a test workload:

```bash
kubectl create namespace test
kubectl label namespace test istio-injection=enabled
kubectl apply -n test -f https://raw.githubusercontent.com/istio/istio/release-1.29/samples/bookinfo/platform/kube/bookinfo.yaml
```

Verify sidecar injection:

```bash
kubectl get pods -n test
```

## Troubleshooting

**Sidecar injection fails with webhook timeout**: On private clusters, this often means the GKE firewall is blocking port 15017. Add the firewall rule from Step 4.

**Pods fail to start with CNI errors**: Check that the `cniBinDir` is set to `/home/kubernetes/bin`. This is GKE-specific and different from most other Kubernetes distributions.

**Network policy conflicts**: If you're using both GKE network policies and Istio authorization policies, remember that GKE network policies are evaluated first. A deny at the network policy level will block traffic before Istio even sees it.

Running Istio on GKE with the native CNI is a solid production setup. The key is getting the GKE-specific paths right for the CNI plugin and making sure the firewall rules allow webhook traffic. Once those pieces are in place, the rest of the Istio configuration works the same as any other platform.
