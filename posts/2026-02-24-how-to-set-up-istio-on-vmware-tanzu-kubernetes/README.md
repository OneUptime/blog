# How to Set Up Istio on VMware Tanzu Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VMware Tanzu, TKG, Kubernetes, Service Mesh

Description: How to install and configure Istio on VMware Tanzu Kubernetes Grid clusters with proper networking and security settings.

---

VMware Tanzu Kubernetes Grid (TKG) is a popular choice for organizations running Kubernetes on VMware infrastructure. While Tanzu has its own service mesh offering based on Istio, you might want to install Istio directly for more control over the version and configuration. This guide walks through the process of setting up Istio on TKG clusters, covering the platform-specific considerations you need to be aware of.

## Prerequisites

Make sure your TKG cluster is ready:

```bash
# Verify cluster access
kubectl cluster-info

# Check Kubernetes version (TKG typically runs 1.25+)
kubectl version

# Verify you have admin access
kubectl auth can-i '*' '*' --all-namespaces

# Check node resources
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory
```

Your TKG cluster should have:
- At least 3 worker nodes
- 4+ CPUs and 8+ GB RAM available across the cluster
- Tanzu CLI installed and configured

## Understanding TKG Networking

TKG clusters typically use Antrea as the default CNI (replacing Calico in newer versions). Antrea supports Kubernetes network policies natively, which is important for Istio.

Check your CNI:

```bash
kubectl get pods -n kube-system | grep -E "antrea|calico"
```

If you are using Antrea, Istio works well out of the box. Antrea's NodePortLocal feature can also be useful for exposing Istio's ingress gateway.

## Installing Istio on TKG

Download istioctl:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
```

Create a TKG-optimized IstioOperator configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-tkg
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
          annotations:
            service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
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
      - vmware-system-tmc
      - vmware-system-auth
      - tkg-system
      - tanzu-system-ingress
```

The key TKG-specific details here:
- Exclusion of VMware system namespaces from CNI configuration
- `holdApplicationUntilProxyStarts: true` prevents race conditions during pod startup
- Resource limits tuned for typical TKG node sizes

Install Istio:

```bash
istioctl install -f istio-tkg.yaml -y
```

Verify:

```bash
istioctl verify-install
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

## Handling NSX-T Integration

If your TKG cluster uses NSX-T for networking and load balancing, configure the ingress gateway to work with NSX-T:

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
          type: LoadBalancer
          annotations:
            # NSX-T specific annotations
            ncp/internal_ip_for_policy: "100.64.0.0/16"
        serviceAnnotations:
          service.beta.kubernetes.io/nsx-lb-type: "layer4"
```

If NSX-T is providing the load balancer, verify it gets an external IP:

```bash
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Excluding TKG System Namespaces

TKG has several system namespaces that should not be injected with Istio sidecars:

```bash
# List TKG system namespaces
kubectl get namespaces | grep -E "vmware|tkg|tanzu"

# Make sure none have injection enabled
for ns in vmware-system-tmc vmware-system-auth tkg-system tanzu-system-ingress; do
  echo "Checking $ns..."
  kubectl get namespace $ns -o jsonpath='{.metadata.labels}' 2>/dev/null
  echo ""
done
```

## Pod Security Policy Considerations

Older TKG versions use PodSecurityPolicies. If your cluster has PSP enforcement, you need to create a PSP that allows Istio components:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: istio-proxy
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
```

For the init container (without CNI):

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: istio-init
spec:
  privileged: false
  allowPrivilegeEscalation: false
  allowedCapabilities:
  - NET_ADMIN
  - NET_RAW
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  runAsUser:
    rule: RunAsAny
  seLinux:
    rule: RunAsAny
```

Newer TKG versions use Pod Security Admission instead. Label namespaces appropriately:

```bash
kubectl label namespace myapp \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted
```

## Setting Up TLS with Tanzu

If you are using Tanzu's cert-manager integration, leverage it for Istio gateway certificates:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: gateway-cert
  namespace: istio-system
spec:
  secretName: gateway-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  commonName: app.example.com
  dnsNames:
  - app.example.com
  - "*.app.example.com"
```

Reference the certificate in your Gateway:

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
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: gateway-tls
    hosts:
    - "app.example.com"
```

## Deploying a Test Application

Deploy a sample application to verify everything works:

```bash
kubectl create namespace bookinfo
kubectl label namespace bookinfo istio-injection=enabled

kubectl apply -n bookinfo -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml

# Wait for pods to be ready
kubectl get pods -n bookinfo -w

# Verify sidecars are injected
kubectl get pods -n bookinfo -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}'
```

Create a Gateway and VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: bookinfo-gateway
  namespace: bookinfo
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
  namespace: bookinfo
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

Test the application:

```bash
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s "http://$GATEWAY_IP/productpage" | grep -o "<title>.*</title>"
```

## Monitoring with Tanzu Observability

If you use Tanzu Observability (Wavefront), configure Istio to export metrics:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
        - istio
        - cluster.upstream
```

Deploy the Wavefront proxy with Istio metric collection:

```bash
helm install wavefront wavefront/wavefront \
  --set clusterName=tkg-cluster-1 \
  --set wavefront.url=https://your-tenant.wavefront.com \
  --set wavefront.token=your-api-token \
  --set collector.discovery.enabled=true
```

Setting up Istio on TKG is mostly straightforward once you handle the platform-specific details: excluding VMware system namespaces, working with NSX-T networking, and dealing with pod security policies. The CNI plugin is recommended for TKG deployments because it avoids the need for privileged init containers.
