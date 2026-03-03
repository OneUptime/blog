# How to Use KubeSpan for Hybrid Cloud Clusters on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Hybrid Cloud, Multi-Cloud, WireGuard

Description: A practical guide to building hybrid cloud Kubernetes clusters with KubeSpan on Talos Linux, spanning on-premises and cloud infrastructure with encrypted connectivity.

---

Hybrid cloud clusters are one of the strongest use cases for KubeSpan in Talos Linux. When you have nodes running on-premises and in one or more cloud providers, KubeSpan creates a unified encrypted network that makes them all part of the same Kubernetes cluster. No VPN appliances, no complex networking gear, just WireGuard tunnels managed automatically by Talos. This guide walks through setting up a hybrid cloud cluster from scratch.

## The Architecture

A typical hybrid cloud setup with Talos Linux and KubeSpan looks like this:

```
On-Premises Data Center
  - 3 control plane nodes (bare metal)
  - 5 worker nodes (bare metal)
  - Private network: 10.10.0.0/16

AWS Region us-east-1
  - 3 worker nodes (EC2 instances)
  - VPC network: 10.20.0.0/16
  - Public IPs via Elastic IPs

GCP Region us-central1
  - 2 worker nodes (GCE instances)
  - VPC network: 10.30.0.0/16
  - Public IPs via static external IPs
```

KubeSpan connects all these nodes through encrypted WireGuard tunnels. Control plane traffic, pod-to-pod communication, and etcd replication all flow securely between sites.

## Setting Up the On-Premises Nodes

Start by generating the cluster configuration. The on-premises data center will host the control plane:

```bash
# Generate cluster configuration with KubeSpan enabled
talosctl gen config hybrid-cluster https://10.10.0.10:6443 \
  --with-kubespan \
  --config-patch='[
    {"op": "add", "path": "/machine/network/kubespan/advertiseKubernetesNetworks", "value": true}
  ]'
```

Create a patch for on-premises nodes:

```yaml
# onprem-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      filters:
        endpoints:
          # Advertise both private and public IPs
          # Private IPs will be used by local peers
          # Public IPs (if available) will be used by cloud peers
          - "0.0.0.0/0"
```

If your on-premises nodes are behind a NAT firewall, configure port forwarding for UDP 51820 and set up endpoint filters:

```yaml
# onprem-nat-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      filters:
        endpoints:
          - "!10.10.0.0/16"    # Do not advertise private data center IPs
          - "0.0.0.0/0"        # Advertise the NAT public IP
```

Apply the configuration:

```bash
# Apply to control plane nodes
talosctl apply-config --insecure \
  --nodes 10.10.0.10,10.10.0.11,10.10.0.12 \
  --file controlplane.yaml \
  --config-patch @onprem-patch.yaml
```

## Setting Up AWS Worker Nodes

For AWS, provision EC2 instances with Talos Linux AMI. Create a patch for AWS nodes:

```yaml
# aws-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      mtu: 1380  # Lower MTU for AWS VPC encapsulation
      filters:
        endpoints:
          # Only advertise the Elastic IP, not the VPC private IP
          - "!10.20.0.0/16"
          - "0.0.0.0/0"
  install:
    disk: /dev/xvda  # AWS EBS device naming
```

Set up the AWS security group:

```bash
# Create security group rules for KubeSpan
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxx \
  --protocol udp \
  --port 51820 \
  --cidr 0.0.0.0/0

# Also allow Talos API and Kubernetes API from on-prem
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxx \
  --protocol tcp \
  --port 50000-50001 \
  --source <onprem-public-ip>/32

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxx \
  --protocol tcp \
  --port 6443 \
  --source <onprem-public-ip>/32
```

Apply the worker configuration:

```bash
# Apply to AWS worker nodes using their public IPs
talosctl apply-config --insecure \
  --nodes <aws-node-1-elastic-ip>,<aws-node-2-elastic-ip>,<aws-node-3-elastic-ip> \
  --file worker.yaml \
  --config-patch @aws-patch.yaml
```

## Setting Up GCP Worker Nodes

For GCP, use the Talos Linux GCE image. Create a GCP-specific patch:

```yaml
# gcp-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      mtu: 1380  # Lower MTU for GCP VPC
      filters:
        endpoints:
          - "!10.30.0.0/16"    # Exclude GCP VPC IPs
          - "0.0.0.0/0"        # Advertise external IPs
  install:
    disk: /dev/sda
```

Set up GCP firewall rules:

```bash
# Allow KubeSpan WireGuard traffic
gcloud compute firewall-rules create allow-kubespan \
  --network=default \
  --allow=udp:51820 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=talos-worker
```

