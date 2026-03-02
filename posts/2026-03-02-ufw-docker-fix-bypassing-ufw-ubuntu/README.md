# How to Configure UFW with Docker on Ubuntu (Fix Docker Bypassing UFW)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, UFW, Firewall, Security

Description: Fix the well-known issue where Docker bypasses UFW firewall rules on Ubuntu, with multiple solutions including iptables rules, Docker network configuration, and the ufw-docker tool.

---

Docker's interaction with UFW (Uncomplicated Firewall) is one of the most common security surprises for Ubuntu users. By default, Docker directly manipulates iptables to expose container ports, completely bypassing UFW rules. A container running with `-p 8080:80` becomes accessible from the internet regardless of what UFW says, even if you have a rule `ufw deny 8080`.

This is a known and documented Docker design decision, not a bug. Docker manages its own iptables chains (`DOCKER`, `DOCKER-USER`, `DOCKER-ISOLATION`) which run before UFW's rules. Understanding this is essential for securing Docker on Ubuntu.

## Verifying the Problem

```bash
# Start a simple web container
docker run -d --name test-nginx -p 8080:80 nginx

# Check UFW status - appears to deny 8080
sudo ufw status
# shows: 8080    DENY IN  Anywhere  (perhaps)

# Check if the container is still accessible from outside
# From another machine or using curl with external IP:
curl http://your-server-ip:8080

# Despite UFW supposedly blocking 8080, this works
# Docker bypassed UFW by adding iptables rules directly
```

Check what iptables rules Docker has added:

```bash
# See Docker's iptables chains
sudo iptables -L DOCKER -n
sudo iptables -L DOCKER-USER -n
sudo iptables -t nat -L DOCKER -n

# Docker inserts rules in PREROUTING that redirect before UFW sees traffic
sudo iptables -t nat -L PREROUTING -n
```

## Solution 1: Use the DOCKER-USER Chain (Recommended)

Docker intentionally leaves the `DOCKER-USER` chain empty for sysadmin-defined rules. Rules here apply before Docker's own rules and are respected even when Docker updates its rules.

```bash
# Block all external access to Docker ports by default
# DOCKER-USER runs before DOCKER chain
sudo iptables -I DOCKER-USER -j DROP

# Allow specific IPs to reach Docker containers
sudo iptables -I DOCKER-USER -s 192.168.1.0/24 -j ACCEPT  # allow local network
sudo iptables -I DOCKER-USER -s 10.0.0.0/8 -j ACCEPT       # allow internal network

# Allow established connections (responses to outbound requests)
sudo iptables -I DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# View the result
sudo iptables -L DOCKER-USER -n -v
```

Make these rules persistent:

```bash
# Install iptables-persistent
sudo apt install -y iptables-persistent

# Save current rules
sudo netfilter-persistent save

# Rules saved to:
# /etc/iptables/rules.v4
# /etc/iptables/rules.v6
```

## Solution 2: Disable Docker iptables Management

You can tell Docker not to manage iptables at all. This gives UFW full control but requires you to handle container networking manually.

```bash
# Edit or create Docker daemon configuration
sudo nano /etc/docker/daemon.json
```

```json
{
  "iptables": false
}
```

```bash
# Restart Docker
sudo systemctl restart docker

# Now UFW rules apply to Docker ports
# But Docker containers cannot reach the internet without additional configuration
# You need to enable IP forwarding and masquerading manually

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# Add masquerading for Docker's bridge network
sudo iptables -t nat -A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
```

This approach is more complex and can break Docker networking features like service discovery.

## Solution 3: Bind Containers to Specific Interfaces

Instead of binding to all interfaces (`0.0.0.0`), bind container ports only to specific interfaces:

```bash
# Bind only to localhost - not accessible from outside
docker run -d -p 127.0.0.1:8080:80 nginx

# Bind to a specific interface IP
docker run -d -p 192.168.1.100:8080:80 nginx

# With docker-compose:
# ports:
#   - "127.0.0.1:8080:80"
```

