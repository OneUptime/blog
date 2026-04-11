# Validation Summary: How to Harden Redis for Internet-Facing Deployments

## Status
validated

## Post Type
Guide / Security Hardening Checklist

## Technologies Covered
- Redis (6+ with ACL support, 6+ with TLS support)
- TLS / mTLS
- Redis ACL system
- UFW (Uncomplicated Firewall)
- redis-cli

## Sources Consulted
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis 7.2 redis.conf reference (GitHub): https://github.com/redis/redis/blob/7.2/redis.conf
- OpenSSL TLS 1.2 vs 1.3 cipher suite naming conventions

## Issues Found

### 1. TLS 1.3 cipher suites placed in wrong directive (Step 1)
**What was wrong:** The `tls-ciphers` directive was set to `"TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256"`. These are TLS 1.3 cipher suite names, but `tls-ciphers` only applies to TLS 1.2 and below. TLS 1.3 suites must use the separate `tls-ciphersuites` directive. With this misconfiguration, TLS 1.3 would use default cipher suites (ignoring the intended restriction) and TLS 1.2 connections could fail because OpenSSL would not recognize these names as valid TLS 1.2 ciphers.

**What was changed:** Split into two directives — `tls-ciphers` with proper TLS 1.2 cipher names (`ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384`) and `tls-ciphersuites` with the original TLS 1.3 suite names.

### 2. Invalid shell substitution for Redis command (Step 3)
**What was wrong:** `ACL SETUSER appuser on >$(ACL GENPASS) ...` used shell command substitution syntax `$(...)` around `ACL GENPASS`, but `ACL GENPASS` is a Redis command, not a shell command. This would result in a shell error, not a generated password.

**What was changed:** Replaced with a two-step approach: comments showing to first run `ACL GENPASS 256` in redis-cli, then use the output as a placeholder (`GENERATED_PASSWORD_HERE`) in the `ACL SETUSER` command.

### 3. Verification commands missing mTLS credentials and using disabled port (Step 10)
**What was wrong:** The first `redis-cli` command used `--cacert` but omitted `--cert` and `--key`, which are required when `tls-auth-clients yes` (mTLS) is enabled. The second and third commands connected to port 6379 (the default), which was disabled in Step 1 (`port 0`). The third command's error comment claimed "WRONGPASS" but the actual failure would be a connection refusal (port disabled) or an mTLS handshake failure.

**What was changed:** Added `--cert client.crt --key client.key` to the successful connection commands. Changed the failure verification to demonstrate two failure modes: connecting without a client certificate (mTLS rejection) and connecting on the disabled non-TLS port.

## Review Notes
- The post uses `rename-command` in Step 5 as an alternative to ACL-based command restriction. While `rename-command` still works, Redis documentation recommends using ACLs (available since Redis 6) as the preferred approach. The post already shows the ACL approach first, so this is acceptable.
- Step 5 removes commands from the `default` user that was already fully disabled in Step 2. This is logically redundant but not technically incorrect — it could serve as a defense-in-depth example if the default user is later re-enabled. The post could be clearer about this being an alternative approach.
- The `ACL GENPASS 256` command in Step 3 explicitly requests 256 bits, which is the default. Not wrong, but redundant.
