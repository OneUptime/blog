# How to Configure a Default Gateway in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Default Gateway, Networking, Kubernetes, Routing

Description: A clear guide to configuring the default gateway in Talos Linux for proper internet connectivity and network routing.

---

The default gateway is the most fundamental routing setting on any networked machine. It tells the operating system where to send traffic when no other, more specific route matches the destination. Without a properly configured default gateway, your Talos Linux node can communicate with devices on its local subnet but nothing else - no internet, no remote subnets, and no reaching the Kubernetes API server if it is on a different network.

This post explains how to configure the default gateway in Talos Linux, how it interacts with other routing settings, and how to handle common scenarios like multi-homed servers and failover gateways.

## What the Default Gateway Does

When your node wants to send a packet to `8.8.8.8`, it checks the routing table. If there is no specific route for `8.8.8.0/24` or any broader prefix that covers `8.8.8.8`, the node uses the default route. The default route says "for any destination not covered by another route, send the packet to this gateway address."

The gateway is a router on the local network that knows how to forward the packet closer to its destination. In a typical network, this is your router or Layer 3 switch.

## Basic Default Gateway Configuration

The default gateway is configured as a route with the `0.0.0.0/0` network:

```yaml
# machine-config.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
```

The `0.0.0.0/0` means "all destinations" - it is the catch-all route. The gateway `192.168.1.1` must be an address on the same subnet as the interface (`192.168.1.0/24` in this case).

## IPv6 Default Gateway

For IPv6, the default route uses `::/0`:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - fd00::10/64
        routes:
          # IPv4 default gateway
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
          # IPv6 default gateway
          - network: ::/0
            gateway: fd00::1
```

Both routes can coexist on the same interface. IPv4 traffic uses the IPv4 gateway, and IPv6 traffic uses the IPv6 gateway.

## Default Gateway with DHCP

When using DHCP, the default gateway is typically provided by the DHCP server, and you do not need to configure it manually:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
```

The DHCP server sends a "router" option that becomes the default gateway. If you want to override the DHCP-provided gateway while still using DHCP for the IP address, you can add a static route:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        # Override the gateway from DHCP
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.254
```

## Only One Default Gateway

A node should generally have only one default gateway. If you have multiple interfaces, only one should carry the default route. The other interfaces should have specific routes for their networks:

```yaml
machine:
  network:
    interfaces:
      # Primary interface with default gateway
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Secondary interface - no default gateway
      - interface: eth1
        addresses:
          - 10.10.0.10/24
        routes:
          # Only route for this specific network
          - network: 10.10.0.0/16
            gateway: 10.10.0.1
```

Having multiple default gateways with the same metric causes unpredictable behavior. The kernel may alternate between gateways or pick one randomly, leading to asymmetric routing and connection issues.

## Failover Default Gateway

If you need redundancy for the default gateway, use route metrics:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          # Primary gateway (lower metric = preferred)
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
            metric: 100
      - interface: eth1
        addresses:
          - 10.0.0.10/24
        routes:
          # Backup gateway (higher metric = fallback)
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
            metric: 200
```

Under normal conditions, all traffic goes through `192.168.1.1` (metric 100). If `eth0` goes down, the kernel automatically uses `10.0.0.1` (metric 200).

Note that Linux does not actively probe whether a gateway is reachable. The failover happens when the link on the interface goes down, not when the gateway itself becomes unreachable. For gateway health checking, you would need additional tooling.

## Default Gateway on VLANs

If your node connects to the upstream network through a VLAN, put the default gateway on the VLAN interface:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.10/24
            routes:
              - network: 0.0.0.0/0
                gateway: 10.100.0.1
          - vlanId: 200
            addresses:
              - 10.200.0.10/24
            # No default gateway on this VLAN
```

Only one VLAN should carry the default route, just like only one physical interface should.

## Default Gateway on Bonded Interfaces

For bonded interfaces, configure the gateway on the bond:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: active-backup
          interfaces:
            - eth0
            - eth1
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

The bond provides link-level redundancy, and the default gateway provides routing. If one physical link fails, the bond switches to the other link, and the default gateway remains reachable.

## Verifying the Default Gateway

Check the current default gateway on a running node:

```bash
# View the routing table
talosctl get routes --nodes 192.168.1.10

# Look for the 0.0.0.0/0 route
```

Test that the gateway is working by pinging an external address:

```bash
# Test internet connectivity
talosctl ping 8.8.8.8 --nodes 192.168.1.10

# Test DNS resolution (requires both gateway and DNS)
talosctl ping google.com --nodes 192.168.1.10
```

## Common Mistakes

**Gateway on wrong subnet** - The gateway must be on the same subnet as the interface address. If your address is `192.168.1.10/24`, the gateway must be in `192.168.1.0/24`. A gateway of `10.0.0.1` will not work because it is not directly reachable.

**Multiple default gateways with same metric** - This causes unpredictable routing. Always use different metrics if you need multiple default routes, or better yet, only have one default route.

**Missing default gateway** - Without a default route, the node cannot reach anything outside its local subnet. Symptoms include failed image pulls, NTP sync failures, and inability to reach the Kubernetes API server.

**Gateway IP does not exist** - If the gateway address is not actually a router on the network, packets are sent there but never forwarded. Check that the gateway IP is correct and the router is running.

## Changing the Default Gateway

To change the default gateway on a running node:

```bash
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"interfaces": [{"interface": "eth0", "addresses": ["192.168.1.10/24"], "routes": [{"network": "0.0.0.0/0", "gateway": "192.168.1.254"}]}]}}}'
```

This changes the gateway from whatever it was to `192.168.1.254`. There will be a brief connectivity disruption during the change.

## Default Gateway in Cloud Environments

Cloud providers set up the default gateway through DHCP or metadata services. In most cases, you should let DHCP handle the gateway in cloud environments:

```yaml
# AWS, Azure, GCP - let DHCP handle the gateway
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
```

The cloud provider's virtual router handles all external routing. Do not try to set a custom gateway unless you have specific network requirements and understand the cloud provider's networking model.

## Relationship to Kubernetes

The default gateway affects several Kubernetes operations:

- **Image pulls** - If the container registry is external, packets go through the default gateway
- **API server communication** - Worker nodes reach the API server through the network, often via the default gateway
- **Pod egress** - When pods send traffic outside the cluster, it eventually reaches the default gateway (after going through the CNI's networking)
- **Cloud controller** - The cloud controller manager communicates with cloud APIs through the default gateway

If the default gateway is misconfigured, these operations fail, and the cluster does not function properly.

## Conclusion

The default gateway is a simple but essential network setting. In Talos Linux, it is a route entry with `0.0.0.0/0` as the network. Configure it on one interface, make sure it points to a reachable router on the local subnet, and verify connectivity after applying. For redundancy, use route metrics to create a primary and backup gateway. For cloud deployments, let DHCP handle it. Getting the default gateway right is step one of any working network configuration, and everything else builds on top of it.
