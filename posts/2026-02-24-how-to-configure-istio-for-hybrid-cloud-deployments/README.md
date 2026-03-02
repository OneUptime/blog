# How to Configure Istio for Hybrid Cloud Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Hybrid Cloud, Multi-Cluster, On-Premise, Kubernetes

Description: How to configure Istio service mesh to span hybrid cloud environments connecting on-premises data centers with cloud Kubernetes clusters.

---

Hybrid cloud is the reality for many organizations. You have workloads running on-premises that cannot be moved to the cloud yet, alongside new services running in Kubernetes on a cloud provider. Istio can bridge these environments, providing a unified service mesh that spans both on-premises and cloud infrastructure. The tricky part is networking, certificate trust, and service discovery across the boundary.

## Architecture Overview

A typical hybrid Istio deployment looks like this:

- Kubernetes cluster in the cloud (EKS, GKE, AKS) running Istio with the primary control plane
- On-premises infrastructure with either a Kubernetes cluster or VMs, joined to the mesh
- A network connection between the two (VPN, Direct Connect, or Interconnect)
- Shared trust through a common root CA

The cloud cluster usually hosts the primary Istio control plane, and the on-premises environment connects as a remote cluster or through Istio's VM support.

## Setting Up Network Connectivity

Before anything else, you need reliable network connectivity between your on-premises environment and the cloud. The Istio control plane needs to reach workloads, and workloads need to reach each other.

For AWS, set up a Site-to-Site VPN or Direct Connect:

```bash
# Create a Virtual Private Gateway
aws ec2 create-vpn-gateway --type ipsec.1

# Attach it to your VPC
aws ec2 attach-vpn-gateway \
  --vpn-gateway-id vgw-abc123 \
  --vpc-id vpc-xyz789

# Create a Customer Gateway (your on-premises router)
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip <on-prem-public-ip> \
  --bgp-asn 65000
```

For GCP, use Cloud VPN or Cloud Interconnect. For Azure, use Azure VPN Gateway or ExpressRoute.

The key requirement is that pod CIDRs and service CIDRs from both environments are routable across the connection. If they overlap, you need NAT or you need to re-address one side.

## Installing the Primary Control Plane

Install Istio on the cloud cluster as the primary:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-primary
spec:
  profile: default
  meshConfig:
    trustDomain: mycompany.com
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    global:
      meshID: hybrid-mesh
      multiCluster:
        clusterName: cloud-cluster
      network: cloud-network
```

```bash
istioctl install -f istio-primary.yaml --context=cloud-cluster
```

## Connecting an On-Premises Kubernetes Cluster

If your on-premises environment runs Kubernetes, you can join it to the mesh as a remote cluster.

Set up shared trust first by using the same root CA:

```bash
# Create cacerts secret on the on-prem cluster
kubectl --context=onprem-cluster create namespace istio-system

kubectl --context=onprem-cluster create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/onprem-ca-cert.pem \
  --from-file=ca-key.pem=certs/onprem-ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/onprem-cert-chain.pem
```

Install Istio on the on-prem cluster as a remote:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-remote
spec:
  profile: remote
  meshConfig:
    trustDomain: mycompany.com
  values:
    global:
      meshID: hybrid-mesh
      multiCluster:
        clusterName: onprem-cluster
      network: onprem-network
    istiodRemote:
      injectionPath: /inject/cluster/onprem-cluster/net/onprem-network
```

```bash
istioctl install -f istio-remote.yaml --context=onprem-cluster
```

Create remote secrets for cross-cluster discovery:

```bash
istioctl create-remote-secret \
  --context=onprem-cluster \
  --name=onprem-cluster | \
  kubectl apply --context=cloud-cluster -f -

istioctl create-remote-secret \
  --context=cloud-cluster \
  --name=cloud-cluster | \
  kubectl apply --context=onprem-cluster -f -
```

## Setting Up East-West Gateways

Since cloud and on-prem are on different networks, you need east-west gateways to bridge them:

```bash
# East-west gateway on the cloud cluster
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh hybrid-mesh --cluster cloud-cluster --network cloud-network | \
  istioctl --context=cloud-cluster install -y -f -

# Expose services
kubectl --context=cloud-cluster apply -n istio-system -f samples/multicluster/expose-services.yaml

# East-west gateway on the on-prem cluster
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh hybrid-mesh --cluster onprem-cluster --network onprem-network | \
  istioctl --context=onprem-cluster install -y -f -

kubectl --context=onprem-cluster apply -n istio-system -f samples/multicluster/expose-services.yaml
```

The east-west gateway uses port 15443 with AUTO_PASSTHROUGH TLS mode, meaning it routes mTLS traffic based on SNI without terminating it.

## Adding On-Premises VMs to the Mesh

If your on-premises workloads run on VMs instead of Kubernetes, Istio can still include them. Create a WorkloadGroup:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: legacy-payment
  namespace: production
spec:
  metadata:
    labels:
      app: legacy-payment
      version: v1
  template:
    serviceAccount: legacy-payment
    network: onprem-network
```

On the VM, install the Istio sidecar agent:

```bash
# Download the Istio sidecar
curl -LO https://storage.googleapis.com/istio-release/releases/1.20.0/deb/istio-sidecar.deb

# Install
sudo dpkg -i istio-sidecar.deb

# Configure the mesh connection
sudo mkdir -p /etc/istio/config
```

Create the mesh configuration on the VM:

```bash
# Generate the configuration from the cloud cluster
istioctl x workload entry configure \
  --file workload-group.yaml \
  --output /tmp/vm-config \
  --clusterID cloud-cluster \
  --autoregister
```

Copy the generated files to the VM and start the Istio agent:

```bash
sudo cp /tmp/vm-config/* /etc/istio/
sudo systemctl start istio
```

Register the workload:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: legacy-payment-vm1
  namespace: production
spec:
  address: 10.100.1.50
  labels:
    app: legacy-payment
    version: v1
  serviceAccount: legacy-payment
  network: onprem-network
```

Create a Kubernetes Service that points to the WorkloadEntry:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-payment
  namespace: production
spec:
  ports:
  - port: 8080
    name: http
    targetPort: 8080
```

Now Kubernetes workloads can call `legacy-payment.production.svc.cluster.local` and traffic will be routed to the on-premises VM through the mesh, complete with mTLS.

## Traffic Management Across Environments

You can use standard Istio traffic management across the hybrid boundary:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-routing
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        subset: cloud
      weight: 90
    - destination:
        host: legacy-payment
        subset: onprem
      weight: 10
```

This lets you gradually shift traffic from on-premises to cloud during migrations.

## Monitoring the Hybrid Mesh

Set up centralized monitoring that covers both environments:

```bash
# Deploy Prometheus on the cloud cluster
kubectl apply -f samples/addons/prometheus.yaml --context=cloud-cluster

# Configure Prometheus federation to scrape the on-prem cluster
```

Use Kiali to visualize traffic flow across the hybrid boundary:

```bash
kubectl apply -f samples/addons/kiali.yaml --context=cloud-cluster
```

Kiali will show connections between cloud services and on-premises workloads, making it easy to spot issues in the cross-environment traffic path.

Hybrid cloud with Istio requires more planning than a single-cluster setup, but the payoff is huge. You get consistent security policies, traffic management, and observability across your entire infrastructure. Start with good network connectivity, establish shared trust through a common root CA, and use east-west gateways to bridge the networks. From there, the mesh makes hybrid cloud feel like a single environment.
