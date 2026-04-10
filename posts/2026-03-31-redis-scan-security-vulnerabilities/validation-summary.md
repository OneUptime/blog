# Validation Summary: How to Scan Redis for Security Vulnerabilities

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (server and CLI)
- nmap (NSE scripts: redis-info, redis-brute)
- redis-audit (Ruby-based key analysis tool)
- Python redis-py library
- CVE vulnerability tracking

## Sources Consulted
- nmap NSE script source for `redis-info.nse` (verified no `noauth` script argument exists; confirmed `redis-brute` is a valid NSE script)
- GitHub API for `dstotijn/redis-flaw-check` (confirmed repo does not exist — returns 404)
- GitHub `snmaynard/redis-audit` README (verified correct installation and CLI syntax)
- CVE-2022-35977 advisory (confirmed it is an integer overflow via SETRANGE/SORT, fixed in Redis 6.2.8 and 7.0.7, not related to LMPOP)
- CVE-2023-25155 advisory (confirmed integer overflow in SRANDMEMBER/ZRANDMEMBER/HRANDFIELD, fixed in Redis 7.0.9)
- CVE-2021-32675 advisory (confirmed denial of service via crafted RESP requests, fixed in Redis 5.0.14)
- Redis official documentation for CONFIG GET, CLIENT LIST, INFO commands

## Issues Found

1. **Fabricated tool: `redis-flaw-check`** — The GitHub repository `dstotijn/redis-flaw-check` does not exist (404). The user dstotijn has no Redis-related projects. Removed the entire section referencing this non-existent tool.

2. **Incorrect `redis-audit` installation and CLI syntax** — The post claimed `gem install redis-audit` and used `--host`/`--port`/`--password` flags. The actual tool is a Ruby script from a cloned GitHub repo (`snmaynard/redis-audit`), installed via `bundle install`, and run as `ruby redis-audit.rb` with `-h`, `-p`, `-a` flags. Fixed to show correct installation and usage.

3. **Fabricated nmap script argument** — The command `nmap --script redis-info --script-args redis-info.noauth=true` uses a non-existent script argument. The `redis-info` NSE script defines no `@args` and silently ignores unknown arguments. Replaced with `nmap --script redis-brute`, a real NSE script that brute-forces weak Redis passwords.

4. **Incorrect CVE-2022-35977 description and version** — The post described it as "(LMPOP crash)" affecting Redis < 6.2.9. The actual vulnerability is an integer overflow triggered by specially crafted SETRANGE and SORT/SORT_RO commands, fixed in Redis 6.2.8 (not 6.2.9). LMPOP is a Redis 7.0 command and is unrelated. Fixed both the description and version number.

5. **Unused `import socket`** — The Python audit script imported `socket` but never used it. Removed the unused import.

## Review Notes
- The Python audit script has a logic gap: if authentication IS required (AuthenticationError is caught) but no password argument is provided, subsequent `config_get` calls will fail. This is acceptable for a demonstration script but could confuse readers who try to run it without a password against an auth-protected instance.
- The CVE search URL `https://www.cve.org/CVESearch?keyword=redis` may not resolve to the exact search results page — the cve.org site search interface may use a different URL format. The NVD search at `https://nvd.nist.gov/` is a more reliable alternative for CVE lookups.
- The post correctly identifies the key security concerns (unauthenticated access, bind to all interfaces, disabled protected mode, TLS, dangerous commands) that are actively exploited in real-world attacks.
