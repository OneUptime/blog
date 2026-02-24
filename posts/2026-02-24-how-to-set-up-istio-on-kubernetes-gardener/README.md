# How to Set Up Istio on Kubernetes Gardener

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gardener, Kubernetes, SAP, Service Mesh, Multi-Cloud

Description: Guide to installing Istio on SAP Gardener-managed Kubernetes clusters with shoot cluster configuration and cloud-agnostic setup.

---

Gardener is an open-source Kubernetes cluster manager originally developed by SAP. It manages the lifecycle of Kubernetes clusters (called "shoots") across multiple cloud providers - AWS, GCP, Azure, Alibaba Cloud, and OpenStack. If your organization uses Gardener for cluster management, adding Istio is a natural next step for service mesh functionality.

Gardener clusters are standard Kubernetes under the hood, so Istio installation is mostly straightforward. There are a few Gardener-specific details around networking and shoot configuration that are worth knowing about.

## Prerequisites

- Access to a Gardener landscape
- A shoot cluster (or the ability to create one)
- kubectl configured for your shoot cluster
- istioctl

## Step 1: Create or Prepare a Shoot Cluster

If you already have a shoot cluster, skip to Step 2. Otherwise, create one through the Gardener dashboard or by applying a Shoot manifest.

Here's a minimal shoot manifest for AWS:

```yaml
apiVersion: core.gardener.cloud/v1beta1
kind: Shoot
metadata:
  name: istio-shoot
  namespace: garden-my-project
spec:
  cloudProfileName: aws
  region: eu-west-1
  secretBindingName: my-aws-secret
  provider:
    type: aws
    infrastructureConfig:
      apiVersion: aws.provider.extensions.gardener.cloud/v1alpha1
      kind: InfrastructureConfig
      networks:
        vpc:
          cidr: 10.250.0.0/16
        zones:
          - name: eu-west-1a
            internal: 10.250.112.0/22
            public: 10.250.96.0/22
            workers: 10.250.0.0/19
    workers:
      - name: worker-pool
        machine:
          type: m5.xlarge
          image:
            name: gardenlinux
            version: 1312.3.0
        maximum: 5
        minimum: 3
        maxSurge: 1
        maxUnavailable: 0
        volume:
          type: gp3
          size: 50Gi
  kubernetes:
    version: "1.30.2"
  networking:
    type: calico
    pods: 100.96.0.0/11
    services: 100.64.0.0/13
    nodes: 10.250.0.0/16
```

Apply it:

```bash
kubectl apply -f shoot.yaml
```

Wait for the shoot to be ready. You can monitor it through the Gardener dashboard or:

```bash
kubectl get shoot istio-shoot -n garden-my-project -w
```

## Step 2: Get Shoot Cluster Credentials

Download the kubeconfig for your shoot:

```bash
# Through Gardener dashboard: Download kubeconfig
# Or using gardenctl
gardenctl target --garden my-garden --project my-project --shoot istio-shoot
export KUBECONFIG=$(gardenctl kubectl-env)
```

Verify:

```bash
kubectl get nodes
```

## Step 3: Install Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Pre-check:

```bash
istioctl x precheck
```

Install Istio. Since Gardener clusters sit on top of various cloud providers, the configuration depends on which cloud your shoot runs on:

```yaml
# istio-gardener.yaml
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
```

If your shoot is on AWS, add NLB annotations:

```yaml
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

If on GCP, no extra annotations are needed. If on Azure, add the health probe annotation:

```yaml
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: /healthz/ready
```

```bash
istioctl install -f istio-gardener.yaml -y
```

## Step 4: Verify

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

The ingress gateway should get an external IP from the underlying cloud provider's load balancer.

## Step 5: Test

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Get the ingress IP:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
# On AWS, use hostname instead:
# export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$INGRESS_HOST/productpage
```

## Gardener's Own Istio Usage

Interestingly, Gardener itself uses Istio internally for managing the networking of shoot API servers. The Gardener control plane runs Istio to route traffic to the correct shoot's kube-apiserver. However, this Istio installation is in the Gardener control plane (the seed cluster), not in your shoot cluster. Your shoot's Istio installation is completely independent.

## NetworkPolicy Considerations

Gardener shoots come with default NetworkPolicies that restrict some traffic. If Istio components can't communicate, you might need to add exceptions:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio-system
  namespace: default
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
  policyTypes:
    - Ingress
```

Also allow the webhook traffic from the kube-apiserver to istiod:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istiod-webhook
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: istiod
  ingress:
    - ports:
        - port: 15017
          protocol: TCP
  policyTypes:
    - Ingress
```

## Using Gardener's DNS Extension with Istio

Gardener has a DNS extension that can automatically create DNS records for your services. You can use it with Istio's ingress gateway:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    dns.gardener.cloud/dnsnames: "myapp.example.com"
    dns.gardener.cloud/ttl: "300"
    dns.gardener.cloud/class: garden
spec:
  type: LoadBalancer
  # ... rest of service spec
```

The Gardener DNS controller picks up the annotation and creates the DNS record automatically.

## Shoot Cluster Sizing for Istio

When planning your shoot's worker pool, account for Istio's overhead:

- istiod: 500 MB - 1 GB RAM, 0.5 CPU
- Ingress gateway: 128 MB - 256 MB RAM per replica
- Each sidecar: 50 - 100 MB RAM, 0.1 CPU

For a cluster running 20 microservices with Istio, plan for an additional 3-4 GB of RAM across your nodes just for the mesh components.

Size your worker pool accordingly:

```yaml
workers:
  - name: worker-pool
    machine:
      type: m5.xlarge  # 4 vCPU, 16 GB
    minimum: 3
    maximum: 6
```

## Monitoring

Install the standard Istio addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
```

If your Gardener landscape has a centralized monitoring setup, you can configure Prometheus federation to scrape Istio metrics from the shoot cluster into the central monitoring system.

## Upgrading Istio on Gardener Shoots

Gardener manages Kubernetes version upgrades, but Istio upgrades are your responsibility. When Gardener upgrades the Kubernetes version of your shoot:

1. Check the Istio compatibility matrix for the new Kubernetes version
2. If needed, upgrade Istio first before the Kubernetes upgrade
3. After the Kubernetes upgrade, verify Istio is still functioning

```bash
istioctl upgrade -y
kubectl rollout restart deployment -n default
```

## Troubleshooting

If the load balancer doesn't provision, check the shoot's cloud provider configuration. The load balancer subnet might not be configured correctly in the shoot manifest.

If pods fail to get sidecars, check the webhook configuration:

```bash
kubectl get mutatingwebhookconfigurations | grep istio
```

If there are network connectivity issues between pods, review the Gardener-managed NetworkPolicies:

```bash
kubectl get networkpolicies --all-namespaces
```

Gardener provides a clean, managed Kubernetes experience, and Istio fits well on top of it. The main thing to be aware of is the NetworkPolicy setup and the cloud-specific load balancer configuration. Once those are sorted, Istio runs the same way on a Gardener shoot as it does on any other Kubernetes cluster.
