# How to Prevent Docker from Modifying iptables Rules for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, iptables, IPv4, Security, daemon.json

Description: Configure Docker to stop modifying iptables rules by disabling iptables management in daemon.json, and manually manage the required firewall rules for container networking.

## Introduction

By default, Docker automatically manages iptables rules to implement port publishing, NAT for containers, and inter-container policies. On servers with strict firewall policies managed by tools like `ufw`, `firewalld`, or custom iptables scripts, Docker's modifications can break or bypass firewall rules. Disabling Docker's iptables management stops Docker from creating most of these rules, but you must replace the required firewall rules yourself.

## Disabling iptables Management

Edit or create `/etc/docker/daemon.json`:

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "iptables": false
}
EOF

sudo systemctl restart docker
```

## What Docker Normally Creates

Before disabling, Docker typically creates:
- `DOCKER-USER` chain (user policy insertion point)
- `DOCKER-FORWARD` chain (first-stage forwarding rules)
- `DOCKER`, `DOCKER-BRIDGE`, and `DOCKER-INTERNAL` chains (bridge-specific filtering and published-port rules)
- `DOCKER-CT` chain (per-bridge connection tracking rules)
- `DOCKER-INGRESS` chain (Swarm ingress rules)
- NAT rules in the `nat` table for port publishing and masquerading

## Adding Required Rules Manually

After disabling Docker's iptables management, you must add replacement rules manually. Assuming IP forwarding is enabled, a minimal example for the default `docker0` bridge is:

```bash
# Allow containers on docker0 to reach the WAN interface
sudo iptables -A FORWARD -i docker0 -o eth0 -j ACCEPT

# Allow return traffic back into docker0
sudo iptables -A FORWARD -i eth0 -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# NAT for outbound container traffic (replace eth0 with your WAN interface,
# and 172.17.0.0/16 if you changed Docker's default bridge subnet)
sudo iptables -t nat -A POSTROUTING -s 172.17.0.0/16 -o eth0 -j MASQUERADE
```

## Publishing Ports Manually

When `iptables: false`, Docker's `-p` flag does not create iptables rules. Do it yourself:

```bash
# Run the container without -p; publish it manually with iptables
docker run -d --name web nginx

# Get the container IP on the bridge network
CONTAINER_IP=$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web)

# Forward incoming connections on host port 8080 to container port 80
sudo iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination $CONTAINER_IP:80
sudo iptables -A FORWARD -p tcp -d $CONTAINER_IP --dport 80 -m conntrack --ctstate NEW,ESTABLISHED,RELATED -j ACCEPT
```

## Using DOCKER-USER Chain Instead

If you want Docker to manage most rules but add your own policies, use the `DOCKER-USER` chain (not disabled):

```bash
# Insert your custom rules BEFORE Docker's rules
sudo iptables -I DOCKER-USER -i eth0 -s 203.0.113.0/24 -j DROP

# Allow only trusted IPs to reach published ports
sudo iptables -I DOCKER-USER -i eth0 ! -s 192.168.1.0/24 -j REJECT
```

## Choosing the Right Approach

| Approach | When to Use |
|---|---|
| Default (Docker manages iptables) | Most use cases |
| DOCKER-USER chain | Need to add policies without disabling Docker's rules |
| `iptables: false` + manual rules | Strict firewall environments, server hardening |

## Conclusion

Disable Docker's iptables management with `"iptables": false` in `daemon.json` only when you are prepared to replace Docker's bridge-network firewall rules yourself. It prevents Docker from creating most iptables rules, but not all firewall rule creation can be disabled entirely. For most environments, using the `DOCKER-USER` chain to prepend custom policies is a better balance of control and simplicity.
