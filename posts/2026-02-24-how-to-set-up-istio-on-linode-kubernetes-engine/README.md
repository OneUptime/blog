# How to Set Up Istio on Linode Kubernetes Engine

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Linode, LKE, Kubernetes, Service Mesh, Akamai

Description: Complete walkthrough for deploying Istio on Linode Kubernetes Engine with NodeBalancer integration and production configuration.

---

Linode Kubernetes Engine (LKE), now part of Akamai Cloud Computing, is a managed Kubernetes service that works surprisingly well with Istio. The pricing is competitive, the networking model is simple, and NodeBalancers (Linode's load balancers) handle external traffic without much fuss. If you are looking to run Istio outside the big three cloud providers, LKE is a solid option.

## Creating an LKE Cluster

Use the Linode CLI to create a cluster:

```bash
linode-cli lke cluster-create \
  --label istio-cluster \
  --region us-east \
  --k8s_version 1.28 \
  --node_pools.type g6-standard-4 \
  --node_pools.count 3
```

The `g6-standard-4` instance type gives you 4 vCPUs and 8GB RAM, which is a good baseline for Istio. With three nodes, you have enough capacity for the control plane, ingress gateway, and your application workloads plus sidecars.

Download the kubeconfig:

```bash
linode-cli lke kubeconfig-view <cluster-id> --text | base64 -d > ~/.kube/lke-config
export KUBECONFIG=~/.kube/lke-config
```

Verify connectivity:

```bash
kubectl get nodes
```

## Installing Istio

Download istioctl:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
```

Create an LKE-optimized configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-lke
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
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/linode-loadbalancer-throttle: "0"
          service.beta.kubernetes.io/linode-loadbalancer-check-type: "http"
          service.beta.kubernetes.io/linode-loadbalancer-check-path: "/healthz/ready"
          service.beta.kubernetes.io/linode-loadbalancer-port-protocol: '{"443":"tcp","80":"tcp"}'
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            memory: 256Mi
```

Install:

```bash
istioctl install -f istio-lke-config.yaml -y
```

When you create a LoadBalancer service on LKE, the Linode cloud controller manager automatically provisions a NodeBalancer. Verify it was created:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

You should see an external IP or hostname in the EXTERNAL-IP column. It might take a minute for the NodeBalancer to be provisioned.

## Configuring the NodeBalancer

Linode NodeBalancers operate at Layer 4 (TCP), which is perfect for Istio. The TCP passthrough lets Istio handle TLS termination directly. You can configure NodeBalancer behavior through annotations:

```yaml
serviceAnnotations:
  # Disable connection throttle for better performance
  service.beta.kubernetes.io/linode-loadbalancer-throttle: "0"

  # Configure health checks
  service.beta.kubernetes.io/linode-loadbalancer-check-type: "http"
  service.beta.kubernetes.io/linode-loadbalancer-check-path: "/healthz/ready"
  service.beta.kubernetes.io/linode-loadbalancer-check-interval: "10"
  service.beta.kubernetes.io/linode-loadbalancer-check-timeout: "5"
  service.beta.kubernetes.io/linode-loadbalancer-check-attempts: "3"

  # Use TCP protocol for TLS passthrough
  service.beta.kubernetes.io/linode-loadbalancer-port-protocol: '{"443":"tcp","80":"tcp"}'
```

The health check configuration is important. The NodeBalancer needs to verify that the Istio gateway pods are healthy. Port 15021 with path /healthz/ready is the standard Istio health check endpoint.

## Setting Up TLS

Since the NodeBalancer passes TCP through, Istio handles TLS termination. Create a TLS secret:

```bash
kubectl create secret tls app-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

Configure the Istio Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
    hosts:
    - "app.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "app.example.com"
```

## Automated TLS with cert-manager

Install cert-manager for automatic Let's Encrypt certificates:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace \
  --set installCRDs=true
```

Create a ClusterIssuer with HTTP01 challenge (works well with LKE since the NodeBalancer forwards traffic directly):

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: istio
```

For the HTTP01 solver to work with Istio, you need a Gateway and VirtualService that can handle the ACME challenge path. Alternatively, use DNS01 challenges if you manage your DNS through an API-compatible provider.

Request a certificate:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert
  namespace: istio-system
spec:
  secretName: app-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - "app.example.com"
```

## Enabling mTLS

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

## Deploying Applications

Label namespaces for sidecar injection:

```bash
kubectl create namespace production
kubectl label namespace production istio-injection=enabled
```

Deploy your application and create routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routing
  namespace: production
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/main-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        port:
          number: 8080
  - route:
    - destination:
        host: frontend
        port:
          number: 3000
```

## DNS Setup

Point your domain to the NodeBalancer IP:

```bash
# Get the NodeBalancer IP
NODEBALANCER_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Create an A record pointing to: $NODEBALANCER_IP"
```

If you use Linode DNS Manager:

```bash
linode-cli domains records-create <domain-id> \
  --type A \
  --name app \
  --target $NODEBALANCER_IP \
  --ttl_sec 300
```

## Monitoring Stack

Deploy the standard monitoring tools:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/grafana.yaml
```

Access them through port-forwarding:

```bash
kubectl port-forward svc/kiali -n istio-system 20001:20001
kubectl port-forward svc/grafana -n istio-system 3000:3000
kubectl port-forward svc/prometheus -n istio-system 9090:9090
```

## Persistent Storage for Monitoring

LKE supports Linode Block Storage through the CSI driver. Use it for Prometheus data persistence:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-data
  namespace: istio-system
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: linode-block-storage-retain
  resources:
    requests:
      storage: 50Gi
```

## Scaling Considerations

LKE supports node pool autoscaling:

```bash
linode-cli lke pool-update <cluster-id> <pool-id> \
  --count 3 \
  --autoscaler.enabled true \
  --autoscaler.min 3 \
  --autoscaler.max 6
```

Available node sizes on Linode that work well with Istio:

- **g6-standard-2** (2 vCPU, 4GB): Development only
- **g6-standard-4** (4 vCPU, 8GB): Small production
- **g6-standard-8** (8 vCPU, 16GB): Production recommended
- **g6-dedicated-4** (4 dedicated vCPU, 8GB): For consistent performance

Dedicated CPU instances are worth considering for Istio workloads because shared CPU instances might see performance variance under load.

LKE is a great platform for running Istio, especially if cost is a factor. The NodeBalancer integration handles external traffic cleanly, the networking model is simple, and the pricing is straightforward. The main thing to watch is node sizing - give yourself enough headroom for sidecar overhead and you will have a smooth experience.
