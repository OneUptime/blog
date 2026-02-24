# How to Set Up Istio on Amazon EKS from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, EKS, Kubernetes, Service Mesh, Amazon

Description: A hands-on guide to setting up Istio on Amazon EKS, including cluster creation, load balancer configuration, and mesh verification.

---

Running Istio on Amazon EKS is a popular choice for production workloads. EKS handles the Kubernetes control plane for you, so you can focus on configuring the service mesh. But there are a few AWS-specific considerations you need to handle - like load balancer types, IAM roles, and security groups.

This guide walks through the whole process from creating an EKS cluster to having a working Istio mesh with traffic flowing through it.

## Prerequisites

Make sure you have these tools installed:

- AWS CLI (configured with appropriate credentials)
- eksctl (the official EKS CLI tool)
- kubectl
- istioctl or Helm 3

Check your AWS CLI is configured:

```bash
aws sts get-caller-identity
```

## Step 1: Create an EKS Cluster

If you don't already have an EKS cluster, create one with eksctl. This is the fastest way:

```bash
eksctl create cluster \
  --name istio-cluster \
  --version 1.30 \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5
```

This takes about 15-20 minutes. eksctl handles the VPC, subnets, security groups, IAM roles, and the EKS cluster itself.

Once it's done, verify you can connect:

```bash
kubectl get nodes
```

You should see three nodes in Ready state.

## Step 2: Configure kubectl for EKS

If you already have a cluster, make sure kubectl is pointing to it:

```bash
aws eks update-kubeconfig --region us-west-2 --name istio-cluster
```

## Step 3: Install Istio

Download and install Istio using istioctl:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Run the pre-check:

```bash
istioctl x precheck
```

Install with the default profile:

```bash
istioctl install --set profile=default -y
```

## Step 4: Configure the AWS Load Balancer

By default, Istio's ingress gateway creates a Classic Load Balancer on AWS. For production, you probably want a Network Load Balancer (NLB) instead. It offers better performance and supports static IPs.

Create a custom configuration:

```yaml
# istio-eks.yaml
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
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/aws-load-balancer-type: nlb
            service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
            service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
```

Apply it:

```bash
istioctl install -f istio-eks.yaml -y
```

Verify the load balancer was created:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

You should see an NLB hostname in the EXTERNAL-IP column. It takes a few minutes for the DNS to propagate.

## Step 5: Enable Sidecar Injection

Label the namespace where your applications run:

```bash
kubectl label namespace default istio-injection=enabled
```

## Step 6: Deploy a Test Application

Deploy the Bookinfo sample to verify everything works:

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Wait for all pods to be ready:

```bash
kubectl get pods -w
```

Get the gateway URL:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
echo "http://$INGRESS_HOST:$INGRESS_PORT/productpage"
```

Open that URL in a browser or curl it to confirm you see the Bookinfo product page.

## Setting Up TLS with AWS Certificate Manager

For production, you want TLS. AWS Certificate Manager (ACM) can provide free certificates. First, request a certificate through the AWS console or CLI:

```bash
aws acm request-certificate \
  --domain-name "*.example.com" \
  --validation-method DNS \
  --region us-west-2
```

Then update your gateway annotations to use the ACM certificate:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/aws-load-balancer-type: nlb
            service.beta.kubernetes.io/aws-load-balancer-ssl-cert: arn:aws:acm:us-west-2:123456789:certificate/abc-123
            service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
            service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
```

## Resource Considerations for EKS

Istio adds resource overhead. Each Envoy sidecar uses roughly 50-100 MB of memory and some CPU. On EKS, plan your node sizes accordingly:

- For development: m5.large (2 vCPU, 8 GB) nodes work fine
- For production: m5.xlarge (4 vCPU, 16 GB) or larger
- istiod itself needs about 500 MB - 1 GB of memory

You can set resource limits in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
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

## Monitoring with CloudWatch

EKS integrates well with CloudWatch. You can export Istio metrics to CloudWatch using the CloudWatch agent or ADOT (AWS Distro for OpenTelemetry):

```bash
kubectl apply -f https://raw.githubusercontent.com/aws-observability/aws-otel-collector/main/deployment-template/eks/otel-container-insights-infra.yaml
```

Alternatively, install Prometheus and Grafana alongside Istio for dedicated mesh observability:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
```

## Security Groups and Network Policies

EKS security groups need to allow traffic between nodes for Istio to work properly. If you used eksctl, this is handled automatically. If you set up the cluster manually, make sure:

- Nodes can communicate with each other on all ports
- The load balancer security group allows inbound traffic on ports 80 and 443
- The control plane security group allows traffic from worker nodes on port 15017 (webhook) and 15012 (xDS)

## Troubleshooting EKS-Specific Issues

If the NLB isn't getting provisioned, check that the AWS Load Balancer Controller is working or that the in-tree cloud provider is handling it. Look at the service events:

```bash
kubectl describe svc istio-ingressgateway -n istio-system
```

If pods can't communicate across nodes, verify your VPC CNI plugin is up to date:

```bash
kubectl describe daemonset aws-node -n kube-system
```

If sidecar injection isn't working, make sure the istiod webhook can reach the API server. EKS sometimes has issues with webhook timeouts if the control plane security group is too restrictive.

Setting up Istio on EKS is mostly standard Kubernetes work with a few AWS-specific tweaks around load balancers and networking. Once you have the initial configuration sorted, the day-to-day operation of the mesh is the same regardless of the underlying cloud provider.
