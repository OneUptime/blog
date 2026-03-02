# How to Check Your Ubuntu Pro Subscription Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ubuntu Pro, Subscription, Security

Description: How to check Ubuntu Pro subscription status, view entitled services, monitor contract expiration, and diagnose common status issues on Ubuntu Server.

---

After attaching an Ubuntu Pro subscription, you need ways to verify the attachment is working correctly, check which services are enabled, and monitor the subscription expiration. The `pro` command-line tool provides all of this.

## Basic Status Check

```bash
# Show the current Pro status
pro status

# Equivalent command (both are the same tool)
ua status
```

A fully attached system shows output like:

```
SERVICE          ENTITLED  STATUS    DESCRIPTION
anbox-cloud      yes       disabled  Scalable Android in the cloud
cc-eal           yes       disabled  Common Criteria EAL2 Provisioning Packages
cis              yes       disabled  Security compliance and hardening tooling
esm-apps         yes       enabled   Expanded Security Maintenance for Applications
esm-infra        yes       enabled   Expanded Security Maintenance for Infrastructure
fips             yes       disabled  NIST-certified core packages
fips-updates     yes       disabled  NIST-certified core packages with priority security updates
livepatch        yes       enabled   Canonical Livepatch service
realtime-kernel  yes       disabled  Ubuntu kernel with PREEMPT_RT patches integrated
usg              yes       disabled  Security compliance and hardening tooling

NOTICES
- Your package manager does not support the "apt-news" feature.

Enable services with: pro enable <service>

     Account: user@example.com
Subscription: Ubuntu Pro - free personal subscription
       Valid until: 9999-12-31 00:00:00+00:00
       Technical support level: essential
```

## Checking Subscription Details

```bash
# Show all services including those not in your subscription
pro status --all

# Show in machine-parseable JSON format
pro status --format json

# Pretty-print JSON output
pro status --format json | python3 -m json.tool
```

The JSON format is useful for scripts:

```bash
# Extract subscription expiry date
pro status --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
expires = data.get('expires', 'unknown')
account = data.get('account', {}).get('name', 'unknown')
subscription = data.get('subscription', {}).get('name', 'unknown')
print(f'Account: {account}')
print(f'Subscription: {subscription}')
print(f'Expires: {expires}')
"
```

## Checking Account Information

```bash
# Show attached account details
pro accounts

# Output includes:
# - Account name
# - Subscription type
# - Expiration date
# - Contact information
```

## Verifying Each Service Status

```bash
# Check individual service details
pro status | grep -E "SERVICE|esm|livepatch"

# Check a specific service
pro status | grep livepatch
```

### Checking Livepatch Specifically

```bash
# Livepatch has its own status command with more detail
sudo canonical-livepatch status

# Verbose output shows applied patches and pending ones
sudo canonical-livepatch status --verbose

# JSON output for scripting
sudo canonical-livepatch status --format json
```

### Checking ESM Update Availability

```bash
# See what ESM updates are available
pro security-status

# Check for CVE coverage
pro security-status --esm-apps
pro security-status --esm-infra
```

## Checking the Contract Expiration Date

```bash
# Get the full status with dates
pro status --format json | python3 -c "
import json, sys
from datetime import datetime, timezone
data = json.load(sys.stdin)
expires_str = data.get('expires', '')
if expires_str:
    expires = datetime.fromisoformat(expires_str.replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    days_left = (expires - now).days
    print(f'Subscription expires: {expires_str}')
    print(f'Days remaining: {days_left}')
else:
    print('No expiration date found')
"
```

For free personal subscriptions, the expiration is typically set far in the future (9999-12-31). Paid subscriptions have annual renewal dates.

## Checking for Subscription Issues

```bash
# Run diagnostics on the Pro attachment
pro diagnose

# Check the systemd service status
systemctl status ubuntu-advantage

# View recent Pro logs
sudo journalctl -u ubuntu-advantage -n 50

# Check if Pro can reach Canonical's servers
pro status --debug 2>&1 | grep -E "contract|network|error"
```

