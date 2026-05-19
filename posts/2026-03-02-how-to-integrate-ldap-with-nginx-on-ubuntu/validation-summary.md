# Validation Summary: How to Integrate LDAP with Nginx on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (auth_request, ngx_http_auth_pam_module via nginx-extras)
- LDAP (OpenLDAP / 389 Directory Server)
- nginx-ldap-auth-daemon (Python daemon from nginxinc)
- PAM with libpam-ldapd / nslcd / libnss-ldapd
- Vouch-Proxy (OAuth2/OIDC reverse proxy)
- Keycloak (OIDC provider, referenced)
- systemd, Ubuntu 22.04+

## Sources Consulted
- nginxinc/nginx-ldap-auth GitHub repository: https://github.com/nginxinc/nginx-ldap-auth (default branch confirmed as `master`, daemon file present)
- vouch/vouch-proxy GitHub repository: https://github.com/vouch/vouch-proxy (releases API, tags, README)
- vouch/vouch-proxy nginx example: examples/nginx/single-file/nginx_with_vouch.conf (canonical auth_request_set names and redirect query parameters)
- Vouch-Proxy README on installation methods (container image at quay.io/vouch/vouch-proxy; no prebuilt binary releases on GitHub)
- Nginx documentation for `auth_request`, `auth_request_set`, `internal` directives (context: `internal` is only valid inside a `location` block, not at server level)
- Debian/Ubuntu packaging for `libpam-ldapd`, `libnss-ldapd`, `nslcd`, `nginx-extras`

## Issues Found
1. **Broken `raw.githubusercontent.com` URL.** The post pointed at the `main` branch of `nginxinc/nginx-ldap-auth`, but the repo's default branch is `master` and the file does not exist at `main`. Updated the curl URL to use `master`.
2. **Invalid first `server` block in Approach 1.** The block listened on port 8888 — the same port the daemon listens on (port conflict / cannot bind), placed `internal;` at server level (the `internal` directive is only valid inside a `location` block), and proxied to itself, creating a self-referential loop. The block served no purpose because the main server's `location /auth { ... }` already proxies the subrequest directly to the daemon at `127.0.0.1:8888`. Removed the broken block and added a one-line comment clarifying the daemon listens on 8888 directly.
3. **Non-existent Vouch-Proxy binary download.** Vouch-Proxy has no GitHub release assets — the `releases/download/v0.40.0/vouch-proxy-linux-amd64.gz` URL returns 404 (and so does the equivalent URL for the latest tag, v0.47.2). The project ships container images at `quay.io/vouch/vouch-proxy` and supports building from source via `./do.sh build`; there is no prebuilt binary archive. Replaced the wget/gunzip steps with a `docker pull quay.io/vouch/vouch-proxy:latest`.
4. **Undefined nginx variables in the Vouch redirect.** The `error_page 401` redirect referenced `$auth_resp_x_vouch_failcount`, `$auth_resp_x_vouch_jwt`, and `$auth_resp_err`, but none of these variables were created via `auth_request_set`, so they would always be empty in the rendered URL. Added the three `auth_request_set` directives that map upstream Vouch headers into nginx variables and renamed the variables in the redirect to match the names used in the official Vouch nginx example (`$auth_resp_failcount`, `$auth_resp_jwt`, `$auth_resp_err`).

## Review Notes
- The Keycloak OIDC endpoint URLs (`/auth/realms/myrealm/...`) use the legacy path prefix that Keycloak removed as a default in version 17+ (2022). Modern Quarkus-based Keycloak servers expose `/realms/myrealm/...` unless explicitly configured with `--http-relative-path=/auth`. This is version-dependent and was left as-is; readers on Keycloak 17+ should drop `/auth` from the URLs.
- The `python3-ldap` apt install followed by `pip3 install python-ldap` is redundant — either is sufficient on its own. Left as-is; harmless.
- `nscd` (the libc name service cache) is installed alongside `libnss-ldapd`/`nslcd`. nslcd has its own internal cache, and running nscd in parallel is generally discouraged; some guides omit it. Functional, so left untouched.
- The Vouch-Proxy nginx server block uses `listen 443 ssl;` without showing `ssl_certificate`/`ssl_certificate_key` directives; readers will need to add these (or front Vouch with a TLS terminator). Out of scope for the LDAP-integration focus of the post.
- The configuration directives parsed by the nginx-ldap-auth daemon's `/etc/nginx-ldap-auth.conf` file are documented inconsistently across forks; the form shown in the post (`url`, `binddn`, `binddn_passwd`, `attribute`, `cache_time`) is supported by the daemon, but operators should cross-check against the version of `nginx-ldap-auth-daemon.py` they actually download.
