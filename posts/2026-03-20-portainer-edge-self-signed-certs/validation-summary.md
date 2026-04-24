# Validation Summary: How to Configure Edge Agent with Self-Signed Certificates - Portainer Certs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Docker
- Docker Compose
- TLS / X.509 certificates
- OpenSSL
- `curl`
- Go TLS certificate trust handling

## Sources Consulted
- Portainer Documentation: The Portainer Edge Agent — https://docs.portainer.io/advanced/edge-agent
- Portainer Documentation: Install Edge Agent Standard on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Documentation: Updating the Edge Agent — https://docs.portainer.io/start/upgrade/edge
- Portainer Documentation: Using mTLS with Portainer — https://docs.portainer.io/advanced/mtls
- Portainer lifecycle policy / current release stream information — https://docs.portainer.io/start/lifecycle
- Portainer agent source repository — https://github.com/portainer/agent
- Go `crypto/x509` package documentation — https://pkg.go.dev/crypto/x509
- Docker Docs: Compose file reference — https://docs.docker.com/compose/compose-file/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- OpenSSL `s_client` and `x509` local `--help` output
- `curl --help all` local output

## Issues Found
1. The post used an unsupported `CA_CERT` environment variable for the Edge Agent. Portainer's agent source and docs do not define `CA_CERT`. I replaced it with a working certificate-trust approach using `SSL_CERT_FILE`, which is honored by Go on Linux when the agent uses the system trust pool.

2. The certificate export step described the exported file as a "CA certificate" even when using Portainer's default self-signed certificate. In that case the command is exporting the server certificate itself. I corrected the wording and filenames, and added `-servername` to the `openssl s_client` command so SNI is explicit.

3. The `EDGE_INSECURE_POLL=1` `docker run` example had a shell syntax error because it placed an inline comment after a trailing line-continuation backslash. I removed the broken inline comment and updated the example to a valid command.

4. The runtime examples used `portainer/agent:latest`. Portainer's official upgrade guidance says agents should match the Portainer Server version. I changed the image references to a version-matched pattern using `2.39.0` as the current example fallback and updated the text accordingly.

5. The `docker run` and Compose examples omitted the standard `/host` and `/data` mounts used in Portainer's documented Edge Agent deployment/update commands. I aligned the examples with the documented standalone deployment shape.

6. The "Trust System CA Store" section incorrectly implied that updating the host trust store would automatically apply to the container. Containers use their own filesystem and trust configuration. I replaced that section with a technically correct custom-image approach that bakes the certificate into the image.

7. The Compose example used the obsolete top-level `version` field. Current Docker Compose documentation marks it as obsolete. I removed it.

8. The manual verification example used `curl` against `https://portainer.example.com/api/system/version` without the explicit `9443` port used elsewhere in the post, and it was unnecessarily tied to a specific API path. I replaced it with a simple HTTPS HEAD request to `https://portainer.example.com:9443`, which validates certificate trust directly.

## Review Notes
- Portainer's official Edge Agent documentation explicitly documents `EDGE_INSECURE_POLL=1` for self-signed Portainer server certificates. The corrected certificate-file approach is technically valid because the agent is a Go application and Go's `crypto/x509` library honors `SSL_CERT_FILE` on Unix-like systems, including Linux containers.
- The mTLS-related agent flags (`MTLS_SSL_CERT`, `MTLS_SSL_KEY`, `MTLS_SSL_CA`) are for Portainer Business Edition mTLS deployments and are not a drop-in replacement for the generic self-signed trust problem described in this post.
- As of April 24, 2026, Portainer 2.39 is the current LTS release. The examples use `2.39.0` as a concrete fallback, but the deployed Edge Agent should still match the Portainer Server version in use.
