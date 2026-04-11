# Validation Summary: How to Set Up Redis Behind a Firewall

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- Redis (server configuration, `redis.conf`)
- UFW (Uncomplicated Firewall) on Ubuntu/Debian
- iptables (Linux packet filtering)
- Cloud security groups (AWS, Azure, GCP)
- Redis TLS (port 6380 convention)

## Sources Consulted
- Redis official documentation on `protected-mode`: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis `bind` directive documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- UFW man page and rule evaluation order (rules evaluated top-to-bottom, first match wins)
- iptables man page (`-A` appends, `-I` inserts at top of chain)
- Linux `iptables-save` documentation (shell redirect vs root privilege interaction)

## Issues Found

### 1. Contradictory comment on `protected-mode` setting
- **What was wrong:** The comment said "Disable protected mode" but the config value was `protected-mode yes`, which enables it.
- **What was changed:** Updated the comment to "Keep protected mode enabled for an extra safeguard" to accurately describe the setting.
- **Why:** The comment contradicted the actual configuration value, which could confuse readers into thinking protected mode was being disabled.

### 2. UFW rule ordering bug (would block all Redis traffic)
- **What was wrong:** `sudo ufw deny 6379` was added before the `allow` rules. UFW evaluates rules in the order they are added (top-to-bottom, first match wins), so the deny-all rule at position #1 would match all traffic to port 6379 before the allow rules were ever evaluated. The allow rules would have no effect.
- **What was changed:** Moved the `allow` rules before the `deny` rule so specific IPs are permitted before the catch-all deny fires.
- **Why:** With the original ordering, no application server could connect to Redis through UFW, defeating the purpose of the configuration.

### 3. Missing `sudo` on iptables commands
- **What was wrong:** The `iptables` commands (`-A INPUT`, `-I INPUT`) were written without `sudo`, but iptables requires root privileges to modify packet filter rules.
- **What was changed:** Added `sudo` prefix to all `iptables` commands.
- **Why:** Without `sudo`, the commands would fail with "Permission denied" for non-root users.

### 4. Broken `iptables-save` redirect
- **What was wrong:** `sudo iptables-save > /etc/iptables/rules.v4` — the `>` redirect is executed by the current shell (not root), so writing to `/etc/iptables/rules.v4` would fail with "Permission denied" even though `iptables-save` itself runs as root.
- **What was changed:** Changed to `sudo sh -c 'iptables-save > /etc/iptables/rules.v4'` so the redirect also runs as root.
- **Why:** This is a common pitfall with sudo and shell redirects. The original command would fail silently or with an error.

## Review Notes
- The iptables section correctly uses `-I` (insert at position 1) for ACCEPT rules and `-A` (append) for the DROP rule, resulting in the correct final chain order: ACCEPT rules first, DROP last. This is correct but potentially confusing to readers since the DROP command appears first in the script. The code is functional as-is.
- Port 6380 for Redis TLS is a common convention but not an official standard. Redis TLS can be configured on any port via the `tls-port` directive. The post correctly frames this with "if using encrypted connections."
- The cloud security groups section uses pseudocode notation rather than actual CLI commands, which is appropriate given the variety of cloud platforms.
