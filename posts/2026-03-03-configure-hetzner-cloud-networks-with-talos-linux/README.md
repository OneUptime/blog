# How to Configure Hetzner Cloud Networks with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Hetzner Cloud, Networking, Kubernetes, Infrastructure

Description: Step-by-step guide to configuring Hetzner Cloud private networks and the Hetzner CCM with Talos Linux Kubernetes clusters.

---

Hetzner Cloud offers some of the best price-to-performance ratios in the cloud hosting market, making it an attractive option for running Kubernetes clusters. Their private network feature creates isolated Layer 3 networks between your servers, and when combined with the Hetzner Cloud Controller Manager, you get automatic load balancer provisioning and node lifecycle management. This guide covers setting up Hetzner Cloud networking with Talos Linux.

## Why Hetzner Cloud for Kubernetes

Hetzner's pricing is dramatically lower than the hyperscalers. A server with 4 vCPUs and 16 GB RAM costs a fraction of what comparable instances cost on AWS or GCP. Private networks between servers are free, and load balancers are inexpensive. For teams running non-trivial Kubernetes clusters, the savings can be substantial.

The trade-off is fewer managed services. Hetzner does not have a native managed Kubernetes offering (though they have a Kubernetes product now), so you manage everything yourself. Talos Linux helps here by eliminating OS-level management overhead.

## Prerequisites

Before you start:

- A Hetzner Cloud account with API access
- An API token with read/write permissions
- `hcloud` CLI installed
- `talosctl` and `kubectl` installed

## Creating the Network

Create a private network for your cluster:

```bash
# Create a private network
hcloud network create --name talos-network --ip-range 10.0.0.0/8

# Create a subnet within the network
hcloud network create-subnet talos-network \
  --type cloud \
  --network-zone eu-central \
  --ip-range 10.0.1.0/24
```

The network uses a /8 range as the overall address space, with a /24 subnet for your servers. You can add more subnets later if needed.

## Creating Servers

Upload the Talos Linux image and create your servers:

```bash
# Upload Talos Linux image to Hetzner
# First, download the Hetzner Cloud image
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/hcloud-amd64.raw.xz

# Create an image through the Hetzner API or use a snapshot approach
# For simplicity, use the Talos Image Factory URL
hcloud server create \
  --name talos-cp-1 \
  --type cpx31 \
  --image <talos-image-id> \
  --location fsn1 \
  --network talos-network \
  --user-data-from-file controlplane.yaml

hcloud server create \
  --name talos-cp-2 \
  --type cpx31 \
  --image <talos-image-id> \
  --location fsn1 \
  --network talos-network \
  --user-data-from-file controlplane.yaml

hcloud server create \
  --name talos-cp-3 \
  --type cpx31 \
  --image <talos-image-id> \
  --location fsn1 \
  --network talos-network \
  --user-data-from-file controlplane.yaml
```

Create worker nodes:

```bash
# Create worker nodes
for i in 1 2 3; do
  hcloud server create \
    --name talos-worker-$i \
    --type cpx41 \
    --image <talos-image-id> \
    --location fsn1 \
    --network talos-network \
    --user-data-from-file worker.yaml
done
```

## Generating Talos Configuration

Configure Talos for the Hetzner environment:

```bash
# Generate Talos configuration
talosctl gen config hetzner-cluster https://<load-balancer-ip>:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {"enabled": true}},
    {"op": "add", "path": "/machine/kubelet/extraArgs", "value": {
      "cloud-provider": "external"
    }}
  ]'
```

You also need to configure the network interface for the private network. Talos needs to know about the private network interface to route traffic correctly:

```yaml
# controlplane-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth1
        dhcp: true
  kubelet:
    extraArgs:
      cloud-provider: external
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
```

The `nodeIP.validSubnets` setting tells the kubelet to use the private network IP as its node address instead of the public IP. This keeps all cluster traffic on the private network.

## Deploying the Hetzner Cloud Controller Manager

The Hetzner CCM handles node initialization and load balancer management:

```bash
# Create the secret with the Hetzner API token
kubectl create secret generic hcloud \
  --namespace kube-system \
  --from-literal=token=<your-hcloud-token> \
  --from-literal=network=talos-network

# Deploy the Hetzner CCM
kubectl apply -f https://github.com/hetznercloud/hcloud-cloud-controller-manager/releases/latest/download/ccm-networks.yaml
```

