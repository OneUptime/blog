# How to Set Up Istio on Canonical MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MicroK8s, Kubernetes, Service Mesh, Canonical, Ubuntu

Description: A complete guide to enabling and configuring Istio service mesh on Canonical MicroK8s with built-in add-on support and custom configurations.

---

MicroK8s from Canonical is one of those Kubernetes distributions that keeps things simple. It installs as a snap package, and it comes with a bunch of add-ons you can toggle on and off, including Istio. The interesting thing about MicroK8s is that you can either use the built-in Istio add-on for a quick setup or do a manual installation with `istioctl` for more control. This guide covers both approaches.

## Prerequisites

- Ubuntu 20.04+ (or any Linux with snap support)
- At least 4GB RAM and 2 CPUs
- MicroK8s installed (version 1.26+)
- For manual installation: `istioctl` (version 1.20+)

## Installing MicroK8s

If you do not have MicroK8s yet:

```bash
sudo snap install microk8s --classic --channel=1.28/stable
sudo usermod -a -G microk8s $USER
newgrp microk8s
```

Wait for it to be ready:

```bash
microk8s status --wait-ready
```

## Option 1: Using the Built-In Istio Add-on

MicroK8s has a community add-on for Istio. Enable the required prerequisites first:

```bash
microk8s enable dns
microk8s enable storage
microk8s enable metallb:192.168.1.200-192.168.1.220
```

The MetalLB range should match available IPs on your network.

Now enable the Istio add-ons:

```bash
microk8s enable community
microk8s enable istio
```

This installs Istio with the default profile. Check the status:

```bash
microk8s kubectl get pods -n istio-system
```

The add-on approach is convenient but gives you limited control over the configuration. For production use, the manual approach is better.

## Option 2: Manual Installation with istioctl

This is the recommended approach if you want full control. First, set up an alias or export your kubeconfig so `istioctl` can talk to MicroK8s:

```bash
microk8s config > ~/.kube/config
```

Or if you already have a kubeconfig for another cluster:

```bash
microk8s config > ~/.kube/microk8s-config
export KUBECONFIG=~/.kube/microk8s-config
```

Make sure DNS and storage add-ons are enabled:

```bash
microk8s enable dns storage
```

Create an IstioOperator configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-microk8s
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    enableAutoMtls: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            type: LoadBalancer
```

If you have not enabled MetalLB, change the service type to NodePort:

```yaml
          service:
            type: NodePort
```

Install:

```bash
istioctl install -f istio-microk8s.yaml -y
```

Verify:

```bash
kubectl get pods -n istio-system
istioctl verify-install
```

## Handling MicroK8s-Specific CNI Configuration

MicroK8s uses Calico as its CNI when you enable it, or it falls back to a basic CNI. For Istio, the default CNI works fine, but if you enable the Calico add-on, you get network policy support:

```bash
microk8s enable calico
```

Istio also has its own CNI plugin that can replace the init container approach for setting up traffic redirection. To use it with MicroK8s:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    cni:
      enabled: true
  values:
    cni:
      cniBinDir: /var/snap/microk8s/current/opt/cni/bin
      cniConfDir: /var/snap/microk8s/current/args/cni-network
```

The paths here are specific to MicroK8s. Regular Kubernetes uses `/opt/cni/bin` and `/etc/cni/net.d`, but MicroK8s keeps everything under its snap directory.

## Enabling Sidecar Injection

Label your target namespace:

```bash
kubectl label namespace default istio-injection=enabled
```

Deploy a test workload:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/bookinfo/platform/kube/bookinfo.yaml
```

Check injection worked:

```bash
kubectl get pods
```

Every pod should show 2/2 in the READY column.

## Setting Up Ingress

Create the Gateway and VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: bookinfo-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: bookinfo
spec:
  hosts:
    - "*"
  gateways:
    - bookinfo-gateway
  http:
    - match:
        - uri:
            exact: /productpage
        - uri:
            prefix: /static
        - uri:
            prefix: /api/v1/products
      route:
        - destination:
            host: productpage
            port:
              number: 9080
```

Apply:

```bash
kubectl apply -f bookinfo-gateway.yaml
```

Get the ingress IP:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo $INGRESS_HOST
```

Test it:

```bash
curl http://$INGRESS_HOST/productpage
```

## Observability Stack

Install the Istio observability add-ons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

Alternatively, MicroK8s has its own observability add-on that can work alongside Istio:

```bash
microk8s enable observability
```

This installs a Prometheus/Grafana stack managed by MicroK8s. You can configure Prometheus to scrape Istio metrics by adding scrape configs for the `istio-system` namespace.

## Multi-Node MicroK8s Cluster

MicroK8s supports clustering. On the first node:

```bash
microk8s add-node
```

This prints a join command. On the second node:

```bash
microk8s join 192.168.1.100:25000/token-string
```

Istio runs on multi-node MicroK8s clusters without special configuration. Istiod and the gateway pods get scheduled normally, and sidecar injection works across all nodes.

## Using MicroK8s kubectl vs External kubectl

You can use either `microk8s kubectl` or an external `kubectl`. The MicroK8s version is handy because it is bundled, but the external version works fine with the exported kubeconfig.

If you want to use `istioctl dashboard` commands, you need the external kubectl configured:

```bash
istioctl dashboard kiali
istioctl dashboard grafana
istioctl dashboard jaeger
```

These commands open a browser to the respective dashboards.

## Upgrading

To upgrade Istio on MicroK8s:

If you used the add-on, upgrading MicroK8s may update the Istio version. Check:

```bash
microk8s status
```

For manual installations, use the standard Istio upgrade process:

```bash
istioctl upgrade -f istio-microk8s.yaml -y
```

Then restart your workloads:

```bash
kubectl rollout restart deployment --all -n default
```

## Troubleshooting

**Snap confinement issues**: MicroK8s runs in a snap, which means some filesystem paths are different. If Istio CNI plugin cannot find the right directories, double-check the snap paths.

**Permission errors**: Make sure your user is in the `microk8s` group and you have run `newgrp microk8s`.

**Storage class issues**: If PVCs are pending, enable the storage add-on: `microk8s enable hostpath-storage`.

**DNS resolution problems**: The `dns` add-on needs to be enabled before installing Istio. Without it, istiod cannot resolve Kubernetes service names.

MicroK8s makes getting started with Istio about as easy as it gets, especially with the built-in add-on. For more control, the manual `istioctl` approach works perfectly once you account for the snap-specific file paths.