For containers that should only be accessible locally (reverse proxied by nginx/traefik on the same host), this is the cleanest solution.

In `docker-compose.yml`:

```yaml
version: '3'
services:
  webapp:
    image: myapp:latest
    ports:
      # Bind to localhost only - nginx handles external access
      - "127.0.0.1:8080:80"

  nginx:
    image: nginx:latest
    ports:
      # nginx is the only container with external access
      - "0.0.0.0:80:80"
      - "0.0.0.0:443:443"
```

## Solution 4: The ufw-docker Tool

The `ufw-docker` utility provides a clean interface for managing UFW rules that work with Docker:

```bash
# Download and install ufw-docker
sudo wget -O /usr/local/bin/ufw-docker \
  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
sudo chmod +x /usr/local/bin/ufw-docker

# Install the ufw-docker fix (adds rules to /etc/ufw/after.rules)
sudo ufw-docker install

# Restart UFW to apply
sudo systemctl restart ufw

# Now use ufw-docker to manage container access
# Allow external access to a specific container
sudo ufw-docker allow nginx 80

# Allow access from a specific IP
sudo ufw-docker allow from 192.168.1.0/24 to nginx 80

# List ufw-docker rules
sudo ufw-docker status

# Remove a rule
sudo ufw-docker delete allow nginx 80
```

The `ufw-docker install` command adds iptables rules to `/etc/ufw/after.rules` that block Docker traffic from the outside by default and let you use `ufw-docker allow` to selectively permit access.

## Solution 5: Network-Level Filtering (Cloud Environments)

If you are on a cloud provider (AWS, GCP, Azure, DigitalOcean), the most reliable protection is at the network/security group level:

- **AWS**: Configure Security Groups to allow only needed ports
- **DigitalOcean**: Use Cloud Firewalls
- **GCP**: Configure VPC firewall rules

This protection applies before traffic even reaches your server, making Docker's iptables manipulation irrelevant.

UFW or DOCKER-USER rules are still useful for defense-in-depth, but cloud firewalls are a more reliable first line of defense.

## Verifying Your Fix

After applying a solution:

```bash
# Start a test container
docker run -d --name test-exposure -p 9999:80 nginx

# Check UFW status
sudo ufw status

# Try to reach port 9999 from outside
# If the fix worked, this should fail:
# curl http://your-external-ip:9999

# Check iptables rules to understand what is happening
sudo iptables -L DOCKER-USER -n -v
sudo iptables -L INPUT -n -v

# Confirm containers can still reach the internet (outbound should work)
docker exec test-exposure curl -s https://example.com | head -5

# Clean up test container
docker rm -f test-exposure
```

## Keeping Track of Exposed Container Ports

To audit what ports Docker is currently exposing:

```bash
# List all container port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"

# More detailed view
docker inspect \
  $(docker ps -q) \
  --format '{{.Name}}: {{range $p, $c := .NetworkSettings.Ports}}{{$p}} -> {{(index $c 0).HostIP}}:{{(index $c 0).HostPort}} {{end}}' \
  2>/dev/null

# Check what ports are actually listening
sudo ss -tlnp | grep docker
sudo netstat -tlnp | grep docker
```

## Recommended Approach for Production

The cleanest production setup combines multiple layers:

1. Cloud-level firewall: only allow ports 80, 443, and your SSH port from anywhere
2. Bind sensitive containers to localhost: `-p 127.0.0.1:port:port`
3. Use a reverse proxy (nginx/traefik) that handles SSL and is the only container with public port exposure
4. DOCKER-USER rules as an additional layer for specific access control

```bash
# Example: add to DOCKER-USER to restrict access by default
sudo iptables -I DOCKER-USER -i eth0 -j DROP
sudo iptables -I DOCKER-USER -i eth0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
# Add specific allows as needed:
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 80 -j ACCEPT
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 443 -j ACCEPT

# Save rules
sudo netfilter-persistent save
```

This layered approach provides multiple independent barriers against accidentally exposing container services. Use [OneUptime](https://oneuptime.com) to monitor your exposed ports and get alerts when unexpected services become accessible.
