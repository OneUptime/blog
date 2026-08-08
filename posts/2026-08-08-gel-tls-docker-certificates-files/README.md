# Configure Gel TLS in Docker With Mounted Certificate Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, TLS, Docker, Docker Compose, Security

Description: Mount Gel server certificates and client trust files with Docker Compose secrets while keeping PEM contents out of environment values.

---

Do not paste a PEM certificate or private key into `compose.yaml`, an `.env` file, or a multiline environment value. Mount each file into only the container that needs it, and put only the in-container path in Gel's configuration.

Current Gel server configuration provides:

- `GEL_SERVER_TLS_CERT_FILE` for the server certificate file;
- `GEL_SERVER_TLS_KEY_FILE` for the private key file; and
- `GEL_SERVER_TLS_CERT_MODE=require_file` to fail startup when the required material is unavailable.

Clients use a different set of connection variables. `GEL_TLS_CA_FILE` points at the trusted certificate authority, while `GEL_CLIENT_TLS_SECURITY=strict` requires both certificate and hostname verification.

The server private key belongs only in the Gel service. Applications need the CA certificate, not the server's private key.

## Prepare Three Different Artifacts

A production chain normally has:

1. a server certificate or certificate chain for the Gel endpoint;
2. the matching server private key; and
3. a CA certificate that clients trust.

The server certificate's Subject Alternative Name must include the hostname clients actually use. If the application connects to `gel.internal`, a certificate valid only for `localhost` or a public name will fail strict hostname verification.

Keep these files outside the image build context when possible. If local Compose reads files from a repository-adjacent directory, exclude that directory from version control and restrict access on the Docker host. A `.gitignore` rule reduces accidental commits but is not a secret manager or an access-control system.

Validate the certificate period, chain, hostname, and key match before deployment. For example, inspect non-secret certificate metadata:

```bash
openssl x509 \
  -in ./secrets/gel-server-chain.pem \
  -noout \
  -subject \
  -issuer \
  -dates \
  -ext subjectAltName
```

Use your certificate authority's supported procedure to confirm the private key matches the certificate. Do not print the private key into CI or terminal logs.

## Mount Files With Compose Secrets

Docker Compose secrets are granted per service and mounted as files under `/run/secrets/<name>`. This matches Gel's file-based configuration without placing PEM contents in the container environment.

```yaml
name: gel-production

services:
  gel:
    image: geldata/gel
    restart: unless-stopped
    environment:
      GEL_SERVER_TLS_CERT_MODE: require_file
      GEL_SERVER_TLS_CERT_FILE: /run/secrets/gel_tls_cert
      GEL_SERVER_TLS_KEY_FILE: /run/secrets/gel_tls_key
      GEL_SERVER_PASSWORD_FILE: /run/secrets/gel_admin_password
      GEL_SERVER_BINARY_ENDPOINT_SECURITY: tls
      GEL_SERVER_HTTP_ENDPOINT_SECURITY: tls
    secrets:
      - gel_tls_cert
      - gel_tls_key
      - gel_admin_password
    volumes:
      - gel_data:/var/lib/gel/data
    networks:
      default:
        aliases:
          - gel.internal

  app:
    image: your-app-image
    restart: unless-stopped
    environment:
      GEL_CREDENTIALS_FILE: /run/secrets/gel_app_credentials
      GEL_TLS_CA_FILE: /run/secrets/gel_ca
      GEL_CLIENT_TLS_SECURITY: strict
    secrets:
      - gel_app_credentials
      - gel_ca
    depends_on:
      - gel

secrets:
  gel_tls_cert:
    file: ./secrets/gel-server-chain.pem
  gel_tls_key:
    file: ./secrets/gel-server.key
  gel_ca:
    file: ./secrets/gel-root-ca.pem
  gel_admin_password:
    file: ./secrets/gel-admin-password.txt
  gel_app_credentials:
    file: ./secrets/gel-app-credentials.json

volumes:
  gel_data:
```

