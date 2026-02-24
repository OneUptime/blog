# How to Install Istio on MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MicroK8s, Kubernetes, Ubuntu, Service Mesh

Description: How to install and configure Istio on MicroK8s, Canonical's lightweight Kubernetes distribution, with addon and manual approaches.

---

MicroK8s is Canonical's lightweight Kubernetes distribution that runs on Ubuntu, macOS, and Windows. It's designed to be simple - you install it with snap and you have a working cluster in minutes. MicroK8s also has a built-in Istio addon, though you can also install Istio manually for more control.

This guide covers both approaches so you can pick the one that fits your needs.

## Prerequisites

- Ubuntu 20.04+ (or any OS with snap support)
- MicroK8s installed
- At least 4 GB RAM and 2 CPUs available

Install MicroK8s if you haven't:

```bash
sudo snap install microk8s --classic --channel=1.30
```

Add your user to the microk8s group so you don't need sudo:

```bash
sudo usermod -a -G microk8s $USER
sudo chown -R $USER ~/.kube
newgrp microk8s
```

Check the status:

```bash
microk8s status --wait-ready
```

## Option A: Using the Built-in Istio Addon

MicroK8s ships with an Istio addon. Enable DNS first (Istio needs it), then enable Istio:

```bash
microk8s enable dns
microk8s enable istio
```

The addon installer walks you through a few questions about which profile to use. For development, pick the demo profile. The installation takes a few minutes.

Check the status:

```bash
microk8s kubectl get pods -n istio-system
```

The advantage of the addon approach is simplicity. The disadvantage is that the Istio version might lag behind the upstream release.

## Option B: Manual Installation (Recommended)

For more control over the version and configuration, install Istio manually.

### Step 1: Enable Required Addons

MicroK8s uses addons for core Kubernetes features. Enable what Istio needs:

```bash
microk8s enable dns
microk8s enable rbac
microk8s enable storage
```

### Step 2: Set Up kubectl

MicroK8s includes its own kubectl. You can either use `microk8s kubectl` or configure your system kubectl to connect to MicroK8s:

```bash
microk8s config > ~/.kube/config
```

Now regular kubectl commands work:

```bash
kubectl get nodes
```

### Step 3: Download Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

### Step 4: Install Istio

Run the pre-check:

```bash
istioctl x precheck
```

Install with the demo profile:

```bash
istioctl install --set profile=demo -y
```

Verify:

```bash
kubectl get pods -n istio-system
```

## Enabling MetalLB for LoadBalancer Support

MicroK8s doesn't have a cloud load balancer, so the ingress gateway will stay in Pending state. MicroK8s includes a MetalLB addon that solves this:

```bash
microk8s enable metallb:10.64.140.43-10.64.140.49
```

The IP range should be in a range that's routable on your network. For a local machine, you can use any range that doesn't conflict with your LAN.

After enabling MetalLB, check the ingress gateway:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

It should now have an external IP from the range you specified.

## Installing Addons

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/jaeger.yaml
```

## Testing with a Sample Application

Enable sidecar injection:

```bash
kubectl label namespace default istio-injection=enabled
```

Deploy Bookinfo:

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Wait for pods:

```bash
kubectl get pods -w
```

Get the gateway address:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_HOST/productpage
```

## MicroK8s Multi-Node Clusters with Istio

One cool feature of MicroK8s is how easy it is to create multi-node clusters. On the first node:

```bash
microk8s add-node
```

This prints a join command. Run it on the second node:

```bash
microk8s join 192.168.1.10:25000/token-goes-here
```

Istio works across all nodes automatically. The sidecars get injected regardless of which node the pod lands on, and istiod manages configuration distribution to all Envoy proxies across the cluster.

## Resource Tuning for MicroK8s

MicroK8s on a small machine (like a Raspberry Pi or a small VM) benefits from trimmed-down Istio settings:

```yaml
# istio-microk8s.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: minimal
  meshConfig:
    accessLogFile: /dev/stdout
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 10m
            memory: 40Mi
          limits:
            cpu: 200m
            memory: 128Mi
    pilot:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 10m
              memory: 40Mi
```

```bash
istioctl install -f istio-microk8s.yaml -y
```

## Using MicroK8s with Istio for Edge Computing

MicroK8s is popular for edge deployments, and Istio can add service mesh capabilities to edge clusters. The minimal profile keeps the overhead low enough for edge hardware:

- istiod: ~256 MB RAM
- Each sidecar: ~40-64 MB RAM
- Ingress gateway: ~40-64 MB RAM

For a cluster with 10 services, you're looking at roughly 1 GB of additional RAM for the full mesh.

## Troubleshooting MicroK8s + Istio

If DNS resolution fails inside pods (you'll see connection errors in Envoy), make sure the DNS addon is enabled and running:

```bash
microk8s status
kubectl get pods -n kube-system | grep coredns
```

If RBAC errors show up during installation, enable the RBAC addon:

```bash
microk8s enable rbac
```

If pods are stuck in ContainerCreating with network errors, restart MicroK8s:

```bash
microk8s stop
microk8s start
```

If sidecar injection isn't working, check that the MutatingWebhookConfiguration exists:

```bash
kubectl get mutatingwebhookconfigurations | grep istio
```

## Upgrading Istio on MicroK8s

If you used the addon, upgrade it through MicroK8s:

```bash
microk8s disable istio
microk8s enable istio
```

If you installed manually, use istioctl:

```bash
istioctl upgrade -y
```

## Cleaning Up

Remove Istio:

```bash
istioctl uninstall --purge -y
kubectl delete namespace istio-system
```

Or if using the addon:

```bash
microk8s disable istio
```

MicroK8s provides a really nice balance between simplicity and flexibility for running Istio. The addon approach gets you started in minutes, and the manual approach gives you full control. Either way, you end up with a functional service mesh on a lightweight Kubernetes platform.
