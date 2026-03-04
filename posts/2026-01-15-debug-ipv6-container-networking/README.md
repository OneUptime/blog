# How to Debug IPv6 Container Networking Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Docker, Containers, Troubleshooting, Networking, Debugging

Description: A comprehensive guide to diagnosing and resolving IPv6 connectivity problems in containerized environments using systematic debugging techniques and practical command-line tools.

---

IPv6 adoption in container environments is accelerating as organizations exhaust IPv4 address space and deploy dual-stack infrastructure. However, debugging IPv6 networking issues in containers presents unique challenges compared to IPv4. Misconfigured daemon settings, missing kernel parameters, firewall rules, and network driver limitations can all cause IPv6 connectivity failures. This guide provides a systematic approach to diagnosing and resolving these issues.

## Understanding IPv6 in Container Networking

Before diving into debugging, it helps to understand how IPv6 works in container environments. Unlike IPv4, which often relies on NAT, IPv6 typically provides globally routable addresses to containers. Docker and other container runtimes support IPv6 through specific configuration options.

### Key Differences from IPv4

- **Address assignment**: IPv6 uses SLAAC (Stateless Address Autoconfiguration) or DHCPv6
- **No NAT by default**: Containers can receive publicly routable addresses
- **Larger address space**: Each container can have multiple IPv6 addresses
- **Neighbor Discovery Protocol**: Replaces ARP for address resolution
- **Link-local addresses**: Always present on interfaces (fe80::/10)

## 1. Verify Docker Daemon IPv6 Configuration

The first step in debugging is confirming that the Docker daemon is properly configured for IPv6. Many IPv6 issues stem from missing or incorrect daemon configuration.

```bash
# Check if Docker daemon has IPv6 enabled
# Look for "ipv6": true in the output
docker info | grep -i ipv6

# View the full daemon configuration
# On Linux, the config file is typically at /etc/docker/daemon.json
cat /etc/docker/daemon.json
```

A properly configured daemon.json for IPv6 should look like this:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64",
  "experimental": true,
  "ip6tables": true
}
```

### Common Configuration Issues

```bash
# Check if the daemon actually loaded the configuration
# Compare running config vs file config
docker system info --format '{{json .}}' | jq '.IPv6'

# Verify the Docker bridge network has IPv6 enabled
docker network inspect bridge --format '{{json .EnableIPv6}}'

# Check the IPv6 subnet assigned to the bridge
docker network inspect bridge --format '{{json .IPAM.Config}}'
```

If IPv6 is not enabled, you need to modify the daemon configuration and restart Docker:

```bash
# Create or edit the daemon configuration file
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/48",
  "experimental": true,
  "ip6tables": true
}
EOF

# Restart Docker daemon to apply changes
sudo systemctl restart docker

# Verify the configuration took effect
docker network inspect bridge | grep -A 5 "EnableIPv6"
```

## 2. Check Host System IPv6 Support

Container IPv6 networking depends on proper host system configuration. Verify that IPv6 is enabled and functioning at the host level.

```bash
# Check if IPv6 is enabled in the kernel
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 0 = enabled, 1 = disabled

# View all IPv6 addresses on the host
ip -6 addr show

# Check IPv6 routing table
ip -6 route show

# Verify IPv6 forwarding is enabled (required for container routing)
cat /proc/sys/net/ipv6/conf/all/forwarding
# Should be 1 for container networking

# Check IPv6 forwarding for specific interfaces
cat /proc/sys/net/ipv6/conf/docker0/forwarding
cat /proc/sys/net/ipv6/conf/eth0/forwarding
```

### Enable IPv6 Forwarding

If IPv6 forwarding is disabled, containers cannot communicate externally:

```bash
# Enable IPv6 forwarding temporarily
sudo sysctl -w net.ipv6.conf.all.forwarding=1
sudo sysctl -w net.ipv6.conf.default.forwarding=1

# Make it persistent across reboots
# Add these lines to /etc/sysctl.conf or create a file in /etc/sysctl.d/
sudo tee /etc/sysctl.d/99-ipv6-forwarding.conf << 'EOF'
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
EOF

