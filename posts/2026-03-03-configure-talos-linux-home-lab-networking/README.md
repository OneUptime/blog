# How to Configure Talos Linux Home Lab Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Home Lab, Networking, VLAN, DNS

Description: A practical guide to configuring networking for a Talos Linux home lab including VLANs, DNS, static IPs, and network segmentation for security.

---

Networking is the backbone of any home lab. Get it right and everything works smoothly. Get it wrong and you spend weekends debugging DNS issues and routing problems. Talos Linux handles networking through its machine configuration API, which means all network settings are declarative and reproducible. No more SSH-ing into nodes to edit /etc/network/interfaces.

This guide covers practical networking configurations for a Talos Linux home lab.

## Basic Network Configuration

The simplest setup is a flat network where all nodes are on the same subnet. This works for most home labs.

### Static IP Addresses

Always use static IPs for your Talos nodes. DHCP reservations work too, but static IPs in the Talos config make the nodes self-contained:

```yaml
# Static IP configuration for a control plane node
machine:
  network:
    hostname: talos-cp-01
    interfaces:
      - interface: enp1s0  # Check actual interface name
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        dhcp: false
    nameservers:
      - 192.168.1.1  # Router DNS
      - 1.1.1.1      # Fallback
```

To find the interface name on a node running in maintenance mode:

```bash
talosctl get links --nodes 192.168.1.x --insecure
```

### Dual NIC Configuration

Some mini PCs and desktops have two Ethernet ports. You can use one for management traffic and one for pod/service traffic:

```yaml
machine:
  network:
    interfaces:
      # Management interface
      - interface: enp1s0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Pod network interface
      - interface: enp2s0
        addresses:
          - 10.10.0.10/24
```

## VLAN Configuration

VLANs let you segment your network without additional physical switches. This is useful for separating IoT devices, guest networks, and management traffic.

### Setting Up VLANs on Talos

```yaml
machine:
  network:
    interfaces:
      # Physical interface (trunk)
      - interface: enp1s0
        dhcp: false
        # VLAN 10 - Management
        vlans:
          - vlanId: 10
            addresses:
              - 192.168.10.10/24
            routes:
              - network: 0.0.0.0/0
                gateway: 192.168.10.1
          # VLAN 20 - IoT devices
          - vlanId: 20
            addresses:
              - 192.168.20.10/24
          # VLAN 30 - Storage
          - vlanId: 30
            addresses:
              - 192.168.30.10/24
```

Your switch needs to be configured for VLAN trunking on the port connected to each Talos node. On a managed switch, this typically means setting the port mode to "trunk" and allowing the relevant VLANs.

### VLAN-Aware Pod Networking

If you need pods to access specific VLANs, you can use Multus CNI with the host-device or macvlan plugin:

```yaml
# Install Multus CNI
# Note: This requires the multus-cni extension in Talos
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: iot-network
  namespace: home-automation
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "enp1s0.20",
      "mode": "bridge",
      "ipam": {
        "type": "host-local",
        "subnet": "192.168.20.0/24",
        "rangeStart": "192.168.20.200",
        "rangeEnd": "192.168.20.250",
        "gateway": "192.168.20.1"
      }
    }
```

## DNS Configuration

DNS issues cause more home lab headaches than almost anything else. Set up DNS properly from the start.

### Local DNS with Split Horizon

If you run a local DNS server (Pi-hole, AdGuard Home, or CoreDNS standalone), configure your Talos nodes to use it:

```yaml
machine:
  network:
    nameservers:
      - 192.168.1.53  # Local DNS server
      - 1.1.1.1       # Fallback external DNS
```

### Custom DNS Records for Services

For accessing Kubernetes services by hostname on your local network, you have several options.

**Option 1: Modify your router's DNS**

Add A records on your router or local DNS server pointing to the MetalLB IP addresses.

**Option 2: Use ExternalDNS with a local DNS provider**

```bash
# Install ExternalDNS with Pi-hole provider
helm install external-dns external-dns/external-dns \
  --namespace kube-system \
  --set provider=pihole \
  --set pihole.server=http://192.168.1.53 \
  --set pihole.password=your-pihole-password
```

**Option 3: Use CoreDNS with custom records**

Add custom DNS entries to the CoreDNS ConfigMap in your cluster:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  homelab.server: |
    home.lab:53 {
        hosts {
            192.168.1.200 jellyfin.home.lab
            192.168.1.201 grafana.home.lab
            192.168.1.202 ha.home.lab
            fallthrough
        }
    }
```

## MetalLB Configuration

MetalLB provides LoadBalancer services on bare metal. For a home lab, Layer 2 mode is the simplest:

```yaml
# metallb-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: homelab-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.230
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: homelab
  namespace: metallb-system
spec:
  ipAddressPools:
    - homelab-pool
```

Make sure the IP range does not overlap with your DHCP range or static IPs.

## Firewall Rules

Talos Linux does not have a traditional firewall like iptables that you configure manually. Network policies in Kubernetes handle pod-to-pod traffic control. For node-level traffic, Talos handles the essential rules automatically.

However, you can implement network policies to restrict pod traffic:

```yaml
# default-deny-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
---
# Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-traffic
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
  ingress:
    - from: []
      ports:
        - protocol: TCP
          port: 80
        - protocol: TCP
          port: 443
```

## WireGuard VPN for Remote Access

Access your home lab from outside your network using WireGuard. Talos has built-in WireGuard support:

```yaml
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.200.0.1/24
        wireguard:
          privateKey: <your-private-key>
          listenPort: 51820
          peers:
            - publicKey: <phone-public-key>
              allowedIPs:
                - 10.200.0.2/32
            - publicKey: <laptop-public-key>
              allowedIPs:
                - 10.200.0.3/32
```

Forward port 51820/UDP on your router to the Talos node running WireGuard. Then configure your phone or laptop as a WireGuard client to connect.

## Network Performance Tuning

For better network performance, especially with NFS storage or high-bandwidth workloads:

```yaml
machine:
  sysctls:
    # Increase network buffer sizes
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
    net.ipv4.tcp_rmem: "4096 87380 16777216"
    net.ipv4.tcp_wmem: "4096 65536 16777216"
    # Increase connection tracking
    net.netfilter.nf_conntrack_max: "131072"
    # Enable TCP BBR congestion control
    net.core.default_qdisc: "fq"
    net.ipv4.tcp_congestion_control: "bbr"
```

## Troubleshooting Network Issues

When things go wrong, here are the most common checks:

```bash
# Check interface status on a Talos node
talosctl get addresses --nodes 192.168.1.10
talosctl get routes --nodes 192.168.1.10
talosctl get links --nodes 192.168.1.10

# Check DNS resolution
talosctl get resolvers --nodes 192.168.1.10

# Check connectivity
talosctl ping 192.168.1.1 --nodes 192.168.1.10

# Check Kubernetes networking
kubectl get svc -A
kubectl get endpoints -A
```

## Summary

Home lab networking with Talos Linux is clean and predictable because everything is defined in the machine configuration. Start with a flat network and static IPs. Add VLANs if you need segmentation. Set up MetalLB for LoadBalancer services. Configure DNS properly from the start. And if you need remote access, WireGuard on Talos is simple and secure. The declarative nature of Talos networking means you can version control your entire network configuration alongside your cluster configs, making it easy to reproduce or modify your setup as your home lab grows.
