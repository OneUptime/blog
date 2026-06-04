# Validation Summary: How to Run ntfy in Docker for Push Notifications

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- ntfy server
- Docker
- Docker Compose
- curl
- Bash scripting
- Nginx reverse proxy
- Traefik labels
- Server-Sent Events and JSON streams

## Sources Consulted
- ntfy installation documentation: https://docs.ntfy.sh/install/
- ntfy server configuration documentation: https://docs.ntfy.sh/config/
- ntfy publishing documentation: https://docs.ntfy.sh/publish/
- ntfy subscription API documentation: https://docs.ntfy.sh/subscribe/api/
- ntfy CLI subscription documentation: https://docs.ntfy.sh/subscribe/cli/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI version output: `docker --version`
- Local Docker Compose version output: `docker compose version`

## Issues Found
- The post claimed self-hosting means "no rate limits" and can work "entirely offline." ntfy servers still have configurable rate limits, and iOS instant push for self-hosted servers requires an APNS-connected upstream server. Updated the wording to say rate limits are configurable and offline use depends on clients connecting directly.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the example follows the current Compose Specification.
- The `server.yml` example used `enable-web: true`, which is not a current ntfy server option. Replaced it with `web-root: "/"` and added `enable-login: true` for web/API login support when authentication is enabled.
- The production config did not account for iOS instant notifications. Added `upstream-base-url: "https://ntfy.sh"` with wording explaining why it is needed.
- The ACL example granted `write` and then `read` in separate commands for the same user/topic pattern. ntfy stores a single permission for an ACL entry, so the second command would leave read-only access. Replaced the two commands with one `read-write` grant.
- The reverse proxy section forwarded client IP headers but did not mention `behind-proxy: true`. Added a small `server.yml` snippet for trusted reverse-proxy deployments so ntfy uses forwarded client IPs for per-visitor rate limits.
- The phone subscription section implied all mobile apps maintain a direct persistent connection for real-time delivery. Updated it to distinguish Android direct connections from iOS instant push behavior with `upstream-base-url`.
- The summary repeated the unconditional real-time mobile delivery claim. Updated it to state that real-time mobile delivery depends on configured push support.

## Review Notes
The Docker image CLI could not be checked locally because Docker Hub returned an unauthenticated pull rate-limit error. The Docker and Docker Compose commands themselves are standard and were checked against the installed local CLIs; ntfy-specific commands and configuration were verified against the current official ntfy documentation.
