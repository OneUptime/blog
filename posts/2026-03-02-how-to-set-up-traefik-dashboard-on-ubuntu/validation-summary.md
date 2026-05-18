# Validation Summary: How to Set Up Traefik Dashboard on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Traefik (v2/v3) reverse proxy
- Ubuntu (systemd, apt)
- Traefik static and dynamic (file provider) YAML configuration
- Traefik API and dashboard
- Traefik middlewares: basicAuth, digestAuth, forwardAuth, rateLimit, ipAllowList
- Let's Encrypt / ACME (TLS challenge)
- Apache `htpasswd` and `htdigest` utilities (bcrypt)
- Prometheus metrics integration
- `curl` for API access

## Sources Consulted
- Traefik v3 basicAuth middleware docs: https://doc.traefik.io/traefik/v3.1/middlewares/http/basicauth/
- Traefik v3 digestAuth middleware docs: https://doc.traefik.io/traefik/v3.1/middlewares/http/digestauth/
- Traefik v3 static configuration / CLI reference: https://doc.traefik.io/traefik/v3.1/reference/static-configuration/cli/
- Traefik API & dashboard docs (general knowledge of `api@internal`, `prometheus@internal`, `/api/http/routers`, `/api/http/services`, `/api/version`, `/api/rawdata` endpoints)
- Apache HTTP Server `htpasswd` / `htdigest` man pages (for `-n`, `-B`, `-c` flags)

## Issues Found
1. **Incorrect claim that `$` must be doubled to `$$` in YAML File provider config.** The post repeatedly asserted that password hashes must use `$$` in YAML files loaded by Traefik's file provider, and supplied a `sed` command to escape them. Per the official docs, `$$` doubling is required **only** for Docker Compose files and Docker labels (where Docker performs its own variable expansion); the Traefik file provider does not perform `$` substitution. Fixed by:
   - Rewriting the explanatory paragraph and removing the `sed` escaping command.
   - Changing the YAML example hashes from `admin:$$2y$$12$$examplehash...` to `admin:$2y$12$examplehash...` in both the basic auth and IP allowlist sections.
   - Rewriting the related troubleshooting note so it clarifies that the `$$` rule applies only to Docker labels / Compose, not file-provider YAML.

2. **Non-existent `traefik --dry-run` flag.** The post recommended `traefik --configFile=/etc/traefik/traefik.yml --dry-run` to validate the config. Traefik has no `--dry-run` flag — there is no built-in static-config validation command; the conventional approach is to restart and inspect logs. Fixed by removing the bogus validation command.

3. **`systemctl reload traefik` is unreliable.** Most Traefik systemd units do not implement reload (only restart), and static configuration changes require a full process restart. Dynamic file-provider changes are picked up automatically when `watch: true` is set. Changed to `sudo systemctl restart traefik` and added a clarifying comment that dynamic config in `conf.d/` is auto-reloaded.

## Review Notes
- All other configuration field names verified as correct for Traefik v3: `api.dashboard`, `api.insecure`, `entryPoints`, `certificatesResolvers.<name>.acme.tlsChallenge`, `providers.file.directory`, `service: api@internal`, `service: prometheus@internal`, `basicAuth.users`, `basicAuth.realm`, `digestAuth.users/realm/removeHeader`, `forwardAuth.address/trustForwardHeader/authResponseHeaders`, `rateLimit.average/burst`, `ipAllowList.sourceRange`, `metrics.prometheus.buckets/addEntryPointsLabels/addServicesLabels/entryPoint`.
- `ipAllowList` is the correct v3 name (replaced the older v2 `ipWhiteList`). The post uses the modern name throughout.
- Dashboard URL behavior is accurate: the trailing slash `/dashboard/` is required, and the router rule must include both `/api` and `/dashboard` path prefixes.
- API endpoint paths used in the `curl` examples (`/api/http/routers`, `/api/http/services`, `/api/version`, `/api/rawdata`) are all valid Traefik API routes.
- IP ranges used in examples are appropriate: `10.0.0.0/8` and `192.168.0.0/16` are RFC1918 private ranges; `203.0.113.0/24` is TEST-NET-3 (RFC5737) for documentation.
- The htpasswd `-n` (stdout, no file write) and `-B` (bcrypt) flags and the htdigest `-c` (create file) flag are accurate.
- The statement that digest auth "does not send the password in base64 encoding" is accurate — digest auth uses a hash-based challenge/response (MD5 by default in the Apache htdigest format) rather than basic auth's base64-encoded credentials.