## Verifying the Hybrid Cluster

After all nodes are configured, bootstrap the cluster from an on-premises control plane node:

```bash
# Bootstrap the cluster
talosctl bootstrap --nodes 10.10.0.10

# Get the kubeconfig
talosctl kubeconfig --nodes 10.10.0.10
```

Verify that all nodes have joined:

```bash
# Check all nodes
kubectl get nodes -o wide

# You should see nodes from all three locations
# NAME              STATUS   ROLES           AGE   VERSION   INTERNAL-IP      EXTERNAL-IP
# onprem-cp-1       Ready    control-plane   10m   v1.29.0   fd7a:...:1       <none>
# onprem-cp-2       Ready    control-plane   9m    v1.29.0   fd7a:...:2       <none>
# onprem-cp-3       Ready    control-plane   9m    v1.29.0   fd7a:...:3       <none>
# aws-worker-1      Ready    <none>          7m    v1.29.0   fd7a:...:4       <none>
# aws-worker-2      Ready    <none>          7m    v1.29.0   fd7a:...:5       <none>
# gcp-worker-1      Ready    <none>          5m    v1.29.0   fd7a:...:6       <none>
```

Check KubeSpan connectivity:

```bash
# Check peer status from on-prem control plane
talosctl get kubespanpeerstatus --nodes 10.10.0.10

# All peers should show "up"
```

## Workload Placement

In a hybrid cloud setup, you want control over where workloads run. Label your nodes by location:

```bash
# Label nodes by cloud provider and location
kubectl label node onprem-cp-1 cloud=onprem location=datacenter-1
kubectl label node aws-worker-1 cloud=aws location=us-east-1
kubectl label node gcp-worker-1 cloud=gcp location=us-central1
```

Use node affinity to place workloads:

```yaml
# Place latency-sensitive workloads on-prem near the database
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: cloud
                    operator: In
                    values:
                      - onprem
      containers:
        - name: api
          image: myapp/api:latest
```

For workloads that should run close to users in specific regions:

```yaml
# Run the CDN cache in each cloud region
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cdn-cache
spec:
  selector:
    matchLabels:
      app: cdn-cache
  template:
    metadata:
      labels:
        app: cdn-cache
    spec:
      nodeSelector:
        cloud: aws  # Or use topology spread constraints for multi-cloud
      containers:
        - name: cache
          image: myapp/cache:latest
```

## Monitoring Cross-Cloud Health

Set up monitoring to track the health of connections between clouds:

```bash
#!/bin/bash
# hybrid-health-check.sh

echo "=== On-Prem to AWS ==="
talosctl get kubespanpeerstatus --nodes 10.10.0.10 -o json | \
  jq '[.[] | select(.spec.label | startswith("aws"))] | {total: length, up: [.[] | select(.spec.state == "up")] | length}'

echo "=== On-Prem to GCP ==="
talosctl get kubespanpeerstatus --nodes 10.10.0.10 -o json | \
  jq '[.[] | select(.spec.label | startswith("gcp"))] | {total: length, up: [.[] | select(.spec.state == "up")] | length}'

echo "=== AWS to GCP ==="
talosctl get kubespanpeerstatus --nodes <aws-node-ip> -o json | \
  jq '[.[] | select(.spec.label | startswith("gcp"))] | {total: length, up: [.[] | select(.spec.state == "up")] | length}'
```

## Cost Considerations

Keep in mind that cloud providers charge for egress traffic. All KubeSpan traffic between cloud providers and on-premises counts as egress. This includes KubeSpan keepalive packets, pod-to-pod traffic across sites, and etcd replication between control plane nodes.

To minimize costs, keep chatty workloads on the same cloud or site, use node affinity to co-locate services that communicate frequently, and monitor KubeSpan traffic volumes using the peer status bandwidth metrics.

## Failure Scenarios

Consider what happens when connectivity between sites fails. If the on-premises to AWS link goes down, AWS workers will show as NotReady, and pods will be rescheduled to on-prem or GCP workers (unless pinned with node affinity). Setting `allowDownPeerBypass: true` ensures that nodes at the same site can still communicate even if cross-site KubeSpan tunnels are down:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      allowDownPeerBypass: true
```

Hybrid cloud clusters with KubeSpan on Talos Linux give you genuine infrastructure flexibility. You can burst to the cloud when you need extra capacity, keep sensitive workloads on-premises, and manage everything as a single Kubernetes cluster. The key is thoughtful network planning, proper endpoint filtering, and workload placement that respects the physical topology.
