# How to Use Link-Local IPs with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Link-Local, IPv4

Description: Learn how to use link-local IP addresses with Podman containers for automatic address assignment on isolated networks.

---

> Link-local addresses let containers communicate on a local segment without a DHCP server or manual configuration.

Link-local IP addresses occupy the 169.254.0.0/16 range for IPv4 and fe80::/10 for IPv6. These addresses are automatically assigned by the host operating system when no other addressing mechanism is available. In Podman, link-local IPs are useful for interface-scoped communication on isolated networks and for scenarios where you want containers to communicate without depending on Podman's address allocation service.

---

## Understanding Link-Local Addresses

Link-local addresses are valid only on the directly connected network segment. They are not routable beyond the local link, which makes them a natural fit for isolated container-to-container communication.

```bash
# Check the IPv6 link-local address on a running container

podman run --rm --name linktest docker.io/library/alpine ip -6 addr show eth0
```

The output usually includes a line starting with `inet6 fe80::` indicating the IPv6 link-local address.

## Creating a Network for Link-Local Use

You can create a Podman network with IP address management disabled and rely on link-local addressing within it.

```bash
# Create a bridge network where Podman does not assign interface IP addresses
podman network create --disable-dns --ipam-driver none linklocal-net

# Run two containers on the same network
podman run -d --name server1 --network linklocal-net docker.io/library/alpine sleep 3600
podman run -d --name server2 --network linklocal-net docker.io/library/alpine sleep 3600
```

## Verifying Link-Local Connectivity

```bash
# Get the link-local address of server1
podman exec server1 ip -6 addr show eth0 | grep fe80

# Ping server1 from server2 using its link-local IPv6 address
# Replace fe80::1 with the actual address and specify the interface
podman exec server2 ping6 -c 3 fe80::1%eth0
```

## Assigning a Static Link-Local IPv4 Address

```bash
# Run a container and manually assign a link-local IPv4 address.
# NET_ADMIN is required to change interface addresses inside the container.
podman run -d --name static-ll --cap-add=NET_ADMIN --network linklocal-net docker.io/library/alpine sleep 3600
podman exec static-ll ip addr add 169.254.10.5/16 dev eth0

# Verify the address
podman exec static-ll ip addr show eth0
```

## When to Use Link-Local Addressing

Link-local IPs are best for ephemeral test environments, air-gapped clusters, and scenarios where you want zero-configuration networking between containers. They are not suitable for production workloads that need external reachability.

## Summary

Link-local addresses provide a lightweight path for isolated container networking in Podman. By creating a network without Podman IPAM, using IPv6 link-local addresses, or manually adding IPv4 link-local addresses when needed, you can set up quick communication channels without DHCP.
