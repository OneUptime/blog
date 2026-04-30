# Validation Summary: How to Fix 'Origin Invalid' Errors After Upgrading Portainer

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker
- Nginx reverse proxy
- CSRF / origin validation
- HTTP proxy headers

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy
- Portainer nginx reverse proxy guide: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer rollback FAQ: https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer troubleshooting FAQ for post-upgrade authentication failures: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-authenticate-after-portainer-update
- Portainer issue documenting the `Origin invalid` reverse-proxy regression and workaround: https://github.com/portainer/portainer/issues/12748
- Portainer source for CSRF/origin validation behavior: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/csrf/csrf.go
- Portainer source for `--trusted-origins` validation: https://raw.githubusercontent.com/portainer/portainer/develop/api/cmd/portainer/main.go

## Issues Found
- The post described the upgrade issue too generically. I corrected the explanation to match Portainer's actual `Origin` / `Referer` validation behavior and added the relevant version context plus the later workaround releases.
- The sample log line did not match Portainer's real error output. I replaced it with the `Failed to validate Origin or Referer` / `CSRF check failed` messages used by Portainer.
- The rollback instructions were unsafe because Portainer cannot run an older image against a newer database. I updated the step to require restoring the matching database backup before redeploying the earlier image.
- The last step incorrectly suggested `HTTPS_PROXY`-style configuration. I replaced it with Portainer's supported `--trusted-origins` / `TRUSTED_ORIGINS` configuration.
- The `--base-url` example used `latest` and omitted the requirement for the reverse proxy to strip the configured subpath. I corrected both points.

## Review Notes
- Current Portainer documentation describes `--trusted-origins` as domains used to access Portainer, while current source validates URL-style origins. The post now uses a full-origin example (`https://portainer.example.com`) to match current behavior.
- The nginx example still assumes Portainer's legacy HTTP port `9000` is enabled. If Portainer is only exposed on its default HTTPS port `9443`, the upstream proxy configuration must be adjusted accordingly.