# Apply sysctl settings without reboot
sudo sysctl --system
```

### Check for IPv6 Disabled at Boot

Some systems disable IPv6 via kernel parameters. Check and fix:

```bash
# Check kernel boot parameters
cat /proc/cmdline | grep ipv6

# Look for ipv6.disable=1 which completely disables IPv6
# If found, remove it from GRUB configuration

# Check if any init scripts disable IPv6
grep -r "disable_ipv6" /etc/sysctl.d/
grep -r "disable_ipv6" /etc/sysctl.conf
```

## 3. Inspect Container IPv6 Addresses

Once the host is configured, verify that containers are receiving IPv6 addresses correctly.

```bash
# Check IPv6 address assigned to a specific container
docker inspect <container_name> --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'

# View all network settings including IPv6
docker inspect <container_name> --format '{{json .NetworkSettings}}' | jq '.Networks'

# List all addresses (IPv4 and IPv6) for a container
docker exec <container_name> ip addr show

# Check specifically for IPv6 addresses inside the container
docker exec <container_name> ip -6 addr show
```

### Debugging Address Assignment

```bash
# Check if the container's network interface has IPv6 enabled
docker exec <container_name> cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6

# View the container's IPv6 routing table
docker exec <container_name> ip -6 route show

# Check for link-local addresses (should always be present if IPv6 works)
docker exec <container_name> ip -6 addr show scope link
```

If containers are not receiving IPv6 addresses:

```bash
# Verify the network has IPv6 enabled
docker network inspect <network_name> | grep -A 10 "IPAM"

# Check if the subnet has available addresses
docker network inspect <network_name> --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'

# Recreate the network with explicit IPv6 configuration
docker network create \
  --ipv6 \
  --subnet="fd00:db8::/64" \
  --gateway="fd00:db8::1" \
  my-ipv6-network
```

## 4. Test IPv6 Connectivity from Containers

Once addresses are assigned, test actual connectivity to identify where communication fails.

```bash
# Test IPv6 connectivity to external hosts
docker exec <container_name> ping6 -c 4 2001:4860:4860::8888

# Alternative using ping with explicit IPv6
docker exec <container_name> ping -6 -c 4 ipv6.google.com

# Test connectivity to the host's IPv6 address
docker exec <container_name> ping6 -c 4 <host_ipv6_address>

# Test connectivity to another container
docker exec <container_name> ping6 -c 4 <other_container_ipv6>
```

### Detailed Connectivity Testing

```bash
# Use traceroute to identify where packets are dropped
docker exec <container_name> traceroute6 2001:4860:4860::8888

# If traceroute6 is not available, install it
docker exec <container_name> apt-get update && apt-get install -y traceroute
# or for Alpine-based images
docker exec <container_name> apk add --no-cache traceroute

# Test TCP connectivity on IPv6
docker exec <container_name> nc -6 -zv ipv6.google.com 443

# Test DNS resolution for IPv6 (AAAA records)
docker exec <container_name> dig AAAA google.com
docker exec <container_name> nslookup -type=AAAA google.com
```

### Test from Host to Container

```bash
# Ping the container's IPv6 address from the host
ping6 -c 4 <container_ipv6_address>

# Test TCP connectivity to a containerized service
nc -6 -zv <container_ipv6_address> <port>

# Use curl to test HTTP services
curl -6 -v http://[<container_ipv6_address>]:<port>/
```

## 5. Debug Network Namespace Issues

Containers use network namespaces for isolation. Issues with namespace configuration can break IPv6.

```bash
# Get the container's process ID
CONTAINER_PID=$(docker inspect <container_name> --format '{{.State.Pid}}')

# Enter the container's network namespace
sudo nsenter -t $CONTAINER_PID -n ip -6 addr show

# Check IPv6 routing from within the namespace
sudo nsenter -t $CONTAINER_PID -n ip -6 route show

# View neighbor cache (IPv6 equivalent of ARP table)
sudo nsenter -t $CONTAINER_PID -n ip -6 neigh show
```

### Inspect Network Namespace Details

```bash
# List all network namespaces
sudo ls -la /var/run/docker/netns/

