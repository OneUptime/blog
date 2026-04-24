# Validation Summary: How to Deploy Authelia via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer Stacks
- Authelia
- Traefik ForwardAuth
- Redis
- SMTP

## Sources Consulted
- Authelia Traefik integration: https://www.authelia.com/integration/proxies/traefik/
- Authelia proxy authorization endpoints: https://www.authelia.com/reference/guides/proxy-authorization/
- Authelia session configuration: https://www.authelia.com/configuration/session/introduction/
- Authelia storage configuration: https://www.authelia.com/configuration/storage/introduction/
- Authelia reset password identity validation: https://www.authelia.com/configuration/identity-validation/reset-password/
- Authelia SMTP notifier configuration: https://www.authelia.com/configuration/notifications/smtp/
- Authelia file authentication backend: https://www.authelia.com/configuration/first-factor/file/
- Authelia password hashing guide: https://www.authelia.com/reference/guides/passwords/
- Authelia server configuration: https://www.authelia.com/configuration/miscellaneous/server/
- Traefik ForwardAuth middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer relative path behavior: https://docs.portainer.io/sts/advanced-topics/relative-paths

## Issues Found
- The Traefik middleware used Authelia’s legacy `/api/verify?rd=...` endpoint. I changed it to `/api/authz/forward-auth`, which is the current endpoint documented for Traefik ForwardAuth integrations.
- The Authelia config used legacy or deprecated configuration style for the listener and session flow. I replaced `server.host`/`server.port` with `server.address`, moved the reset-password JWT secret to `identity_validation.reset_password.jwt_secret`, and moved session domain/redirection settings into `session.cookies`, including the required `authelia_url`.
- The storage configuration omitted `storage.encryption_key`, which current Authelia documentation marks as required. I added the missing placeholder key.
- The SMTP example used `host` and `port` keys. I changed this to the current `notifier.smtp.address` format using `submission://smtp.example.com:587`, which matches the current notifier documentation.
- The password-hash guidance used the obsolete `authelia hash-password` command. I updated both the inline comment and the command example to `authelia crypto hash generate argon2 --password 'your_password'`.
- The stack used a relative bind mount (`./authelia:/config`). For a Portainer-focused guide this is misleading because relative path volumes are only available in specific Portainer deployment modes. I changed the example to an absolute host path (`/opt/authelia:/config`) and updated the file creation paths to match.

## Review Notes
- `traefik.http.middlewares.authelia.forwardAuth.trustForwardHeader=true` remains in the example because Authelia’s current Traefik integration guide still uses it, but Traefik’s own middleware reference marks this option as deprecated for a future major release.
- The post still uses mutable image tags such as `authelia/authelia:latest`. This is technically valid, but pinning a version would make the deployment more reproducible.
- Runtime validation with a local Authelia container was not performed in this environment because Docker was unavailable during review. The corrections were made against current official documentation.
