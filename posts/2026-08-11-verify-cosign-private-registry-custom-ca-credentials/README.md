# How to Verify Cosign Signatures from a Private Registry with Custom CAs and Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Private Registry, TLS, Image Verification, Container Security

Description: Configure registry authentication, private TLS roots, optional mTLS, and signing trust independently when verifying Cosign signatures by digest.

---

Verification against a private registry crosses two trust boundaries. Cosign must first authenticate the registry's HTTPS endpoint and authorize pulls of the subject and signature artifacts. It must then verify the artifact signature against the expected public key or keyless identity.

Those checks use different credentials and certificates. A private registry CA does not make a signing certificate trusted, and a valid Cosign signature does not make an untrusted TLS connection safe.

## Map the full registry path

Start with an immutable reference:

```bash
IMAGE=registry.internal.example/team/payments@sha256:REPLACE_WITH_DIGEST
```

Current Cosign stores OCI 1.1 signature referrers in the same repository by default. The signer may instead set `COSIGN_REPOSITORY`, in which case verification must be able to pull from that mapped signature repository too.

List the endpoints and permissions involved:

- registry API for `team/payments`;
- registry API for any separate signature repository;
- registry token or identity service;
- private certificate-authority chain for the registry endpoint;
- optional client certificate/key for mTLS;
- Sigstore public-good services, a private Sigstore deployment, or local public-key material.

Troubleshoot them separately. “No signatures found” can be a discovery or authorization failure rather than proof that the artifact is unsigned.

## Authenticate without exposing a password

Cosign provides a registry login command with password-from-stdin support:

```bash
printf '%s' "$REGISTRY_PASSWORD" \
  | cosign login \
      --username "$REGISTRY_USERNAME" \
      --password-stdin \
      registry.internal.example
```

Run this in an ephemeral CI environment and protect the resulting credential configuration. Prefer short-lived workload credentials or a registry credential helper where supported. Never enable shell tracing around secrets.

`cosign verify` also exposes `--registry-username`, `--registry-password`, and `--registry-token`. Command-line secrets can appear in process listings and job logs, so use them only when the execution environment protects arguments and no safer login/helper mechanism is available.

Test authorization with a non-mutating operation. A `401` usually means authentication was not accepted; a `403` often means the identity lacks repository pull scope. The subject and referrer may require the same repository scope, while a configured `COSIGN_REPOSITORY` requires another scope.

## Trust an internal registry CA

If the registry certificate chains to a private CA, supply that CA in PEM form:

```bash
cosign verify \
  --registry-cacert=/etc/company/pki/registry-ca.pem \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$IMAGE"
```

`--registry-cacert` controls TLS server-certificate validation for the registry connection. The PEM should contain the appropriate CA chain, not the registry's private key and not an unrelated Fulcio root.

An alternative is to install the CA into the operating system or container trust store used by the verifier. That can simplify several registry tools, but broad trust-store changes affect every process in the environment. Scope and manage the CA deliberately.

Do not use `--allow-insecure-registry` as a production workaround. Cosign's command documentation says it is for testing. Skipping TLS verification permits a network attacker to impersonate the registry, hide referrers, or serve stale content even if a forged image signature would still fail.

## Handle mutual TLS explicitly

For a registry that requires a client certificate, Cosign exposes paired client-certificate options:

```bash
cosign verify \
  --registry-cacert=/etc/company/pki/registry-ca.pem \
  --registry-client-cert=/run/secrets/registry-client.crt \
  --registry-client-key=/run/secrets/registry-client.key \
  --registry-server-name=registry.internal.example \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$IMAGE"
```

The client certificate and key authenticate the verifier to the registry transport. Protect the key as a secret and mount it read-only. `--registry-server-name` sets the name used for TLS hostname verification when routing or service discovery makes that necessary; it should match an authorized SAN in the server certificate, not bypass name checking.

mTLS may coexist with registry bearer authorization. In that case both the TLS client identity and the registry token must be accepted.

## Configure signature trust separately

For a public-key signature:

```bash
cosign verify \
  --registry-cacert=/etc/company/pki/registry-ca.pem \
  --key=/etc/company/cosign/release.pub \
  "$IMAGE"
```

For a public-good keyless signature, use the exact certificate identity and issuer. For a private Sigstore deployment, provide its trusted root plus its identity constraints:

```bash
cosign verify \
  --registry-cacert=/etc/company/pki/registry-ca.pem \
  --trusted-root=/etc/company/sigstore/trusted-root.json \
  --certificate-identity='spiffe://build.example/release/payments' \
  --certificate-oidc-issuer='https://issuer.example' \
  "$IMAGE"
```

`--trusted-root` describes Sigstore verification authorities, such as Fulcio and transparency-log trust. It does not validate the registry's HTTPS certificate. Similarly, Cosign's `--ca-roots`, `--ca-intermediates`, and `--certificate-chain` options are for verifying signing certificate chains, not registry transport.

## Use the Kubernetes keychain when appropriate

Cosign's verification command exposes `--k8s-keychain` for Kubernetes credential semantics and workload identity. Use it only when the process actually runs with the intended cluster identity and its registry integration is configured.

For admission controllers, follow that controller's credential model rather than assuming it inherits an operator's local Cosign login. Kyverno, for example, can use configured image-registry credentials and, in current releases, Pod `imagePullSecrets` subject to RBAC. The controller also needs trust for the registry CA in its own runtime.

## Diagnose in layers

Use this order:

1. Resolve DNS and connect to the registry endpoint.
2. Verify the TLS chain and hostname using the intended CA.
3. Authenticate and confirm pull permission for the subject by digest.
4. Discover signature referrers in the expected repository.
5. Pull the signature artifact.
6. Validate the signature, signed subject digest, key or certificate chain, identity, issuer, trusted time, and transparency evidence.
7. Run the same check from the admission-controller or CI runtime, not only an administrator's laptop.

Avoid weakening a later layer to compensate for an earlier failure. `--insecure-ignore-tlog` cannot repair registry TLS, and `--allow-insecure-registry` cannot repair a wrong signing identity.

## Private-registry verification checklist

- [ ] Pin the image by digest.
- [ ] Identify the image and any separate signature repository.
- [ ] Use short-lived credentials and password-from-stdin or a helper.
- [ ] Grant pull-only scope to verifiers.
- [ ] Install or pass the correct registry CA.
- [ ] Configure client certificate and key only when mTLS is required.
- [ ] Keep registry TLS trust separate from Sigstore/signing trust.
- [ ] Require an exact public key or keyless identity and issuer.
- [ ] Test from the real CI or admission-controller network and identity.
- [ ] Keep insecure transport and transparency-bypass flags out of production.

## Official Documentation

- [Cosign verification command and registry options](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Cosign registry login command](https://github.com/sigstore/cosign/blob/main/doc/cosign_login.md)
- [Sigstore registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Sigstore verification guide](https://docs.sigstore.dev/cosign/verifying/verify/)
- [OCI Distribution Specification authentication and API behavior](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [CNCF Distribution token authentication specification](https://distribution.github.io/distribution/spec/auth/token/)

## Conclusion

Private-registry verification succeeds only when transport trust, registry authorization, artifact discovery, and signature policy all succeed independently. Use a private CA rather than disabling TLS checks, grant pull access to every signature location, and still enforce the exact key or keyless identity that is authorized to release the digest.
