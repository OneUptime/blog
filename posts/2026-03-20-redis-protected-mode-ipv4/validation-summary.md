# Validation Summary: How to Configure Redis protected-mode for IPv4 Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Open Source
- Redis configuration (`redis.conf`)
- `redis-cli`
- Redis ACLs / `requirepass`
- IPv4 binding
- Linux firewalling (`iptables`)

## Sources Consulted
- Redis security docs: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis `CONFIG GET` docs: https://redis.io/docs/latest/commands/config-get/
- Redis `INFO` docs: https://redis.io/docs/latest/commands/info/
- Redis `ACL GETUSER` docs: https://redis.io/docs/latest/commands/acl-getuser/
- Official Redis sample config (`redis.conf`): https://github.com/redis/redis/blob/unstable/redis.conf
- Official Redis source for protected-mode connection handling (`src/networking.c`): https://github.com/redis/redis/blob/unstable/src/networking.c

## Issues Found
- The post described protected mode as depending on a non-loopback bind plus no `requirepass`. Current Redis behavior checks whether `protected-mode` is enabled and whether the default user has no password, so I updated the introduction, behavior explanation, matrix wording, and conclusion to match current Redis behavior.
- The post implied `requirepass` is the only way to allow remote access while `protected-mode yes` is enabled. In current Redis, `requirepass` is one way to set a password for the default user, but ACL-based default-user passwords also satisfy the requirement, so I updated the wording to reflect that.
- The command `redis-cli info server | grep -E "protected|bind|requirepass"` was inaccurate because `INFO server` does not expose those configuration directives. I replaced it with `CONFIG GET` checks and added `ACL GETUSER default` for ACL-based setups.
- The production snippet recommended `rename-command` for hardening. Redis marks that mechanism as deprecated and recommends ACL rules instead, so I removed the deprecated example and replaced it with a note to prefer ACLs.

## Review Notes
- `requirepass` still works, but in Redis 6+ it is a compatibility layer on top of the ACL system; ACLs are the recommended authentication model for newer deployments.
- The `iptables` example is valid on systems using iptables, but some modern Linux distributions use nftables underneath or instead.
