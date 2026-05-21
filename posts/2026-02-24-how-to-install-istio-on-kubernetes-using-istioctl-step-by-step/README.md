# How to Install Istio on Kubernetes Using istioctl Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Istioctl, DevOps

Description: A complete step-by-step guide to installing Istio on Kubernetes using the istioctl CLI tool with practical commands and verification steps.

---

If you're looking to add a service mesh to your Kubernetes cluster, istioctl is probably the most straightforward way to get Istio up and running. It's the official CLI tool from the Istio project, and it gives you fine-grained control over the installation process without needing extra tooling like Helm.

## Prerequisites

Before you start, make sure you have:

- A running Kubernetes cluster with a version supported by your Istio release (Istio 1.30 supports Kubernetes 1.32 through 1.36)
- kubectl configured and pointing to your cluster
- Sufficient cluster resources (at least 4 vCPUs and 8 GB RAM recommended)

You can verify your cluster is ready with:

```bash
kubectl cluster-info
kubectl get nodes
```

## Step 1: Download Istio

First, grab the latest Istio release. The easiest way is using the official download script:

```bash
curl -L https://istio.io/downloadIstio | sh -
```

This downloads the latest release and extracts it into a directory named something like `istio-1.30.0`. If you want a specific version, you can set it:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.30.0 sh -
```

Now move into the Istio directory:

```bash
cd istio-1.30.0
```

## Step 2: Add istioctl to Your PATH

The istioctl binary lives in the `bin/` directory inside the release. Add it to your PATH so you can use it from anywhere:

```bash
export PATH=$PWD/bin:$PATH
```

For a more permanent setup, copy it to a directory already in your PATH:

```bash
sudo cp bin/istioctl /usr/local/bin/
```

Verify it works:

```bash
istioctl version
```

You should see the client version printed out. The server version will show as "not connected" since Istio isn't installed yet.

## Step 3: Run Pre-Installation Checks

Before installing, run the pre-check command to make sure your cluster meets all requirements:

```bash
istioctl x precheck
```

This checks things like Kubernetes version compatibility, RBAC permissions, and whether any existing installations might conflict. If everything looks good, you'll see a message confirming the cluster is ready.

## Step 4: Install Istio

Now for the actual installation. The simplest command uses the default profile:

```bash
istioctl install --set profile=default -y
```

The `-y` flag skips the confirmation prompt. The default profile installs:

- istiod (the control plane)
- An ingress gateway

You'll see output showing each component being installed. It typically takes a minute or two depending on your cluster.

```text
✔ Istio core installed
✔ Istiod installed
✔ Ingress gateways installed
✔ Installation complete
```

## Step 5: Verify the Installation

Check that all Istio components are running:

```bash
kubectl get pods -n istio-system
```

You should see something like:

```text
NAME                                    READY   STATUS    RESTARTS   AGE
istio-ingressgateway-5d6b8c5f5-abcde   1/1     Running   0          2m
istiod-7f4c8d6b9-fghij                 1/1     Running   0          2m
```

Also verify the services:

```bash
kubectl get svc -n istio-system
```

You can also use istioctl to analyze the mesh configuration:

```bash
istioctl analyze
```

This checks your cluster configuration and flags validation issues that could affect the mesh.

## Step 6: Enable Sidecar Injection

Istio works by injecting an Envoy sidecar proxy into each pod. The easiest way to enable this is by labeling a namespace:

```bash
kubectl label namespace default istio-injection=enabled
```

From now on, any pod deployed to the default namespace will automatically get an Envoy sidecar. You can verify the label:

```bash
kubectl get namespace default --show-labels
```

## Step 7: Deploy a Test Application

To make sure everything is working, deploy a sample application. Istio ships with the Bookinfo sample app:

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
```

Wait for the pods to come up:

```bash
kubectl get pods
```

Each pod should show 2/2 in the READY column - one container for the app and one for the Envoy sidecar.

## Step 8: Expose the Application Through the Gateway

Create a Gateway and VirtualService to make the app accessible from outside the cluster:

```bash
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Find the ingress gateway's external IP:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

If you're on a cloud provider, you'll see an external IP or hostname in the EXTERNAL-IP column. Set it as a variable:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$INGRESS_HOST" ]; then
  export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
export GATEWAY_URL=$INGRESS_HOST:$INGRESS_PORT
```

Test it:

```bash
curl -s "http://${GATEWAY_URL}/productpage" | head -20
```

## Customizing the Installation

The default profile is just one option. You can customize your installation using the IstioOperator API:

```yaml
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
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

Save this as `custom-install.yaml` and apply it:

```bash
istioctl install -f custom-install.yaml -y
```

## Useful istioctl Commands

Once Istio is installed, istioctl becomes your go-to tool for debugging and managing the mesh:

```bash
# Check proxy status for all sidecars

istioctl proxy-status

# Analyze your configuration for issues
istioctl analyze

# Check the configuration of a specific pod's proxy
istioctl proxy-config routes deploy/productpage-v1

# Open the proxy dashboard for a pod
istioctl dashboard proxy deploy/productpage-v1
```

## Upgrading Istio

When a new version comes out, upgrading with istioctl is straightforward. Download the new version, then run:

```bash
istioctl upgrade -y
```

This performs an in-place upgrade of the control plane and gateways. For production environments, Istio recommends revision-based canary upgrades for a safer rollout.

## Uninstalling Istio

If you need to remove Istio completely:

```bash
istioctl uninstall --purge -y
kubectl delete namespace istio-system
```

The `--purge` flag removes all Istio resources, including cluster-scoped resources that may be shared with other Istio control planes.

## Troubleshooting Common Issues

If pods aren't getting sidecars injected, check that the namespace label is set and that the MutatingWebhookConfiguration exists:

```bash
kubectl get mutatingwebhookconfiguration
```

If the ingress gateway doesn't get an external IP, your cluster might not support LoadBalancer services. In that case, use NodePort or set up port forwarding:

```bash
kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80
```

If istiod fails to start, check its logs:

```bash
kubectl logs -n istio-system deploy/istiod
```

The most common issue is insufficient RBAC permissions or resource constraints. Make sure your cluster has enough capacity and that your user has cluster-admin privileges.

## Wrapping Up

Installing Istio with istioctl gives you a clean, repeatable process that's easy to customize and troubleshoot. The CLI tool handles all the heavy lifting - creating the namespace, deploying the control plane, setting up webhooks for sidecar injection, and configuring the ingress gateway. Once you've gone through this process once, subsequent installations become second nature.