## Status When Not Attached

An unattached system shows:

```
SERVICE         AVAILABLE  DESCRIPTION
anbox-cloud     yes        Scalable Android in the cloud
cc-eal          no         Common Criteria EAL2 Provisioning Packages
...

This machine is not attached to an Ubuntu Pro subscription.
See https://ubuntu.com/pro
```

## Automating Status Checks

For environments where you monitor multiple servers, automate the status check:

```bash
#!/bin/bash
# check-pro-status.sh
# Run on each server to summarize Pro status

HOSTNAME=$(hostname -f)
PRO_STATUS=$(pro status --format json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "$HOSTNAME: ERROR - Failed to get Pro status"
    exit 1
fi

ATTACHED=$(echo "$PRO_STATUS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('attached', False))")
EXPIRES=$(echo "$PRO_STATUS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('expires', 'unknown'))")
ESM_APPS=$(echo "$PRO_STATUS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
services = {s['name']: s['status'] for s in d.get('services', [])}
print(services.get('esm-apps', 'not-found'))
")
ESM_INFRA=$(echo "$PRO_STATUS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
services = {s['name']: s['status'] for s in d.get('services', [])}
print(services.get('esm-infra', 'not-found'))
")

echo "Host: $HOSTNAME"
echo "  Attached: $ATTACHED"
echo "  Expires: $EXPIRES"
echo "  ESM-Apps: $ESM_APPS"
echo "  ESM-Infra: $ESM_INFRA"
```

Run across multiple hosts:

```bash
for host in server1 server2 server3; do
    ssh "$host" "bash /path/to/check-pro-status.sh"
done
```

## Interpreting Service Status Values

Each service shows one of several status values:

- **enabled**: The service is active and providing its benefits
- **disabled**: The service is entitled (included in your subscription) but not currently active
- **n/a**: The service is not applicable to this Ubuntu version or architecture
- **warning**: The service is enabled but has an issue (check logs)
- **error**: The service failed to enable or maintain itself

For "warning" or "error" states:

```bash
# Check Pro service logs for details
sudo journalctl -u ubuntu-advantage

# Check specific service logs
sudo journalctl -u snap.canonical-livepatch.canonical-livepatch.service

# Attempt to re-enable a service that is in error state
sudo pro disable livepatch && sudo pro enable livepatch
```

## Checking Token Validity

```bash
# Verify the token is still valid (requires network access)
sudo pro refresh

# This refreshes the contract data from Canonical's servers
# Useful if the status seems stale or incorrect

# Check what the refresh retrieved
pro status
```

## Pro Status in cloud-init Contexts

When deploying via cloud-init, verify Pro attached correctly:

```bash
# Check cloud-init logs for Pro-related output
sudo grep -i "ubuntu_advantage\|ubuntu-advantage\|pro attach" /var/log/cloud-init.log

# Check cloud-init status
cloud-init status --long

# View cloud-init final module output
sudo cloud-init single --name final
```

## Setting Up Expiration Alerts

For paid subscriptions, set up a reminder before expiration:

```bash
#!/bin/bash
# add this to crontab

EXPIRES=$(pro status --format json | python3 -c "
import json, sys
from datetime import datetime, timezone
d = json.load(sys.stdin)
e = d.get('expires', '')
if e and '9999' not in e:
    exp = datetime.fromisoformat(e.replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    print((exp - now).days)
else:
    print(-1)
")

if [ "$EXPIRES" -gt 0 ] && [ "$EXPIRES" -lt 30 ]; then
    echo "Ubuntu Pro subscription expires in $EXPIRES days on $(hostname)" | \
        mail -s "Ubuntu Pro Expiration Warning" admin@example.com
fi
```

```bash
# Add to crontab
crontab -e
```

```
# Check Pro expiration daily at 9 AM
0 9 * * * /usr/local/bin/check-pro-expiry.sh
```

Keeping close track of Pro subscription status is straightforward with the `pro` tool. The combination of status checks, JSON output for automation, and service-level diagnostics gives you full visibility into what your servers are receiving from the subscription.
