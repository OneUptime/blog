# Validation Summary: How to Configure mTLS Between Services with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Docker Swarm UI)
- Mutual TLS (mTLS)
- OpenSSL (certificate generation)
- Docker Swarm (secrets, configs, overlay networks)
- Docker Compose v3.8 schema (stack file)
- NGINX (TLS server with `ssl_verify_client`)
- curl (mTLS client testing)
- cert-manager (Kubernetes Certificate / ClusterIssuer)
- Prometheus exporter (`enix/x509-certificate-exporter`) for cert expiry

## Sources Consulted
- Compose Specification — configs reference: https://github.com/compose-spec/compose-spec/blob/master/spec.md and https://docs.docker.com/reference/compose-file/configs/
- Portainer documentation — Docker Swarm Secrets / Configs UI: https://docs.portainer.io/user/docker/secrets and https://docs.portainer.io/user/docker/secrets/add
- cert-manager — CA Issuer: https://cert-manager.io/docs/configuration/ca/
- cert-manager — Certificate resource and `usages`: https://cert-manager.io/docs/usage/certificate/
- NGINX `ngx_http_ssl_module` (`ssl_verify_client`, status codes 495/496/497): https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- enix/x509-certificate-exporter project README and Helm/CLI flags: https://github.com/enix/x509-certificate-exporter
- Docker Hub lookup for `nimbustech/cert-monitor` (404 — image does not exist)

## Issues Found
1. **Inline `configs.content` is not supported by `docker stack deploy` / Portainer Swarm stacks.** The original Step 4 stack defined the NGINX server block via `configs: nginx-mtls-config: content: |`. The Compose Specification supports inline `content`, but the Swarm orchestrator (which Portainer Stack deploys to in Swarm environments) only accepts `file:` or `external: true` configs. Fix: changed the stack to declare `nginx-mtls-config` as `external: true`, and added a Step 3 instruction to create the config either through Portainer's **Configs > Add config** UI or via `docker config create nginx-mtls-config nginx.conf`. The NGINX server block content was preserved verbatim.

2. **Docker image `nimbustech/cert-monitor` does not exist on Docker Hub** (returns 404). Replaced the example with the maintained `enix/x509-certificate-exporter` project, including correct flag (`--watch-file`), default port (`9793`), and a real metric name (`x509_cert_not_after`). Updated the surrounding prose to describe the Prometheus / Alertmanager pattern that this exporter is designed for, instead of the original webhook-style env vars (`WARN_DAYS`, `CRITICAL_DAYS`, `WEBHOOK_URL`) that did not correspond to any real image.

3. **NGINX status code on missing client certificate.** The original stated the failed `curl` would return "400 Bad Request - No required SSL certificate was sent". curl does observe a 400-class failure, but per the NGINX SSL module documentation the non-standard internal status code for "client did not provide a required certificate" is **496** (495 = invalid certificate, 497 = HTTP-on-HTTPS). Updated the comment in Step 6 to mention NGINX's internal 496 status code alongside the 400 the client sees, so readers can configure `error_page 496 ...` if they want a custom response.

4. **Portainer Secrets navigation menu wording.** The original "Secrets > Add Secret" path is correct, but the menu only appears for Swarm-mode environments. Clarified this in Step 3.

## Review Notes
- The Compose file still uses `version: "3.8"`. This top-level `version` key is obsolete in the modern Compose Specification (it is ignored), but `docker stack deploy` and Portainer still accept it without warning, so it is left in place to avoid changing semantics.
- The OpenSSL commands in Steps 1 and 2 are correct standard usage (`openssl genrsa`, `openssl req -new -x509`, `openssl x509 -req` with `-extfile <(printf ...)` for SANs). No changes needed.
- The cert-manager snippet in Step 5 is correct for the CA Issuer, but readers should know that for a `ClusterIssuer` of type `ca`, the referenced `internal-ca-secret` must live in the cert-manager controller's cluster-resource namespace (default `cert-manager`), not the namespace where Certificates are requested. This is a usage caveat rather than a bug in the snippet.
- The cert-rotation script in Step 7 is conceptually fine (`openssl x509 -checkend 2592000` returns non-zero if the cert expires within 30 days), but the "# Generate new certificate" step is left as a comment placeholder — readers will need to wire that into their own CA workflow.
- Network `secure-mesh` uses `driver: overlay` with `encrypted: true`, which requires Swarm mode (consistent with the `external` Docker secrets and configs used elsewhere).
