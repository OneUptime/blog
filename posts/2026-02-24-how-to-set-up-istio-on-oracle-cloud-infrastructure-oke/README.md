# How to Set Up Istio on Oracle Cloud Infrastructure (OKE)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Oracle Cloud, OKE, Kubernetes, Service Mesh

Description: Complete guide to deploying Istio on Oracle Kubernetes Engine with OCI load balancer integration and network configuration.

---

Oracle Kubernetes Engine (OKE) is Oracle Cloud Infrastructure's managed Kubernetes service. It provides a straightforward Kubernetes experience, and setting up Istio on it is pretty standard. The main OCI-specific considerations are around the load balancer configuration and the OCI networking model.

## Prerequisites

- An Oracle Cloud account
- OCI CLI installed and configured
- kubectl
- istioctl
- An existing VCN (Virtual Cloud Network) or you can create one during cluster setup

Configure the OCI CLI:

```bash
oci setup config
```

## Step 1: Create an OKE Cluster

You can create a cluster through the OCI Console or the CLI. Here's the CLI approach:

```bash
oci ce cluster create \
  --compartment-id ocid1.compartment.oc1..your-compartment-id \
  --name istio-cluster \
  --kubernetes-version v1.35.2 \
  --vcn-id ocid1.vcn.oc1..your-vcn-id \
  --service-lb-subnet-ids '["ocid1.subnet.oc1..your-lb-subnet-id"]'
```

Then create a node pool:

```bash
oci ce node-pool create \
  --cluster-id ocid1.cluster.oc1..your-cluster-id \
  --compartment-id ocid1.compartment.oc1..your-compartment-id \
  --name istio-nodes \
  --kubernetes-version v1.35.2 \
  --node-shape VM.Standard.E4.Flex \
  --node-shape-config '{"ocpus": 4, "memoryInGBs": 32}' \
  --size 3 \
  --placement-configs '[{"availabilityDomain": "your-region-ad-name", "subnetId": "ocid1.subnet.oc1..your-subnet-id"}]'
```

The VM.Standard.E4.Flex shape is a good choice because you can configure the exact amount of CPU and memory you need.

## Step 2: Configure kubectl

Download the kubeconfig:

```bash
oci ce cluster create-kubeconfig \
  --cluster-id ocid1.cluster.oc1..your-cluster-id \
  --file $HOME/.kube/config \
  --region us-ashburn-1 \
  --token-version 2.0.0
```

Verify:

```bash
kubectl get nodes
```

## Step 3: Install Istio

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.30.0 sh -
cd istio-1.30.0
export PATH=$PWD/bin:$PATH
```

Pre-check:

```bash
istioctl x precheck
```

Create an OCI-specific configuration:

```yaml
# istio-oke.yaml

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
            service.beta.kubernetes.io/oci-load-balancer-shape: flexible
            service.beta.kubernetes.io/oci-load-balancer-shape-flex-min: "10"
            service.beta.kubernetes.io/oci-load-balancer-shape-flex-max: "100"
```

The OCI load balancer annotations configure a flexible load balancer, which scales bandwidth between 10 and 100 Mbps. For production, adjust the max value based on your traffic needs.

```bash
istioctl install -f istio-oke.yaml -y
```

## Step 4: Verify Installation

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

The ingress gateway should get a public IP from OCI's load balancer service. This might take 2-3 minutes:

```bash
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Step 5: Test the Setup

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Get the external IP:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_HOST/productpage
```

## OCI Load Balancer Options

OCI offers several load balancer configurations that work with Istio:

### Public Load Balancer (Default)

This is what you get by default. It has a public IP accessible from the internet.

### Internal Load Balancer

For internal services:

```yaml
k8s:
  serviceAnnotations:
    service.beta.kubernetes.io/oci-load-balancer-internal: "true"
    service.beta.kubernetes.io/oci-load-balancer-subnet1: "ocid1.subnet.oc1..your-internal-subnet"
```

### Network Load Balancer

For higher performance and lower latency, use OCI's Network Load Balancer:

```yaml
k8s:
  serviceAnnotations:
    oci.oraclecloud.com/load-balancer-type: nlb
```

## Security Lists and Network Security Groups

OCI uses security lists or network security groups (NSGs) to control traffic. Make sure your worker node subnet allows:

- Inbound traffic from the load balancer subnet to worker node NodePorts (typically 30000-32767) and kube-proxy health checks on 10256
- Node-to-node communication on all ports (for Istio mesh traffic)
- Outbound internet access for pulling images

Create or update security list rules for the worker node subnet. When using `oci network security-list update`, include your existing ingress rules too because the command replaces the rule list:

```bash
oci network security-list update \
  --security-list-id ocid1.securitylist.oc1..your-sl-id \
  --ingress-security-rules '[
    {
      "source": "10.0.20.0/24",
      "protocol": "6",
      "tcpOptions": {"destinationPortRange": {"min": 30000, "max": 32767}},
      "description": "Load balancer subnet to worker node NodePorts"
    },
    {
      "source": "10.0.20.0/24",
      "protocol": "6",
      "tcpOptions": {"destinationPortRange": {"min": 10256, "max": 10256}},
      "description": "Load balancer health checks to kube-proxy"
    }
  ]'
```

## Setting Up TLS with Kubernetes Secrets

For Istio to terminate TLS at the ingress gateway, create a Kubernetes TLS secret in the namespace where the gateway workload runs. If you use OCI Certificates, import or sync the certificate material into a Kubernetes secret before referencing it from an Istio `Gateway`:

```bash
kubectl create -n istio-system secret tls istio-tls-secret \
  --cert=cert.pem \
  --key=key.pem
```

Then configure Istio's Gateway to use TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
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
        credentialName: istio-tls-secret
      hosts:
        - "*.example.com"
```

## Monitoring with OCI Monitoring Service

OKE emits cluster and node metrics to the `oci_oke` namespace in OCI Monitoring automatically. To publish Istio application or proxy metrics to OCI Monitoring, use a custom metric pipeline or a collector that posts custom metrics to OCI Monitoring.

```bash
oci monitoring metric-data post \
  --metric-data file://metric-data.json \
  --endpoint https://telemetry-ingestion.us-ashburn-1.oraclecloud.com
```

Or use the standard Istio observability stack:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
```

## Troubleshooting OKE-Specific Issues

If the load balancer creation fails, check your OCI service limits:

```bash
oci limits value list --compartment-id ocid1.tenancy.oc1..your-tenancy --service-name load-balancer
```

If nodes can't pull images, make sure your subnet has a route to the internet through a NAT gateway or internet gateway.

If the load balancer health checks fail, verify that the Istio ingress gateway's health check endpoint is responding:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -- curl -s localhost:15021/healthz/ready
```

OKE with Istio works well for production workloads. The main things to get right are the load balancer configuration and the network security rules. Once those are in place, the day-to-day Istio experience is the same as on any other Kubernetes platform.
