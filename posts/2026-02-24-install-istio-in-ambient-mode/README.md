# How to Install Istio in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Installation, Kubernetes, Service Mesh

Description: Complete installation guide for Istio ambient mode using istioctl, Helm, and the Istio Operator with verification steps and troubleshooting tips.

---

Installing Istio in ambient mode is straightforward, but there are a few things you need to know that differ from the traditional sidecar installation. The ambient profile installs different components - ztunnel and istio-cni instead of the sidecar injector - and the installation method you choose affects how you manage upgrades later.

This guide covers three installation methods: istioctl, Helm, and the Istio Operator.

## Prerequisites

Before installing, check your environment:

```bash
# Kubernetes version 1.27+
kubectl version

# istioctl version 1.22+ (1.24+ recommended for GA ambient features)
istioctl version --remote=false
```

Download istioctl if you do not have it:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
export PATH=$HOME/istio-1.24.0/bin:$PATH
```

Run the pre-flight check:

```bash
istioctl x precheck
```

This validates that your cluster meets the requirements for Istio installation.

## Method 1: istioctl Install

The simplest method. One command does everything:

```bash
istioctl install --set profile=ambient -y
```

The ambient profile installs these components:
- **istiod**: The control plane that manages configuration and certificate issuance
- **ztunnel**: A DaemonSet that runs on every node, handling L4 mTLS and traffic tunneling
- **istio-cni**: A DaemonSet that configures traffic interception in the node's network stack

If you need to customize the installation, pass additional `--set` flags:

```bash
istioctl install --set profile=ambient \
  --set values.global.proxy.resources.requests.memory=128Mi \
  --set values.cni.resources.requests.memory=64Mi \
  -y
```

You can also use an IstioOperator manifest for more complex customizations:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: ambient-install
spec:
  profile: ambient
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: false
  values:
    ztunnel:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
    cni:
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
```

Apply it:

```bash
istioctl install -f ambient-config.yaml -y
```

## Method 2: Helm Install

Helm gives you more control over each component and is the preferred method for production installations because it integrates well with GitOps workflows.

Add the Istio Helm repository:

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

Install the components in order. The CRDs go first:

```bash
helm install istio-base istio/base -n istio-system --create-namespace
```

Then install istiod with ambient-compatible settings:

```bash
helm install istiod istio/istiod -n istio-system --wait
```

Install the CNI plugin:

```bash
helm install istio-cni istio/cni -n istio-system --wait
```

Install ztunnel:

```bash
helm install ztunnel istio/ztunnel -n istio-system --wait
```

Verify all components:

```bash
helm list -n istio-system
```

To customize values, create a values file:

```yaml
# ztunnel-values.yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    memory: 512Mi
```

```bash
helm install ztunnel istio/ztunnel -n istio-system \
  -f ztunnel-values.yaml --wait
```

## Method 3: Istio Operator

The Istio Operator watches for IstioOperator custom resources and manages the installation:

```bash
istioctl operator init
```

Then create an IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: ambient
  namespace: istio-system
spec:
  profile: ambient
```

```bash
kubectl apply -f ambient-operator.yaml
```

The operator will reconcile the installation. Check its progress:

```bash
kubectl get istiooperator -n istio-system
kubectl logs -l name=istio-operator -n istio-operator --tail=50
```

Note: The Istio project recommends istioctl or Helm over the Operator for new installations. The Operator is still supported but is not the primary focus going forward.

## Verifying the Installation

After installation, regardless of method, verify everything is running:

```bash
kubectl get pods -n istio-system
```

Expected output (pod names will vary):

```text
NAME                      READY   STATUS    RESTARTS   AGE
istiod-7d8c7f5b4-abcde   1/1     Running   0          2m
ztunnel-node1             1/1     Running   0          2m
ztunnel-node2             1/1     Running   0          2m
istio-cni-node-abc        1/1     Running   0          2m
istio-cni-node-def        1/1     Running   0          2m
```

Check that ztunnel is running on every node:

```bash
kubectl get ds ztunnel -n istio-system
```

The DESIRED and READY columns should match your node count.

Run the built-in verification:

```bash
istioctl verify-install
```

Check that the ambient profile components are present and the sidecar injector is not:

```bash
kubectl get mutatingwebhookconfigurations | grep istio
```

With ambient mode, you should not see a sidecar injector webhook.

## Installing Telemetry Addons

The telemetry addons (Grafana, Kiali, Prometheus, Jaeger) work the same way regardless of ambient or sidecar mode:

```bash
kubectl apply -f samples/addons/
kubectl rollout status deployment/kiali -n istio-system
```

## Installing the Ingress Gateway

The ambient profile does not include an ingress gateway by default. Install it separately if you need one:

```bash
# Using istioctl
istioctl install --set profile=ambient \
  --set components.ingressGateways[0].name=istio-ingressgateway \
  --set components.ingressGateways[0].enabled=true -y

# Or using Helm
helm install istio-ingress istio/gateway -n istio-system
```

## Common Installation Issues

### ztunnel Pods in CrashLoopBackOff

This usually means ztunnel cannot connect to istiod. Check the logs:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=50
```

Common causes: istiod is not running yet, or there is a network policy blocking communication within istio-system.

### istio-cni Pods Failing

The CNI plugin needs host-level access. Check if your cluster has a restrictive PodSecurityPolicy or PodSecurityStandard:

```bash
kubectl logs -l k8s-app=istio-cni-node -n istio-system --tail=50
```

On some managed Kubernetes platforms, you may need to configure CNI plugin settings. For example, on GKE:

```bash
helm install istio-cni istio/cni -n istio-system \
  --set cni.cniBinDir=/home/kubernetes/bin
```

### Traffic Not Being Intercepted

If ztunnel is running but traffic between labeled namespaces is not encrypted, check that istio-cni is properly installed:

```bash
kubectl get ds istio-cni-node -n istio-system
```

Also verify your namespace label:

```bash
kubectl get ns your-namespace --show-labels | grep dataplane-mode
```

## Uninstalling

If you need to remove the installation:

```bash
# istioctl
istioctl uninstall --purge -y
kubectl delete namespace istio-system

# Helm (reverse order)
helm uninstall ztunnel -n istio-system
helm uninstall istio-cni -n istio-system
helm uninstall istiod -n istio-system
helm uninstall istio-base -n istio-system
```

Remove the namespace labels from any enrolled namespaces first:

```bash
kubectl label namespace bookinfo istio.io/dataplane-mode-
```

The installation method you choose matters most for day-two operations. If your team uses Helm and ArgoCD, go with Helm. If you prefer simplicity and are just getting started, istioctl is the fastest path. Either way, the ambient mode components are the same.
