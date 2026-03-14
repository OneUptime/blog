# How to Set Up Istio on k0s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, K0s, Kubernetes, Service Mesh, Zero Friction Kubernetes

Description: Learn how to install and configure Istio service mesh on k0s, the zero-friction Kubernetes distribution from Mirantis.

---

k0s is a Kubernetes distribution from Mirantis that aims to be the simplest way to run production-grade Kubernetes. It packages everything into a single binary, and the "zero" in the name refers to zero friction, zero dependencies, and zero cost. Running Istio on top of k0s gives you a capable service mesh without the overhead of a full enterprise Kubernetes distribution. Here is the walkthrough.

## Prerequisites

You need:

- A Linux machine with at least 4GB RAM and 2 CPU cores
- k0s installed (version 1.28+)
- `kubectl` access to the k0s cluster
- `istioctl` installed (version 1.20+)

## Installing k0s

If you do not have k0s running yet, the installation is straightforward:

```bash
curl -sSLf https://get.k0s.sh | sudo sh
sudo k0s install controller --single
sudo k0s start
```

The `--single` flag creates a single-node cluster where the controller also runs workloads. For production, you would separate controllers and workers.

Get the kubeconfig:

```bash
sudo k0s kubeconfig admin > ~/.kube/config
chmod 600 ~/.kube/config
```

Verify the cluster is healthy:

```bash
kubectl get nodes
kubectl get pods -A
```

## Understanding k0s Specifics

k0s has a few characteristics that matter for Istio:

- It uses kube-router for network policies by default (or you can choose Calico)
- It does not include a default ingress controller, which is actually nice because there is nothing to conflict with Istio
- The control plane components run as a single process, not as pods
- It supports both containerd and Docker as container runtimes

The fact that k0s does not bundle an ingress controller means you do not have the Traefik conflict that plagues k3s installations.

## Step 1: Prepare the IstioOperator Configuration

Create a configuration file called `istio-k0s.yaml`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-k0s
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
            cpu: 150m
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
```

I am using NodePort here because k0s does not come with a cloud load balancer controller out of the box. If you have MetalLB or a similar solution, feel free to switch to LoadBalancer.

## Step 2: Install Istio

Run the installation:

```bash
istioctl install -f istio-k0s.yaml -y
```

Monitor the progress:

```bash
kubectl get pods -n istio-system -w
```

Wait until both `istiod` and `istio-ingressgateway` are in Running state. This typically takes 1-2 minutes.

Verify the installation:

```bash
istioctl verify-install
```

## Step 3: Configure Network Policy Compatibility

k0s uses kube-router for network policies by default. Istio's sidecar proxy uses iptables rules to intercept traffic, and these need to coexist with kube-router's rules.

Check if network policies are enabled in your k0s configuration:

```bash
sudo k0s config create > k0s-config.yaml
```

Look at the `network` section in the generated config. If you are using kube-router with network policies, make sure Istio's init containers can set up their iptables rules. Usually this works without changes, but if you see connection issues, check the init container logs:

```bash
kubectl logs <pod-name> -c istio-init
```

If you switched to Calico during k0s setup, Istio works seamlessly because Calico and Istio are well-tested together.

## Step 4: Enable Sidecar Injection

Label the namespace:

```bash
kubectl label namespace default istio-injection=enabled
```

Deploy a sample application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
        - name: httpbin
          image: kennethreitz/httpbin
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
spec:
  selector:
    app: httpbin
  ports:
    - port: 80
      targetPort: 80
```

Apply and check:

```bash
kubectl apply -f httpbin.yaml
kubectl get pods -l app=httpbin
```

The pod should show 2/2 containers ready.

## Step 5: Expose Through Istio Gateway

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: httpbin-gateway
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
  name: httpbin
spec:
  hosts:
    - "*"
  gateways:
    - httpbin-gateway
  http:
    - route:
        - destination:
            host: httpbin
            port:
              number: 80
```

Apply and test:

```bash
kubectl apply -f httpbin-gw.yaml
curl http://$(hostname -I | awk '{print $1}'):30080/get
```

You should get a JSON response from httpbin.

## Step 6: Set Up Observability

Install the standard Istio add-ons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

Access the dashboards:

```bash
istioctl dashboard kiali
istioctl dashboard grafana
```

## Multi-Node k0s with Istio

For a multi-node setup, install k0s controller on one node and workers on others:

On the controller:

```bash
sudo k0s install controller
sudo k0s start
sudo k0s token create --role=worker > worker-token.txt
```

On each worker:

```bash
sudo k0s install worker --token-file worker-token.txt
sudo k0s start
```

Istio will distribute sidecars to pods on all worker nodes automatically. The istiod control plane pod will be scheduled on whichever node has available resources.

For high availability, you can scale istiod:

```bash
kubectl scale deployment istiod -n istio-system --replicas=2
```

## Upgrading Istio on k0s

When a new Istio version comes out, the upgrade process on k0s follows the standard canary upgrade path:

```bash
istioctl install --set revision=1-21 -f istio-k0s.yaml -y
```

Then relabel namespaces to use the new revision:

```bash
kubectl label namespace default istio.io/rev=1-21 --overwrite
kubectl label namespace default istio-injection-
```

Restart workloads to pick up the new sidecar:

```bash
kubectl rollout restart deployment -n default
```

## Troubleshooting

**Pods stuck in Init state**: Check if the `istio-init` container can configure iptables. On some k0s setups, the container runtime might restrict capabilities:

```bash
kubectl describe pod <pod-name> | grep -A 5 "istio-init"
```

**DNS resolution issues**: k0s uses CoreDNS, and it should work with Istio's DNS proxying. If services cannot resolve each other, check CoreDNS logs:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns
```

**Resource constraints**: On a single-node k0s setup, the combined resource usage of k0s components plus Istio can be significant. Keep an eye on node resources:

```bash
kubectl top nodes
kubectl top pods -n istio-system
```

k0s and Istio make a solid pair for environments where you want a minimal Kubernetes footprint but still need proper service mesh capabilities. The lack of a bundled ingress controller in k0s actually simplifies the Istio setup compared to some other lightweight distributions.
