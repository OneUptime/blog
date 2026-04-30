# How to Limit SSH Brute Force Attacks with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, SSH, Brute Force, Security, Linux, Rate Limiting

Description: Use iptables rate limiting with the hashlimit and recent modules to restrict SSH connection attempts per IP address, blocking brute force attacks without requiring Fail2Ban.

SSH brute force attacks constantly probe for weak passwords. iptables rate limiting stops them at the network level - before they consume CPU resources or fill auth logs - without the overhead of log-parsing tools.

## Method 1: Rate Limit with hashlimit (Recommended)

The `hashlimit` module limits connections per source IP:

```bash
# Allow SSH connections at an average of 3 per minute per source IP,
# with an initial burst of 5

sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -m hashlimit \
  --hashlimit-name ssh-limit \
  --hashlimit-mode srcip \
  --hashlimit-upto 3/min \
  --hashlimit-burst 5 \
  --hashlimit-htable-expire 60000 \
  -j ACCEPT

# Drop SSH connections that exceed the limit
sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -j DROP
```

## Method 2: Recent Module (Track Recent Connections)

```bash
# Track new SSH attempts; once an IP reaches 5 attempts in 60 seconds,
# log and drop matching attempts
sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -m recent --set --name ssh_brute

sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -m recent --rcheck --seconds 60 --hitcount 5 --name ssh_brute \
  -j LOG --log-prefix "SSH-BRUTE-BLOCK: "

sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -m recent --rcheck --seconds 60 --hitcount 5 --name ssh_brute \
  -j DROP

# After this: allow legitimate connections
sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW -j ACCEPT
```

## Method 3: Simple limit Module (Global Rate)

A simpler but less precise approach - limits connections globally, not per IP:

```bash
# Allow 4 new SSH connections per minute globally
sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -m limit --limit 4/min --limit-burst 6 \
  -j ACCEPT

# Drop excess
sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -j DROP
```

## Whitelist Trusted IPs Before Applying Limits

```bash
# Always allow SSH from your known IPs BEFORE rate limiting rules
# This ensures you're never locked out

# Allow unrestricted SSH from management IP
sudo iptables -I INPUT 1 -p tcp --dport 22 \
  -s 203.0.113.10 -j ACCEPT

# Allow from office network
sudo iptables -I INPUT 2 -p tcp --dport 22 \
  -s 10.0.0.0/8 -j ACCEPT

# THEN add rate limiting rules for everyone else
sudo iptables -A INPUT -p tcp --dport 22 \
  -m state --state NEW \
  -m hashlimit ... -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -j DROP
```

## Monitor Blocked Attempts

```bash
# Check recent module table
cat /proc/net/xt_recent/ssh_brute

# Check hashlimit table
cat /proc/net/ipt_hashlimit/ssh-limit

# View logged drops on syslog-based systems
sudo grep "SSH-BRUTE" /var/log/syslog | tail -20

# Count blocked IPs on syslog-based systems
sudo grep "SSH-BRUTE-BLOCK" /var/log/syslog | grep -oP 'SRC=\S+' \
  | sort | uniq -c | sort -rn | head -10
```

## Test the Limit

```bash
# Verify limit from a test machine that can already SSH successfully with keys
for i in $(seq 1 10); do
    ssh -o BatchMode=yes -o ConnectTimeout=2 user@server true \
      && echo "attempt $i: allowed" || echo "attempt $i: blocked"
done
# First few should succeed, later ones should be blocked
```

Rate limiting SSH with iptables is a lightweight, always-on defense that stops the vast majority of automated brute force attacks without requiring external tools or log monitoring.
