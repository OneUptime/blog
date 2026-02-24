# How to Set Up Istio on AWS EKS with Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, EKS, Kubernetes, Service Mesh

Description: A production-ready guide to installing and configuring Istio on Amazon EKS with AWS-specific best practices and optimizations.

---

Running Istio on AWS EKS works well, but there are a bunch of AWS-specific considerations that can trip you up if you just follow the generic Istio installation docs. From load balancer integration to IAM roles to node sizing, there are real decisions to make that affect your mesh's reliability and performance.

## Prerequisites

Before installing Istio, make sure your EKS cluster is set up properly:

```bash
# Create an EKS cluster with enough resources for Istio
eksctl create cluster \
  --name my-mesh-cluster \
  --region us-east-1 \
  --version 1.28 \
  --nodegroup-name standard-workers \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 6
```

Use at least `m5.xlarge` instances. Istio sidecars add CPU and memory overhead to every pod, and running on small instances leads to scheduling problems fast.

Verify your cluster is ready:

```bash
kubectl get nodes
aws eks describe-cluster --name my-mesh-cluster --query cluster.status
```

## Installing Istio on EKS

Download istioctl and install with a production-appropriate profile:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
```

Create an IstioOperator configuration tailored for EKS:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-config
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    enableTracing: true
    outboundTrafficPolicy:
      mode: ALLOW_ANY
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
          service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
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
            memory: 2Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 3
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
```

Install it:

```bash
istioctl install -f istio-eks-config.yaml -y
```

A few things to note in this configuration:

- `holdApplicationUntilProxyStarts` prevents application containers from starting before the sidecar is ready. This avoids race conditions where your app tries to make network calls before Istio is intercepting traffic.
- DNS capture and auto-allocate make ServiceEntry resolution work properly.
- The NLB annotation tells AWS to create a Network Load Balancer instead of the default Classic Load Balancer.
- Cross-zone load balancing distributes traffic evenly across availability zones.

## Configuring IAM Roles for Service Accounts (IRSA)

If your workloads need to access AWS services, set up IRSA so they can assume IAM roles without using static credentials:

```bash
# Associate OIDC provider with your cluster
eksctl utils associate-iam-oidc-provider \
  --cluster my-mesh-cluster \
  --approve

# Create an IAM role for a service account
eksctl create iamserviceaccount \
  --name my-app-sa \
  --namespace default \
  --cluster my-mesh-cluster \
  --role-name my-app-role \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --approve
```

Istio sidecars do not interfere with IRSA token exchange since the AWS SDK communicates with the EC2 metadata service, which Istio proxies handle correctly.

## Setting Up Namespace Injection

Label your application namespaces for automatic sidecar injection:

```bash
kubectl create namespace production
kubectl label namespace production istio-injection=enabled
```

## Configuring the Ingress Gateway for Production

Set up a Gateway and VirtualService for your application:

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
---
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
        host: frontend-service
        port:
          number: 3000
```

## Resource Requests and Limits

On EKS, getting sidecar resource requests right is important for the cluster autoscaler. Each sidecar adds to the pod's total resource request, which affects scheduling:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
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

For high-throughput services, you might need to bump the sidecar resources:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "200m"
    sidecar.istio.io/proxyMemory: "256Mi"
    sidecar.istio.io/proxyCPULimit: "500m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

## Enabling mTLS

Enable strict mTLS across the mesh:

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

## Pod Disruption Budgets

Make sure Istio control plane components survive node replacements during EKS upgrades:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ingress-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      istio: ingressgateway
```

## Topology-Aware Routing

Take advantage of EKS topology labels to keep traffic local to an availability zone where possible:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: prefer-local-az
  namespace: production
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    loadBalancer:
      localityLbSetting:
        enabled: true
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

This tells Istio to prefer sending traffic to pods in the same AZ, which reduces latency and cross-AZ data transfer costs.

## Monitoring

Install monitoring tools to keep an eye on your mesh:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/grafana.yaml
```

The combination of Prometheus, Kiali, and Grafana gives you solid visibility into traffic patterns, latency, and error rates across your mesh.

Running Istio on EKS is straightforward once you address the AWS-specific considerations. Use NLB for the ingress gateway, size your nodes to account for sidecar overhead, set up IRSA for AWS service access, and take advantage of locality-aware routing to minimize cross-AZ costs. These small decisions add up to a stable, cost-effective mesh deployment.
