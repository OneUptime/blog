# How to Use WireGuard for Multi-Cloud Talos Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, Multi-Cloud, Kubernetes, Networking

Description: Learn how to connect Talos Linux clusters across multiple cloud providers using WireGuard for secure, encrypted inter-cloud communication.

---

Running Talos Linux across multiple cloud providers gives you resilience against provider outages, access to specialized services, and bargaining power for pricing. But connecting clusters across AWS, GCP, Azure, or other providers is not straightforward. Each cloud has its own networking model, and there is no native interconnect between them. WireGuard provides a clean solution by creating encrypted tunnels between nodes regardless of where they run.

This post covers how to set up WireGuard to connect Talos Linux clusters across multiple cloud providers, including the network planning, gateway configuration, and practical considerations for production deployments.

## The Multi-Cloud Networking Challenge

When you run Talos nodes in AWS and GCP, those nodes live in completely separate networks. An AWS instance at 10.0.1.5 cannot directly reach a GCP instance at 10.0.2.5 because these are private IPs within their respective cloud VPCs. You need something to bridge these networks.

Traditional solutions include cloud-provider VPN gateways (like AWS Site-to-Site VPN or GCP Cloud VPN), dedicated interconnect services, or third-party networking products. These work but often come with significant cost, complexity, and vendor lock-in.

WireGuard running on your Talos nodes is a lightweight alternative. It uses the public IPs that cloud instances already have, creates encrypted UDP tunnels, and requires no additional infrastructure.

## Network Architecture

The first step is designing a non-overlapping address scheme across all clouds.

```text
AWS Cluster:
  VPC CIDR: 10.1.0.0/16
  Node subnet: 10.1.1.0/24
  Pod CIDR: 10.244.0.0/18
  Service CIDR: 10.96.0.0/18
  WG Gateway: 10.1.1.10 (private), elastic IP (public)
  WG Tunnel IP: 10.10.0.1/24

GCP Cluster:
  VPC CIDR: 10.2.0.0/16
  Node subnet: 10.2.1.0/24
  Pod CIDR: 10.244.64.0/18
  Service CIDR: 10.96.64.0/18
  WG Gateway: 10.2.1.10 (private), static IP (public)
  WG Tunnel IP: 10.10.0.2/24

Azure Cluster:
  VNet CIDR: 10.3.0.0/16
  Node subnet: 10.3.1.0/24
  Pod CIDR: 10.244.128.0/18
  Service CIDR: 10.96.128.0/18
  WG Gateway: 10.3.1.10 (private), public IP
  WG Tunnel IP: 10.10.0.3/24
```

Each cloud gets unique CIDR ranges for nodes, pods, and services. The WireGuard tunnel network (10.10.0.0/24) is shared across all gateways.

## Setting Up Gateway Nodes

Each cloud needs at least one node designated as the WireGuard gateway. This node handles all inter-cloud traffic for its local cluster.

### AWS Gateway

First, make sure the gateway instance has a static Elastic IP and that the security group allows UDP traffic on the WireGuard port.

```bash
# Allocate an Elastic IP for the AWS gateway
aws ec2 allocate-address --domain vpc
# Associate it with the gateway instance
aws ec2 associate-address --instance-id i-xxxxx --allocation-id eipalloc-xxxxx

# Update the security group to allow WireGuard traffic
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol udp \
  --port 51820 \
  --cidr 0.0.0.0/0
```

Apply the WireGuard configuration to the AWS gateway node:

```yaml
# aws-gateway-wireguard.yaml
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.1/24
        wireguard:
          privateKey: "AWS_GATEWAY_PRIVATE_KEY"
          listenPort: 51820
          peers:
            # GCP gateway
            - publicKey: "GCP_GATEWAY_PUBLIC_KEY"
              endpoint: 35.x.x.x:51820
              allowedIPs:
                - 10.10.0.2/32
                - 10.2.0.0/16
                - 10.244.64.0/18
                - 10.96.64.0/18
              persistentKeepalive: 25
            # Azure gateway
            - publicKey: "AZURE_GATEWAY_PUBLIC_KEY"
              endpoint: 52.x.x.x:51820
              allowedIPs:
                - 10.10.0.3/32
                - 10.3.0.0/16
                - 10.244.128.0/18
                - 10.96.128.0/18
              persistentKeepalive: 25
  sysctls:
    net.ipv4.ip_forward: "1"
```

```bash
talosctl -n 10.1.1.10 patch machineconfig --patch-file aws-gateway-wireguard.yaml
```

### GCP Gateway

Similarly, set up the GCP gateway with firewall rules and WireGuard configuration.

```bash
# Create a firewall rule for WireGuard in GCP
gcloud compute firewall-rules create allow-wireguard \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=udp:51820 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=wireguard-gateway
```

