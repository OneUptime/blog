# How to Add a Corporate Root CA to a ko-Built Go Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Root CA, Certificate Authority, TLS, Container Image

Description: Trust an internal certificate authority in a ko-built service through a custom base, image augmentation, or a dedicated data path.

---

A private registry, outbound TLS proxy, internal database, or service mesh may present certificates rooted in a corporate certificate authority. A minimal `ko` image trusts the roots supplied by its base, not every organization's private PKI. Add only the public root or required intermediate certificates and verify the exact TLS path.

Never copy a CA private key into an image. Root certificates are public trust anchors; private signing material belongs in a protected PKI system.

## Confirm That Trust Is the Failure

Capture the hostname and error from the Go application. `x509: certificate signed by unknown authority` can mean the root is absent, but it can also mean the server omitted an intermediate certificate or the client connected with the wrong server name.

From an approved diagnostic machine:

```bash
openssl s_client -connect api.corp.example:443 \
  -servername api.corp.example \
  -showcerts </dev/null
```

Validate the chain and SAN. Do not solve a hostname mismatch by disabling verification. Fix the certificate or requested hostname.

Choose whether corporate trust is an image property or runtime configuration. A base-image trust store is consistent and easy to test by digest; a mounted CA can rotate without rebuilding but becomes another deployment dependency.

## Option 1: Use a Custom Base Image

The most conventional method is to build a runtime base that installs the certificate using its distribution's supported trust-store mechanism. A simplified Alpine example follows the upstream `ko` guidance:

```dockerfile
FROM alpine:3.22
RUN apk add --no-cache ca-certificates
COPY corp-root-ca.crt /usr/local/share/ca-certificates/corp-root-ca.crt
RUN chmod 0644 /usr/local/share/ca-certificates/corp-root-ca.crt \
    && update-ca-certificates
USER 65532:65532
```

Build, scan, and publish that base through a controlled pipeline. Then pin it:

```yaml
defaultBaseImage: registry.example.com/base/go-corp-ca@sha256:BASE_DIGEST
```

Build the application normally:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/services
ko build ./cmd/api
```

The precise certificate path and update command depend on the distribution. Use that distribution's documentation and verify the generated bundle. A Dockerfile copied between Debian and Alpine will not necessarily update the correct store.

For multiple commands, scope the base with `baseImageOverrides` so only workloads that need corporate trust inherit it.

## Option 2: Augment the Published Image with `incert`

The official `ko` documentation also identifies Chainguard's `incert`, which appends CA certificates to an existing image and publishes a new image:

```bash
source_ref=$(ko build ./cmd/api)

incert \
  -image-url="$source_ref" \
  -ca-certs-file=/secure-input/corp-roots.pem \
  -dest-image-url=registry.example.com/acme/api:with-corp-ca
```

The destination is a different image with a different digest. Capture, scan, sign, attest, and deploy that final digest - not the original digest returned by `ko`. Ensure the SBOM and provenance process describes the augmentation step.

Pin and verify the `incert` tool itself. Do not use an unreviewed downloaded binary in a release pipeline.

## Option 3: Bundle Certificates as `kodata`

For a Go application, `kodata` can carry PEM roots:

```text
cmd/api/
├── main.go
└── kodata/
    └── corp-root-ca.crt
```

`ko` puts these files under `KO_DATA_PATH`, normally `/var/run/ko` on Linux. Go's Unix root loader honors `SSL_CERT_DIR`, so set it to that directory at runtime:

```yaml
env:
  - name: SSL_CERT_DIR
    value: /var/run/ko
```

Or for Docker:

```bash
docker run --rm -e SSL_CERT_DIR=/var/run/ko "$IMAGE_REF"
```

Use a CA-only `kodata` directory for this pattern. `SSL_CERT_DIR` is a trust input, so mixing arbitrary templates and downloaded files into it makes review unnecessarily broad. The value inside the image is fixed when it is built.

This approach primarily targets Go's `crypto/x509` behavior. A subprocess or non-Go library may ignore `SSL_CERT_DIR` and use a different trust mechanism.

## Option 4: Mount the CA at Runtime

If certificate rotation must not wait for an image rebuild, mount a ConfigMap or managed volume and point `SSL_CERT_DIR` or `SSL_CERT_FILE` at it:

```yaml
volumes:
  - name: corporate-ca
    configMap:
      name: corporate-ca
containers:
  - name: api
    image: registry.example.com/acme/api@sha256:IMAGE_DIGEST
    env:
      - name: SSL_CERT_DIR
        value: /var/run/corporate-ca
    volumeMounts:
      - name: corporate-ca
        mountPath: /var/run/corporate-ca
        readOnly: true
```

The application may need a restart to rebuild its root pool after the mounted data changes. Make CA rollout and rollback explicit. Restrict who may update the ConfigMap because adding a trust anchor grants powerful interception capability.

## Preserve Public Roots When Required

Replacing the trust source with only a corporate root can break public HTTPS. Test both internal and external destinations required by the service. The exact interaction between default files and `SSL_CERT_DIR` is operating-system and Go implementation behavior; do not assume every language runtime merges sources identically.

When the application needs a tightly limited trust set for one upstream, construct an explicit `x509.CertPool` in code and attach it to a dedicated `tls.Config` rather than changing process-wide system roots. Preserve hostname validation and a modern minimum TLS version.

## Verify with the Actual Go Client

A shell-less image may not contain `curl` or OpenSSL, and adding them only for the test changes the artifact. Add a startup check, integration test, or small Go test using the same client configuration:

```go
resp, err := http.Get("https://api.corp.example/healthz")
if err != nil {
	log.Fatalf("corporate TLS check: %v", err)
}
defer resp.Body.Close()
```

Test these negative cases too:

- a server signed by an untrusted CA is rejected;
- a trusted certificate for the wrong hostname is rejected;
- an expired certificate is rejected; and
- removing the corporate root predictably breaks only the intended path.

## Rotate and Audit Trust

Keep certificate fingerprints and expiry dates in inventory:

```bash
openssl x509 -in corp-root-ca.crt -noout \
  -subject -issuer -serial -dates -fingerprint -sha256
```

During rotation, trust old and new roots for an overlap window, rotate server certificates, then remove the old root and rebuild or update the mount. Record which image or configuration digest contains each trust set.

## Conclusion

First verify that the error is truly an unknown root rather than a bad chain or hostname. Then choose a reviewed custom base, `incert` augmentation, `kodata`, or a runtime mount based on rotation and client requirements. Capture the final image digest, test with the real Go TLS stack, retain public trust where needed, and never weaken verification or ship private CA keys.

## Official Documentation

- [ko: Root CA Certificates](https://ko.build/advanced/root-ca-certificates/)
- [ko: Base Image Configuration](https://ko.build/configuration/#overriding-base-images)
- [ko: Static Assets](https://ko.build/features/static-assets/)
- [Go: `crypto/x509` SystemCertPool](https://pkg.go.dev/crypto/x509#SystemCertPool)
- [Go Source: Unix Root Certificate Loading](https://go.dev/src/crypto/x509/root_unix.go)
- [Chainguard `incert`](https://github.com/chainguard-dev/incert)
