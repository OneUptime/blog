# How to Set Up Istio on k3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, K3s, Kubernetes, Service Mesh, Lightweight Kubernetes

Description: Step-by-step instructions for installing Istio service mesh on a k3s lightweight Kubernetes cluster with proper configuration and tuning.

---

k3s is a lightweight Kubernetes distribution from Rancher that strips away a lot of the bulk you find in full-blown Kubernetes installations. It is popular for edge computing, IoT, CI pipelines, and development environments. Getting Istio running on k3s takes a bit of extra attention because k3s ships with Traefik as the default ingress controller and uses SQLite instead of etcd by default. Here is how to get everything working cleanly.

## Prerequisites

You will need:

- A machine with at least 4GB RAM and 2 CPU cores (Istio is resource-hungry even on lightweight clusters)
- k3s installed (version 1.26+)
- `kubectl` configured to talk to your k3s cluster
- `istioctl` installed locally (version 1.20+)

## Installing k3s Without Traefik

The biggest gotcha with k3s and Istio is that k3s ships with Traefik as the default ingress controller. Traefik will conflict with Istio's ingress gateway because both try to handle incoming traffic. The cleanest solution is to install k3s without Traefik:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
```

If you already have k3s running with Traefik, you can disable it by editing the k3s service configuration:

```bash
sudo systemctl edit k3s
```

Add the `--disable=traefik` flag and restart:

```bash
sudo systemctl restart k3s
```

Verify Traefik is gone:

```bash
kubectl get pods -n kube-system | grep traefik
```

Nothing should show up.

Copy the kubeconfig so you can use it with `kubectl` and `istioctl`:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

## Step 1: Configure Istio for k3s

k3s uses Flannel as the default CNI and does not have some of the components that a full Kubernetes distribution includes. Create an IstioOperator configuration tuned for k3s:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-k3s
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 300m
            memory: 384Mi
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
          service:
            type: LoadBalancer
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

Save this as `istio-k3s.yaml`.

The resource limits here are intentionally lower than the defaults because k3s environments typically run on constrained hardware. Adjust these numbers based on your actual capacity.

## Step 2: Install Istio

Run the installation:

```bash
istioctl install -f istio-k3s.yaml -y
```

Watch the pods come up:

```bash
kubectl get pods -n istio-system -w
```

You should see two pods eventually reach Running status: `istiod` and `istio-ingressgateway`.

If the ingress gateway service stays in `Pending` state, that is because k3s's built-in ServiceLB (formerly Klipper) might need a moment. Check it:

```bash
kubectl get svc -n istio-system istio-ingressgateway
```

On a single-node k3s cluster, the external IP will be your node's IP address.

## Step 3: Handle k3s-Specific Networking

k3s uses Flannel VXLAN by default, which works fine with Istio. However, if you are running k3s with the `--flannel-backend=none` option and using a different CNI, make sure that CNI supports the network policies Istio relies on.

One thing that trips people up is that k3s's built-in load balancer (ServiceLB) creates DaemonSet pods for each LoadBalancer service. You can check these:

```bash
kubectl get pods -n kube-system -l svccontroller.k3s.cattle.io/svcname=istio-ingressgateway
```

If you prefer using MetalLB instead:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
```

Then configure an IP pool:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
```

## Step 4: Enable Sidecar Injection

Label your application namespace:

```bash
kubectl label namespace default istio-injection=enabled
```

Deploy a test application:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/bookinfo/platform/kube/bookinfo.yaml
```

Verify the sidecars got injected:

```bash
kubectl get pods
```

Each pod should show 2/2 in the READY column, indicating the application container plus the Envoy sidecar.

## Step 5: Set Up Ingress

Create a Gateway and VirtualService:

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
            prefix: /productpage
      route:
        - destination:
            host: productpage
            port:
              number: 9080
```

Apply it:

```bash
kubectl apply -f bookinfo-gateway.yaml
```

Get the external IP and test:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_HOST/productpage
```

## Step 6: Install Observability Add-ons

Even on a lightweight k3s cluster, you probably want some observability. Install Kiali, Prometheus, and Grafana with reduced resource requirements:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
```

Access Kiali:

```bash
istioctl dashboard kiali
```

## Performance Tuning for k3s

On resource-constrained k3s nodes, consider these optimizations:

Reduce the proxy concurrency to limit CPU usage by each sidecar:

```yaml
meshConfig:
  defaultConfig:
    concurrency: 1
```

Disable features you do not need. For example, if you are not using Istio's DNS proxying:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "false"
```

Use the `minimal` profile instead of `default` if you do not need the ingress gateway:

```bash
istioctl install --set profile=minimal -y
```

## Multi-Node k3s Clusters

If you are running a multi-node k3s cluster with server and agent nodes, Istio works out of the box. The istiod control plane will run on one of the server nodes, and sidecars get injected into pods wherever they are scheduled.

For high availability, run multiple istiod replicas:

```yaml
components:
  pilot:
    k8s:
      replicaCount: 2
```

Just make sure your k3s cluster has at least 2 server nodes for this to make sense.

## Common Pitfalls

**Memory pressure**: k3s on small VMs can run into OOM issues when Istio is added. Monitor memory usage closely with `kubectl top pods -n istio-system`.

**CNI conflicts**: If you installed k3s with a custom CNI, verify it supports the iptables rules Istio needs for traffic interception.

**Certificate issues**: k3s uses its own certificate management. Istio generates its own CA certificates, and these two do not conflict, but be aware of it if you are also using cert-manager.

Getting Istio running on k3s is totally doable with the right resource tuning and the Traefik conflict sorted out. The combination gives you a production-grade service mesh on hardware that would not normally support a full Kubernetes installation.
