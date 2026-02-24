# How to Set Up Istio on DigitalOcean Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DigitalOcean, DOKS, Kubernetes, Service Mesh

Description: Step-by-step guide to installing and running Istio service mesh on DigitalOcean Kubernetes with platform-specific configuration tips.

---

DigitalOcean Kubernetes (DOKS) is a solid managed Kubernetes offering that works well with Istio. The platform is simpler than the big three cloud providers, which actually makes setting up Istio more straightforward in some ways. There are fewer knobs to turn and fewer platform-specific gotchas. That said, there are still some DigitalOcean-specific considerations around load balancers, node sizes, and networking that you should know about.

## Creating a DOKS Cluster

Use the DigitalOcean CLI to create a cluster:

```bash
doctl kubernetes cluster create istio-cluster \
  --region nyc1 \
  --size s-4vcpu-8gb \
  --count 3 \
  --version 1.28.2-do.0
```

Node sizing is important. The `s-4vcpu-8gb` droplet type gives you 4 vCPUs and 8GB RAM per node. This is the minimum recommended size for running Istio, because each sidecar consumes around 100m CPU and 128Mi memory. On smaller nodes, you will run into scheduling problems quickly.

Get your kubeconfig:

```bash
doctl kubernetes cluster kubeconfig save istio-cluster
```

Verify the cluster is ready:

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

Create an IstioOperator configuration for DOKS:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-doks
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
          service.beta.kubernetes.io/do-loadbalancer-protocol: "tcp"
          service.beta.kubernetes.io/do-loadbalancer-size-slug: "lb-small"
          service.beta.kubernetes.io/do-loadbalancer-healthcheck-port: "15021"
          service.beta.kubernetes.io/do-loadbalancer-healthcheck-path: "/healthz/ready"
          service.beta.kubernetes.io/do-loadbalancer-healthcheck-protocol: "http"
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
istioctl install -f istio-doks-config.yaml -y
```

Verify the installation:

```bash
istioctl verify-install
kubectl get pods -n istio-system
kubectl get svc istio-ingressgateway -n istio-system
```

The DigitalOcean cloud controller manager will automatically provision a DigitalOcean Load Balancer for the ingress gateway service.

## Configuring the DigitalOcean Load Balancer

DigitalOcean Load Balancers are Layer 4 (TCP/UDP), which is actually ideal for Istio since it lets Istio handle TLS termination. You can configure the load balancer through service annotations:

```yaml
serviceAnnotations:
  # Use TCP protocol for TLS passthrough
  service.beta.kubernetes.io/do-loadbalancer-protocol: "tcp"

  # Set the load balancer size
  service.beta.kubernetes.io/do-loadbalancer-size-slug: "lb-small"

  # Enable proxy protocol to preserve client IP
  service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"

  # Configure health checks
  service.beta.kubernetes.io/do-loadbalancer-healthcheck-port: "15021"
  service.beta.kubernetes.io/do-loadbalancer-healthcheck-path: "/healthz/ready"
  service.beta.kubernetes.io/do-loadbalancer-healthcheck-protocol: "http"

  # Set a custom name
  service.beta.kubernetes.io/do-loadbalancer-name: "istio-gateway-lb"
```

## Preserving Client IP with Proxy Protocol

DigitalOcean Load Balancers support PROXY protocol for source IP preservation. Enable it on the load balancer:

```yaml
service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"
```

Then configure the Istio gateway to accept PROXY protocol:

```yaml
apiVersion: networking.istio.io/v1
kind: EnvoyFilter
metadata:
  name: proxy-protocol
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: LISTENER
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        listenerFilters:
        - name: envoy.filters.listener.proxy_protocol
          typedConfig:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
```

## Setting Up TLS

Create a TLS secret for your domain:

```bash
kubectl create secret tls app-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

Configure the Gateway:

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

## Automated Certificates with cert-manager

Install cert-manager for automated Let's Encrypt certificates:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace \
  --set installCRDs=true
```

Create a ClusterIssuer using DigitalOcean DNS for ACME challenges:

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
    - dns01:
        digitalocean:
          tokenSecretRef:
            name: digitalocean-dns
            key: access-token
```

Create the DO API token secret:

```bash
kubectl create secret generic digitalocean-dns \
  --from-literal=access-token=<your-do-api-token> \
  -n cert-manager
```

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
  - "api.example.com"
```

## Enabling mTLS

Enable strict mTLS:

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

## Deploying an Application

Label your namespace and deploy:

```bash
kubectl create namespace production
kubectl label namespace production istio-injection=enabled
```

Create a VirtualService:

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

## DNS Configuration

Point your domain to the DigitalOcean Load Balancer IP:

```bash
# Get the load balancer IP
export LB_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Create a DNS A record (if using DigitalOcean DNS)
doctl compute domain records create example.com \
  --record-type A \
  --record-name app \
  --record-data $LB_IP \
  --record-ttl 300
```

## Monitoring

Deploy the standard Istio monitoring stack:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/grafana.yaml
```

Access Kiali to visualize your service mesh:

```bash
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

## Resource Considerations

DigitalOcean droplets have fixed CPU and memory. Unlike AWS or GCP, you cannot independently scale CPU and memory. Plan your node sizes carefully:

- **s-2vcpu-4gb**: Minimum for development. Tight on resources with Istio sidecars.
- **s-4vcpu-8gb**: Good for small production workloads.
- **s-8vcpu-16gb**: Recommended for production with multiple services.

Set up cluster autoscaling if your workload varies:

```bash
doctl kubernetes cluster update istio-cluster \
  --auto-upgrade \
  --node-pool "name=default;min-nodes=3;max-nodes=6;auto-scale=true"
```

DigitalOcean Kubernetes is a great platform for Istio if you want a simpler, more cost-effective setup compared to the big cloud providers. The TCP load balancer works well with Istio's TLS management, cert-manager handles certificate automation, and the straightforward networking model means fewer surprises in production.
