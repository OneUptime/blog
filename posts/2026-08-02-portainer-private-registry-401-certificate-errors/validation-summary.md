# Validation Summary: How to Connect Portainer to a Private Registry Without 401 or Certificate Errors

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Portainer Community Edition and Portainer Agent
- Docker Engine and Docker Compose
- Docker Swarm private-registry authentication
- OCI/Docker Registry HTTP API V2
- TLS, X.509 certificates, and private certificate authorities
- curl and Linux systemd administration

## Sources Consulted
- [Portainer: Add a custom registry](https://docs.portainer.io/admin/registries/add/custom)
- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Use a custom certificate authority](https://docs.portainer.io/faqs/troubleshooting/certificates-and-security/how-can-i-use-my-custom-certificate-authority-ca-with-portainer)
- [Portainer: Install Portainer CE with Docker on Linux](https://docs.portainer.io/start/install-ce/server/docker/linux)
- [Portainer: Browse a registry](https://docs.portainer.io/admin/registries/browse)
- [Docker: Verify repository client with certificates](https://docs.docker.com/engine/security/certificates/)
- [Docker: `docker login` reference](https://docs.docker.com/reference/cli/docker/login/)
- [Docker: `dockerd` insecure-registry behavior](https://docs.docker.com/reference/cli/dockerd/#insecure-registries)
- [Docker: Deploy services to a Swarm](https://docs.docker.com/engine/swarm/services/#create-a-service-using-an-image-on-a-private-registry)
- [Docker Compose: Service `image` and `restart` fields](https://docs.docker.com/reference/compose-file/services/)
- [Docker Compose trust model: mutable tags and immutable digests](https://docs.docker.com/compose/trust-model/#pin-remote-references-to-digests)
- [Docker Registry: Token authentication specification](https://docs.docker.com/reference/api/registry/auth/)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [curl: TLS certificate verification and custom CA stores](https://curl.se/docs/sslcerts.html)
- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)

## Issues Found
- The end-to-end registry probe used `curl -I`, which sends `HEAD`, while the OCI Distribution Specification defines `GET /v2/` as the conformance and authentication probe. Replaced it with a body-discarding GET that prints response headers.
- The post installed the private CA only in Docker's daemon-specific trust directory but later expected plain `curl` to trust it. Added `--cacert registry-root-ca.crt` to the TLS checks so they use the intended private CA without requiring an unstated system-wide curl trust-store change.
- The checklist's "full certificate chain" wording could imply that the server should send the root trust anchor. Clarified that the server supplies its leaf certificate and required intermediate chain; the trusted root is distributed independently.
- The production checklist referred to immutable version tags without stating that tag immutability must be enforced by the registry. Clarified that only registry-enforced immutable tags, or inherently immutable digests, provide that guarantee.

## Review Notes
- Both Compose snippets were checked with `docker compose config` and parsed successfully. The image reference, `restart` values, Portainer command, port mapping, named volume, Docker socket mount, and read-only CA-bundle mount are valid.
- The Docker daemon commands assume a rootful, systemd-managed Linux installation. The Portainer CA-bundle source path shown is the Debian/Ubuntu-style path; as the post notes, the host CA must first be installed into the host's normal bundle.
- Portainer registry browsing is a Business Edition feature, but the custom-CA mounting procedure applies to both Portainer Server and Agent containers when they make direct HTTPS requests that require the private CA.
- The `portainer/portainer-ce:lts` image tag and the linked Portainer documentation were current at validation time. All external links in the post returned HTTP 200.
