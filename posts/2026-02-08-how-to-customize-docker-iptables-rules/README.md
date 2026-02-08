# How to Customize Docker iptables Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, iptables, Firewall, Networking, Security, Linux, Containers

Description: Learn how to safely add custom iptables rules alongside Docker without breaking container networking or port publishing.

---

Docker manages iptables rules automatically. Every time you publish a port or create a network, Docker inserts and removes rules as needed. This creates a challenge: if you add your own firewall rules carelessly, Docker will overwrite them on restart. If you modify Docker's chains directly, you risk breaking container networking.

The solution is the DOCKER-USER chain. Docker created this chain specifically for user-defined rules. It processes packets before Docker's own rules, and Docker never modifies it. This guide shows you how to use DOCKER-USER effectively, along with other techniques for customizing Docker's networking behavior through iptables.

## Understanding Where to Add Rules

Docker's FORWARD chain processes rules in this order:

1. DOCKER-USER (your rules go here)
2. DOCKER-ISOLATION-STAGE-1 (network isolation)
3. ACCEPT for established connections
4. DOCKER (published port rules)
5. ACCEPT for outbound container traffic
6. ACCEPT for container-to-container traffic

Because DOCKER-USER comes first, your rules take priority over everything else in the FORWARD chain.

```bash
# View the current DOCKER-USER chain
sudo iptables -L DOCKER-USER -n -v --line-numbers
```

By default, it contains only a RETURN rule, which means "continue processing in the FORWARD chain."

## Restricting Access to Published Ports

The most common customization is restricting which IP addresses can reach published container ports.

```bash
# Allow only your office IP to access any published Docker port
sudo iptables -I DOCKER-USER -i eth0 -s 203.0.113.50 -j ACCEPT
sudo iptables -I DOCKER-USER -i eth0 -s 10.0.0.0/8 -j ACCEPT

# Drop all other external traffic to Docker containers
sudo iptables -A DOCKER-USER -i eth0 -j DROP

# Keep the RETURN rule at the end for internal traffic
sudo iptables -A DOCKER-USER -j RETURN
```

Important: the `-i eth0` flag limits these rules to traffic arriving from the external interface. Without it, you would also block container-to-container traffic on the bridge interfaces.

## Port-Specific Restrictions

Lock down specific published ports while leaving others open:

```bash
# Block all external access to port 5432 (PostgreSQL)
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 5432 -j DROP

# Allow only the application server to reach PostgreSQL
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 5432 -s 10.0.1.5 -j ACCEPT
```

Note that the ACCEPT rule must come before the DROP rule. iptables processes rules top-to-bottom and stops at the first match.

```bash
# Verify rule ordering (ACCEPT should be above DROP for the same port)
sudo iptables -L DOCKER-USER -n -v --line-numbers
```

## Rate Limiting Container Traffic

Protect containers from brute-force attacks or DDoS:

```bash
# Rate limit new connections to published port 8080 (max 25 per minute)
sudo iptables -I DOCKER-USER -p tcp --dport 8080 -m conntrack --ctstate NEW \
  -m limit --limit 25/minute --limit-burst 50 -j ACCEPT

# Drop connections that exceed the rate limit
sudo iptables -I DOCKER-USER -p tcp --dport 8080 -m conntrack --ctstate NEW -j DROP
```

The `--limit-burst 50` allows an initial burst of 50 connections before the rate limit kicks in. Adjust these values based on your expected traffic patterns.

## Geo-Blocking with ipset

For large IP block lists, use ipset with iptables for better performance:

```bash
# Install ipset
sudo apt-get install ipset

# Create an IP set for allowed countries (example: US IP ranges)
sudo ipset create allowed-countries hash:net

# Add IP ranges (use a script for real geo-IP data)
sudo ipset add allowed-countries 203.0.113.0/24
sudo ipset add allowed-countries 198.51.100.0/24

# Use the ipset in a DOCKER-USER rule
sudo iptables -I DOCKER-USER -i eth0 -m set ! --match-set allowed-countries src -j DROP
```

ipset lookups are O(1) regardless of the number of entries, making them much faster than hundreds of individual iptables rules.

## Logging Container Traffic

Add logging rules to monitor traffic patterns:

```bash
# Log all dropped packets in DOCKER-USER
sudo iptables -I DOCKER-USER -j LOG \
  --log-prefix "DOCKER-USER-DROP: " \
  --log-level 4 \
  -m limit --limit 5/min

# Log new connections to specific ports
sudo iptables -I DOCKER-USER -p tcp --dport 443 -m conntrack --ctstate NEW \
  -j LOG --log-prefix "DOCKER-NEW-443: " --log-level 4
```

View the logs:

```bash
# Watch iptables log entries in real-time
sudo journalctl -f -k | grep "DOCKER-USER"
```

