# How to Set Up Istio on IBM Cloud Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, IBM Cloud, IKS, Kubernetes, Service Mesh

Description: Practical guide to deploying Istio on IBM Cloud Kubernetes Service with VPC networking and IBM-specific load balancer setup.

---

IBM Cloud Kubernetes Service (IKS) has a long history with Istio. IBM was one of the original contributors to the Istio project, and IKS even had a managed Istio addon for a while. While the managed addon has been deprecated in favor of IBM's own service mesh offering, installing upstream Istio on IKS works perfectly fine.

This guide covers setting up an IKS cluster and getting Istio running on it with all the IBM Cloud-specific details handled.

## Prerequisites

- IBM Cloud account
- IBM Cloud CLI (`ibmcloud`) installed
- kubectl
- istioctl

Install the IBM Cloud CLI and plugins:

```bash
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
ibmcloud plugin install kubernetes-service
ibmcloud plugin install container-registry
```

Log in:

```bash
ibmcloud login
ibmcloud target -g default
```

## Step 1: Create an IKS Cluster

Create a VPC-based cluster (recommended over classic infrastructure):

```bash
# Create a VPC first
ibmcloud is vpc-create istio-vpc

# Create a subnet
ibmcloud is subnet-create istio-subnet istio-vpc --zone us-south-1 --ipv4-cidr-block 10.240.0.0/24

# Create the cluster
ibmcloud ks cluster create vpc-gen2 \
  --name istio-cluster \
  --zone us-south-1 \
  --vpc-id <vpc-id> \
  --subnet-id <subnet-id> \
  --flavor bx2.4x16 \
  --workers 3 \
  --version 1.30
```

The `bx2.4x16` flavor gives you 4 vCPUs and 16 GB RAM per worker node, which is enough for Istio plus a few services.

Cluster creation takes 20-30 minutes. Check the status:

```bash
ibmcloud ks cluster ls
ibmcloud ks cluster get --cluster istio-cluster
```

## Step 2: Configure kubectl

```bash
ibmcloud ks cluster config --cluster istio-cluster
```

Verify:

```bash
kubectl get nodes
```

## Step 3: Install Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Pre-check:

```bash
istioctl x precheck
```

Install with a configuration that works well on IKS:

```yaml
# istio-iks.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
```

```bash
istioctl install -f istio-iks.yaml -y
```

## Step 4: Verify

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

On VPC clusters, the ingress gateway gets a hostname from the VPC load balancer:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

## Step 5: Test

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Get the hostname and test:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$INGRESS_HOST/productpage
```

## VPC Load Balancer Configuration

IKS on VPC uses the VPC Load Balancer for ALB (Application Load Balancer). You can customize it with annotations:

### Public Load Balancer (Default)

```yaml
k8s:
  serviceAnnotations:
    service.kubernetes.io/ibm-load-balancer-cloud-provider-ip-type: public
```

### Private Load Balancer

```yaml
k8s:
  serviceAnnotations:
    service.kubernetes.io/ibm-load-balancer-cloud-provider-ip-type: private
```

### Network Load Balancer

For better performance with TCP traffic:

```yaml
k8s:
  serviceAnnotations:
    service.kubernetes.io/ibm-load-balancer-cloud-provider-enable-features: nlb
```

## Integrating with IBM Cloud Logging and Monitoring

IBM Cloud offers Log Analysis and Cloud Monitoring (powered by Sysdig). You can send Istio logs and metrics to these services.

For logging, the IKS logging agent picks up Istio's access logs automatically if you've enabled the logging addon:

```bash
ibmcloud ks logging config create --cluster istio-cluster --logsource application --type ibm
```

For metrics, install the monitoring agent:

```bash
ibmcloud ks observe monitoring config create \
  --cluster istio-cluster \
  --instance <monitoring-instance-id>
```

You can also install the standard Istio observability stack:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
```

## TLS with IBM Certificate Manager

IBM Cloud Certificate Manager can store and manage TLS certificates. To use them with Istio:

1. Create or import a certificate in IBM Certificate Manager
2. Create a Kubernetes secret from the certificate
3. Reference the secret in your Istio Gateway

```bash
# Create a secret from your certificate
kubectl create secret tls istio-tls \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

Then use it in a Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
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
        credentialName: istio-tls
      hosts:
        - "*.example.com"
```

## Security Group Configuration

If you're on a VPC cluster, make sure your security groups allow Istio traffic:

```bash
# Allow inbound HTTP/HTTPS to the load balancer
ibmcloud is security-group-rule-add <sg-id> inbound tcp --port-min 80 --port-max 80 --remote 0.0.0.0/0
ibmcloud is security-group-rule-add <sg-id> inbound tcp --port-min 443 --port-max 443 --remote 0.0.0.0/0
```

Worker-to-worker communication should already be allowed by the default security group rules that IKS creates.

## Multi-Zone Clusters

IKS supports multi-zone clusters, which is great for high availability with Istio. Create worker pools across zones:

```bash
ibmcloud ks zone add vpc-gen2 \
  --cluster istio-cluster \
  --zone us-south-2 \
  --subnet-id <subnet-id-zone2> \
  --worker-pool default
```

Istio's locality-aware routing can take advantage of this:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    connectionPool:
      tcp:
        maxConnections: 100
```

## Troubleshooting IKS + Istio

If the VPC load balancer isn't provisioning, check the VPC load balancer status:

```bash
ibmcloud is load-balancers
```

If pods can't communicate across zones, verify that the subnet routing tables allow inter-zone traffic.

If you see TLS handshake errors, make sure the cluster's Kubernetes version supports the TLS versions that Istio requires. IKS clusters on older Kubernetes versions might have compatibility issues.

```bash
ibmcloud ks cluster get --cluster istio-cluster | grep Version
```

IKS and Istio work well together, especially given IBM's history with the project. The VPC networking model is clean and predictable, and the load balancer integration works out of the box. For production deployments, consider using a multi-zone setup to get the full benefit of both IKS's availability zones and Istio's traffic management.
