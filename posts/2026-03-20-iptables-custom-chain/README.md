# How to Create a Custom iptables Chain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Linux, Firewall, Custom Chains, Security, Organization

Description: Create and use custom iptables chains to organize firewall rules into logical groups, reduce repetition, and build modular rule sets for complex filtering scenarios.

Custom chains let you create reusable rule groups - like a function in programming. Instead of duplicating rules across multiple contexts, you define them once in a custom chain and jump to it from any standard chain in the same table.

## Create a Custom Chain

```bash
# Create a new chain called MYCHAIN

sudo iptables -N MYCHAIN

# List all chains including custom ones
sudo iptables -L

# Output shows:
# Chain INPUT (policy DROP)
# ...
# Chain MYCHAIN (0 references)
# target  prot  opt  source  destination
```

## Add Rules to the Custom Chain

```bash
# Add rules to your custom chain
sudo iptables -A MYCHAIN -p tcp --dport 22 -j ACCEPT
sudo iptables -A MYCHAIN -p tcp --dport 80 -j ACCEPT
sudo iptables -A MYCHAIN -p tcp --dport 443 -j ACCEPT

# Add a default action (RETURN = resume at the next rule in the calling chain)
sudo iptables -A MYCHAIN -j RETURN
```

## Jump to Custom Chain from Standard Chain

```bash
# Jump from INPUT chain to MYCHAIN for all traffic
sudo iptables -A INPUT -j MYCHAIN

# Or conditionally: jump only for specific source IP
sudo iptables -A INPUT -s 10.0.0.0/8 -j MYCHAIN

# Or for specific protocol
sudo iptables -A INPUT -p tcp -j MYCHAIN
```

## Real-World Example: Organized Firewall

```bash
#!/bin/bash
# modular-firewall.sh - Organized firewall with custom chains

# Create custom chains
sudo iptables -N ALLOW-SERVICES
sudo iptables -N BLOCK-THREATS
sudo iptables -N RATE-LIMIT

# --- BLOCK-THREATS chain ---
# Block known bad IPs
sudo iptables -A BLOCK-THREATS -s 1.2.3.4 -j DROP
sudo iptables -A BLOCK-THREATS -s 5.6.7.8 -j DROP
# Track TCP SYN sources
sudo iptables -A BLOCK-THREATS -p tcp --syn -m recent --name scanners --set
# Log and drop repeated TCP SYNs from the same source
sudo iptables -A BLOCK-THREATS -p tcp --syn -m recent \
  --update --seconds 60 --hitcount 10 --name scanners \
  -j LOG --log-prefix "PORT-SCAN: "
sudo iptables -A BLOCK-THREATS -p tcp --syn -m recent \
  --update --seconds 60 --hitcount 10 --name scanners \
  -j DROP
sudo iptables -A BLOCK-THREATS -j RETURN

# --- ALLOW-SERVICES chain ---
sudo iptables -A ALLOW-SERVICES -p tcp --dport 22 -j ACCEPT
sudo iptables -A ALLOW-SERVICES -p tcp --dport 80 -j ACCEPT
sudo iptables -A ALLOW-SERVICES -p tcp --dport 443 -j ACCEPT
sudo iptables -A ALLOW-SERVICES -j RETURN

# --- Main INPUT chain ---
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -j BLOCK-THREATS    # Check threats first
sudo iptables -A INPUT -j ALLOW-SERVICES  # Then allow services
sudo iptables -A INPUT -j DROP            # Default drop
```

## Delete a Custom Chain

Custom chains can only be deleted when empty and unreferenced:

```bash
# Step 1: Remove all rules FROM the chain
sudo iptables -F MYCHAIN

# Step 2: Remove all references TO the chain (jump rules)
sudo iptables -D INPUT -j MYCHAIN

# Step 3: Delete the chain
sudo iptables -X MYCHAIN

# Or use the all-in-one cleanup method:
# Flush all, then delete all custom chains
sudo iptables -F
sudo iptables -X  # Deletes ALL user-defined chains
```

## List Custom Chains

```bash
# List specific custom chain
sudo iptables -L MYCHAIN -n -v

# List all custom chains with reference counts
sudo iptables -L | grep "Chain " | grep -v "INPUT\|OUTPUT\|FORWARD"

# Count rules in a custom chain
sudo iptables -S MYCHAIN | grep "^-A MYCHAIN" | wc -l
```

Custom chains are the key to maintainable iptables rule sets - they bring structure and reusability to what would otherwise become an unmanageable list of hundreds of rules.
