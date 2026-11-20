# Check Runner Environment Claims in Fulcio Certificates Before Accepting Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, CI/CD, Security, Python

Description: Evaluate Fulcio runner environment metadata with provider-specific allowlists, missing-field rejection, and tests that keep runner claims separate from build provenance.

A signature from the expected workflow can still come from a runner class your release policy does not permit. Fulcio's runner environment extension lets a verifier inspect that distinction, provided the certificate issuer actually maps the provider's claim into the certificate and the verifier enforces the result.

The extension does not certify every property of the machine. Treat it as one authenticated input to your acceptance policy, alongside the signer, source, and artifact verification results.

## Identify the provider's vocabulary

Fulcio assigns runner environment to OID `1.3.6.1.4.1.57264.1.11`. The [OID documentation](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md) describes platform-hosted versus customer-hosted execution, while warning that consumers cannot assume every provider uses the same format.

For GitHub, the [OIDC reference](https://docs.github.com/en/actions/reference/security/oidc) documents `runner_environment` values such as `github-hosted` and `self-hosted`. Use the exact provider-specific value. A generic test that accepts every string ending in `-hosted` would accept both of these even when the policy intends to allow only GitHub-hosted execution.

Review the identity configuration for your own Fulcio deployment, including the release and any local changes. The [upstream provider templates](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml) show that mappings differ across CI systems. In particular, CircleCI's SSH-rerun handling is not a translation into GitHub's two-value vocabulary.

## Inspect an authenticated certificate

Obtain the leaf certificate from the exact signature or bundle your normal verifier accepted for the artifact digest. Reading an arbitrary PEM file is useful during development, but its fields are not trustworthy until the certificate and artifact signature have been verified.

The following inspection code requires `cryptography` and `pyasn1`. It reads the DER-encoded string instead of stripping bytes from a human-readable OpenSSL dump:

```python
from pathlib import Path
from cryptography import x509
from cryptography.x509.oid import ObjectIdentifier
from pyasn1.codec.der.decoder import decode
from pyasn1.type.char import UTF8String

cert = x509.load_pem_x509_certificate(
    Path("certificate.pem").read_bytes()
)
extension = cert.extensions.get_extension_for_oid(
    ObjectIdentifier("1.3.6.1.4.1.57264.1.11")
)
value, rest = decode(extension.value.value, asn1Spec=UTF8String())
if rest or not str(value):
    raise ValueError("Malformed runner environment extension")
runner_environment = str(value)
print(repr(runner_environment))
```

The X.509 and DER APIs are documented by [cryptography](https://cryptography.io/en/latest/x509/reference/) and [pyasn1](https://pyasn1.readthedocs.io/en/latest/pyasn1/codec/der/contents.html). A missing extension raises an exception here. An enforcing verifier should turn that outcome into a clear policy rejection rather than defaulting to an approved runner class.

## Apply a narrow policy

Suppose your release policy permits only GitHub-hosted execution. After the normal signature checks and authenticated extraction, the relevant predicate could be:

```python
def runner_is_allowed(verified_issuer, runner_environment):
    allowed = {
        "https://token.actions.githubusercontent.com": {"github-hosted"},
    }
    return runner_environment in allowed.get(verified_issuer, set())
```

This is an application policy example, not a Fulcio configuration field or a complete signature verifier. It deliberately rejects an unknown issuer, missing value, unexpected case, and new provider value. Add another provider only after deciding what its runner claims mean.

Keep the predicate in the actual acceptance path. A script that prints a rejection after an admission controller has already allowed the image does not enforce anything. Likewise, verify that the controller supports custom extension conditions rather than assuming standard issuer and subject checks include them.

## Test the boundaries

Build fixtures for an approved runner value, `self-hosted`, an empty extension, an absent extension, an unknown value, and malformed DER. Include a certificate with the approved value but the wrong signer identity. The last case catches an implementation that accidentally replaces the main identity policy with a runner check.

Use staging workflows to confirm that your real CA emits the expected values for the runner types you operate. Record the observed issuer, subject, runner value, artifact digest, and verdict. Preserve the version of the CA templates and verifier so future provider changes can be evaluated deliberately.

A platform-hosted claim does not establish that a dependency was trustworthy, a workflow was protected, or an artifact matches reviewed source. Conversely, a self-hosted runner may be acceptable under a policy with separate controls. The value only has meaning in the context of the release requirements you defined.

When a previously accepted build begins failing, compare the certificate extension and provider mapping first. Explain whether the failure is missing evidence, a changed claim value, or a deliberate policy violation. Avoid broadening the allowlist simply to make the release pass; resolve which execution environment actually produced the signature.
