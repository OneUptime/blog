# How to Install Istio from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Istio, Service Mesh, DevOps

Description: A step-by-step guide to installing Istio service mesh on a Kubernetes cluster managed by Rancher.

Istio is a powerful open-source service mesh that provides traffic management, observability, and security features for microservices running on Kubernetes. Rancher makes it straightforward to deploy and manage Istio through its built-in Apps catalog. Rancher-Istio is deprecated starting in Rancher v2.12.0, so newer Rancher deployments should use the SUSE Rancher Application Collection build of Istio. This guide walks you through the complete installation process.

## Prerequisites

Before installing Istio from Rancher, ensure you have the following in place:

- A Rancher installation with the Istio chart available in **Apps** → **Charts**
- A downstream Kubernetes cluster whose worker nodes meet Rancher's Istio CPU and memory recommendations
- If you are installing on RKE2, complete Rancher's additional Istio CNI and overlay configuration first
- `kubectl` configured to communicate with your cluster
- Cluster admin privileges in Rancher

## Step 1: Locate the Istio Chart

Rancher exposes Istio as a chart in the cluster's Apps catalog. First, verify that the chart is available in your Rancher instance.

1. Log in to the Rancher UI
2. Navigate to **Cluster Management** and open your target cluster with **Explore**
3. Go to **Apps** → **Charts**
4. Search for **Istio** in the catalog

## Step 2: Configure Namespace and Resource Requirements

Istio components are typically installed into the `istio-system` namespace. Rancher can create it during installation if it does not already exist.

Recommended resource allocations for a production setup:

| Component | CPU Request | Memory Request |
|---|---|---|
| istiod | 500m | 2Gi |
| istio-ingressgateway | 100m | 128Mi |
| istio-egressgateway | 100m | 128Mi |

## Step 3: Install Istio via Rancher Apps

1. In the Rancher UI, navigate to **Apps** → **Charts** on your target cluster
2. Locate the **Istio** chart and click **Install**
3. If Rancher prompts you to install `rancher-monitoring`, complete that step before continuing
4. Select the namespace `istio-system` (create it if it does not exist)
5. Configure the Helm values as needed

```yaml
# Example values.yaml for the Rancher `rancher-istio` chart

ingressGateways:
  enabled: true
  type: LoadBalancer

egressGateways:
  # Egress is disabled by default; enable it only if you need it
  enabled: true

overlayFile: |-
  apiVersion: install.istio.io/v1alpha1
  kind: IstioOperator
  spec:
    components:
      pilot:
        k8s:
          resources:
            requests:
              cpu: 500m
              memory: 2048Mi
      ingressGateways:
      - name: istio-ingressgateway
        k8s:
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
      egressGateways:
      - name: istio-egressgateway
        k8s:
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

6. Click **Install** to deploy Istio

## Step 4: Verify the Installation

After the installation completes, verify all Istio pods are running:

```bash
# Check that all Istio components are running
kubectl get pods -n istio-system

# Expected output includes at least:
# NAME                                   READY   STATUS    RESTARTS   AGE
# istiod-xxxxxxxxx-xxxxx                 1/1     Running   0          2m
# istio-ingressgateway-xxxxxxxxx-xxxxx   1/1     Running   0          2m
# If you enabled the egress gateway, you should also see:
# istio-egressgateway-xxxxxxxxx-xxxxx    1/1     Running   0          2m
```

```bash
# Verify the Istio services were created
kubectl get services -n istio-system

# Check the Istio mesh ConfigMap
kubectl get configmap istio -n istio-system -o yaml
```

## Step 5: Install istioctl (Optional but Recommended)

The `istioctl` CLI provides additional management capabilities:

```bash
# Download the latest istioctl binary
curl -sL https://istio.io/downloadIstioctl | sh -

# Add istioctl to your PATH
export PATH=$HOME/.istioctl/bin:$PATH

# Verify the installation
istioctl version

# Analyze your cluster's Istio configuration
istioctl analyze
```

## Step 6: Enable Istio Injection for Namespaces

To have Istio automatically inject sidecar proxies into new application pods, label your namespaces:

```bash
# Enable automatic sidecar injection for a namespace
kubectl label namespace default istio-injection=enabled --overwrite

# Verify the label was applied
kubectl get namespace default --show-labels
```

## Monitoring Istio with OneUptime

After installing Istio, integrating with a monitoring platform like OneUptime helps you track the health of your service mesh. OneUptime can monitor your Istio ingress gateway endpoints and alert you when services become unavailable.

```bash
# Get the external IP or hostname of the Istio ingress gateway
kubectl get svc istio-ingressgateway -n istio-system

# Use this endpoint to configure monitors in OneUptime
```

## Conclusion

Installing Istio from Rancher is a streamlined process thanks to the built-in Apps catalog. Once installed, Istio provides a robust foundation for traffic management, observability, and security in your Kubernetes environment. The next steps are to enable sidecar injection in your application namespaces and configure traffic management policies to take full advantage of the service mesh capabilities.