# Find the namespace for a specific container
docker inspect <container_name> --format '{{.NetworkSettings.SandboxKey}}'

# Examine interfaces in the namespace
SANDBOX=$(docker inspect <container_name> --format '{{.NetworkSettings.SandboxKey}}')
sudo nsenter --net=$SANDBOX ip link show

# Check for MTU issues that might affect IPv6
sudo nsenter --net=$SANDBOX ip link show eth0 | grep mtu
```

## 6. Analyze IPv6 Firewall Rules

Firewall misconfigurations are a common cause of IPv6 connectivity issues. Docker manages ip6tables rules automatically when ip6tables is enabled.

```bash
# View all ip6tables rules
sudo ip6tables -L -v -n

# Check the DOCKER-USER chain for custom rules
sudo ip6tables -L DOCKER-USER -v -n

# View NAT rules (if using IPv6 NAT, which is uncommon)
sudo ip6tables -t nat -L -v -n

# Check the FORWARD chain for Docker rules
sudo ip6tables -L FORWARD -v -n

# View the complete ruleset with line numbers
sudo ip6tables -L --line-numbers -v -n
```

### Debug Blocked Traffic

```bash
# Add logging to dropped packets for debugging
sudo ip6tables -I INPUT -j LOG --log-prefix "IPv6-INPUT-DROP: " --log-level 4
sudo ip6tables -I FORWARD -j LOG --log-prefix "IPv6-FORWARD-DROP: " --log-level 4

# Watch the logs in real-time
sudo tail -f /var/log/syslog | grep IPv6
# or
sudo journalctl -f | grep IPv6

# Count dropped packets
sudo ip6tables -L -v | grep DROP

# Remove logging rules after debugging
sudo ip6tables -D INPUT -j LOG --log-prefix "IPv6-INPUT-DROP: " --log-level 4
sudo ip6tables -D FORWARD -j LOG --log-prefix "IPv6-FORWARD-DROP: " --log-level 4
```

### Fix Common Firewall Issues

```bash
# Allow all IPv6 traffic from Docker networks (use cautiously)
sudo ip6tables -A FORWARD -i docker0 -j ACCEPT
sudo ip6tables -A FORWARD -o docker0 -j ACCEPT

# Allow ICMPv6 (required for IPv6 to function properly)
sudo ip6tables -A INPUT -p icmpv6 -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 -j ACCEPT

# Allow established connections
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo ip6tables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
```

## 7. Debug DNS Resolution for IPv6

DNS issues can manifest as IPv6 connectivity problems when AAAA records are not resolved correctly.

```bash
# Check DNS configuration inside the container
docker exec <container_name> cat /etc/resolv.conf

# Test DNS resolution for AAAA records
docker exec <container_name> dig AAAA google.com
docker exec <container_name> host -t AAAA google.com

# Check if DNS server supports IPv6 queries
docker exec <container_name> dig @8.8.8.8 AAAA google.com
docker exec <container_name> dig @2001:4860:4860::8888 AAAA google.com

# Test reverse DNS lookup for IPv6
docker exec <container_name> dig -x 2001:4860:4860::8888
```

### Configure DNS for IPv6

```bash
# Start a container with custom DNS servers that support IPv6
docker run --dns 2001:4860:4860::8888 --dns 2001:4860:4860::8844 <image>

# Configure DNS in daemon.json for all containers
sudo tee -a /etc/docker/daemon.json << 'EOF'
{
  "dns": ["2001:4860:4860::8888", "2001:4860:4860::8844", "8.8.8.8"]
}
EOF

# Test if the container prefers IPv6 when both A and AAAA records exist
docker exec <container_name> getent ahosts google.com
```

## 8. Capture and Analyze IPv6 Traffic

When other debugging methods fail, packet capture provides definitive answers about what is happening on the network.

```bash
# Capture IPv6 traffic on the Docker bridge
sudo tcpdump -i docker0 ip6 -n -v

# Capture only ICMPv6 traffic (neighbor discovery, ping)
sudo tcpdump -i docker0 icmp6 -n -v

# Capture traffic for a specific container's IPv6 address
sudo tcpdump -i docker0 host <container_ipv6_address> -n -v

