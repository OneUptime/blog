# How to Set Up Istio on AWS EKS Anywhere

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, EKS Anywhere, Kubernetes, Service Mesh

Description: Step-by-step guide to installing and configuring Istio on AWS EKS Anywhere clusters running on-premises or in your own data center.

---

AWS EKS Anywhere lets you run Kubernetes clusters on your own infrastructure using the same tooling and APIs as Amazon EKS in the cloud. Installing Istio on EKS Anywhere is similar to any self-managed Kubernetes cluster, but there are some EKS Anywhere-specific considerations around load balancing, storage, and integration with AWS services.

This guide covers the complete process of getting Istio running on EKS Anywhere.

## Prerequisites

Before installing Istio, make sure your EKS Anywhere cluster is ready:

```bash
# Verify cluster access
kubectl cluster-info
eksctl anywhere version

# Check node status
kubectl get nodes -o wide

# Verify you have admin access
kubectl auth can-i '*' '*' --all-namespaces

# Check available resources
kubectl describe nodes | grep -A 5 "Allocated resources"
```

Your EKS Anywhere cluster should have:
- At least 3 worker nodes
- Kubernetes 1.25 or newer
- A load balancer solution (MetalLB, kube-vip, or your own)
- kubectl configured for the cluster

## Understanding EKS Anywhere Networking

EKS Anywhere uses Cilium as the default CNI. Cilium works well with Istio, but there are a few things to configure properly.

Check your CNI:

```bash
kubectl get pods -n kube-system | grep cilium
```

Cilium has its own service mesh capabilities, but you can run Istio on top of it. Make sure Cilium is not configured in kube-proxy replacement mode if you want Istio to handle all traffic management:

```bash
kubectl get configmap -n kube-system cilium-config -o yaml | grep kube-proxy
```

## Installing Istio

Download istioctl:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
```

Create an IstioOperator configuration optimized for EKS Anywhere:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-eks-anywhere
spec:
  profile: default
  meshConfig:
    enableAutoMtls: true
    accessLogFile: /dev/stdout
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: LoadBalancer
        resources:
          requests:
            cpu: 200m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 512Mi
    cni:
      enabled: true
      namespace: kube-system
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
      - eksa-system
      - flux-system
      - cert-manager
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

Key EKS Anywhere considerations:
- Exclude `eksa-system` and `flux-system` namespaces from CNI (these are EKS Anywhere management namespaces)
- The Istio CNI plugin is recommended because EKS Anywhere uses Cilium, and the interaction between Cilium and Istio's iptables rules is cleaner with the CNI approach
- `holdApplicationUntilProxyStarts: true` prevents race conditions

Install Istio:

```bash
istioctl install -f istio-eks-anywhere.yaml -y
```

Verify:

```bash
istioctl verify-install
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

## Configuring Load Balancing

EKS Anywhere does not come with a cloud load balancer. You need to provide your own solution.

**Option 1: MetalLB**

MetalLB is common for bare metal and on-prem clusters:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.3/config/manifests/metallb-native.yaml
```

Configure an IP address pool:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: istio-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.210
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: istio-l2
  namespace: metallb-system
spec:
  ipAddressPools:
  - istio-pool
```

**Option 2: kube-vip**

EKS Anywhere often uses kube-vip for the control plane. You can also use it for services:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-vip
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: kube-vip
        image: ghcr.io/kube-vip/kube-vip:v0.7.0
        args:
        - manager
        env:
        - name: svc_enable
          value: "true"
        - name: svc_election
          value: "true"
        - name: cidr-global
          value: "192.168.1.200/29"
```

After setting up the load balancer, verify the ingress gateway gets an external IP:

```bash
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Setting Up TLS

For on-premises environments, you typically manage certificates yourself. Install cert-manager for automated certificate management:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

Create a self-signed issuer for internal use:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: istio-ca
  secretName: istio-ca-secret
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-ca-issuer
spec:
  ca:
    secretName: istio-ca-secret
```

Create a certificate for the gateway:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: gateway-cert
  namespace: istio-system
spec:
  secretName: gateway-tls
  issuerRef:
    name: istio-ca-issuer
    kind: ClusterIssuer
  commonName: "*.example.internal"
  dnsNames:
  - "*.example.internal"
  - "example.internal"
```

## Deploying an Application

Enable sidecar injection and deploy a test application:

```bash
kubectl create namespace myapp
kubectl label namespace myapp istio-injection=enabled

kubectl apply -n myapp -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  replicas: 2
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
EOF
```

Create a Gateway and VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: myapp-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "httpbin.example.internal"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: gateway-tls
    hosts:
    - "httpbin.example.internal"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: httpbin
  namespace: myapp
spec:
  hosts:
  - "httpbin.example.internal"
  gateways:
  - istio-system/myapp-gateway
  http:
  - route:
    - destination:
        host: httpbin
        port:
          number: 80
```

Test it:

```bash
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -H "Host: httpbin.example.internal" http://$GATEWAY_IP/get
```

## Monitoring on EKS Anywhere

Since EKS Anywhere runs on-premises, you need to set up your own monitoring stack.

Deploy Prometheus and Grafana:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/kiali.yaml
```

If you want to send metrics to AWS CloudWatch (hybrid monitoring):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudwatch-agent
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: cloudwatch-agent
        image: amazon/cloudwatch-agent:latest
        env:
        - name: AWS_REGION
          value: us-east-1
```

## EKS Anywhere Cluster Lifecycle

EKS Anywhere uses GitOps (Flux) for cluster management. When upgrading the cluster, make sure Istio is included in the upgrade plan:

```bash
# Check current versions
eksctl anywhere version
kubectl version
istioctl version

# Before EKS Anywhere upgrade, check Istio compatibility
istioctl x precheck
```

When EKS Anywhere performs a rolling node replacement during upgrades, your pods (including sidecars) will be rescheduled. Make sure you have:
- At least 2 replicas for critical services
- PodDisruptionBudgets configured
- Proper resource requests so pods can be scheduled on remaining nodes

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: httpbin-pdb
  namespace: myapp
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: httpbin
```

## Multi-Cluster with EKS Anywhere

If you have multiple EKS Anywhere clusters and want to set up a multi-cluster mesh:

```bash
# Install Istio on both clusters
istioctl install -f istio-eks-anywhere.yaml --context=cluster-a
istioctl install -f istio-eks-anywhere.yaml --context=cluster-b

# Set up east-west gateways
kubectl apply -f samples/multicluster/expose-services.yaml --context=cluster-a
kubectl apply -f samples/multicluster/expose-services.yaml --context=cluster-b

# Exchange remote secrets
istioctl create-remote-secret --context=cluster-a --name=cluster-a | kubectl apply -f - --context=cluster-b
istioctl create-remote-secret --context=cluster-b --name=cluster-b | kubectl apply -f - --context=cluster-a
```

Make sure the east-west gateways have routable IPs between the clusters. Since these are on-premises clusters, you might need to configure routing at the network level.

Setting up Istio on EKS Anywhere is very similar to any on-premises Kubernetes installation. The main challenges are providing your own load balancer, managing certificates without a cloud CA, and setting up monitoring infrastructure. Once these are in place, Istio works the same way it does on any other Kubernetes distribution.