Use the `ccm-networks.yaml` manifest specifically (not the basic `ccm.yaml`) because it includes network route management. This is important for pod-to-pod communication across nodes.

## Verifying Network Connectivity

After the CCM starts, check that routes are configured:

```bash
# Check CCM pods
kubectl get pods -n kube-system -l app=hcloud-cloud-controller-manager

# Verify node initialization
kubectl get nodes -o wide

# Check that nodes have Hetzner provider IDs
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.providerID}{"\n"}{end}'
```

The CCM creates routes in the Hetzner network so that pods on different nodes can reach each other through the private network.

## Load Balancer Integration

Create a LoadBalancer service to test the integration:

```yaml
# lb-test.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-lb
  annotations:
    # Use the Hetzner Cloud Load Balancer
    load-balancer.hetzner.cloud/location: fsn1
    # Health check configuration
    load-balancer.hetzner.cloud/health-check-interval: "5s"
    load-balancer.hetzner.cloud/health-check-timeout: "3s"
    load-balancer.hetzner.cloud/health-check-retries: "3"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
```

```bash
# Apply and check for the external IP
kubectl apply -f lb-test.yaml
kubectl get svc web-lb --watch
```

## Advanced Load Balancer Configuration

Hetzner Load Balancers support several configuration options through annotations:

```yaml
annotations:
  # Use a specific load balancer type
  load-balancer.hetzner.cloud/type: lb11

  # Make the load balancer internal (private network only)
  load-balancer.hetzner.cloud/use-private-ip: "true"

  # Configure the load balancer algorithm
  load-balancer.hetzner.cloud/algorithm-type: "least_connections"

  # Enable Proxy Protocol for client IP forwarding
  load-balancer.hetzner.cloud/uses-proxyprotocol: "true"

  # Attach the load balancer to a specific network
  load-balancer.hetzner.cloud/network-zone: "eu-central"
```

## Deploying the Hetzner CSI Driver

For persistent storage, deploy the Hetzner CSI driver:

```bash
# Create the secret for the CSI driver
kubectl create secret generic hcloud-csi \
  --namespace kube-system \
  --from-literal=token=<your-hcloud-token>

# Deploy the CSI driver
kubectl apply -f https://raw.githubusercontent.com/hetznercloud/csi-driver/main/deploy/kubernetes/hcloud-csi.yml
```

Create a StorageClass:

```yaml
# hcloud-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hcloud-volumes
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.hetzner.cloud
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Network Performance Optimization

Hetzner's private network has excellent performance, but there are a few things to optimize:

```yaml
# Increase the MTU for the private network interface
machine:
  network:
    interfaces:
      - interface: eth1
        dhcp: true
        mtu: 1450
```

The private network supports jumbo frames, but the overhead from encapsulation means you should set the MTU slightly below 1500 to avoid fragmentation.

## Multi-Location Clusters

Hetzner has data centers in Falkenstein (fsn1), Nuremberg (nbg1), Helsinki (hel1), and Ashburn (ash). You can create servers across locations, but private networks currently only work within a single network zone. For cross-location communication, you would need to use the public network or set up a VPN overlay.

```bash
# Create servers in different locations within the same network zone
hcloud server create --name worker-fsn --type cpx41 --location fsn1 --network talos-network ...
hcloud server create --name worker-nbg --type cpx41 --location nbg1 --network talos-network ...
```

## Troubleshooting

If nodes cannot communicate or load balancers are not being created:

```bash
# Check CCM logs
kubectl logs -n kube-system -l app=hcloud-cloud-controller-manager --tail=50

# Verify the network routes in Hetzner
hcloud network describe talos-network

# Check server network attachment
hcloud server describe talos-cp-1
```

Common issues include incorrect API tokens, servers not being attached to the network, and firewall rules blocking traffic between nodes.

## Conclusion

Hetzner Cloud with Talos Linux delivers impressive value for Kubernetes clusters. The private network feature provides fast, free inter-node communication, and the Cloud Controller Manager automates load balancer provisioning and route management. The main limitation compared to the hyperscalers is the smaller set of managed services, but for teams that are comfortable managing their own infrastructure, the cost savings are compelling.
