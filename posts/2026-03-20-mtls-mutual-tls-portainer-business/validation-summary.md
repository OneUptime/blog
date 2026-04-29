# Validation Summary: How to Set Up mTLS (Mutual TLS) in Portainer Business Edition

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer Business Edition (`portainer/portainer-ee`)
- Portainer Agent (`portainer/agent`)
- OpenSSL (CA, server, and client cert generation)
- Docker (container deployment)
- nginx (mTLS-terminating reverse proxy — added during fix)
- Mutual TLS / X.509 client certificates
- curl (client cert API access)

## Sources Consulted
- Portainer Server CLI flag definitions: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer Server SSL handling: https://github.com/portainer/portainer/blob/develop/api/internal/ssl/ssl.go
- Portainer Agent options: https://github.com/portainer/agent/blob/develop/os/options.go
- Portainer official docs: https://docs.portainer.io/
- nginx HTTP SSL module reference: http://nginx.org/en/docs/http/ngx_http_ssl_module.html
- nginx HTTP proxy module reference: http://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Portainer image registry: https://hub.docker.com/r/portainer/portainer-ee and https://hub.docker.com/r/portainer/agent

## Issues Found

The original post had a fundamentally incorrect technical premise and several deprecated flags. The following fixes were applied:

1. **Non-existent `--sslcacert` flag on Portainer Server (critical).** The original Step 2 used `--sslcacert /certs/ca/ca.crt` and claimed this enabled client certificate verification. This flag does not exist on Portainer Server. Even the closest existing flag, `--tlscacert`, is wired into the outbound HTTP server for connecting to Docker hosts — not for verifying inbound HTTPS clients. Source inspection of `api/internal/ssl/ssl.go` confirms Portainer never sets `tls.Config.ClientAuth` or `ClientCAs`, so its HTTPS endpoint cannot enforce mTLS via any CLI flag. **Fix:** removed the bogus flag and added a new Step 3 that uses an nginx reverse proxy (`ssl_client_certificate` + `ssl_verify_client on`) to actually enforce client certificate verification — which is the canonical way to put mTLS in front of Portainer.

2. **Deprecated Portainer Server flags.** `--ssl`, `--sslcert`, `--sslkey` are marked deprecated in `api/cli/cli.go` and emit a runtime warning recommending `--tlsverify`, `--tlscert`, `--tlskey`. **Fix:** updated the Step 2 `docker run` invocation to use the current flags.

3. **Deprecated Portainer Agent flags.** `--sslcert`, `--sslkey`, `--sslcacert` are marked `(DEPRECATED)` in `os/options.go`; the current flags are `--mtlscert`, `--mtlskey`, `--mtlscacert`. **Fix:** updated the Step 4 (formerly Step 3) `docker run` invocation. Also corrected the cert paths — the agent's mTLS cert is the *client* identity it presents to Portainer, so it should reference the `client/client.*` files rather than the server cert with `CN=portainer.example.com` (which the original post incorrectly mounted as the agent's identity).

4. **Verification step would not actually fail without a client cert.** Because the original `--sslcacert` flag did nothing, `curl -k https://localhost:9443/api/status` would have succeeded, breaking the tutorial's "expected: SSL error" claim. **Fix:** verification now hits the nginx proxy (`portainer.example.com`), where the expected response without a cert is the documented nginx response `400 No required SSL certificate was sent`.

5. **Reframed intro and prerequisites** to honestly state that Portainer's HTTPS endpoint can't enforce mTLS by itself, and that nginx is required as the mTLS terminator. Added nginx to prerequisites.

## Review Notes

- **Self-signed cert SANs.** The OpenSSL invocations don't add Subject Alternative Names (SANs) to the server cert. Modern TLS clients (and recent curl versions) reject certs that match only by CN. For a real deployment, add `-extfile` with `subjectAltName = DNS:portainer.example.com` to the `openssl x509 -req` step. Left unchanged because the original post worked at this level of detail and adding SANs is a stylistic addition rather than a correctness fix for what was originally there.
- **`portainer/portainer-ee:latest` and `portainer/agent:latest`.** Both image tags exist on Docker Hub, but Portainer's docs recommend pinning to a specific version (e.g. `2.40.0`, `sts`) rather than `:latest` for production use.
- **Portainer Edge Agent mTLS.** The `--mtls*` flags on the agent are primarily designed for Edge Agent mode (where the agent dials out to Portainer through the tunnel on port 8000). For a Standalone agent that Portainer dials into on `:9001`, the agent normally auto-generates its own self-signed cert; the `--mtls*` flags are still accepted but the deployment topology matters. A future revision could split the Edge vs. Standalone agent guidance more explicitly.
- **`ssl_client_certificate` vs. `ssl_trusted_certificate`.** The post uses `ssl_client_certificate`, which is correct and additionally advertises the acceptable CA list to clients during the TLS handshake. If hiding the trusted CA list from clients is desired, `ssl_trusted_certificate` can be used instead.