Pin `geldata/gel` to the exact tested release tag or image digest in a real deployment. The unpinned name keeps the example version-neutral; it is not a production upgrade policy.

The application credentials file can use Gel's documented JSON format:

```json
{
  "host": "gel.internal",
  "port": 5656,
  "user": "app_user",
  "password": "replace-through-your-secret-workflow",
  "branch": "main"
}
```

Provision the application role and password through the deployment's bootstrap process. Do not use the default superuser from routine application code. The credentials file and private key should be populated by the actual secret-delivery system, not committed with placeholder replacement as a manual release step.

## Understand What This Does and Does Not Protect

The Compose file contains paths such as `/run/secrets/gel_tls_key`; it does not contain the key. The `gel` service is granted the server chain, server key, and bootstrap password. The `app` service is granted its credentials and the CA certificate. It cannot read `gel_tls_key` merely because both services are in the same Compose project.

Local Docker Compose implements file-backed secrets using mounts from files on the Docker host. Protecting the host files, Compose configuration, Docker socket, and operator account remains essential. This is not equivalent to an external hardware-backed or orchestrator-managed secret store. Docker's Compose trust model also warns that file references are read by the Compose process and can surface during configuration processing, so run Compose only from trusted configuration with appropriately limited operator access.

In Swarm or another deployment platform, use that platform's secret lifecycle and access controls. The important Gel contract remains the same: make the files readable at stable container paths and keep the private key away from clients.

## Keep Hostname Verification Enabled

Gel's connection reference documents three TLS security modes:

- `strict` verifies the certificate and hostname;
- `no_host_verification` verifies the certificate but not its hostname; and
- `insecure` disables certificate validation.

When a custom CA is supplied, the default mode may resolve to `no_host_verification`. Set this explicitly in production:

```yaml
environment:
  GEL_TLS_CA_FILE: /run/secrets/gel_ca
  GEL_CLIENT_TLS_SECURITY: strict
```

Then ensure the connection host appears in the certificate SAN. The example gives the Gel service a `gel.internal` network alias and places the same name in the application credentials.

If network routing requires connecting to one address while presenting a different TLS server name, Gel supports `GEL_TLS_SERVER_NAME` and the `--tls-server-name` CLI option. Prefer a coherent DNS name and certificate when possible; use an override only when the routing design requires it.

## Do Not Use Development Security Flags in Production

Gel's binary endpoint defaults to TLS. The official Docker image defaults the HTTP endpoint to `optional`, so set both endpoints explicitly to `tls` as shown. Do not use:

```yaml
environment:
  GEL_SERVER_SECURITY: insecure_dev_mode
```

That preset is for development and relaxes authentication and TLS-related behavior. Similarly, client settings such as `GEL_CLIENT_SECURITY=insecure_dev_mode` or `GEL_CLIENT_TLS_SECURITY=insecure` are not fixes for an incomplete chain or hostname mismatch.

Make certificate failure a deployment failure. `require_file` prevents the server from silently generating a different self-signed identity when the intended mounted material is missing.

## Verify From the Client Network

Check the TLS handshake from the same network and DNS view used by the application:

```bash
openssl s_client \
  -connect gel.internal:5656 \
  -servername gel.internal \
  -CAfile /run/secrets/gel_ca \
  -verify_hostname gel.internal \
  -verify_return_error \
  </dev/null
```

The path above assumes the command runs in a diagnostic container granted the CA secret. On an operator host, substitute the host's CA file path and a reachable Gel hostname.

Then test a Gel protocol connection with strict verification:

```bash
gel \
  --host gel.internal \
  --port 5656 \
  --branch main \
  --user app_user \
  --tls-ca-file /path/to/gel-root-ca.pem \
  --tls-security strict \
  --password \
  query 'select sys::get_version_as_str()'
```

`--password` prompts instead of placing the password in shell history. A successful TLS handshake is not enough: the Gel query confirms protocol negotiation and authentication too.

