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

The key requirement is that the networks do not overlap and that the endpoints used for cross-environment traffic are reachable. If workloads can communicate directly, pod CIDRs must be routable across the connection. If they cannot, configure Istio networks and east-west gateways so cross-network traffic has reachable gateway addresses.

## Installing the Primary Control Plane

Install Istio on the cloud cluster as the primary:

```bash
kubectl --context=cloud-cluster create namespace istio-system

kubectl --context=cloud-cluster create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/ca-cert.pem \
  --from-file=ca-key.pem=certs/ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/cert-chain.pem
```

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
      externalIstiod: true
```

```bash
istioctl install -f istio-primary.yaml --context=cloud-cluster
```

Expose the primary control plane through an east-west gateway so the remote cluster can reach it:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network cloud-network | \
  istioctl --context=cloud-cluster install -y -f -

kubectl --context=cloud-cluster apply -n istio-system -f samples/multicluster/expose-istiod.yaml
```

## Connecting an On-Premises Kubernetes Cluster

If your on-premises environment runs Kubernetes, you can join it to the mesh as a remote cluster.

Set up shared trust first by using the same root CA files you used for the primary cluster:

```bash
# Create cacerts secret on the on-prem cluster
kubectl --context=onprem-cluster create namespace istio-system

kubectl --context=onprem-cluster create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/ca-cert.pem \
  --from-file=ca-key.pem=certs/ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/cert-chain.pem
```

Install Istio on the on-prem cluster as a remote:

```bash
kubectl --context=onprem-cluster annotate namespace istio-system \
  topology.istio.io/controlPlaneClusters=cloud-cluster

kubectl --context=onprem-cluster label namespace istio-system \
  topology.istio.io/network=onprem-network

DISCOVERY_ADDRESS=$(kubectl --context=cloud-cluster \
  -n istio-system get svc istio-eastwestgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

```bash
cat > istio-remote.yaml <<EOF
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
      remotePilotAddress: ${DISCOVERY_ADDRESS}
    istiodRemote:
      injectionPath: /inject/cluster/onprem-cluster/net/onprem-network
EOF
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
```

## Setting Up East-West Gateways

Since cloud and on-prem are on different networks, you need east-west gateways to bridge them. The cloud gateway is already exposing the primary control plane; now expose user services and install the gateway on the remote cluster:

```bash
# Expose services on the cloud cluster
kubectl --context=cloud-cluster apply -n istio-system -f samples/multicluster/expose-services.yaml

# East-west gateway on the on-prem cluster
samples/multicluster/gen-eastwest-gateway.sh \
  --network onprem-network | \
  istioctl --context=onprem-cluster install -y -f -
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
# Download the Istio sidecar for your Istio release
curl -LO https://storage.googleapis.com/istio-release/releases/1.30.0/deb/istio-sidecar.deb

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
  --clusterID cloud-cluster
```

Copy the generated files to the VM and start the Istio agent:

```bash
sudo mkdir -p /etc/certs /var/run/secrets/tokens /var/lib/istio/envoy /etc/istio/config /etc/istio/proxy
sudo cp /tmp/vm-config/root-cert.pem /etc/certs/root-cert.pem
sudo cp /tmp/vm-config/istio-token /var/run/secrets/tokens/istio-token
sudo cp /tmp/vm-config/cluster.env /var/lib/istio/envoy/cluster.env
sudo cp /tmp/vm-config/mesh.yaml /etc/istio/config/mesh
sudo sh -c 'cat /tmp/vm-config/hosts >> /etc/hosts'
sudo chown -R istio-proxy /var/lib/istio /etc/certs /etc/istio/proxy /etc/istio/config /var/run/secrets
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
  selector:
    app: legacy-payment
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
