# How to Install Istio with Helm Charts on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Kubernetes, Service Mesh, DevOps

Description: A practical guide to installing Istio on Kubernetes using Helm charts, covering base components, istiod, and gateway setup.

---

Helm is one of the most popular ways to install Istio, especially if your team already uses Helm for managing other Kubernetes applications. Compared to istioctl, Helm gives you better integration with GitOps workflows and makes it easier to manage Istio as part of your broader infrastructure-as-code strategy.

## Why Use Helm for Istio

There are a few solid reasons to pick Helm over istioctl:

- Helm fits naturally into existing CI/CD pipelines
- You can manage Istio configuration in version-controlled values files
- Helm's upgrade and rollback mechanisms work well for production environments
- It integrates with tools like ArgoCD and Flux for GitOps deployments

The tradeoff is that Helm installation requires a bit more setup since you need to install multiple charts in the right order.

## Prerequisites

You'll need:

- Kubernetes cluster version 1.25+
- Helm 3.6 or later
- kubectl configured for your cluster
- Cluster admin permissions

Check your Helm version:

```bash
helm version
```

## Step 1: Add the Istio Helm Repository

First, add the official Istio Helm repository:

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

You can list available charts to see what's available:

```bash
helm search repo istio
```

This shows three main charts:

- `istio/base` - Istio CRDs and cluster-wide resources
- `istio/istiod` - The Istio control plane
- `istio/gateway` - Istio gateway (ingress/egress)

## Step 2: Create the istio-system Namespace

Unlike istioctl, the Helm charts don't automatically create the namespace. Do it manually:

```bash
kubectl create namespace istio-system
```

## Step 3: Install the Istio Base Chart

The base chart installs Istio's Custom Resource Definitions (CRDs) and other cluster-scoped resources. This must be installed first:

```bash
helm install istio-base istio/base -n istio-system --wait
```

Verify the CRDs were created:

```bash
kubectl get crds | grep istio
```

You should see CRDs like `virtualservices.networking.istio.io`, `destinationrules.networking.istio.io`, and others.

## Step 4: Install istiod

Next, install the control plane (istiod):

```bash
helm install istiod istio/istiod -n istio-system --wait
```

This deploys istiod, which handles service discovery, configuration distribution, certificate management, and sidecar injection.

Check that istiod is running:

```bash
kubectl get pods -n istio-system
```

```text
NAME                      READY   STATUS    RESTARTS   AGE
istiod-6c8d5f7b8-x9k2m   1/1     Running   0          45s
```

## Step 5: Install the Ingress Gateway

The gateway chart deploys an Envoy-based ingress gateway. You can install it in the istio-system namespace or a separate one:

```bash
kubectl create namespace istio-ingress
helm install istio-ingress istio/gateway -n istio-ingress --wait
```

Verify the gateway is running:

```bash
kubectl get pods -n istio-ingress
kubectl get svc -n istio-ingress
```

## Customizing the Installation with Values

One of Helm's biggest advantages is how easy it is to customize installations. Create a values file for istiod:

```yaml
# istiod-values.yaml
pilot:
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 1Gi
  autoscaleEnabled: true
  autoscaleMin: 2
  autoscaleMax: 5

meshConfig:
  accessLogFile: /dev/stdout
  enableTracing: true
  defaultConfig:
    tracing:
      sampling: 100
```

Install with the values file:

```bash
helm install istiod istio/istiod -n istio-system -f istiod-values.yaml --wait
```

For the gateway, you might want to customize the service type or add annotations for cloud load balancers:

```yaml
# gateway-values.yaml
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
  ports:
    - name: http2
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443
```

```bash
helm install istio-ingress istio/gateway -n istio-ingress -f gateway-values.yaml --wait
```

## Step 6: Enable Sidecar Injection

Label the namespaces where you want automatic sidecar injection:

```bash
kubectl label namespace default istio-injection=enabled
```

## Step 7: Verify Everything Works

Deploy a test application to make sure sidecars get injected properly:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/bookinfo/platform/kube/bookinfo.yaml
```

Check the pods:

```bash
kubectl get pods
```

Every pod should show 2/2 containers (the app container plus the Envoy sidecar).

## Upgrading Istio with Helm

Upgrading is one area where Helm really shines. Update your repo first:

```bash
helm repo update
```

Then upgrade each component in order - base first, then istiod, then gateways:

```bash
helm upgrade istio-base istio/base -n istio-system
helm upgrade istiod istio/istiod -n istio-system --wait
helm upgrade istio-ingress istio/gateway -n istio-ingress --wait
```

You can also do canary upgrades by installing a new revision of istiod alongside the existing one:

```bash
helm install istiod-canary istio/istiod -n istio-system \
  --set revision=canary \
  --wait
```

Then migrate workloads namespace by namespace by changing the injection label:

```bash
kubectl label namespace default istio.io/rev=canary --overwrite
kubectl rollout restart deployment -n default
```

## Uninstalling Istio with Helm

Remove the components in reverse order:

```bash
helm uninstall istio-ingress -n istio-ingress
helm uninstall istiod -n istio-system
helm uninstall istio-base -n istio-system
```

Clean up the namespaces:

```bash
kubectl delete namespace istio-ingress
kubectl delete namespace istio-system
```

If you also want to remove the CRDs (be careful - this deletes all Istio custom resources):

```bash
kubectl get crd -oname | grep --color=never 'istio.io' | xargs kubectl delete
```

## Helm vs istioctl: When to Use Which

Helm works best when:

- You're using GitOps and want Istio managed through Helm values files
- Your team is already comfortable with Helm
- You need to integrate Istio into existing Helm-based deployment pipelines
- You want easy rollback capabilities

istioctl works best when:

- You want the simplest possible installation experience
- You need advanced analysis and debugging tools
- You're doing a quick test or proof of concept
- You want built-in pre-flight checks and configuration validation

Both approaches produce the same end result - a working Istio mesh. The difference is mainly in the workflow and tooling around the installation.

## Common Issues and Fixes

If the base chart installation fails with CRD-related errors, make sure you don't have leftover CRDs from a previous Istio installation:

```bash
kubectl get crds | grep istio
```

If istiod can't start, check pod events and logs:

```bash
kubectl describe pod -l app=istiod -n istio-system
kubectl logs -l app=istiod -n istio-system
```

If the gateway service stays in Pending state for the external IP, your cluster might not have a load balancer controller. Switch to NodePort:

```bash
helm upgrade istio-ingress istio/gateway -n istio-ingress \
  --set service.type=NodePort
```

That covers the full Helm-based installation workflow for Istio. Once you have the charts configured the way you want, you can check those values files into git and have a fully reproducible Istio setup for any cluster.
