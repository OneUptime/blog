# How to Set Up Istio on Alibaba Cloud Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Alibaba Cloud, ACK, Kubernetes, Service Mesh

Description: Guide to deploying Istio on Alibaba Cloud Container Service for Kubernetes (ACK) with SLB integration and China region setup.

---

Alibaba Cloud Container Service for Kubernetes (ACK) is one of the major managed Kubernetes platforms in the Asia-Pacific region. While Alibaba Cloud offers its own service mesh product (ASM - Alibaba Service Mesh), you can also install upstream Istio directly on ACK. This gives you the latest community features and keeps your setup portable across cloud providers.

This guide covers creating an ACK cluster and getting Istio running with Alibaba Cloud-specific networking considerations.

## Prerequisites

- Alibaba Cloud account
- Alibaba Cloud CLI (`aliyun`) installed and configured
- kubectl
- istioctl

Install and configure the Alibaba Cloud CLI:

```bash
# Install

curl https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz -o aliyun-cli-linux-latest.tgz
tar xzvf aliyun-cli-linux-latest.tgz
sudo mv ./aliyun /usr/local/bin/

# Configure
aliyun configure
```

## Step 1: Create an ACK Cluster

You can create a managed Kubernetes cluster through the console or CLI. The CLI approach:

```bash
aliyun cs POST /clusters --region cn-hangzhou --header "Content-Type=application/json" --body '{
  "name": "istio-cluster",
  "cluster_type": "ManagedKubernetes",
  "profile": "Default",
  "cluster_spec": "ack.standard",
  "region_id": "cn-hangzhou",
  "kubernetes_version": "1.34.3-aliyun.1",
  "vpcid": "vpc-xxx",
  "vswitch_ids": ["vsw-xxx"],
  "container_cidr": "172.20.0.0/16",
  "service_cidr": "172.21.0.0/20",
  "snat_entry": true,
  "addons": [
    {"name": "flannel"},
    {"name": "csi-plugin"},
    {"name": "managed-csiprovisioner"},
    {"name": "nginx-ingress-controller", "disabled": true}
  ],
  "nodepools": [
    {
      "nodepool_info": {"name": "default-nodepool"},
      "scaling_group": {
        "vswitch_ids": ["vsw-xxx"],
        "instance_types": ["ecs.g6.xlarge"],
        "system_disk_category": "cloud_essd",
        "system_disk_size": 120,
        "desired_size": 3,
        "instance_charge_type": "PostPaid"
      },
      "kubernetes_config": {
        "runtime": "containerd"
      }
    }
  ]
}'
```

The `ecs.g6.xlarge` instance type gives you 4 vCPUs and 16 GB RAM per node.

Alternatively, create the cluster through the Alibaba Cloud console, which is often easier for first-time setup since it handles VPC and vSwitch creation for you.

## Step 2: Configure kubectl

Get the kubeconfig from ACK:

```bash
# Through the console: Cluster -> More -> Manage kubectl config
# Or using the CLI:
aliyun cs GET /k8s/<cluster-id>/user_config
```

Save the config and point kubectl to it:

```bash
export KUBECONFIG=~/.kube/config-ack
kubectl get nodes
```

## Step 3: Install Istio

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.29.2 sh -
cd istio-1.29.2
export PATH=$PWD/bin:$PATH
```

Pre-check:

```bash
istioctl x precheck
```

Install with Alibaba Cloud-specific annotations for the Server Load Balancer (SLB):

```yaml
# istio-ack.yaml
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
            service.beta.kubernetes.io/alibaba-cloud-loadbalancer-spec: slb.s2.small
            service.beta.kubernetes.io/alibaba-cloud-loadbalancer-address-type: internet
```

The `slb.s2.small` spec is suitable for development when you create a pay-by-specification CLB instance. For production, use a larger spec like `slb.s3.medium` or `slb.s3.large`, or omit the spec annotation and use Alibaba Cloud's default pay-by-usage CLB billing.

```bash
istioctl install -f istio-ack.yaml -y
```

## Step 4: Verify

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

The ingress gateway should get a public IP from Alibaba's SLB:

```bash
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Step 5: Deploy and Test

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Test:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_HOST/productpage
```

## SLB Configuration Options

Alibaba Cloud's SLB (Server Load Balancer) has several configuration options through annotations:

### Internal SLB

```yaml
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-address-type: intranet
```

### Specific vSwitch for Internal SLB

```yaml
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-address-type: intranet
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-vswitch-id: "vsw-xxx"
```

### Use an Existing SLB

```yaml
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-id: "lb-xxx"
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-force-override-listeners: "true"
```

### Health Check Configuration

```yaml
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-health-check-flag: "on"
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-health-check-type: http
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-health-check-uri: /healthz/ready
service.beta.kubernetes.io/alibaba-cloud-loadbalancer-health-check-connect-timeout: "5"
```

## Container Image Considerations

If your cluster is in a China region, pulling images from Docker Hub can be slow or unreliable. Configure Istio to use Alibaba's container registry mirror:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: <your-acr-registry>/<your-istio-namespace>
  tag: 1.29.2
```

Or set up a pull-through cache using Alibaba Container Registry (ACR):

```bash
# Create a namespace in ACR
aliyun cr CreateNamespace \
  --RegionId cn-hangzhou \
  --InstanceId cri-xxx \
  --NamespaceName istio-mirror \
  --AutoCreateRepo true
```

## TLS with Alibaba Cloud Certificates

You can use certificates from Alibaba Cloud's SSL Certificate Service:

```bash
# Download the certificate from the console
# Then create a Kubernetes secret
kubectl create secret tls istio-tls \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

Configure the Gateway:

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

## Monitoring with ARMS

Alibaba Cloud's Application Real-Time Monitoring Service (ARMS) integrates with Kubernetes. You can use it alongside or instead of Istio's built-in monitoring:

```bash
# Install the supported ack-onepilot add-on from the ACK console:
# Cluster -> Add-ons -> Logs and Monitoring -> ack-onepilot
```

Or install the standard Istio addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
```

## Security Group Rules

ACK clusters use Alibaba Cloud security groups. Make sure the worker node security group allows:

- Inbound traffic on port 80 and 443 from the SLB
- All traffic between worker nodes (for mesh communication)
- Outbound internet access for image pulls

```bash
aliyun ecs AuthorizeSecurityGroup \
  --SecurityGroupId sg-xxx \
  --IpProtocol tcp \
  --PortRange 80/80 \
  --SourceCidrIp 0.0.0.0/0
```

## Troubleshooting ACK + Istio

If images fail to pull, check your internet connectivity and consider using the China region mirror.

If the SLB isn't provisioning, verify your account has sufficient SLB quota:

```bash
aliyun slb DescribeAvailableResource --RegionId cn-hangzhou
```

If pods are stuck in Init state, check the istio-init container logs. ACK's network plugin (Terway or Flannel) should work with Istio, but Terway in ENI mode requires extra attention to make sure the iptables rules are applied correctly.

Getting Istio running on ACK follows the same patterns as other cloud providers. The key differences are the SLB annotations and potentially needing to use Chinese container registry mirrors. Once you're past those initial setup steps, the Istio experience is identical to what you'd get on any other managed Kubernetes platform.