# Save capture to file for analysis in Wireshark
sudo tcpdump -i docker0 ip6 -w /tmp/ipv6-capture.pcap

# Capture on all interfaces
sudo tcpdump -i any ip6 -n -v
```

### Analyze Specific Protocol Issues

```bash
# Capture only TCP traffic on IPv6
sudo tcpdump -i docker0 'ip6 and tcp' -n -v

# Capture DNS queries over IPv6
sudo tcpdump -i docker0 'ip6 and port 53' -n -v

# Capture HTTP traffic on IPv6
sudo tcpdump -i docker0 'ip6 and tcp port 80' -n -v

# Watch for Neighbor Discovery Protocol messages
sudo tcpdump -i docker0 'icmp6 and (ip6[40] == 133 or ip6[40] == 134 or ip6[40] == 135 or ip6[40] == 136)' -n -v

# Capture with timestamps for correlation
sudo tcpdump -i docker0 ip6 -tttt -n -v
```

### Capture Inside Container

```bash
# Install tcpdump in the container (if not present)
docker exec <container_name> apt-get update && apt-get install -y tcpdump

# Capture traffic inside the container
docker exec <container_name> tcpdump -i eth0 ip6 -n -v

# Capture and save to a file, then copy it out
docker exec <container_name> tcpdump -i eth0 ip6 -w /tmp/capture.pcap -c 100
docker cp <container_name>:/tmp/capture.pcap ./container-capture.pcap
```

## 9. Debug Docker Network Drivers

Different network drivers handle IPv6 differently. Understanding driver-specific behavior helps diagnose issues.

### Bridge Network Driver

```bash
# Check bridge network IPv6 configuration
docker network inspect bridge --format '{{json .Options}}'

# View the docker0 bridge interface
ip -6 addr show docker0
brctl show docker0

# Check if IPv6 proxy NDP is enabled
cat /proc/sys/net/ipv6/conf/docker0/proxy_ndp
```

### Overlay Network Driver (Swarm)

```bash
# Check overlay network IPv6 settings
docker network inspect <overlay_network> --format '{{json .IPAM}}'

# Verify that all Swarm nodes have IPv6 enabled
docker node inspect <node_name> --format '{{json .Status}}'

# Check the ingress network IPv6 configuration
docker network inspect ingress --format '{{json .EnableIPv6}}'
```

### Macvlan Network Driver

```bash
# Create a macvlan network with IPv6
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  --ipv6 \
  --subnet=2001:db8:abc1::/64 \
  --gateway=2001:db8:abc1::1 \
  -o parent=eth0 \
  my-macvlan-ipv6

# Verify macvlan IPv6 configuration
docker network inspect my-macvlan-ipv6 | grep -A 20 "IPAM"
```

## 10. Debug User-Defined Networks

User-defined networks provide better isolation and control over IPv6 configuration.

```bash
# Create a network with explicit IPv6 settings
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet "fd00:0:0:1::/64" \
  --gateway "fd00:0:0:1::1" \
  my-ipv6-net

# Inspect the network configuration
docker network inspect my-ipv6-net

# Start a container on the IPv6 network
docker run -d --network my-ipv6-net --name test-ipv6 nginx

# Verify the container received an IPv6 address
docker inspect test-ipv6 --format '{{range .NetworkSettings.Networks}}IPv6: {{.GlobalIPv6Address}}{{end}}'
```

### Debugging Network Creation Failures

```bash
# Check for subnet conflicts
docker network ls
docker network inspect $(docker network ls -q) --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'

# Verify the subnet is valid
ipcalc -6 fd00:0:0:1::/64

# Check if the gateway is within the subnet
python3 -c "import ipaddress; print(ipaddress.ip_address('fd00:0:0:1::1') in ipaddress.ip_network('fd00:0:0:1::/64'))"

# Test creating a network with verbose output
docker network create --ipv6 --subnet "fd00::/64" test-net 2>&1
```

## 11. Debug Container-to-Container Communication

IPv6 communication between containers on the same network should work automatically, but issues can arise.

```bash
# Start two containers on the same IPv6 network
docker run -d --network my-ipv6-net --name container1 nginx
docker run -d --network my-ipv6-net --name container2 alpine sleep 3600

