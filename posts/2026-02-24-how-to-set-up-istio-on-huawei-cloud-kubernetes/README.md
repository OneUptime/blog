# How to Set Up Istio on Huawei Cloud Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Huawei Cloud, CCE, Kubernetes, Service Mesh

Description: How to deploy Istio on Huawei Cloud Container Engine (CCE) with ELB integration and Huawei-specific networking configuration.

---

Huawei Cloud Container Engine (CCE) is Huawei's managed Kubernetes service. While Huawei offers its own Application Service Mesh (ASM) built on Istio, you might prefer installing upstream Istio directly for version flexibility or to maintain a consistent setup across multiple cloud providers. CCE provides standard Kubernetes with Huawei Cloud's networking layer, and Istio runs well on it with a few platform-specific adjustments.

## Prerequisites

- Huawei Cloud account
- Huawei Cloud CLI (`hcloud`) or access to the CCE console
- kubectl
- istioctl
- A VPC configured in your Huawei Cloud region

## Step 1: Create a CCE Cluster

You can create a cluster through the Huawei Cloud console or the API. The console is the easiest path for a first setup:

1. Navigate to CCE in the Huawei Cloud console
2. Click "Create Cluster"
3. Choose "CCE Standard" for production or "CCE Turbo" for better networking performance
4. Select your VPC and subnet
5. Configure node pools

For a cluster suitable for Istio, use these settings:

- Node flavor: c6.xlarge.4 (4 vCPUs, 16 GB RAM)
- Node count: 3
- Container network model: VPC network (for CCE Standard) or Cloud Native 2.0 (for CCE Turbo)

Using the API:

```bash
curl -X POST "https://cce.cn-north-4.myhuaweicloud.com/api/v3/projects/{project_id}/clusters" \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "Cluster",
    "apiVersion": "v3",
    "metadata": {
      "name": "istio-cluster"
    },
    "spec": {
      "type": "VirtualMachine",
      "flavor": "cce.s2.medium",
      "version": "v1.30",
      "hostNetwork": {
        "vpc": "vpc-id",
        "subnet": "subnet-id"
      },
      "containerNetwork": {
        "mode": "vpc-router",
        "cidr": "10.0.0.0/16"
      }
    }
  }'
```

## Step 2: Configure kubectl

Download the kubeconfig from the CCE console:

1. Go to your cluster in the CCE console
2. Click "kubectl" in the left menu
3. Download the kubeconfig file

```bash
export KUBECONFIG=~/.kube/cce-config
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

Create a CCE-specific configuration with Huawei's Elastic Load Balance (ELB) annotations:

```yaml
# istio-cce.yaml
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
            kubernetes.io/elb.class: union
            kubernetes.io/elb.autocreate: >-
              {
                "type": "public",
                "bandwidth_name": "istio-bandwidth",
                "bandwidth_chargemode": "traffic",
                "bandwidth_size": 100,
                "bandwidth_sharetype": "PER",
                "eip_type": "5_bgp"
              }
```

This creates a public ELB with a bandwidth of 100 Mbps billed by traffic.

```bash
istioctl install -f istio-cce.yaml -y
```

## Step 4: Verify

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

The ingress gateway should get a public EIP (Elastic IP) from Huawei's ELB service. This might take a couple of minutes:

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

## ELB Configuration Options

Huawei Cloud's ELB has several configurations through Kubernetes annotations:

### Internal ELB

For services only accessible within the VPC:

```yaml
k8s:
  serviceAnnotations:
    kubernetes.io/elb.class: union
    kubernetes.io/elb.autocreate: >-
      {
        "type": "inner"
      }
```

### Using an Existing ELB

If you already have an ELB:

```yaml
k8s:
  serviceAnnotations:
    kubernetes.io/elb.class: union
    kubernetes.io/elb.id: "elb-id-here"
    kubernetes.io/elb.subnet-id: "subnet-id-here"
```

### Dedicated Load Balancer

For better performance isolation:

```yaml
k8s:
  serviceAnnotations:
    kubernetes.io/elb.class: performance
    kubernetes.io/elb.autocreate: >-
      {
        "type": "public",
        "bandwidth_name": "istio-dedicated",
        "bandwidth_size": 200,
        "bandwidth_sharetype": "PER",
        "eip_type": "5_bgp",
        "available_zone": ["cn-north-4a"]
      }
```

## Container Image Registry

If you're in a China region, pulling images from the default Istio registry might be slow. Use Huawei's SWR (Software Repository for Container) as a mirror:

```bash
# Pull Istio images and push to SWR
docker pull docker.io/istio/proxyv2:1.24.0
docker tag docker.io/istio/proxyv2:1.24.0 swr.cn-north-4.myhuaweicloud.com/istio/proxyv2:1.24.0
docker push swr.cn-north-4.myhuaweicloud.com/istio/proxyv2:1.24.0
```

Then configure Istio to use SWR:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: swr.cn-north-4.myhuaweicloud.com/istio
  tag: 1.24.0
```

## Security Groups

CCE manages security groups for your nodes. Make sure the node security group allows:

- All TCP traffic between nodes in the cluster (for mesh communication)
- Inbound traffic on ports 80 and 443 from the ELB subnet
- Outbound internet access for image pulls

You can check and modify security groups in the VPC console or through the API:

```bash
# List security groups
curl -X GET "https://vpc.cn-north-4.myhuaweicloud.com/v1/{project_id}/security-groups" \
  -H "X-Auth-Token: $TOKEN"
```

## Monitoring with AOM

Huawei Cloud's Application Operations Management (AOM) can collect metrics from your CCE cluster. Enable it in the CCE console under "Add-ons":

1. Go to your cluster
2. Click "Add-ons"
3. Install the ICAgent addon

ICAgent collects node and pod metrics. For Istio-specific metrics, install Prometheus and Grafana:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
```

Access Grafana:

```bash
istioctl dashboard grafana
```

## CCE Turbo vs CCE Standard

CCE Turbo uses a different networking model (Cloud Native Network 2.0) that assigns ENIs directly to pods. This provides better network performance, which benefits Istio since all mesh traffic goes through Envoy proxies.

With CCE Turbo:
- Lower latency between pods
- Higher throughput for mesh traffic
- Better IP address management

The Istio installation process is the same for both CCE types. The main difference is in the ELB annotations and the underlying network performance.

## Upgrading Istio

When upgrading Istio on CCE, follow the standard process:

```bash
# Download the new version
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.25.0 sh -
cd istio-1.25.0
export PATH=$PWD/bin:$PATH

# Upgrade
istioctl upgrade -y

# Restart workloads to get new sidecar version
kubectl rollout restart deployment -n default
```

## Troubleshooting

If the ELB isn't created, check your Huawei Cloud quotas for ELBs and EIPs:

```bash
# Check through the console under "My Quotas"
```

If pod networking is broken after installing Istio, verify that the container network mode is compatible. VPC Router mode works best with Istio on CCE Standard.

If sidecar injection fails, check that the istiod webhook can receive calls from the API server. CCE sometimes has network restrictions between the control plane and worker nodes for webhook traffic.

Setting up Istio on Huawei Cloud CCE follows the same general pattern as other cloud providers. The main Huawei-specific considerations are the ELB annotations for load balancer creation and potentially using SWR for container images. Once those are configured, the Istio experience is the same as on any other Kubernetes platform.
