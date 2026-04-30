# How to Fix Host-to-Container Communication Issues with Docker macvlan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, Macvlan, IPv4, Host Communication, Troubleshooting

Description: Resolve the host-to-container communication limitation of Docker macvlan networks by creating a macvlan shim interface on the host that allows direct IP connectivity to macvlan containers.

## Introduction

A fundamental limitation of macvlan: the Docker host cannot communicate with containers on a macvlan network through the same physical interface. This is a kernel limitation - a macvlan parent interface cannot talk to its children. The fix is to create a `macvlan` interface on the host with the same parent interface and assign it an IP in the macvlan subnet.

## Understanding the Problem

```bash
# Container is running on macvlan with IP 192.168.1.220

docker run -d --name test --network lan-macvlan --ip 192.168.1.220 nginx

# From the host - this FAILS
ping 192.168.1.220
# ping: connect: Network unreachable (or just times out)
```

## The Solution: macvlan Shim Interface

Create a `macvlan` type interface on the host (a "shim") and assign it an unused IP from the same macvlan subnet, then route the macvlan subnet through it:

```bash
# Create a macvlan interface on the host
# (eth0 must be the same parent as the Docker macvlan network)
sudo ip link add link eth0 name macvlan-shim type macvlan mode bridge

# Assign an unused host IP in the macvlan subnet
# Here the macvlan subnet is 192.168.1.192/27, and 192.168.1.219 is an unused address in that subnet
sudo ip addr add 192.168.1.219/32 dev macvlan-shim

# Bring it up
sudo ip link set macvlan-shim up

# Add a route for the macvlan subnet via the shim
sudo ip route add 192.168.1.192/27 dev macvlan-shim
```

## Verifying Host-to-Container Connectivity

```bash
# Now the host can reach macvlan containers
ping 192.168.1.220   # Should succeed
curl http://192.168.1.220   # Should reach nginx
```

## Making the Shim Persistent (Ubuntu)

Netplan does not directly support macvlan. Use a systemd service instead:

```bash
sudo tee /etc/systemd/system/macvlan-shim.service << 'EOF'
[Unit]
Description=macvlan shim for Docker container access
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/bash -c "\
  ip link add link eth0 name macvlan-shim type macvlan mode bridge && \
  ip addr add 192.168.1.219/32 dev macvlan-shim && \
  ip link set macvlan-shim up && \
  ip route add 192.168.1.192/27 dev macvlan-shim"
ExecStop=/bin/bash -c "\
  ip link del macvlan-shim || true"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now macvlan-shim
```

## Conclusion

The macvlan shim technique creates a secondary macvlan interface on the host, giving it a separate MAC/IP that can communicate with container macvlan interfaces. Route the macvlan subnet through the shim interface, and host-to-container communication works transparently.
