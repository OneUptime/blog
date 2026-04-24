# Validation Summary: How to Configure mTLS for Portainer Business Edition

## Status
validated

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent mTLS
- Docker Engine / `dockerd`
- Docker API over TLS
- OpenSSL
- X.509 certificates

## Sources Consulted
- Portainer: Using mTLS with Portainer: https://docs.portainer.io/advanced/mtls
- Portainer: How does Portainer secure connectivity to and from Agents and Edge Agents?: https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer: Connect to the Docker API: https://docs.portainer.io/admin/environments/add/docker/api
- Portainer: Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Portainer: CLI configuration options: https://docs.portainer.io/advanced/cli
- Docker Docs: Protect the Docker daemon socket: https://docs.docker.com/engine/security/protect-access/
- Docker Docs: `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/
- OpenSSL Documentation: `req`: https://docs.openssl.org/1.1.1/man1/req/
- OpenSSL Documentation: `x509`: https://docs.openssl.org/1.1.1/man1/x509/

## Issues Found
- The overview implied Portainer mTLS covered connected agents generally and Docker endpoints as the same feature. Portainer documents mTLS specifically for Edge Agent communication, while standard Agent connectivity uses a different trust model and Docker endpoint TLS is a separate environment connection method. I corrected the scope and terminology.
- The original server-certificate step generated `portainer-server.crt/key`, but the Docker daemon configuration later referenced `docker-server.crt/key`. I changed the certificate-generation step to create the Docker daemon certificate actually used by the later configuration.
- The Docker daemon certificate generation omitted the SAN and `serverAuth` extended key usage that Docker’s TLS guidance requires. I added an extension file so the example produces a certificate suitable for Docker daemon authentication.
- The client certificate generation omitted `clientAuth` extended key usage. I added the appropriate extension so the certificate is explicitly valid for client authentication.
- The Portainer API example used multipart field names `TLSCACert`, `TLSCert`, and `TLSKey`, which do not match Portainer’s documented API example. I corrected them to `TLSCACertFile`, `TLSCertFile`, and `TLSKeyFile`, and clarified the header uses a bearer JWT.
- The verification step expected one exact error string when no client certificate was provided. That message can vary by TLS stack and client version, so I changed the expectation to the protocol-level outcome instead of a brittle literal string.
- The Docker daemon JSON example can conflict with existing `-H` flags from a systemd unit. I added the required caveat because Docker documents that duplicate daemon options from flags and `daemon.json` prevent startup.

## Review Notes
Portainer’s current documentation marks direct Docker API connectivity as a legacy option and recommends the Edge Agent for most use cases. The corrected post is technically accurate for Docker API TLS, but that deployment tradeoff is still worth keeping in mind.
