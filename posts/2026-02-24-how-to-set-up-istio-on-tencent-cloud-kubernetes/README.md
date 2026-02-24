# How to Set Up Istio on Tencent Cloud Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tencent Cloud, TKE, Kubernetes, Service Mesh

Description: Practical guide to deploying Istio on Tencent Kubernetes Engine with CLB integration and Tencent Cloud networking setup.

---

Tencent Kubernetes Engine (TKE) is Tencent Cloud's managed Kubernetes service. While Tencent offers its own mesh product (TCM - Tencent Cloud Mesh), installing upstream Istio on TKE is a solid choice when you want full control over your service mesh version and configuration. TKE provides standard Kubernetes with Tencent's networking layer, and Istio works well with it once you handle the load balancer configuration.

## Prerequisites

- Tencent Cloud account
- Tencent Cloud CLI or console access
- kubectl
- istioctl
- A VPC configured in your Tencent Cloud region

## Step 1: Create a TKE Cluster

Through the Tencent Cloud console:

1. Navigate to TKE (Tencent Kubernetes Engine)
2. Click "Create Cluster"
3. Choose "Managed Cluster" (the control plane is managed by Tencent)
4. Select your VPC and subnet
5. Configure worker nodes

Recommended settings for Istio:

- Node type: S5.XLARGE8 (4 vCPUs, 8 GB RAM) or larger
- Node count: 3
- Container network: GlobalRouter or VPC-CNI
- Runtime: containerd

Using the Tencent Cloud CLI:

```bash
tccli tke CreateCluster \
  --ClusterType MANAGED_CLUSTER \
  --ClusterCIDRSettings '{"ClusterCIDR": "10.0.0.0/14"}' \
  --ClusterBasicSettings '{
    "ClusterOs": "tlinux2.4(tkernel4)x86_64",
    "ClusterVersion": "1.30.0",
    "ClusterName": "istio-cluster",
    "VpcId": "vpc-xxx",
    "SubnetId": "subnet-xxx"
  }' \
  --RunInstancesForNode '[{
    "NodeRole": "WORKER",
    "RunInstancesPara": ["{\"InstanceType\":\"S5.XLARGE8\",\"InstanceCount\":3}"]
  }]'
```

## Step 2: Configure kubectl

Download the kubeconfig from the TKE console:

1. Go to your cluster
2. Click "Basic Information"
3. Download the kubeconfig under "Cluster APIServer Information"

Or use the CLI:

```bash
tccli tke DescribeClusterKubeconfig --ClusterId cls-xxx
```

Set up kubectl:

```bash
export KUBECONFIG=~/.kube/tke-config
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

Create a TKE-specific configuration with Tencent's CLB (Cloud Load Balancer) annotations:

```yaml
# istio-tke.yaml
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
            service.kubernetes.io/qcloud-loadbalancer-internal-subnetid: ""
            service.kubernetes.io/tke-existed-lbid: ""
```

For a public load balancer, just use the default without special annotations - TKE creates a public CLB automatically for LoadBalancer services:

```yaml
# istio-tke.yaml
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
istioctl install -f istio-tke.yaml -y
```

## Step 4: Verify

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

The ingress gateway should get a public VIP from Tencent's CLB:

```bash
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Step 5: Test

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Test access:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_HOST/productpage
```

## CLB Configuration Options

### Internal Load Balancer

For services accessible only within the VPC:

```yaml
k8s:
  serviceAnnotations:
    service.kubernetes.io/qcloud-loadbalancer-internal-subnetid: "subnet-xxx"
```

### Using an Existing CLB

```yaml
k8s:
  serviceAnnotations:
    service.kubernetes.io/tke-existed-lbid: "lb-xxx"
```

### CLB with Bandwidth Configuration

```yaml
k8s:
  serviceAnnotations:
    service.kubernetes.io/qcloud-loadbalancer-internet-charge-type: TRAFFIC_POSTPAID_BY_HOUR
    service.kubernetes.io/qcloud-loadbalancer-internet-max-bandwidth-out: "100"