## Time-Based Rules

Restrict access to certain hours:

```bash
# Allow access to the admin panel only during business hours (9 AM - 6 PM, Mon-Fri)
sudo iptables -I DOCKER-USER -p tcp --dport 8443 \
  -m time --timestart 09:00 --timestop 18:00 --weekdays Mon,Tue,Wed,Thu,Fri \
  -j ACCEPT

# Block admin panel access outside business hours
sudo iptables -A DOCKER-USER -p tcp --dport 8443 -j DROP
```

## Persisting Custom Rules

Docker does not manage DOCKER-USER rules, so they disappear on reboot. Several options exist to persist them.

Using iptables-persistent:

```bash
# Install the persistence package
sudo apt-get install iptables-persistent

# Save current rules (including DOCKER-USER customizations)
sudo netfilter-persistent save
```

Using a systemd service:

```bash
# Create a script with your custom rules
cat << 'SCRIPT' | sudo tee /usr/local/bin/docker-firewall.sh
#!/bin/bash
# Custom Docker firewall rules - applied after Docker starts

# Flush existing DOCKER-USER rules (except the final RETURN)
iptables -F DOCKER-USER

# Allow established connections
iptables -A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow internal network access to all containers
iptables -A DOCKER-USER -s 10.0.0.0/8 -j ACCEPT
iptables -A DOCKER-USER -s 172.16.0.0/12 -j ACCEPT
iptables -A DOCKER-USER -s 192.168.0.0/16 -j ACCEPT

# Allow specific external IPs
iptables -A DOCKER-USER -s 203.0.113.50 -j ACCEPT

# Drop everything else from external interfaces
iptables -A DOCKER-USER -i eth0 -j DROP

# Final RETURN for anything that reaches this point
iptables -A DOCKER-USER -j RETURN
SCRIPT

sudo chmod +x /usr/local/bin/docker-firewall.sh
```

Create a systemd service to run it after Docker starts:

```ini
# /etc/systemd/system/docker-firewall.service
[Unit]
Description=Docker custom firewall rules
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/docker-firewall.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Enable the firewall service to run on boot
sudo systemctl daemon-reload
sudo systemctl enable docker-firewall.service
sudo systemctl start docker-firewall.service
```

## Working with Docker Compose and iptables

When using Docker Compose, each project creates its own bridge network. Your DOCKER-USER rules apply to all Docker networks. If you need network-specific rules, filter by the bridge interface name:

```bash
# Find the bridge interface name for a Compose network
docker network inspect myproject_default --format '{{index .Options "com.docker.network.bridge.name"}}'

# Add rules specific to that network's bridge
sudo iptables -I DOCKER-USER -i br-abc123 -p tcp --dport 3306 -j DROP
```

## Testing Your Rules

Always test iptables changes before locking yourself out:

```bash
# Test rule: temporarily add a rule and automatically remove it after 60 seconds
sudo timeout 60 bash -c '
  iptables -I DOCKER-USER -i eth0 -j DROP
  echo "Rule active for 60 seconds. Test connectivity now."
  sleep 60
  iptables -D DOCKER-USER -i eth0 -j DROP
  echo "Rule removed."
'
```

Verify rules are working:

```bash
# Check packet counters to see if rules are matching traffic
sudo iptables -L DOCKER-USER -n -v --line-numbers

# Send test traffic and watch counters increment
curl http://your-server:8080
sudo iptables -L DOCKER-USER -n -v --line-numbers
```

## Common Mistakes to Avoid

1. **Do not modify the DOCKER chain directly** - Docker will overwrite your changes on restart
2. **Do not change the FORWARD chain policy without adding explicit DOCKER-USER rules** - This can break all container networking
3. **Always use `-i eth0` (or your external interface name)** when restricting external access, so internal Docker traffic is not affected
4. **Test rules before persisting** - A mistake in DOCKER-USER can lock you out of remote servers
5. **Check rule order** - ACCEPT rules must come before DROP rules for the same traffic

## Restoring Default Behavior

If your custom rules cause problems, flush DOCKER-USER and restart Docker:

```bash
# Remove all custom rules from DOCKER-USER
sudo iptables -F DOCKER-USER
sudo iptables -A DOCKER-USER -j RETURN

# Restart Docker to regenerate its own rules
sudo systemctl restart docker
```

## Conclusion

The DOCKER-USER chain is Docker's sanctioned way to add firewall rules. It survives Docker restarts, processes before Docker's own rules, and gives you full control over which traffic reaches your containers. The key principles are simple: add rules to DOCKER-USER only, filter by external interface to avoid disrupting internal traffic, persist your rules with systemd or iptables-persistent, and always test before committing. With these practices, you can maintain a proper firewall alongside Docker without fighting the container engine.
