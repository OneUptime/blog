# How to Set Up Istio on Talos Linux Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Talos Linux, Kubernetes, Service Mesh, Immutable OS

Description: A hands-on guide for installing and configuring Istio on Talos Linux, the immutable and minimal Kubernetes operating system.

---

Talos Linux is a different kind of operating system for Kubernetes. It is immutable, has no SSH access, no shell, and is managed entirely through an API. Everything about it is designed to run Kubernetes and nothing else. Installing Istio on Talos requires understanding how Talos handles networking and system configuration, because you cannot just SSH into the machine and tweak things when something goes wrong.

## Prerequisites

- Talos Linux cluster (version 1.6+) with at least one control plane and one worker node
- `talosctl` configured to communicate with your cluster
- `kubectl` configured with the kubeconfig from Talos
- `istioctl` installed (version 1.20+)
- At least 4GB RAM per worker node

## Getting Your Talos Cluster Ready

If you are starting from scratch, here is a quick overview of Talos cluster creation. Generate machine configurations:

```bash
talosctl gen config my-cluster https://10.0.0.2:6443
```

This creates `controlplane.yaml` and `worker.yaml` files. Apply them to your nodes:

```bash
talosctl apply-config --insecure --nodes 10.0.0.2 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.0.0.3 --file worker.yaml
```

Bootstrap the cluster:

```bash
talosctl bootstrap --nodes 10.0.0.2 --endpoints 10.0.0.2
```

Get the kubeconfig:

```bash
talosctl kubeconfig --nodes 10.0.0.2 --endpoints 10.0.0.2
```

Verify the cluster:

```bash
kubectl get nodes
```

## Understanding Talos Constraints

There are several things about Talos that affect Istio installation:

**No shell access**: You cannot SSH into Talos nodes. All debugging happens through `talosctl` commands like `talosctl logs`, `talosctl dmesg`, and `talosctl read`.

**Immutable filesystem**: The root filesystem is read-only. Istio's CNI plugin, if you choose to use it, needs the right mount paths.

**Flannel CNI by default**: Talos ships with Flannel as the default CNI. You can replace it with Cilium or other CNIs through the machine configuration.

**No package manager**: You cannot install tools on the nodes. Everything runs as containers.

## Step 1: Configure Talos for Istio CNI (Optional)

If you want to use Istio's CNI plugin instead of the init container approach, you need to configure Talos to allow the CNI paths. Patch your machine config:

```yaml
machine:
  kubelet:
    extraMounts:
      - destination: /opt/cni/bin
        type: bind
        source: /opt/cni/bin
        options:
          - bind
          - rshared
          - rw
```

Apply the patch:

```bash
talosctl patch machineconfig --nodes 10.0.0.3 --patch-file cni-mount-patch.yaml
```

However, for most setups, skipping the CNI plugin and using the default init container approach is simpler and works fine.

## Step 2: Create IstioOperator Configuration

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-talos
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
          limits:
            cpu: 500m
            memory: 512Mi
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            type: NodePort
            ports:
              - port: 80
                targetPort: 8080
                nodePort: 30080
                name: http2
              - port: 443
                targetPort: 8443
                nodePort: 30443
                name: https
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 300m
            memory: 256Mi
```

Save this as `istio-talos.yaml`.

## Step 3: Install Istio

```bash
istioctl install -f istio-talos.yaml -y
```

Watch the installation:

```bash
kubectl get pods -n istio-system -w
```

Verify:

```bash
istioctl verify-install
```

Both `istiod` and `istio-ingressgateway` should be running.

## Step 4: Handle Load Balancer

Since Talos runs on bare metal or VMs without a cloud load balancer, you have a few options:

**Option A: NodePort (already configured above)**

Access services via `<node-ip>:30080`.

**Option B: MetalLB**

Install MetalLB for proper LoadBalancer support:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
```

Configure an IP pool:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: istio-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.0.0.200-10.0.0.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
```

Then update the Istio ingress gateway to use LoadBalancer type:

```bash
kubectl patch svc istio-ingressgateway -n istio-system -p '{"spec":{"type":"LoadBalancer"}}'
```

## Step 5: Deploy and Test

Label the namespace and deploy a test app:

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/bookinfo/platform/kube/bookinfo.yaml
```

Create the gateway:

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
      route:
        - destination:
            host: productpage
            port:
              number: 9080
```

```bash
kubectl apply -f bookinfo-gw.yaml
```

Test:

```bash
curl http://10.0.0.3:30080/productpage
```

## Step 6: Debugging on Talos

Since you cannot SSH into Talos nodes, use these commands for troubleshooting:

Check system logs:

```bash
talosctl dmesg --nodes 10.0.0.3
```

Check kubelet logs:

```bash
talosctl logs kubelet --nodes 10.0.0.3
```

Check container runtime logs:

```bash
talosctl logs containerd --nodes 10.0.0.3
```

For Istio-specific debugging, use the standard kubectl and istioctl commands:

```bash
istioctl analyze
istioctl proxy-status
kubectl logs -n istio-system deployment/istiod
```

Check proxy configuration for a specific pod:

```bash
istioctl proxy-config clusters <pod-name>
istioctl proxy-config routes <pod-name>
istioctl proxy-config listeners <pod-name>
```

## Using Cilium Instead of Flannel

Many Talos users replace Flannel with Cilium for better networking features. If you go this route, disable Flannel in the Talos machine config:

```yaml
cluster:
  network:
    cni:
      name: none
```

Then install Cilium:

```bash
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=10.0.0.2 \
  --set k8sServicePort=6443
```

Cilium and Istio work well together. Cilium handles L3/L4 networking while Istio handles L7 traffic management.

## Upgrading Istio on Talos

Upgrading Istio follows the standard process:

```bash
istioctl upgrade -f istio-talos.yaml -y
kubectl rollout restart deployment --all -n default
```

Upgrading Talos itself requires care because it replaces the entire OS image:

```bash
talosctl upgrade --image ghcr.io/siderolabs/installer:v1.7.0 --nodes 10.0.0.3
```

Talos upgrades are rolling by design. The kubelet restarts, and Istio sidecars in pods continue working during the upgrade. However, if the node is drained, pods will be rescheduled to other nodes.

## Production Considerations

For production Talos clusters with Istio, consider running multiple control plane nodes and scaling istiod to at least 2 replicas. Also consider enabling Istio's PeerAuthentication in STRICT mode for mTLS everywhere:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Talos's immutable nature actually complements Istio's security model nicely. The nodes themselves are hardened, and Istio secures the communication between workloads.
