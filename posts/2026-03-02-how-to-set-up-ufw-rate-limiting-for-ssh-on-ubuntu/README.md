# How to Set Up UFW Rate Limiting for SSH on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, SSH, Security, Brute Force Protection

Description: Configure UFW rate limiting for SSH on Ubuntu to automatically block IP addresses making too many connection attempts, protecting against brute-force attacks.

---

SSH brute-force attacks are a constant reality for any server with port 22 exposed to the internet. Attackers run automated tools that try thousands of username/password combinations per hour. Even with key-based authentication (which everyone should use), these failed attempts clutter logs and waste server resources.

UFW has a built-in rate limiting feature specifically designed for this scenario. It uses iptables' `hashlimit` module to track connection attempts per source IP and automatically block IPs that exceed a threshold.

## How UFW Rate Limiting Works

UFW's `limit` action blocks source IPs that make more than 6 connections in a 30-second window. This is a fixed threshold - UFW doesn't provide a way to customize the numbers through its command interface (for that, you'd modify iptables directly or use fail2ban).

When an IP is blocked by rate limiting:
- New connection attempts from that IP are silently dropped
- Existing connections from that IP continue working
- The block expires after some time

This is effective against brute-force attacks because it slows them down dramatically while not affecting legitimate users who rarely make more than a few connections in 30 seconds.

## Enabling Rate Limiting for SSH

```bash
# Check UFW is enabled
sudo ufw status

# Enable rate limiting for SSH (port 22)
sudo ufw limit ssh

# Or by port number if SSH is on a custom port
sudo ufw limit 2222/tcp
```

After running this command, check the rules:

```bash
sudo ufw status verbose
```

You'll see the SSH rule change from `ALLOW` to `LIMIT`:

```
To                         Action      From
--                         ------      ----
22/tcp                     LIMIT IN    Anywhere
22/tcp (v6)                LIMIT IN    Anywhere (v6)
```

## What Happens to the Old Allow Rule

If you had a plain `allow ssh` rule before adding `limit ssh`, you now have both rules. The limit rule supersedes the allow rule, but having both is redundant and confusing:

```bash
# Check for duplicate rules
sudo ufw status numbered
```

```
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 22/tcp                     LIMIT IN    Anywhere
```

Delete the old allow rule:

```bash
# Delete by number (the ALLOW rule)
sudo ufw delete 1
```

Then verify only the limit rule remains:

```bash
sudo ufw status numbered
```

## Testing Rate Limiting

To verify rate limiting is working, you can simulate multiple connection attempts:

```bash
# From another machine, attempt multiple rapid connections
# This script makes 10 SSH connections in rapid succession
for i in {1..10}; do
    ssh -o ConnectTimeout=2 -o PasswordAuthentication=no user@server-ip 2>&1 | head -1
    sleep 0.5
done
```

After the 6th connection within 30 seconds, subsequent attempts will time out or be dropped.

Check UFW logs to see the rate limiting in action:

```bash
# Watch for BLOCK entries
sudo tail -f /var/log/ufw.log

# Filter for rate limit blocks
sudo grep "LIMIT BLOCK" /var/log/ufw.log | tail -20
```

Rate limit blocks appear as:

```
[UFW LIMIT BLOCK] IN=eth0 OUT= SRC=203.0.113.100 DST=192.168.1.10 ... DPT=22
```

## Combining Rate Limiting with IP Allowlisting

For production servers, combine rate limiting with IP allowlisting for even stronger protection:

```bash
# First, allow SSH from trusted IPs without rate limiting
sudo ufw allow from 192.168.1.10 to any port 22 proto tcp  # Admin workstation
sudo ufw allow from 10.100.0.5 to any port 22 proto tcp    # Jump server

# Then, rate limit SSH for everyone else
sudo ufw limit 22/tcp

# View the resulting rules
sudo ufw status numbered
```

The rule order matters here. UFW checks rules top to bottom. Trusted IPs match the allow rule first and bypass rate limiting. Unknown IPs fall through to the rate limit rule.

```
[ 1] 22/tcp                     ALLOW IN    192.168.1.10
[ 2] 22/tcp                     ALLOW IN    10.100.0.5
[ 3] 22/tcp                     LIMIT IN    Anywhere
```

## Adjusting Rate Limit Parameters

UFW's built-in limit is fixed at 6 connections per 30 seconds. For more granular control, you can modify the iptables rules that UFW generates.

After running `sudo ufw limit ssh`, UFW creates rules in `/etc/ufw/user.rules`. You can see the raw iptables implementation:

```bash
# View the generated rules
sudo cat /etc/ufw/user.rules | grep -A 5 "22"
```

For custom thresholds, use the iptables `hashlimit` module directly through `/etc/ufw/before.rules`:

```bash
sudo nano /etc/ufw/before.rules
```

Add before the `COMMIT` line:

```
# Custom SSH rate limiting - more restrictive than UFW default
# Block IPs making more than 3 connection attempts in 60 seconds
-A ufw-before-input -p tcp --dport 22 -m state --state NEW \
    -m hashlimit \
    --hashlimit-name ssh-rate-limit \
    --hashlimit-above 3/minute \
    --hashlimit-burst 3 \
    --hashlimit-mode srcip \
    --hashlimit-htable-expire 60000 \
    -j DROP
```

```bash
sudo ufw reload
```

This approach requires removing the `ufw limit ssh` rule to avoid conflicts.

## Comparing UFW Rate Limiting with fail2ban

UFW's built-in rate limiting is simple and requires no additional software, but it has limitations:

| Feature | UFW Rate Limit | fail2ban |
|---------|---------------|----------|
| Configuration | Fixed (6 per 30s) | Fully customizable |
| Persistent bans | No | Yes (configurable duration) |
| Log-based detection | No | Yes |
| Email notifications | No | Yes |
| Multiple services | SSH only via `limit` | Any log-based service |
| Jail duration | Expires automatically | Configurable (hours/days) |

For a server where SSH is a major concern, combining both is effective: UFW rate limiting provides immediate protection at the packet level, while fail2ban provides longer-duration bans based on log analysis.

See the fail2ban configuration guide at https://oneuptime.com/blog/post/2026-03-02-how-to-configure-fail2ban-with-ufw-on-ubuntu/view for details on the combined setup.

## Monitoring Rate Limiting Effectiveness

Track how often rate limiting is blocking connections:

```bash
# Count blocks per source IP over the past day
sudo grep "LIMIT BLOCK" /var/log/ufw.log \
    | grep "$(date +%b %e)" \
    | awk '{for(i=1;i<=NF;i++) if($i~/^SRC=/) print $i}' \
    | sort | uniq -c | sort -rn \
    | head -20
```

This shows which IPs are being rate-limited most frequently. Persistent offenders might warrant adding to a permanent block list:

```bash
# Permanently block a persistent attacker
sudo ufw insert 1 deny from 203.0.113.100

# Verify the block
sudo ufw status numbered | head -5
```

## Handling Cloud Environments

In cloud environments (AWS, GCP, Azure), the cloud provider's security groups or firewall rules often take effect before UFW sees the traffic. In those environments:

- Use the cloud provider's security groups as the primary firewall (only allow port 22 from known IPs)
- Use UFW as a secondary layer for rate limiting and more granular control
- Consider using a bastion/jump host approach where only the bastion has port 22 open publicly

```bash
# If using a cloud provider security group that already restricts SSH sources,
# UFW rate limiting still helps as a defense-in-depth measure
sudo ufw limit 22/tcp
```

## Checking if Rate Limiting is Active

Confirm rate limiting is actually running in the kernel:

```bash
# Check the iptables rules directly
sudo iptables -L ufw-user-input -n -v | grep -A 3 "22"

# Look for the hashlimit or recent modules
sudo iptables -L -n | grep "dpt:22" | head -10
```

The underlying iptables rules will show `LIMIT` targets and `recent` module rules that implement the rate limiting.

UFW rate limiting is a low-effort, high-value security measure that should be enabled on any SSH port exposed to untrusted networks. It's not a substitute for key-based authentication and strong access controls, but it effectively blunts automated brute-force campaigns that target every reachable SSH port on the internet.
