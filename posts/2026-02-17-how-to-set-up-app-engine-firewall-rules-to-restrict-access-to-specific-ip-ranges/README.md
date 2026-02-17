# How to Set Up App Engine Firewall Rules to Restrict Access to Specific IP Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Firewall, Security, IP Restriction

Description: A practical guide to configuring App Engine firewall rules to control which IP addresses and ranges can access your application for improved security.

---

App Engine includes a built-in firewall that sits in front of your application. Every request passes through it before reaching your code. By default, the firewall allows all traffic, but you can add rules to restrict access to specific IP addresses or ranges. This is useful for locking down staging environments, restricting admin panels to office IPs, or blocking abusive traffic.

The App Engine firewall is evaluated before your application code runs, which means blocked requests never consume instance hours. This makes it an efficient first line of defense.

## How the Firewall Works

The App Engine firewall uses a priority-based rule system. Each rule has:

- A priority number (1 to 2147483646) - lower numbers are evaluated first
- A source IP range (CIDR notation)
- An action (ALLOW or DENY)

There is also a default rule at priority 2147483647 that you can set to either ALLOW or DENY. This default determines what happens to traffic that does not match any explicit rule.

When a request arrives, the firewall checks it against rules starting from the lowest priority number. The first matching rule determines whether the request is allowed or denied.

## Setting the Default Rule

The most important decision is whether your default rule should allow or deny. For most public applications, the default allows all traffic and you add DENY rules for specific bad actors:

```bash
# Default: allow all traffic (standard for public apps)
gcloud app firewall-rules update default \
  --action=ALLOW \
  --project=your-project-id
```

For internal or staging applications, flip the default to deny and explicitly allow only trusted IPs:

```bash
# Default: deny all traffic (allowlist approach)
gcloud app firewall-rules update default \
  --action=DENY \
  --project=your-project-id
```

## Creating Allow Rules

With a deny-by-default configuration, add rules for IP ranges that should have access:

```bash
# Allow traffic from your office IP range
gcloud app firewall-rules create \
  --action=ALLOW \
  --source-range="203.0.113.0/24" \
  --description="Office network" \
  --priority=100 \
  --project=your-project-id
```

```bash
# Allow traffic from your VPN exit point
gcloud app firewall-rules create \
  --action=ALLOW \
  --source-range="198.51.100.50/32" \
  --description="VPN server" \
  --priority=200 \
  --project=your-project-id
```

```bash
# Allow traffic from a partner's IP range
gcloud app firewall-rules create \
  --action=ALLOW \
  --source-range="192.0.2.0/28" \
  --description="Partner API access" \
  --priority=300 \
  --project=your-project-id
```

The `/32` suffix means a single IP address. The `/24` suffix means 256 addresses (the last octet can be anything).

## Creating Deny Rules

With an allow-by-default configuration, add deny rules to block specific sources:

```bash
# Block a known abusive IP
gcloud app firewall-rules create \
  --action=DENY \
  --source-range="198.18.0.100/32" \
  --description="Blocked - abusive scraping" \
  --priority=100 \
  --project=your-project-id
```

```bash
# Block an entire IP range associated with bot traffic
gcloud app firewall-rules create \
  --action=DENY \
  --source-range="198.18.0.0/16" \
  --description="Blocked - bot network" \
  --priority=200 \
  --project=your-project-id
```

## Listing and Managing Rules

View your current firewall rules:

```bash
# List all firewall rules sorted by priority
gcloud app firewall-rules list --project=your-project-id
```

The output looks something like this:

```
PRIORITY  ACTION  SOURCE_RANGE     DESCRIPTION
100       ALLOW   203.0.113.0/24   Office network
200       ALLOW   198.51.100.50/32 VPN server
300       ALLOW   192.0.2.0/28     Partner API access
2147483647 DENY   *                default
```

Update an existing rule:

```bash
# Update the priority of an existing rule
gcloud app firewall-rules update 100 \
  --source-range="203.0.113.0/24" \
  --action=ALLOW \
  --description="Office network - updated" \
  --project=your-project-id
```

Delete a rule:

```bash
# Remove a firewall rule by priority
gcloud app firewall-rules delete 200 --project=your-project-id
```

## Practical Scenario: Staging Environment Lockdown

A common pattern is locking down your staging environment so only your team can access it:

