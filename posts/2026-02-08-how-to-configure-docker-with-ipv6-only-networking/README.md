# How to Configure Docker with IPv6-Only Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, IPv6, Networking, Containers, Linux, Configuration

Description: Set up Docker containers to operate in an IPv6-only environment with proper addressing, routing, and DNS configuration.

---

IPv6 adoption is accelerating. Major cloud providers now offer IPv6-only instances at lower cost, and many networks are moving to IPv6 as the primary protocol. Docker has supported IPv6 for years, but the configuration is not as straightforward as IPv4. The defaults assume IPv4, and many tutorials skip IPv6 entirely.

This guide covers setting up Docker for IPv6-only networking. You will learn how to configure the Docker daemon, create IPv6 networks, handle DNS resolution, and deal with the common pitfalls that trip people up.

## Enabling IPv6 in the Docker Daemon

Docker does not enable IPv6 by default. Update the daemon configuration:

```json
// /etc/docker/daemon.json - Enable IPv6 support in Docker
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/48",
  "ip6tables": true,
  "experimental": true
}
```

Breaking down these settings:

- `ipv6: true` - Enables IPv6 on the default bridge network
- `fixed-cidr-v6` - The IPv6 subnet for the default bridge (use a ULA prefix for private networks)
- `ip6tables` - Lets Docker manage ip6tables rules (similar to iptables for IPv4)
- `experimental` - Required for some IPv6 features in older Docker versions

Restart Docker:

```bash
# Apply the IPv6 configuration
sudo systemctl restart docker

# Verify IPv6 is enabled on docker0
ip -6 addr show docker0
```

You should see an IPv6 address from the `fd00:dead:beef::/48` range assigned to the docker0 bridge.

## Creating an IPv6-Only Network

Create a custom network that uses only IPv6:

```bash
# Create an IPv6-only bridge network
docker network create \
  --ipv6 \
  --subnet fd00:1::/64 \
  --gateway fd00:1::1 \
  ipv6-only-net
```

Verify the network configuration:

```bash
# Inspect the network to confirm IPv6 settings
docker network inspect ipv6-only-net --format '{{json .IPAM.Config}}' | python3 -m json.tool
```

## Running Containers on IPv6

Start a container on the IPv6 network:

```bash
# Run a container on the IPv6-only network
docker run -d \
  --name ipv6-web \
  --network ipv6-only-net \
  nginx:alpine

# Check the container's IPv6 address
docker inspect ipv6-web --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'
```

Test IPv6 connectivity from inside the container:

```bash
# Verify IPv6 networking inside the container
docker exec ipv6-web ip -6 addr show eth0

# Test IPv6 connectivity to the gateway
docker exec ipv6-web ping6 -c 3 fd00:1::1

# Test container-to-container IPv6 connectivity
docker run --rm --network ipv6-only-net alpine ping6 -c 3 fd00:1::2
```

## Assigning Static IPv6 Addresses

Assign specific IPv6 addresses to containers:

```bash
# Run a container with a specific IPv6 address
docker run -d \
  --name ipv6-db \
  --network ipv6-only-net \
  --ip6 fd00:1::db \
  postgres:16-alpine \
  -e POSTGRES_PASSWORD=secret

# Verify the assigned address
docker exec ipv6-db ip -6 addr show eth0 | grep fd00
```

## Publishing Ports on IPv6

Bind published ports to IPv6 addresses:

```bash
# Publish a port on all IPv6 addresses
docker run -d \
  --name ipv6-service \
  --network ipv6-only-net \
  -p "[::]:8080:80" \
  nginx:alpine

# Test access via IPv6
curl -6 http://[::1]:8080/
```

To bind to a specific IPv6 address:

```bash
# Bind to a specific IPv6 address on the host
docker run -d \
  --name ipv6-specific \
  -p "[fd00:1::1]:8080:80" \
  nginx:alpine
```

## DNS Configuration for IPv6

Docker's embedded DNS server (127.0.0.11) works for both IPv4 and IPv6. On custom networks, container name resolution returns both A and AAAA records:

```bash
# Start two containers on the IPv6 network
docker run -d --name server-a --network ipv6-only-net nginx:alpine
docker run -d --name client --network ipv6-only-net alpine sleep 3600

# Resolve the server's hostname - should return AAAA record
docker exec client nslookup -type=AAAA server-a
```

For external DNS resolution in an IPv6-only environment, configure DNS servers that support IPv6:

```json
// /etc/docker/daemon.json - IPv6 DNS servers
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/48",
  "dns": ["2001:4860:4860::8888", "2001:4860:4860::8844"]
}
```

## Docker Compose with IPv6

Define IPv6 networks in Docker Compose:

