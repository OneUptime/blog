# How to Create Custom fapolicyd Trust Rules on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, fapolicyd, Security, Application Whitelisting, Trust Rules

Description: Learn how to create custom fapolicyd trust rules to allow specific third-party or in-house applications to run on RHEL while maintaining application whitelisting.

---

When fapolicyd is enforcing application whitelisting, any binary not in the trust database will be blocked. This guide shows how to add custom trust rules for applications that are not installed through RPM.

## Understanding Trust Sources

fapolicyd uses multiple trust sources. RPM-installed packages are trusted by default. For custom software, you need to add explicit trust entries.

```bash
# Check current trust sources
cat /etc/fapolicyd/fapolicyd.trust

# View the compiled rules
sudo fapolicyd-cli --list
```

## Adding a File to the Trust Database

The simplest method is to add individual files to the file trust list.

```bash
# Add a specific binary to the trust database
sudo fapolicyd-cli --file add /opt/myapp/bin/myapp

# You can also add entire directories
sudo fapolicyd-cli --file add /opt/myapp/

# After adding files, update the database
sudo fapolicyd-cli --update
```

## Creating Custom Trust Rules via fapolicyd.trust

For persistent rules, add entries to the trust file directly.

```bash
# Add a custom application to the trust file
# Format: full_path size sha256_hash
# First, get the file details
sha256sum /opt/custom-tool/bin/tool
stat --format=%s /opt/custom-tool/bin/tool

# Add the entry manually
echo "/opt/custom-tool/bin/tool $(stat --format=%s /opt/custom-tool/bin/tool) $(sha256sum /opt/custom-tool/bin/tool | awk '{print $1}')" | sudo tee -a /etc/fapolicyd/fapolicyd.trust
```

## Writing Custom Rules in fapolicyd.rules

For more flexible control, write rules in `/etc/fapolicyd/rules.d/`.

```bash
# Create a custom rule file
sudo tee /etc/fapolicyd/rules.d/90-custom.rules << 'RULES'
# Allow all executables in /opt/mycompany/
allow perm=execute all : dir=/opt/mycompany/ trust=0

# Allow a specific binary by SHA256
allow perm=execute sha256hash=abc123... : path=/usr/local/bin/mytool
RULES

# Restart fapolicyd to load the new rules
sudo systemctl restart fapolicyd
```

## Verifying Your Rules

```bash
# Test if a specific file is allowed
sudo fapolicyd-cli --check-path /opt/myapp/bin/myapp

# Watch the logs for allow/deny decisions
sudo journalctl -u fapolicyd -f
```

Always test custom rules in permissive mode first, then switch to enforcement after verifying that all required applications are properly whitelisted.
