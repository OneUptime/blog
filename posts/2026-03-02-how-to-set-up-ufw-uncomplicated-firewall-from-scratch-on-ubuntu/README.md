# How to Set Up UFW (Uncomplicated Firewall) from Scratch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Security, Networking

Description: Configure UFW from scratch on Ubuntu with a default-deny policy, essential service rules, and proper logging to secure your server without locking yourself out.

---

UFW (Uncomplicated Firewall) is a frontend for iptables that makes firewall management significantly more approachable without sacrificing meaningful functionality. Ubuntu ships with UFW available but disabled by default. Getting it right from the start - particularly not locking yourself out of SSH - requires understanding the order of operations.

## UFW Architecture

UFW writes to iptables under the hood. Every `ufw` command you run translates to iptables rules stored in `/etc/ufw/`. When you run `ufw enable`, those rules get loaded into the kernel's netfilter framework.

UFW evaluates rules in order and uses a default policy for traffic that doesn't match any rule. The default-deny approach (deny all traffic unless explicitly allowed) is the right baseline for servers exposed to the internet.

## Checking UFW Status

Before making any changes:

```bash
# Check if UFW is installed
which ufw

# Check current status
sudo ufw status verbose
```

If UFW isn't installed:

```bash
sudo apt update
sudo apt install -y ufw
```

## Setting Default Policies

Set the default policies before enabling UFW. Always do this before adding rules:

```bash
# Deny all incoming traffic by default
sudo ufw default deny incoming

# Allow all outgoing traffic by default
# This is the sensible default for most servers
sudo ufw default allow outgoing

# Deny forwarding (for servers that aren't routers)
sudo ufw default deny forward
```

## Adding SSH Rule Before Enabling

This is the critical step people miss. Add the SSH rule before enabling UFW, or you'll lock yourself out:

```bash
# Allow SSH (port 22) - do this BEFORE enabling UFW
sudo ufw allow ssh

# If SSH is on a custom port (e.g., 2222)
sudo ufw allow 2222/tcp

# Verify the rule was added
sudo ufw show added
```

If you're connecting from a specific IP range, a more restrictive rule is safer:

```bash
# Allow SSH only from your management network
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
```

## Enabling UFW

Once the SSH rule is in place:

```bash
sudo ufw enable
```

You'll see:

```text
Command may disrupt existing ssh connections. Proceed with operation (y|n)?
```

Type `y`. UFW will enable immediately. If you have an active SSH connection, it will continue working because established connections aren't immediately dropped.

Check that it's active:

```bash
sudo ufw status verbose
```

Expected output:

```text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (forwarded)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
22/tcp (v6)                ALLOW IN    Anywhere (v6)
```

## Adding Common Service Rules

With UFW active, add rules for the services running on your server:

```bash
# Web server - HTTP and HTTPS
sudo ufw allow http
sudo ufw allow https

# Or by port number
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Mail server ports
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 587/tcp   # SMTP submission
sudo ufw allow 993/tcp   # IMAPS
sudo ufw allow 995/tcp   # POP3S

# Database - restrict to specific source IPs
sudo ufw allow from 192.168.1.0/24 to any port 5432 proto tcp  # PostgreSQL
sudo ufw allow from 10.0.0.50 to any port 3306 proto tcp       # MySQL from app server

# Custom application port
sudo ufw allow 8080/tcp
```

## Viewing Current Rules

Check what's configured:

```bash
# Simple status view
sudo ufw status

# Verbose with more detail
sudo ufw status verbose

# Numbered list (useful for deleting specific rules)
sudo ufw status numbered
```

The numbered output is especially useful:

```text
     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 80/tcp                     ALLOW IN    Anywhere
[ 3] 443/tcp                    ALLOW IN    Anywhere
[ 4] 5432/tcp                   ALLOW IN    192.168.1.0/24
```

## Deleting Rules

Remove rules you no longer need:

```bash
# Delete by rule content
sudo ufw delete allow http

# Delete by rule number (from `ufw status numbered`)
sudo ufw delete 3

# Delete a specific allow rule
sudo ufw delete allow from 192.168.2.0/24 to any port 22
```

## Enabling UFW at Boot

UFW should start automatically at boot:

```bash
# UFW is enabled at boot when activated with 'ufw enable'
# Verify with systemd
sudo systemctl status ufw

# If not enabled
sudo systemctl enable ufw
```

## Testing Your Rules

After setting up UFW, verify your rules work as expected:

```bash
# From another machine, test that SSH is accessible
ssh user@your-server-ip

# Test that a blocked port is actually blocked
# From another machine:
nc -zv your-server-ip 3306  # Should fail if MySQL isn't allowed from that IP

# Test with nmap from another machine
nmap -p 22,80,443,3306 your-server-ip
```

## Viewing UFW Logs

UFW logs blocked connection attempts. Enable logging if it's not already on:

```bash
# Check logging status
sudo ufw status verbose | grep Logging

# Enable logging
sudo ufw logging on

# Set log level (low, medium, high, full)
sudo ufw logging medium
```

View the logs:

```bash
# UFW logs appear in syslog and kern.log
sudo tail -f /var/log/ufw.log

# Or via journalctl
sudo journalctl -f | grep UFW
```

Log entries look like:

```text
[UFW BLOCK] IN=eth0 OUT= MAC=... SRC=203.0.113.1 DST=192.168.1.10 LEN=44 ... PROTO=TCP DPT=3306
```

## IPv6 Support

UFW handles IPv6 automatically when IPv6 is enabled in its configuration:

```bash
# Check IPv6 is enabled in UFW
sudo nano /etc/ufw/ufw.conf
```

```bash
# Ensure this is set to yes
IPV6=yes
```

When you add a rule like `sudo ufw allow 80/tcp`, UFW automatically creates both IPv4 and IPv6 rules.

## Using UFW with Docker

Docker modifies iptables directly and bypasses UFW rules by default. Containers can be exposed to the internet even when UFW should be blocking them. The fix:

```bash
sudo nano /etc/ufw/after.rules
```

Add at the end:

```text
# Block Docker from bypassing UFW
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -i eth0 ! -s 192.168.1.0/24 -j DROP
COMMIT
```

A cleaner approach is to configure Docker to not modify iptables:

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "iptables": false
}
```

But this requires manually managing Docker network connectivity, so weigh the trade-offs.

## Resetting UFW

If you need to start over completely:

```bash
# Reset all rules and disable UFW
sudo ufw reset

# This returns to the default disabled state with no rules
# Re-enable from scratch
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

## Common Mistakes to Avoid

The most common mistake is enabling UFW before adding the SSH rule. If this happens and you have console access (datacenter KVM, cloud provider console), you can:

```bash
sudo ufw allow ssh
# or
sudo ufw disable
```

If you only have SSH access and get locked out, you'll need to use your cloud provider's console or rescue mode.

Another common mistake is forgetting that UFW rules apply to all interfaces by default. If your server has a management interface and a public interface, be explicit about which interface rules apply to when needed:

```bash
# Allow SSH only on the management interface
sudo ufw allow in on eth1 to any port 22 proto tcp
```

UFW provides a solid security baseline for Ubuntu servers without requiring deep iptables knowledge. The default-deny policy with explicit allow rules is the right mental model for server security.
