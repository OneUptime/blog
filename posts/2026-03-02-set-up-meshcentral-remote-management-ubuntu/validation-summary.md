# Validation Summary: How to Set Up MeshCentral for Remote Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- MeshCentral (self-hosted remote management server)
- Node.js (v20 LTS via NodeSource)
- Ubuntu 20.04+
- npm
- systemd
- Nginx (reverse proxy with TLS termination)
- Let's Encrypt (referenced for certificates)
- SMTP (email notifications)
- TOTP / 2FA

## Sources Consulted
- MeshCentral GitHub repository and sample-config-advanced.json: https://github.com/Ylianst/MeshCentral/blob/master/sample-config-advanced.json
- MeshCentral configuration schema: https://github.com/Ylianst/MeshCentral/blob/master/meshcentral-config-schema.json
- MeshCentral documentation: https://docs.meshcentral.com/
- MeshCentral discussions on Node.js version requirements (issue #5458 and related): https://github.com/Ylianst/MeshCentral/discussions/5458
- MeshCentral Linux agent install script: https://github.com/Ylianst/MeshCentral/blob/master/agents/meshinstall-linux.sh
- NodeSource Node.js installation instructions: https://deb.nodesource.com/

## Issues Found

1. **Outdated Node.js minimum version.** The prerequisites listed "Node.js 14 or newer". Current MeshCentral releases require Node.js 20 or newer (Node 14 has been EOL for some time and recent MeshCentral versions explicitly require Node 20+). Updated to "Node.js 20 or newer". The install snippet already installs Node 20 LTS, so this is now consistent.

2. **SMTP field name was incorrect.** The post used `"tlscert": false`. The actual field name in the MeshCentral configuration schema is `tlscertcheck` (disables TLS certificate verification when false). Updated accordingly.

3. **Nginx reverse-proxy upstream protocol was wrong.** With `"tlsOffload": "127.0.0.1"` set in MeshCentral's config, MeshCentral binds plain HTTP on the listen port — TLS is terminated at the proxy. The post had `proxy_pass https://localhost:4430;` together with `proxy_ssl_verify off;`, which would not work because MeshCentral is no longer listening for TLS on that port. Changed to `proxy_pass http://localhost:4430;` and removed the now-irrelevant `proxy_ssl_verify off;` directive.

4. **2FA snippet did not actually enforce 2FA.** The original snippet only set `twoFactorCookieDurationDays`, which controls how long the "trust this browser" cookie lasts after a successful 2FA challenge — it does not require accounts to enable 2FA. The accompanying comment ("Require 2FA for all logins") was therefore misleading. Added `passwordRequirements.force2factor: true`, which is the actual MeshCentral setting that forces all accounts to set up 2FA, and clarified the comment.

## Review Notes

- The `useradd -r -m -s /bin/bash -d /opt/meshcentral meshcentral` line creates a system account with an interactive shell, which is slightly unusual for a service account but is intentional here so that the admin can `sudo su - meshcentral` to run the npm install. This is functional and matches several community guides; not a technical error.
- The Linux agent download URL example uses the `action=5&filename=meshinstall.sh` form. This pattern is present in MeshCentral and community tutorials. The "official" install snippet shown in the MeshCentral web UI uses `?script=1` plus serverUrl and meshid arguments to the script — either approach is acceptable; the post's example is plausible and left as-is.
- `redirPort: 800` in the Nginx-fronted config is redundant (Nginx handles the port 80 redirect), but MeshCentral will happily bind to that port; not incorrect, just unnecessary.
- The post says "Each connected agent uses roughly 2-5MB" of memory — this is a reasonable ballpark and is consistent with community guidance; exact values vary by version and workload.
- Future-proofing: MeshCentral's Node.js minimum requirement will likely continue to rise; this guide should be revisited periodically.
