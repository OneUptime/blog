# How to Connect Portainer to a Private Registry Without 401 or Certificate Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Private Registry, Container Registry, TLS, Authentication, DevOps

Description: Connect Portainer to an authenticated private Docker registry, install the correct CA trust, and diagnose 401 Unauthorized and TLS certificate failures without weakening security.

---

A private registry connection has two independent security checks:

1. **Authentication and authorization** decide whether the supplied account may pull a particular repository and tag.
2. **TLS verification** decides whether the registry really is the server named in its URL and whether its certificate chains to a trusted certificate authority (CA).

Treat these as separate problems. Changing credentials cannot repair an unknown CA, and disabling certificate verification cannot grant permission to a repository. This guide uses a registry at `registry.example.com:5000` and an image named `registry.example.com:5000/platform/api:1.4.2`; replace both with your real values.

## Understand Which Components Contact the Registry

For a Docker environment managed by Portainer, more than one component can contact the registry:

- Portainer stores registry details and credentials, displays registry information, and supplies credentials during supported deployment operations.
- The Docker Engine on the target environment pulls image layers and verifies the registry's TLS certificate.
- If Portainer or a Portainer Agent must connect directly to an HTTPS resource signed by a private CA, its container also needs that CA in its trust store.

This explains a common symptom: Portainer can save a registry entry, but a deployment still fails with `x509: certificate signed by unknown authority`. The Docker daemon performing the pull does not yet trust the registry CA.

## Step 1: Verify the Registry Name and TLS Certificate

Use the exact DNS name clients will use in image references:

```bash
curl -v https://registry.example.com:5000/v2/
```

For a registry that requires authentication, an HTTP `401 Unauthorized` response can be normal at this stage. A conforming registry uses that response and a `WWW-Authenticate` header to tell the client how to obtain credentials. What must succeed first is the TLS handshake.

If `curl` reports a hostname mismatch, fix the registry certificate or use the DNS name covered by its Subject Alternative Names. If it reports an unknown issuer, obtain the **public CA certificate** that signed the registry certificate. Do not distribute the registry's private key.

After obtaining a private CA certificate that is not already in `curl`'s trust store, confirm the same request validates against that CA:

```bash
curl --cacert registry-root-ca.crt -v \
  https://registry.example.com:5000/v2/
```

Also check the certificate chain and system clocks. An otherwise valid certificate fails when an intermediate is missing, the certificate is expired or not yet valid, or the client clock is wrong.

## Step 2: Make Every Target Docker Engine Trust a Private CA

On each Linux Docker host that may pull the image, create a certificate directory whose name exactly matches the registry host and port:

```bash
sudo mkdir -p /etc/docker/certs.d/registry.example.com:5000
sudo cp registry-root-ca.crt \
  /etc/docker/certs.d/registry.example.com:5000/ca.crt
sudo systemctl restart docker
```

The filename must end in `.crt`. Docker's certificate documentation distinguishes CA files ending in `.crt` from client certificates ending in `.cert`. The directory must include `:5000` when the image name includes that non-default port.

Repeat this on every Swarm node that might run the service. Trust configured only on a manager does not help a worker that performs its own pull.

Test from the actual target host:

```bash
docker login registry.example.com:5000
docker pull registry.example.com:5000/platform/api:1.4.2
```

Use a robot account, deploy token, or other least-privilege credential with pull access to the required repositories. Avoid a registry-wide administrator credential. A successful local `docker login` is an important test, but it does not automatically copy that credential into Portainer; configure the registry in Portainer as the next step.

### Do Not Normalize the Problem Away with an Insecure Registry

Docker can be configured to treat registries as insecure, but that removes or weakens a critical identity check. It is not the production fix for a private CA. Install the CA and keep HTTPS verification enabled.

## Step 3: Add the Registry to Portainer

Sign in as a Portainer administrator, then:

1. Open **Registries** and select **Add registry**.
2. Choose **Custom registry**.
3. Enter a descriptive name.
4. Enter `registry.example.com:5000` as the registry URL. Do not append a repository, image tag, or `/v2/` API path.
5. Enable **Authentication**.
6. Enter the registry username and password or token.
7. Select **Add registry**.

Portainer assumes `https://` when no protocol is supplied. The credential must match the same registry authority used in the image name, including the port. Credentials stored for `registry.example.com` do not necessarily match `registry.example.com:5000`.

When deploying a stack, select the intended registry in the stack's registry settings. Portainer's stack documentation specifically recommends selecting it explicitly when several configured registries use the same provider, because Docker might otherwise receive the wrong credentials.

Use a fully qualified image reference in Compose:

```yaml
services:
  api:
    image: registry.example.com:5000/platform/api:1.4.2
    restart: unless-stopped
```

The image value contains no URL scheme. `https://registry.example.com:5000/platform/api:1.4.2` is not a valid Docker image reference.

## Step 4: Add the Private CA to Portainer When It Needs It

If Portainer itself logs an unknown-authority error while browsing or contacting the registry, add the private CA to the host's normal CA bundle and mount that bundle into the Portainer Server container. Portainer's official custom-CA guidance expects the bundle inside the container at `/etc/ssl/certs/ca-certificates.crt`.

