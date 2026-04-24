# Validation Summary: How to Disable HTTP and Force HTTPS-Only in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker
- Docker Compose
- Kubernetes
- Helm
- HTTPS / TLS
- Nginx
- HSTS

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer SSL certificate documentation: https://docs.portainer.io/advanced/ssl
- Portainer General settings ("Force HTTPS only"): https://docs.portainer.io/admin/settings/general
- Portainer Kubernetes installation documentation: https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- Portainer troubleshooting FAQ for `--http-disabled`: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/i-enabled-force-https-only-and-now-im-locked-out-of-portainer.-how-do-i-get-back-in
- Docker port publishing documentation: https://docs.docker.com/engine/network/port-publishing/
- NGINX `add_header` directive documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header
- RFC 6797 (HTTP Strict Transport Security): https://www.rfc-editor.org/rfc/rfc6797.html

## Issues Found
1. Removed the undocumented `--ssl` flag from the Docker and Docker Compose examples. Current Portainer CLI docs document `--sslcert` and `--sslkey`, but not `--ssl`.
2. Added the missing certificate bind mount to the first `docker run` example so the `/certs/portainer.crt` and `/certs/portainer.key` paths referenced by the command would actually exist inside the container.
3. Corrected the explanation about Portainer's default TLS behavior. The original text said omitting `--ssl` would fall back to a generated certificate, but the relevant behavior is omitting `--sslcert` and `--sslkey`.
4. Replaced the Kubernetes `Deployment` example with the current supported Helm deployment using `tls.force=true`. The original manifest did not match Portainer's documented Kubernetes installation method and omitted required Kubernetes-side setup such as the standard Portainer deployment components and RBAC resources.
5. Changed the verification text from "HTTP should fail or redirect" to "HTTP should fail" because `--http-disabled` disables the HTTP listener on port `9000` rather than configuring an HTTP redirect.

## Review Notes
- Portainer currently documents HTTP on port `9000` and HTTPS on port `9443` as the default bind addresses, with `--http-disabled` forcing HTTPS-only mode.
- Portainer generates and uses a self-signed certificate by default if you do not provide your own certificate and key.
- Docker documents localhost-bound published ports as local-only for current releases, but notes caveats for releases older than 28.0.0.