Gel also exposes readiness and aliveness over its HTTP endpoint. With the same trusted CA and hostname, an external health checker can request:

```bash
curl \
  --fail \
  --show-error \
  --cacert /path/to/gel-root-ca.pem \
  https://gel.internal:5656/server/status/ready
```

Use `/server/status/alive` to test whether the process is alive and `/server/status/ready` to test whether it is ready to receive queries. Do not weaken TLS verification just to make a health check pass.

## Diagnose Common Startup Failures

If the Gel container exits after TLS configuration, inspect its logs and check:

- both secret files were granted to the `gel` service;
- the paths exactly match `/run/secrets/...` names;
- the Gel process can read the mounted files;
- the certificate and key are valid PEM files and form a pair;
- the certificate chain is ordered and complete for the deployment's CA tooling;
- `generate_self_signed` is not set alongside explicit certificate files; and
- the tested image version supports the current `GEL_` variables.

If the server starts but the client rejects it, separate the error classes:

- unknown issuer usually indicates a missing or wrong CA trust file;
- hostname mismatch indicates a SAN or connection-host problem;
- expiration indicates certificate lifecycle failure;
- authentication failure happens after TLS and concerns the Gel role or password; and
- connection refusal concerns routing, listening, readiness, or port publication.

Do not respond to all five by setting TLS security to `insecure`.

## Rotate Certificates Intentionally

A safe rotation plan includes a new certificate, a compatible trust path, deployment to a canary, strict client verification, and an observed container replacement or restart so the Gel process loads the new files.

When changing certificate authorities, distribute trust before switching the server certificate. If the client trust bundle can contain both the old and new roots during the overlap, validate both paths, rotate the server, then remove the old trust only after every client has moved.

After rotation, verify:

- the certificate serial number and validity period served on port 5656;
- hostname verification from every relevant network path;
- Gel protocol authentication;
- readiness checks; and
- the absence of the old private key from containers that no longer need it.

Do not infer that editing a host file caused a running process to reload it. Replace or restart according to the behavior of the tested Gel image and your deployment platform.

## Version-aware Names

Gel 6 introduced the `GEL_` prefix for server configuration. Server releases before 6.0 use corresponding `EDGEDB_` names. Client connection-variable names follow the installed client or CLI generation rather than the target server version: current Gel clients use `GEL_`, while EdgeDB-era clients used `EDGEDB_`. The `gel` executable alias was already available for several pre-6 CLI releases, although older documentation and scripts generally use `edgedb`.

Do not set both generations speculatively. Identify the server image version and the installed client or CLI version, use their documentation, and migrate each configuration as part of the corresponding upgrade. The current client variable is `GEL_CLIENT_TLS_SECURITY`, while the CA file variable is `GEL_TLS_CA_FILE`.

## Official Documentation

- [Gel server configuration](https://docs.geldata.com/reference/running/configuration)
- [Gel Docker deployment](https://docs.geldata.com/reference/running/deployment/docker)
- [Gel connection parameters](https://docs.geldata.com/reference/using/connection)
- [Gel CLI connection options](https://docs.geldata.com/reference/using/cli/gel)
- [Gel HTTP readiness and aliveness endpoints](https://docs.geldata.com/reference/running/http)
- [Docker Compose secrets guide](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Docker Compose secrets reference](https://docs.docker.com/reference/compose-file/secrets/)
- [Docker Compose trust model](https://docs.docker.com/compose/trust-model/)

## Conclusion

Mount the server chain and private key only into the Gel service, point `GEL_SERVER_TLS_CERT_FILE` and `GEL_SERVER_TLS_KEY_FILE` at those files, and require them at startup. Give applications only their own credentials and the CA trust file, with `GEL_CLIENT_TLS_SECURITY=strict`. Finally, verify the real hostname, chain, Gel protocol, and readiness path from the client network. File mounts reduce environment-value exposure, but host security, service scoping, rotation, and strict verification remain part of the design.
