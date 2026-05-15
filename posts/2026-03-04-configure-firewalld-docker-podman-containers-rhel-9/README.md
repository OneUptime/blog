# How to Configure Firewalld for Docker and Podman Containers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, firewalld, Docker, Podman, Container, Linux

Description: How to make firewalld work correctly with Docker and Podman on RHEL, covering port publishing, network conflicts, and zone configurations for container workloads.

---

Containers and firewalld have a complicated relationship. Docker and rootful Podman both need to manipulate networking rules to expose container ports, and this can conflict with firewalld's rule management. Getting them to cooperate requires understanding how each tool interacts with the kernel's packet filtering.

## The Problem

When you run a container with a published port on a bridge network, the container runtime usually sets up NAT rules to forward traffic from the host port to the container. Docker does this by directly modifying iptables/nftables, which can bypass or conflict with firewalld.

```mermaid
graph TD
    A[External Traffic] --> B{Firewalld Rules}
    B -->|Direct port access| C[Host Service]
    A --> D{Container NAT Rules}
    D -->|Port forwarding| E[Container]
    B -.->|May not filter| D
```

The result: ordinary firewalld rules for host services might not actually block traffic to published container ports, because Docker's forwarding and port-publishing rules can handle that traffic outside the normal host input path.

## Docker and Firewalld

### The Default Conflict

Docker modifies iptables directly. On RHEL, Docker can add its own chains that bypass firewalld. A published port like `-p 8080:80` might be accessible from anywhere, regardless of your firewalld rules.

### Option 1: Let Docker Manage Its Own Rules

The simplest approach is to accept that Docker manages its own port publishing and focus on controlling which ports you publish:

```bash
# Only publish ports on localhost (not externally accessible)

docker run -d -p 127.0.0.1:8080:80 nginx

# Or bind to a specific interface
docker run -d -p 10.0.1.50:8080:80 nginx
```

This way, firewalld handles external access and Docker handles container traffic.

### Option 2: Disable Docker's iptables Management

You can tell Docker to stop managing iptables, but then you need to handle all container networking rules yourself:

```bash
# Edit the Docker daemon configuration
cat > /etc/docker/daemon.json << 'EOF'
{
  "iptables": false
}
EOF

# Restart Docker
systemctl restart docker
```

After this, Docker stops creating most of the firewall rules it normally uses for bridge networking, masquerading, and port publishing, so you need to provide replacement rules yourself. This approach is complex and not recommended unless you have a specific reason.

### Option 3: Use Docker's Firewalld Zone

When firewalld is running and Docker's iptables/ip6tables management is enabled, Docker creates a `docker` firewalld zone with target `ACCEPT` and assigns Docker bridge interfaces such as `docker0` to it. Verify that Docker has created and populated the zone:

```bash
# Check Docker's firewalld integration
firewall-cmd --get-active-zones
firewall-cmd --zone=docker --list-all
```

Do not rely on allowing or blocking the same port in the `public` zone to restrict a Docker-published port. Docker's own forwarding rules control published container ports. For simple exposure control, bind the published port to localhost or a specific host address:

```bash
# Only expose the Docker-published port locally
docker run -d -p 127.0.0.1:8080:80 nginx
```

## Podman and Firewalld

Podman on RHEL works differently from Docker in significant ways:

### Rootless Podman

Rootless Podman (running as a regular user) uses slirp4netns or pasta for networking. On RHEL 9.5 and later, pasta is the default rootless network mode; earlier RHEL 9 releases default to slirp4netns. Rootless port publishing does not create the same host firewall rules as rootful bridge networking:

```bash
# Rootless Podman - no firewall conflicts
podman run -d -p 8080:80 nginx
```

Firewalld rules on the host still apply. If you block port 8080 in firewalld, rootless Podman containers on that port will not be reachable from outside.

```bash
# Allow the port in firewalld for rootless Podman
firewall-cmd --zone=public --add-port=8080/tcp --permanent
firewall-cmd --reload
```

### Rootful Podman

Rootful Podman (running as root) uses netavark by default on fresh RHEL 9 installations, while some upgraded systems can still use CNI. It creates bridge interfaces similar to Docker:

```bash
# Check Podman's network backend
podman info --format '{{.Host.NetworkBackend}}'
```

For rootful Podman with a bridge interface:

```bash
# Check the bridge interface name before assigning it
bridge_interface=$(podman network inspect podman --format '{{.NetworkInterface}}')
firewall-cmd --zone=trusted --change-interface="$bridge_interface" --permanent
firewall-cmd --reload
```

## Practical Setup: Web App with Firewalld

Here is a complete example for running a web application in a container with proper firewall rules:

```bash
# Allow HTTP and HTTPS on the public zone
firewall-cmd --zone=public --add-service=http --permanent
firewall-cmd --zone=public --add-service=https --permanent
firewall-cmd --reload

# Run the container as root, publishing on standard ports
sudo podman run -d --name webapp -p 80:8080 -p 443:8443 my-web-app

# Verify firewall allows traffic
firewall-cmd --zone=public --list-all
```

## Handling Container-to-Container Communication

Containers on the same bridge network can communicate directly. For containers on different networks:

```bash
# Create a custom Podman network
podman network create app-network

# Run containers on the same network
podman run -d --name frontend --network app-network nginx
podman run -d --name backend --network app-network my-api
```

Firewalld does not need special rules for container-to-container communication on the same network.

## Firewalld with Podman Pods

When using Podman pods, ports are published at the pod level:

```bash
# Create a pod with published ports
podman pod create --name my-pod -p 8080:80 -p 3306:3306

# Add containers to the pod
podman run -d --pod my-pod --name web nginx
podman run -d --pod my-pod --name db mariadb

# Allow those ports in firewalld
firewall-cmd --zone=public --add-port=8080/tcp --permanent
firewall-cmd --zone=public --add-port=3306/tcp --permanent
firewall-cmd --reload
```

## Masquerading for Container Networks

Container runtimes normally configure masquerading for their managed bridge networks. If you have disabled that rule management or you are managing container forwarding yourself, enable masquerading on the zone bound to the external interface:

```bash
# Enable masquerading on the public zone
firewall-cmd --zone=public --add-masquerade --permanent
firewall-cmd --reload

# Verify
firewall-cmd --zone=public --query-masquerade
```

## Troubleshooting

**Container port not reachable externally**:

```bash
# Check if firewalld is blocking the port
firewall-cmd --zone=public --list-ports

# Check if the container is actually listening
ss -tlnp | grep 8080

# Check the container's published ports
podman port webapp
```

**Firewalld rules not affecting Docker ports**:

This is the NAT bypass issue. Docker creates its own forwarding and port-publishing rules, so ordinary host input rules might not restrict Docker-published ports. Use Docker's `-p 127.0.0.1:port:port` syntax to limit access, or add filtering in Docker's `DOCKER-USER` chain.

**Container cannot reach the internet**:

```bash
# Check masquerading
firewall-cmd --zone=public --query-masquerade

# Check IP forwarding
sysctl net.ipv4.ip_forward
```

## Summary

Podman on RHEL, especially rootless Podman, works well with firewalld because it does not bypass firewall rules in the same way as Docker-published bridge ports. Docker is more problematic because it modifies iptables/nftables directly. For Docker, either accept its rule management and control access through which ports and addresses you publish, or use Docker's firewalld integration and Docker-specific filtering such as the `DOCKER-USER` chain. For Podman, standard firewalld port rules work as expected for host-published rootless ports. Always test from an external machine to verify that only the intended ports are reachable.
