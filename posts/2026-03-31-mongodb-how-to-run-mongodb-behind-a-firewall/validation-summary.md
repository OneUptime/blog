# Validation Summary: How to Run MongoDB Behind a Firewall

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (mongod, mongos, replica sets, sharded clusters)
- iptables (Linux packet filtering)
- UFW (Uncomplicated Firewall for Ubuntu)
- netcat (nc) for connectivity testing

## Sources Consulted
- MongoDB documentation on default ports: https://www.mongodb.com/docs/manual/reference/default-mongodb-port/
- MongoDB documentation on firewalls: https://www.mongodb.com/docs/manual/core/security-hardening/
- iptables man page and documentation for `-m state`, `-A INPUT`, `-p tcp`, `--dport`, `-s`, `-j` flags
- UFW documentation for `ufw allow from`, `ufw default deny incoming`
- netcat (nc) man page for `-z`, `-v`, `-w` flags

## Issues Found
No technical issues found.

## Review Notes
- The `-m state --state` iptables module is technically superseded by `-m conntrack --ctstate` in modern kernels, but `-m state` remains fully functional and widely used. Not an error, but worth noting for future updates.
- The replica set section mentions "Each member needs both inbound and outbound rules" but only shows INPUT (inbound) rules. This is acceptable because the default iptables OUTPUT policy is ACCEPT, so outbound traffic is permitted without explicit rules. In a fully hardened environment where OUTPUT is set to DROP, additional outbound rules would be needed — but that is beyond the scope of this guide.
- The post does not mention MongoDB's `bindIp` configuration setting, which is a complementary security measure. This is not an error since the post is focused specifically on firewall rules, but readers may benefit from knowing about it.