```bash
# Step 1: Set default to deny
gcloud app firewall-rules update default \
  --action=DENY \
  --project=staging-project-id

# Step 2: Allow your office
gcloud app firewall-rules create \
  --action=ALLOW \
  --source-range="203.0.113.0/24" \
  --description="Office" \
  --priority=100 \
  --project=staging-project-id

# Step 3: Allow your CI/CD system for health checks
gcloud app firewall-rules create \
  --action=ALLOW \
  --source-range="35.190.247.0/24" \
  --description="Cloud Build health checks" \
  --priority=200 \
  --project=staging-project-id

# Step 4: Allow Google health check IPs (needed for App Engine)
gcloud app firewall-rules create \
  --action=ALLOW \
  --source-range="0.1.0.1/32" \
  --description="App Engine health checks" \
  --priority=50 \
  --project=staging-project-id

# Step 5: Allow Cloud Tasks and Cron IPs
gcloud app firewall-rules create \
  --action=ALLOW \
  --source-range="0.1.0.2/32" \
  --description="Cloud Tasks and Cron" \
  --priority=51 \
  --project=staging-project-id
```

Important: The IP `0.1.0.1` is a special App Engine internal IP used for health check requests. If you block it, App Engine will think your instances are unhealthy and keep restarting them. The IP `0.1.0.2` is used by Cloud Tasks and App Engine cron jobs.

## Practical Scenario: Geo-Blocking

While App Engine firewall does not support country-based blocking directly, you can block IP ranges associated with specific regions. You would need to obtain the IP ranges for the regions you want to block from a database like RIPE or ARIN:

```bash
# Block specific IP ranges (example)
gcloud app firewall-rules create \
  --action=DENY \
  --source-range="45.64.0.0/12" \
  --description="Blocked region range 1" \
  --priority=500 \
  --project=your-project-id
```

For more sophisticated geo-blocking, use Cloud Armor with a load balancer in front of App Engine instead.

## Automating Firewall Updates

If you need to update firewall rules frequently (like adding developer IPs), automate it with a script:

```python
# update_firewall.py - Script to manage App Engine firewall rules
import subprocess
import json

def add_ip(ip_range, description, priority, project):
    """Add an IP range to the App Engine firewall allowlist."""
    cmd = [
        "gcloud", "app", "firewall-rules", "create",
        "--action=ALLOW",
        f"--source-range={ip_range}",
        f"--description={description}",
        f"--priority={priority}",
        f"--project={project}",
        "--format=json"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"Added: {ip_range} - {description}")
    else:
        print(f"Failed to add {ip_range}: {result.stderr}")

def list_rules(project):
    """List all current firewall rules."""
    cmd = [
        "gcloud", "app", "firewall-rules", "list",
        f"--project={project}",
        "--format=json"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

# Example usage
if __name__ == "__main__":
    PROJECT = "your-project-id"

    # Add a new developer's IP
    add_ip("192.0.2.100/32", "Developer - Alice", 150, PROJECT)

    # List current rules
    rules = list_rules(PROJECT)
    for rule in rules:
        print(f"Priority {rule['priority']}: {rule['action']} {rule['sourceRange']}")
```

## Testing Firewall Rules

After adding rules, test them without affecting production traffic. Use curl from different IP addresses or a VPN:

```bash
# Test from your allowed IP
curl -o /dev/null -s -w "%{http_code}" https://your-project.appspot.com/

# Expected: 200 (allowed)

# Test from a blocked IP (use a VPN or proxy)
curl -o /dev/null -s -w "%{http_code}" https://your-project.appspot.com/

# Expected: 403 (denied)
```

When a request is blocked by the firewall, App Engine returns a 403 Forbidden response. This happens before your application code runs, so you will not see these requests in your application logs. They do appear in the App Engine request logs in Cloud Logging with a 403 status.

## Firewall Rule Limits

Be aware of these limits:

- Maximum of 1000 firewall rules per application
- Rules apply to all services and versions within the application
- You cannot create per-service or per-version firewall rules
- IPv6 ranges are supported
- The source range must be in valid CIDR notation

If you need per-service access control, use Identity-Aware Proxy instead of the App Engine firewall.

## Firewall vs Other Security Options

The App Engine firewall is just one layer of security. Here is how it compares:

- App Engine Firewall: IP-based allow/deny, simple, no extra cost
- Identity-Aware Proxy: User identity-based access control, supports Google accounts
- Cloud Armor: Advanced WAF rules, DDoS protection, geo-blocking (requires load balancer)
- Application-level auth: Custom authentication in your code

For most applications, a combination of the App Engine firewall for IP-level restrictions and application-level authentication for user-level access control is the right approach.

## Summary

The App Engine firewall provides a simple, effective way to control who can reach your application. For internal tools and staging environments, use a deny-by-default approach with explicit allow rules for trusted IPs. For public applications, use an allow-by-default approach with deny rules for abusive sources. Remember to allow the special App Engine health check IPs (0.1.0.1 and 0.1.0.2) when using deny-by-default, and test your rules before relying on them in production.