For example, after installing the CA in the Linux host's CA store, include this read-only mount in the Portainer service:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    command: -H unix:///var/run/docker.sock
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - /etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt:ro
    restart: always

volumes:
  portainer_data:
```

If a Portainer Agent also makes HTTPS connections that require the CA, apply the same trust-store approach to the Agent host and container as described by Portainer. This trust is separate from `/etc/docker/certs.d/...`, so keep the Docker daemon configuration from Step 2.

Re-create the Portainer container after changing its mounts. Its persistent configuration remains in `portainer_data`; do not replace that volume.

## Diagnose `401 Unauthorized` Correctly

First identify which request produced the 401.

### A 401 from `GET /v2/` Without Credentials

This is often the registry's expected authentication challenge. Look for a `WWW-Authenticate` response header. Continue by testing `docker login` and `docker pull` rather than treating the anonymous probe as a failed registry.

### `docker login` Returns 401

Check the following:

- The username and token belong to the same registry hostname.
- The registry expects a token rather than the interactive account password.
- The token is unexpired and has not been revoked.
- A reverse proxy forwards the registry's `Authorization` and `WWW-Authenticate` headers.
- The registry URL does not contain a repository path.

### Login Works but Pull Returns 401 or `denied`

Authentication succeeded, but the identity may lack repository authorization. Confirm that the account has pull/read scope for `platform/api`, that the repository spelling and case are correct for the registry, and that the requested tag exists.

### CLI Pull Works but the Portainer Stack Fails

This usually means the CLI and Portainer are not using the same credentials or deployment node:

- Re-enter the credential in Portainer; a local Docker credential store is separate.
- Explicitly select the correct registry while creating or updating the stack.
- For Swarm, ensure credentials are available for service deployment and every eligible node trusts the CA.
- Confirm the image reference uses the same host and port as the Portainer registry entry.

## Diagnose Certificate Errors by Message

| Error | Likely cause | Correct fix |
|---|---|---|
| `x509: certificate signed by unknown authority` | The caller lacks the private root or intermediate CA | Install the CA in the Docker host and, when needed, the Portainer/Agent trust store |
| `certificate is valid for ..., not registry.example.com` | URL hostname is not in the certificate SANs | Issue a certificate for the registry DNS name or use the covered name |
| `certificate has expired or is not yet valid` | Expired certificate or incorrect clock | Renew the certificate and verify time synchronization |
| `server gave HTTP response to HTTPS client` | Registry or reverse proxy is serving plain HTTP on a URL treated as HTTPS | Configure TLS correctly; do not silently switch production traffic to insecure HTTP |
| `unauthorized: authentication required` | Missing, incorrect, or misrouted credentials | Fix the Portainer registry entry and repository permissions |
| `denied: requested access to the resource is denied` | Identity authenticated but lacks repository scope, or image name is wrong | Grant minimum pull scope and verify repository path |

## A Safe End-to-End Test

Use this order so each test proves one layer:

```bash
# 1. DNS should resolve to the intended registry.
getent hosts registry.example.com

# 2. TLS should validate against the private CA. The GET may return HTTP 401.
curl --cacert registry-root-ca.crt -sS -o /dev/null -D - \
  https://registry.example.com:5000/v2/

# 3. Credentials and repository authorization should work on the target engine.
docker login registry.example.com:5000
docker pull registry.example.com:5000/platform/api:1.4.2
```

Then add the same authority and least-privilege credential in Portainer, select that registry for the stack, and deploy the same fully qualified image. This progression avoids changing multiple security controls at once and makes the failing layer obvious.

## Production Checklist

- The registry certificate covers the exact DNS name used in image references.
- The server supplies its leaf certificate and required intermediate chain, and all systems have synchronized clocks.
- Every Docker node trusts a private registry CA under the matching `/etc/docker/certs.d/<host>:<port>/` directory.
- Portainer and Agents trust the private CA when they make direct HTTPS requests.
- Portainer stores a dedicated, least-privilege pull credential.
- The correct registry is explicitly selected for stack deployment.
- Compose images use registry-enforced immutable version tags or digests rather than relying on `latest`.
- TLS verification remains enabled; private CA trust replaces insecure-registry workarounds.

## Official Documentation

- [Portainer: Add a custom registry](https://docs.portainer.io/admin/registries/add/custom)
- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Use a custom certificate authority](https://docs.portainer.io/faqs/troubleshooting/certificates-and-security/how-can-i-use-my-custom-certificate-authority-ca-with-portainer)
- [Docker: Verify repository clients with certificates](https://docs.docker.com/engine/security/certificates/)
- [Docker: `docker login` reference](https://docs.docker.com/reference/cli/docker/login/)
- [Docker Registry: Token authentication specification](https://docs.docker.com/reference/api/registry/auth/)

## Conclusion

A reliable Portainer-to-registry connection requires the same registry authority everywhere, a credential authorized for the requested repository, and CA trust in every component that establishes TLS. Validate TLS first, test authentication from the target Docker Engine, then configure the identical registry and credential in Portainer. That fixes the root cause of 401 and certificate failures without disabling the protections a private registry is meant to provide.