```yaml
# docker-compose.yml - IPv6-only microservice stack
services:
  web:
    image: nginx:alpine
    networks:
      app-v6:
        ipv6_address: fd00:2::10
    ports:
      - "[::]:80:80"

  api:
    image: node:20-alpine
    networks:
      app-v6:
        ipv6_address: fd00:2::20
    command: ["node", "-e", "require('http').createServer((req,res) => { res.end('OK') }).listen(3000)"]

  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    networks:
      app-v6:
        ipv6_address: fd00:2::30

networks:
  app-v6:
    enable_ipv6: true
    ipam:
      config:
        - subnet: fd00:2::/64
          gateway: fd00:2::1
```

## NAT66 and Masquerading for IPv6

Unlike IPv4, IPv6 was designed to avoid NAT. But in Docker environments with private ULA addresses, you may need NAT66 for external connectivity:

```bash
# Enable IPv6 masquerading for Docker containers to reach the internet
sudo ip6tables -t nat -A POSTROUTING -s fd00:dead:beef::/48 ! -o docker0 -j MASQUERADE

# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.d/99-docker-ipv6.conf
```

If your host has a globally routable IPv6 prefix, you can avoid NAT66 entirely by assigning addresses from that prefix to your Docker network:

```bash
# Create a network using a globally routable prefix
docker network create \
  --ipv6 \
  --subnet 2001:db8:1::/64 \
  --gateway 2001:db8:1::1 \
  global-v6-net
```

## Dual-Stack vs IPv6-Only

For a transitional approach, use dual-stack networks that have both IPv4 and IPv6:

```bash
# Create a dual-stack network
docker network create \
  --subnet 10.20.0.0/24 \
  --gateway 10.20.0.1 \
  --ipv6 \
  --subnet fd00:3::/64 \
  --gateway fd00:3::1 \
  dual-stack-net
```

Containers on this network get both an IPv4 and IPv6 address:

```bash
# Run a container on the dual-stack network
docker run -d --name dual-test --network dual-stack-net alpine sleep 3600

# Check both addresses
docker exec dual-test ip addr show eth0
```

## IPv6 Firewall Rules with ip6tables

Docker manages ip6tables rules when `ip6tables: true` is set. Add custom rules similar to IPv4:

```bash
# View Docker's ip6tables rules
sudo ip6tables -L -n -v
sudo ip6tables -t nat -L -n -v

# Add custom rules to the DOCKER-USER chain
sudo ip6tables -I DOCKER-USER -s 2001:db8:bad::/48 -j DROP

# Allow specific IPv6 range
sudo ip6tables -I DOCKER-USER -s 2001:db8:good::/48 -j ACCEPT
```

## Troubleshooting IPv6 Issues

When IPv6 connectivity fails, check these items:

```bash
# 1. Verify IPv6 forwarding is enabled
cat /proc/sys/net/ipv6/conf/all/forwarding
# Should be 1

# 2. Check if the bridge has an IPv6 address
ip -6 addr show docker0

# 3. Verify the container has an IPv6 address
docker exec ipv6-web ip -6 addr show eth0

# 4. Check IPv6 routes inside the container
docker exec ipv6-web ip -6 route show

# 5. Test IPv6 connectivity step by step
docker exec ipv6-web ping6 -c 1 fd00:1::1    # Gateway
docker exec ipv6-web ping6 -c 1 2001:4860:4860::8888  # External

# 6. Check ip6tables rules for dropped packets
sudo ip6tables -L FORWARD -n -v

# 7. Capture IPv6 traffic on the bridge
sudo tcpdump -i docker0 ip6 -c 20 -n
```

## IPv6 Health Checks

Configure health checks that work over IPv6:

```yaml
# docker-compose.yml - Health check using IPv6
services:
  web:
    image: nginx:alpine
    networks:
      app-v6:
        ipv6_address: fd00:2::10
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://[::1]:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Performance Considerations

IPv6 headers are larger than IPv4 (40 bytes vs 20 bytes), which slightly reduces the effective MTU. In Docker bridge networks with the standard 1500 MTU, this means the maximum TCP payload per packet is 1440 bytes for IPv6 compared to 1460 bytes for IPv4. The practical impact is negligible for most workloads.

For jumbo frames or tunnel configurations, set the MTU explicitly:

```bash
# Create an IPv6 network with a custom MTU
docker network create \
  --ipv6 \
  --subnet fd00:4::/64 \
  --opt com.docker.network.driver.mtu=9000 \
  jumbo-v6-net
```

## Conclusion

IPv6-only Docker networking requires explicit configuration but works reliably once set up. Enable IPv6 in the daemon, create networks with IPv6 subnets, configure DNS for IPv6, and handle masquerading if you use private address space. The commands mirror their IPv4 counterparts, with `ip6tables` instead of `iptables` and `ping6` instead of `ping`. As more infrastructure moves to IPv6, running Docker in IPv6-only mode eliminates the complexity of dual-stack management.
