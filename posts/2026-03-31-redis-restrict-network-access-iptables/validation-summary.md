# Validation Summary: How to Restrict Redis Network Access with iptables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (default port 6379, `bind` directive, `redis-cli`)
- iptables (Linux packet filtering / firewall)
- netfilter-persistent / iptables-persistent (Debian/Ubuntu rule persistence)
- iptables-save / iptables service (Red Hat/CentOS rule persistence)

## Sources Consulted
- iptables man page and Netfilter documentation (https://www.netfilter.org/documentation/)
- Redis security documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- Redis configuration documentation for `bind` directive (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- Debian wiki on iptables-persistent (https://wiki.debian.org/iptables)

## Issues Found

### 1. Replica rules appended after DROP rule (rule ordering bug)
**What was wrong:** The "Allow Replica Connections" section used `iptables -A INPUT` (append) to add ACCEPT rules for replicas. Since these commands would be executed after the core rule set — which ends with a DROP rule for port 6379 — the replica ACCEPT rules would be placed after the DROP rule in the chain. iptables evaluates rules in order, so the DROP rule would match first and replica connections would be silently blocked. The rules as written would not work.

**What was changed:** Added explanation that replica rules must be placed before the DROP rule, and changed the commands to show the correct approach: remove the existing DROP rule with `iptables -D`, append the new ACCEPT rules, then re-add the DROP rule at the end of the chain.

**Why:** iptables processes rules top-to-bottom; a DROP rule that matches will prevent any subsequent ACCEPT rules from being evaluated. This is a fundamental iptables ordering requirement.

### 2. Logging rule inserted at wrong position
**What was wrong:** The logging section used `iptables -I INPUT` (insert without a position number), which inserts the LOG rule at position 1 — the very top of the INPUT chain. This would log ALL traffic to port 6379, including legitimate accepted connections, not just blocked connections. The "REDIS-BLOCKED" log prefix would be misleading since accepted traffic would also carry this prefix.

**What was changed:** Replaced the single `-I INPUT` command with the delete-and-readd approach: remove the DROP rule, append the LOG rule, then re-add the DROP rule. This ensures the LOG rule sits immediately before the DROP rule and only captures traffic that has fallen through all ACCEPT rules (i.e., traffic about to be dropped).

**Why:** The LOG target does not terminate rule processing — after logging, the packet continues through subsequent rules. A LOG rule at position 1 would log every packet to port 6379 regardless of whether it's later accepted or dropped.

## Review Notes
- All iptables flags and syntax (`-A`, `-I`, `-D`, `-s`, `-i lo`, `-p tcp`, `--dport`, `-j ACCEPT/DROP/LOG`, `--log-prefix`, `--log-level`) are correct.
- The `iptables -L INPUT -n -v` verification command and output format are accurate.
- The persistence commands for both Debian/Ubuntu (`netfilter-persistent save`) and Red Hat/CentOS (`service iptables save`, `iptables-save > /etc/sysconfig/iptables`) are correct.
- The Redis `bind 127.0.0.1 10.0.1.20` directive syntax is correct.
- The defense-in-depth recommendation combining `bind` with iptables is sound security advice.
- The post correctly notes that Redis default port is 6379.
- The claim that Redis has no built-in IP allowlist beyond `bind` is accurate — Redis ACLs (available since Redis 6) provide user/command-level access control but not IP-based filtering.
