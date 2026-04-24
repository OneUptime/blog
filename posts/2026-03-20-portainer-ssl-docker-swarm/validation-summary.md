# Validation Summary: How to Configure SSL/TLS for Portainer on Docker Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Swarm
- Docker Secrets
- TLS/SSL certificates
- OpenSSL
- Nginx

## Sources Consulted
- Portainer Documentation, "Using your own SSL certificate with Portainer": https://docs.portainer.io/advanced/ssl
- Portainer Documentation, "CLI configuration options": https://docs.portainer.io/sts/advanced/cli
- Portainer Documentation, "Deprecated and removed features": https://docs.portainer.io/advanced/deprecated
- Portainer Documentation, "Docker Swarm" install documentation: https://docs.portainer.io/start/install-ce/server/swarm
- Official Portainer CE Swarm SSL manifest: https://downloads.portainer.io/ce-sts/portainer-agent-stack-ssl.yml
- Docker Docs, "Manage sensitive data with Docker secrets": https://docs.docker.com/engine/swarm/secrets/
- Docker Docs, "`docker service update`": https://docs.docker.com/reference/cli/docker/service/update/
- OpenSSL CLI help: `openssl req -help`

## Issues Found
- The stack example used the older socket-mounted Portainer server pattern and the older SSL flag flow. I updated it to match the current official Swarm SSL manifest: Portainer now connects to `tasks.agent:9001`, uses the current `portainer/portainer-ce:sts` and `portainer/agent:sts` image tags, and reads certificate material from `portainer.tlscert` and `portainer.tlskey` secrets.
- The original Portainer service bind-mounted `/var/run/docker.sock`. I removed that mount from the server service because the current official Swarm deployment uses the Portainer Agent for server-to-cluster communication.
- The rotation section implied seamless, no-restart secret rotation. Docker secret rotation for a service is done through `docker service update`, which redeploys service tasks. I corrected the secret names and clarified that a single-replica Portainer deployment will see a brief restart during certificate rotation.
- The conclusion recommended `cert-manager`, which is a Kubernetes-focused tool rather than a Docker Swarm certificate automation path. I replaced that guidance with `Certbot or another ACME client`.
- The certificate-generation note did not make it clear that the sample command produces a self-signed certificate. I clarified that point and added the full-chain requirement for CA-issued certificates, matching Portainer's SSL documentation.

## Review Notes
- Portainer's current documentation has some drift between narrative pages and the downloadable Swarm SSL manifest around legacy versus current TLS flag naming. The downloadable `ce-sts` SSL manifest and Portainer's deprecation guidance were treated as authoritative for the corrected stack example.
- The Nginx section remains an illustrative service fragment and assumes the external `nginx-config` object contains the full reverse-proxy configuration for Portainer.
