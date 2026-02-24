# How to Set Up Istio on Rancher Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rancher, RKE, Kubernetes, Service Mesh

Description: Step-by-step guide to installing and configuring Istio on Rancher-managed Kubernetes clusters including RKE and RKE2.

---

Rancher is one of the most popular Kubernetes management platforms, and it has built-in support for Istio. But the built-in option is not always the best choice. Depending on your version of Rancher, the bundled Istio might be outdated or configured in ways that do not match your needs. This guide covers both the Rancher UI approach and the manual installation approach, so you can pick what works best for your situation.

## Prerequisites

Before installing Istio, make sure your Rancher-managed cluster meets these requirements:

- Kubernetes version 1.25 or newer
- At least 4 CPUs and 8 GB RAM available for Istio components
- The kubectl context is set to your Rancher cluster
- Helm 3 is installed

Verify your cluster:

```bash
# Check Kubernetes version
kubectl version --short

# Check available resources
kubectl top nodes

# Verify you have cluster-admin access
kubectl auth can-i '*' '*' --all-namespaces
```

## Option 1: Installing via Rancher UI

Rancher provides an Istio integration through its Apps & Marketplace. This is the simplest approach if you want Rancher to manage Istio's lifecycle.

1. Log into the Rancher UI
2. Navigate to your cluster
3. Go to Apps & Marketplace > Charts
4. Search for "Istio"
5. Click Install

The Rancher UI will let you configure basic options. But for production use, you should customize the values:

```yaml
# Custom values for Rancher Istio chart
istio:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
  meshConfig:
    enableAutoMtls: true
    accessLogFile: /dev/stdout
```

## Option 2: Manual Installation with istioctl

For more control, install Istio directly using istioctl. This bypasses Rancher's chart management but gives you the latest version and full configuration control.

Download and install istioctl:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
```

Create an IstioOperator configuration that works well with Rancher/RKE:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-config
spec:
  profile: default
  meshConfig:
    enableAutoMtls: true
    accessLogFile: /dev/stdout
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
        hpaSpec:
          minReplicas: 2
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
    cni:
      enabled: true
      namespace: kube-system
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
      - cattle-system
      - cattle-fleet-system
```

Notice the `cattle-system` and `cattle-fleet-system` namespaces in the CNI exclusion list. These are Rancher system namespaces that should not have Istio sidecars injected.

Install Istio:

```bash
istioctl install -f istio-config.yaml
```

Verify the installation:

```bash
istioctl verify-install
kubectl get pods -n istio-system
```

## Handling RKE-Specific Networking

RKE clusters use Canal (Calico + Flannel) or Calico as the default CNI. Istio works with both, but there are some things to be aware of.

**Canal/Flannel considerations:**

RKE's default Canal networking uses VXLAN encapsulation. Istio's iptables rules work on top of this. If you see intermittent connectivity issues, check that the MTU is set correctly:

```bash
# Check the current MTU
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=canal -o jsonpath='{.items[0].metadata.name}') -- ip link show flannel.1
```

**Calico considerations:**

If your RKE cluster uses Calico with network policies, make sure Istio's ports are allowed:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-istio
spec:
  selector: all()
  types:
  - Ingress
  - Egress
  ingress:
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - 15001
      - 15006
      - 15010
      - 15012
      - 15014
      - 15017
      - 15021
      - 15090
  egress:
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - 15001
      - 15006
      - 15010
      - 15012
```

## Excluding Rancher System Namespaces

Rancher runs several system components that should not have Istio sidecars. Make sure these namespaces are excluded:

```bash
# List Rancher system namespaces
kubectl get namespaces | grep -E "cattle|fleet|rancher"

# Ensure they are not labeled for injection
kubectl get namespace cattle-system -o jsonpath='{.metadata.labels}'
kubectl get namespace cattle-fleet-system -o jsonpath='{.metadata.labels}'
```

If any system namespaces accidentally have the injection label:

```bash
kubectl label namespace cattle-system istio-injection-
kubectl label namespace cattle-fleet-system istio-injection-
kubectl label namespace cattle-impersonation-system istio-injection-
```

## Enabling Sidecar Injection

Label your application namespaces for automatic sidecar injection:

```bash
kubectl create namespace myapp
kubectl label namespace myapp istio-injection=enabled
```

Deploy a test application:

```bash
kubectl apply -n myapp -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
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
EOF
```

Verify the sidecar was injected:

```bash
kubectl get pods -n myapp -o jsonpath='{.items[*].spec.containers[*].name}'
```

You should see both `httpbin` and `istio-proxy`.

## Configuring the Ingress Gateway with Rancher's Load Balancer

If your RKE cluster uses a cloud provider load balancer:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "*.example.com"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: example-tls
    hosts:
    - "*.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: httpbin-vs
  namespace: myapp
spec:
  hosts:
  - "httpbin.example.com"
  gateways:
  - istio-system/main-gateway
  http:
  - route:
    - destination:
        host: httpbin
        port:
          number: 80
```

If you are using NodePort (common with on-prem RKE):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: NodePort
          ports:
          - name: http2
            nodePort: 30080
            port: 80
            targetPort: 8080
          - name: https
            nodePort: 30443
            port: 443
            targetPort: 8443
```

## Monitoring Istio on Rancher

Rancher includes monitoring through its Prometheus integration. Configure it to scrape Istio metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-component-monitor
  namespace: cattle-monitoring-system
spec:
  selector:
    matchExpressions:
    - key: istio
      operator: In
      values: ["pilot", "ingressgateway"]
  namespaceSelector:
    matchNames:
    - istio-system
  endpoints:
  - port: http-monitoring
    interval: 15s
```

## Upgrading Istio on Rancher

If you installed via Rancher UI, upgrade through the Apps marketplace. If you used istioctl:

```bash
# Download new version
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.1 sh -

# Run pre-upgrade check
istioctl x precheck

# Upgrade
istioctl upgrade -f istio-config.yaml

# Verify
istioctl version
kubectl get pods -n istio-system
```

Setting up Istio on Rancher requires a bit of extra care around system namespace exclusion and CNI compatibility, but once configured, it runs just as well as on any other Kubernetes distribution. The choice between Rancher's built-in Istio chart and a manual installation depends on how much control you need over the Istio version and configuration.