```yaml
# gcp-gateway-wireguard.yaml
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.2/24
        wireguard:
          privateKey: "GCP_GATEWAY_PRIVATE_KEY"
          listenPort: 51820
          peers:
            # AWS gateway
            - publicKey: "AWS_GATEWAY_PUBLIC_KEY"
              endpoint: 54.x.x.x:51820
              allowedIPs:
                - 10.10.0.1/32
                - 10.1.0.0/16
                - 10.244.0.0/18
                - 10.96.0.0/18
              persistentKeepalive: 25
            # Azure gateway
            - publicKey: "AZURE_GATEWAY_PUBLIC_KEY"
              endpoint: 52.x.x.x:51820
              allowedIPs:
                - 10.10.0.3/32
                - 10.3.0.0/16
                - 10.244.128.0/18
                - 10.96.128.0/18
              persistentKeepalive: 25
  sysctls:
    net.ipv4.ip_forward: "1"
```

### Azure Gateway

The Azure setup follows the same pattern with its own network security group rules.

```bash
# Create NSG rule for WireGuard in Azure
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name AllowWireGuard \
  --protocol udp \
  --direction inbound \
  --priority 1000 \
  --source-address-prefix '*' \
  --destination-port-range 51820 \
  --access allow
```

## Configuring Routes on Non-Gateway Nodes

All non-gateway nodes in each cloud need routes to send cross-cloud traffic to their local gateway.

```yaml
# routes-for-aws-nodes.yaml
# Apply to all non-gateway nodes in AWS
machine:
  network:
    routes:
      # Route GCP traffic through local WireGuard gateway
      - network: 10.2.0.0/16
        gateway: 10.1.1.10
      - network: 10.244.64.0/18
        gateway: 10.1.1.10
      # Route Azure traffic through local WireGuard gateway
      - network: 10.3.0.0/16
        gateway: 10.1.1.10
      - network: 10.244.128.0/18
        gateway: 10.1.1.10
```

```bash
# Apply routes to all AWS worker nodes
for node in 10.1.1.11 10.1.1.12 10.1.1.13; do
  talosctl -n $node patch machineconfig --patch-file routes-for-aws-nodes.yaml
done
```

## Cross-Cloud Pod Communication

For pods to communicate across clouds, the CNI plugin needs to be configured to use the WireGuard routes. If you are using Cilium, you can set up cluster mesh to enable cross-cluster service discovery.

```yaml
# Cilium configuration for multi-cloud with WireGuard routing
# Install on each cluster with unique cluster ID and name
cluster:
  name: aws-cluster
  id: 1
ipam:
  mode: kubernetes
routingMode: native
autoDirectNodeRoutes: true
# Enable cluster mesh for cross-cluster service discovery
clustermesh:
  useAPIServer: true
```

With cluster mesh, services in one cloud can discover and communicate with services in other clouds. The WireGuard tunnel handles the encrypted transport between clouds.

## Performance Considerations

Inter-cloud traffic goes over the public internet, so latency is higher than within a single cloud region. WireGuard adds minimal overhead on top of this, but you should be aware of the baseline latency between your cloud regions.

```bash
# Measure baseline latency between clouds
# From AWS gateway to GCP gateway through the WireGuard tunnel
talosctl -n 10.1.1.10 ping 10.10.0.2

# Compare with latency over the public internet (without WireGuard)
talosctl -n 10.1.1.10 ping 35.x.x.x
```

The WireGuard encryption adds about 0.1-0.5ms of latency per packet on modern hardware. The internet latency between clouds is typically 10-100ms depending on the regions, so the WireGuard overhead is negligible.

For bandwidth-intensive cross-cloud workloads, consider the data transfer costs. Cloud providers charge for egress traffic, and all WireGuard tunnel traffic counts as egress. Design your applications to minimize cross-cloud data transfer where possible.

## High Availability

A single gateway per cloud is a single point of failure. For production, run two gateways per cloud and use one of these approaches for failover.

The simplest option is to configure both gateways on each side and let the routing handle failover. If one gateway goes down, update the routes to point to the backup.

A more automated approach is to use a floating IP (or cloud equivalent) that moves between gateways.

```bash
# AWS: Move an Elastic IP to the backup gateway on failover
aws ec2 associate-address \
  --instance-id i-backup-gateway \
  --allocation-id eipalloc-xxxxx \
  --allow-reassociation
```

## Monitoring the Multi-Cloud VPN

Monitor the WireGuard tunnels to detect cross-cloud connectivity issues early.

```yaml
# Prometheus alert for WireGuard tunnel down
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: wireguard-alerts
spec:
  groups:
    - name: wireguard
      rules:
        - alert: WireGuardTunnelDown
          # Alert if no handshake for more than 5 minutes
          expr: time() - wireguard_latest_handshake_seconds > 300
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "WireGuard tunnel to {{ $labels.public_key }} is down"
```

## Conclusion

WireGuard provides a practical, low-cost way to connect Talos Linux clusters across multiple cloud providers. The setup involves designating gateway nodes in each cloud, creating WireGuard tunnels between them, and configuring routes so all nodes know how to reach other clouds. Combined with a CNI plugin that supports cross-cluster communication, you get a fully connected multi-cloud infrastructure with encrypted inter-cloud traffic. The main things to watch are address planning (no overlapping CIDRs), gateway high availability, and data transfer costs.