```

### CLB with Specific Availability Zone

```yaml
k8s:
  serviceAnnotations:
    service.kubernetes.io/qcloud-loadbalancer-type: "2"
    service.kubernetes.io/local-svc-only-bind-node-with-pod: "true"
```

## Container Image Mirror

In China regions, pulling from Docker Hub can be unreliable. Use Tencent's container registry:

```bash
# Push Istio images to Tencent Container Registry (TCR)
docker pull docker.io/istio/proxyv2:1.24.0
docker tag docker.io/istio/proxyv2:1.24.0 ccr.ccs.tencentyun.com/istio/proxyv2:1.24.0
docker push ccr.ccs.tencentyun.com/istio/proxyv2:1.24.0

docker pull docker.io/istio/pilot:1.24.0
docker tag docker.io/istio/pilot:1.24.0 ccr.ccs.tencentyun.com/istio/pilot:1.24.0
docker push ccr.ccs.tencentyun.com/istio/pilot:1.24.0
```

Then install Istio with the custom hub:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: ccr.ccs.tencentyun.com/istio
  tag: 1.24.0
  profile: default
```

## VPC-CNI Mode

TKE supports VPC-CNI networking, which assigns VPC IPs directly to pods. This provides better performance for Istio mesh traffic since it eliminates the overlay network overhead.

When using VPC-CNI:
- Each pod gets a VPC IP address
- No IP masquerading needed
- Lower latency for inter-pod communication
- Security groups can be applied directly to pods

To use VPC-CNI with Istio, make sure your subnet has enough IP addresses for all pods plus their sidecars.

## Security Groups

TKE nodes share security groups. For Istio, verify the node security group allows:

- All TCP/UDP traffic between nodes (for mesh communication)
- Inbound traffic from CLB health check IPs on port 15021
- Inbound traffic on ports 80 and 443 from the CLB

Check through the console under VPC > Security Groups, or:

```bash
tccli vpc DescribeSecurityGroupPolicies --SecurityGroupId sg-xxx
```

## Monitoring with CLS and APM

Tencent Cloud Log Service (CLS) can collect Istio access logs:

1. Enable CLS log collection in TKE cluster settings
2. Create a log topic for Istio
3. Configure a LogConfig to collect from the istio-proxy containers

```yaml
apiVersion: cls.cloud.tencent.com/v1
kind: LogConfig
metadata:
  name: istio-proxy-logs
spec:
  inputDetail:
    type: container_stdout
    containerStdout:
      allContainers: false
      includeLabels:
        security.istio.io/tlsMode: istio
  outputDetail:
    topicId: "topic-xxx"
```

For metrics and tracing, install the Istio addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/jaeger.yaml
```

## TLS with Tencent SSL Certificates

Tencent Cloud provides free DV SSL certificates. You can use them with Istio:

1. Get a certificate from the SSL Certificate Service console
2. Download the certificate files
3. Create a Kubernetes secret

```bash
kubectl create secret tls istio-tls \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

Configure the Istio Gateway:

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
        - "myapp.example.com"
```

## Troubleshooting

If the CLB isn't provisioning, check your Tencent Cloud CLB quotas in the console under "Overview > Resource Limits."

If pod-to-pod communication fails, verify the container network mode. GlobalRouter mode adds an overlay that can sometimes conflict with Istio's iptables rules. VPC-CNI mode avoids this issue.

If images fail to pull, set up a pull-through proxy or use Tencent's container registry as described above.

If sidecar injection hangs, check that the API server can reach the istiod webhook. TKE's managed control plane has specific network paths for webhook calls:

```bash
kubectl describe mutatingwebhookconfigurations istio-sidecar-injector
```

Istio on TKE works well once you handle the CLB configuration and image availability. The VPC-CNI networking mode provides excellent performance for mesh traffic, and Tencent's monitoring services integrate nicely with Istio's telemetry.
