# How to Verify Cosign Signatures from a Private Registry with Custom CAs and Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Private Registry, TLS, Image Verification, Container Security

Description: Configure registry authentication, private TLS roots, optional mTLS, and signing trust independently when verifying Cosign signatures by digest.

---

Verification against a private registry crosses two trust boundaries. Cosign must first authenticate the registry's HTTPS endpoint and be authorized to discover and pull signature artifacts. When given a tag rather than a digest, it must also resolve the subject through the registry. It must then verify the artifact signature against the expected public key or keyless identity.

Those checks use different credentials and certificates. A private registry CA does not make a signing certificate trusted, and a valid Cosign signature does not make an untrusted TLS connection safe.

## Map the full registry path

Start with an immutable reference:

```bash
IMAGE=registry.internal.example/team/payments@sha256:REPLACE_WITH_DIGEST
```

Current Cosign stores OCI 1.1 signature referrers in the same repository by default. The signer may instead set `COSIGN_REPOSITORY`, in which case verification must set the corresponding mapping and be able to pull from that signature repository too. Use Cosign 3.1.0 or newer when the alternate repository contains OCI bundles; Cosign 3.0.x did not honor that mapping when fetching bundles during verification.

List the endpoints and permissions involved:

- registry API for `team/payments`;
- registry API for any separate signature repository;
- registry token or identity service;
- private certificate-authority chain for the registry endpoint;
- optional client certificate/key for mTLS;
- Sigstore public-good services, a private Sigstore deployment, or local public-key material.

Troubleshoot them separately. “No signatures found” can be a discovery, repository-mapping, client-version, or storage-format failure rather than proof that the artifact is unsigned. Authorization failures normally surface separately, but verify access before concluding that no signature exists.

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

Test authorization with a non-mutating operation. An initial `401` is normally the Bearer-authentication challenge. A final `401` after the client handles that challenge means acceptable credentials were not supplied; `403` or `DENIED` commonly means the authenticated identity lacks repository access. The subject and referrers stored with it use the same repository pull scope, while a configured `COSIGN_REPOSITORY` requires pull access to that separate repository and, if its host differs, credentials and TLS trust for that registry.

## Trust an internal registry CA

If the registry certificate chains to a private CA, supply that CA in PEM form:

```bash
cosign verify \
  --registry-cacert=/etc/company/pki/registry-ca.pem \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$IMAGE"
```

`--registry-cacert` controls TLS server-certificate validation for the registry connection. When it is set, Cosign uses the supplied PEM as the registry transport's root pool rather than adding it to the system roots. Include the trust anchors needed by every registry and separate HTTPS token service reached through that transport, not the registry's private key or an unrelated Fulcio root.

An alternative is to install the CA into the operating system or container trust store used by the verifier. That can simplify several registry tools, but broad trust-store changes affect every process in the environment. Scope and manage the CA deliberately.

Do not use `--allow-insecure-registry` as a production workaround. Cosign's command documentation says it is for testing. The flag disables certificate verification and enables insecure registry handling, which can use HTTP. A network attacker could impersonate the registry, steal registry credentials, suppress signature discovery, or replay registry metadata. Digest and signature checks still prevent a differently digested image or forged signature from passing.

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

The client certificate and key authenticate the verifier to the registry transport. Protect the key as a secret and mount it read-only. `--registry-server-name` sets the name used for TLS hostname verification when routing or service discovery makes that necessary; it should match an authorized SAN in the server certificate, not bypass name checking. It applies to the registry client transport, so do not set it to a name that conflicts with a separate HTTPS token service or mapped signature-registry host reached through that transport.

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

`--trusted-root` describes Sigstore verification authorities, such as Fulcio and transparency-log trust. It does not validate the registry's HTTPS certificate. Cosign 3.1 deprecates the legacy `--ca-roots`, `--ca-intermediates`, and `--certificate-chain` verification options in favor of `--trusted-root`; those options concern signing certificate chains, not registry transport, and standardized bundle verification rejects them.

## Use the Kubernetes keychain when appropriate

Cosign's verification command exposes `--k8s-keychain` to combine the default registry keychain with built-in cloud and registry credential providers, including support for ambient workload identity. Use it only when the verifier's runtime has the intended credentials. Despite the option's name, it does not read a Pod's `imagePullSecrets`.

For admission controllers, follow that controller's credential model rather than assuming it inherits an operator's local Cosign login. Kyverno, for example, can use configured image-registry credentials and, starting in Kyverno 1.18, automatically use a Pod's `spec.imagePullSecrets`. Its admission and background controller service accounts need permission to read those Secrets in each Pod namespace. The controller also needs trust for the registry CA in its own runtime.

## Diagnose in layers

Use this order:

1. Resolve DNS and connect to the registry endpoint.
2. Verify the TLS chain and hostname using the intended CA.
3. Authenticate and confirm pull permission for the repository that holds the signature material. If the workload will pull the image, also confirm subject pull permission by digest.
4. Discover signature referrers in the expected repository.
5. Pull the signature artifact.
6. Validate the signature and signed subject digest against the configured public key or, for keyless verification, the certificate chain, identity, and issuer. Check any policy-required trusted-time and transparency evidence too.
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