# Get IPv6 addresses
CONTAINER1_IPV6=$(docker inspect container1 --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')
CONTAINER2_IPV6=$(docker inspect container2 --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')

echo "Container1 IPv6: $CONTAINER1_IPV6"
echo "Container2 IPv6: $CONTAINER2_IPV6"

# Test connectivity between containers
docker exec container2 ping6 -c 4 $CONTAINER1_IPV6

# Test using container name (DNS resolution)
docker exec container2 ping6 -c 4 container1
```

### Debug Inter-Container DNS

```bash
# Check if Docker's embedded DNS resolves IPv6
docker exec container2 dig AAAA container1

# Check DNS server being used
docker exec container2 cat /etc/resolv.conf

# Test DNS resolution with nslookup
docker exec container2 nslookup container1
```

## 12. Debug IPv6 with Docker Compose

Docker Compose requires specific configuration for IPv6 networking.

```yaml
# docker-compose.yml with IPv6 support
version: '3.8'

services:
  web:
    image: nginx
    networks:
      app_net:
        ipv6_address: fd00:0:0:1::10

  api:
    image: node:18
    networks:
      app_net:
        ipv6_address: fd00:0:0:1::20

networks:
  app_net:
    enable_ipv6: true
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
        - subnet: fd00:0:0:1::/64
          gateway: fd00:0:0:1::1
```

### Debug Compose Network Issues

```bash
# Bring up the stack with verbose output
docker-compose up -d --verbose

# Check if the network was created with IPv6
docker network inspect <project>_app_net | grep -A 10 "EnableIPv6"

# Verify containers received IPv6 addresses
docker-compose ps -q | xargs -I {} docker inspect {} --format '{{.Name}}: {{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'

# Check Compose logs for network errors
docker-compose logs 2>&1 | grep -i "ipv6\|network\|address"
```

## 13. Debug Kubernetes Pod IPv6

For Kubernetes environments, IPv6 debugging requires cluster-level considerations.

```bash
# Check if the cluster has IPv6 enabled
kubectl get nodes -o wide

# Verify pod IPv6 addresses
kubectl get pods -o wide
kubectl describe pod <pod_name> | grep -i "ip"

# Check the CNI plugin IPv6 configuration
kubectl get configmap -n kube-system <cni-config> -o yaml

# Test IPv6 connectivity from a pod
kubectl exec -it <pod_name> -- ping6 -c 4 2001:4860:4860::8888
```

### Debug Kubernetes Network Policies

```bash
# Check if network policies are blocking IPv6
kubectl get networkpolicies -A

# Describe network policy details
kubectl describe networkpolicy <policy_name> -n <namespace>

# Test connectivity with a debug pod
kubectl run debug-pod --image=nicolaka/netshoot --rm -it -- bash
# Inside the pod:
ping6 -c 4 <target_ipv6>
traceroute6 <target_ipv6>
```

## 14. Common IPv6 Container Networking Issues and Solutions

### Issue: Container Has No IPv6 Address

```bash
# Diagnosis
docker inspect <container> --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'
# Empty output indicates no IPv6 address

# Check if network has IPv6 enabled
docker network inspect <network> --format '{{.EnableIPv6}}'

# Solution: Create or use an IPv6-enabled network
docker network create --ipv6 --subnet fd00::/64 ipv6-net
docker run --network ipv6-net <image>
```

### Issue: IPv6 Ping Works But TCP Fails

```bash
# Diagnosis
docker exec <container> ping6 -c 4 <target>  # Works
docker exec <container> nc -6 -zv <target> 80  # Fails

# Check firewall rules
sudo ip6tables -L -v -n | grep -i drop

# Solution: Add firewall rules for the specific port
sudo ip6tables -A FORWARD -p tcp --dport 80 -j ACCEPT
```

### Issue: DNS Returns Only IPv4 Addresses

```bash
# Diagnosis
docker exec <container> dig google.com  # Returns A record only
docker exec <container> dig AAAA google.com  # Returns nothing

# Check DNS server configuration
docker exec <container> cat /etc/resolv.conf

# Solution: Use DNS servers that support IPv6
docker run --dns 2001:4860:4860::8888 <image>
```

### Issue: External IPv6 Connectivity Fails

```bash
# Diagnosis
docker exec <container> ping6 -c 4 fd00::1  # Works (local)
docker exec <container> ping6 -c 4 2001:4860:4860::8888  # Fails (external)

# Check host IPv6 connectivity
ping6 -c 4 2001:4860:4860::8888

# Check routing
ip -6 route show

# Solution: Add default IPv6 route or fix upstream connectivity
sudo ip -6 route add default via <gateway_ipv6> dev eth0
```

### Issue: IPv6 Works with IP but Not Hostname

```bash
# Diagnosis
docker exec <container> ping6 -c 4 2001:4860:4860::8888  # Works
docker exec <container> ping6 -c 4 ipv6.google.com  # Fails

# Check DNS resolution
docker exec <container> dig AAAA ipv6.google.com

# Solution: DNS issue - check resolver configuration
docker exec <container> cat /etc/resolv.conf
# Verify DNS server is reachable
docker exec <container> dig @8.8.8.8 AAAA ipv6.google.com
```

## 15. Summary: IPv6 Container Networking Debug Checklist

Use this systematic checklist when debugging IPv6 container networking issues:

| Step | Command | What to Check |
|------|---------|---------------|
| 1. Docker daemon IPv6 | `docker info \| grep -i ipv6` | IPv6 enabled in daemon |
| 2. Daemon config | `cat /etc/docker/daemon.json` | ipv6: true, fixed-cidr-v6 set |
| 3. Host IPv6 enabled | `cat /proc/sys/net/ipv6/conf/all/disable_ipv6` | Should be 0 |
| 4. IPv6 forwarding | `cat /proc/sys/net/ipv6/conf/all/forwarding` | Should be 1 |
| 5. Host IPv6 addresses | `ip -6 addr show` | Has global IPv6 address |
| 6. Host IPv6 route | `ip -6 route show` | Has default route |
| 7. Network IPv6 enabled | `docker network inspect <net> \| grep EnableIPv6` | Should be true |
| 8. Container IPv6 address | `docker inspect <container> --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'` | Has IPv6 address |
| 9. Container IPv6 route | `docker exec <container> ip -6 route` | Has default route |
| 10. Local connectivity | `docker exec <container> ping6 -c 4 <gateway>` | Gateway reachable |
| 11. External connectivity | `docker exec <container> ping6 -c 4 2001:4860:4860::8888` | Internet reachable |
| 12. DNS resolution | `docker exec <container> dig AAAA google.com` | Returns AAAA records |
| 13. Firewall rules | `sudo ip6tables -L -v -n` | No unexpected drops |
| 14. Packet capture | `sudo tcpdump -i docker0 ip6 -n` | Traffic flowing |

## Quick Reference Commands

```bash
# Enable IPv6 in Docker daemon
echo '{"ipv6": true, "fixed-cidr-v6": "fd00::/64", "ip6tables": true}' | sudo tee /etc/docker/daemon.json

# Restart Docker
sudo systemctl restart docker

# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Create IPv6-enabled network
docker network create --ipv6 --subnet fd00::/64 my-ipv6-net

# Test IPv6 connectivity
docker run --rm --network my-ipv6-net alpine ping6 -c 4 2001:4860:4860::8888

# Debug with netshoot
docker run --rm -it --network container:<target> nicolaka/netshoot

# Capture IPv6 packets
sudo tcpdump -i docker0 ip6 -n -v
```

---

Debugging IPv6 in containers requires understanding both container networking fundamentals and IPv6-specific behavior. Start with daemon configuration, verify host-level IPv6 support, then work your way through network configuration, firewall rules, and finally packet-level analysis. The systematic approach outlined in this guide will help you identify and resolve IPv6 connectivity issues efficiently. Remember that most IPv6 problems in containers stem from missing daemon configuration, disabled IPv6 forwarding, or firewall rules blocking ICMPv6 traffic. By following this checklist and using the debugging commands provided, you can quickly pinpoint and resolve IPv6 networking issues in your containerized environments.
