# How to Trace a Fulcio Signing Certificate to the Exact CI Run Attempt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, CI/CD, Python, Troubleshooting

Description: Extract the run invocation URI from a Fulcio certificate and correlate the verified signing evidence with the precise GitHub Actions attempt or provider-specific job.

A workflow run can have several attempts. If an incident report records only the run number, it can point investigators to a later rerun instead of the execution that signed the artifact. Fulcio certificates can carry a run invocation URI that gives you a more precise starting point.

Begin with the certificate associated with a successfully verified artifact signature. A certificate downloaded from an unrelated job is not evidence about that artifact. Record the artifact digest, signature or bundle location, certificate fingerprint, and verification policy before following any CI links.

## Extract the invocation extension

The run invocation URI uses OID `1.3.6.1.4.1.57264.1.21`. Fulcio's [extension implementation](https://github.com/sigstore/fulcio/blob/main/pkg/certificate/extensions.go) encodes it as a DER UTF8String. It is optional, so absence should produce an explicit evidence gap rather than a fabricated run URL.

For a local inspection tool, install `cryptography` and `pyasn1` in an isolated Python environment. Save the leaf signing certificate as `certificate.pem`, then run:

```python
from pathlib import Path
from cryptography import x509
from cryptography.x509.oid import ObjectIdentifier
from pyasn1.codec.der.decoder import decode
from pyasn1.type.char import UTF8String

cert = x509.load_pem_x509_certificate(
    Path("certificate.pem").read_bytes()
)
try:
    extension = cert.extensions.get_extension_for_oid(
        ObjectIdentifier("1.3.6.1.4.1.57264.1.21")
    )
except x509.ExtensionNotFound:
    raise SystemExit("Certificate has no run invocation URI")

value, rest = decode(extension.value.value, asn1Spec=UTF8String())
if rest or not str(value):
    raise SystemExit("Malformed or empty run invocation URI")
print(str(value))
```

The [cryptography X.509 API](https://cryptography.io/en/latest/x509/reference/) exposes unrecognized extension bytes, and the [pyasn1 DER decoder](https://pyasn1.readthedocs.io/en/latest/pyasn1/codec/der/contents.html) handles their inner string encoding. This script only extracts metadata; it does not verify the artifact or certificate.

## Interpret the URI for the correct provider

The current [Fulcio identity configuration](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml) maps GitHub's run ID and attempt into a URL of this shape:

```text
https://github.com/OWNER/REPOSITORY/actions/runs/RUN_ID/attempts/ATTEMPT
```

Its GitLab mapping instead identifies a particular job. Other providers use their own identifiers and paths. Do not parse every provider URL as if it were a GitHub run. First establish the trusted issuer and provider mapping used by the CA that issued the certificate.

For GitHub, retain the attempt suffix when opening the UI or querying the API. A run-level page can emphasize the latest attempt, which is not necessarily the signed attempt. The workflow name is also insufficient: names can repeat across repositories and change over time.

## Query the exact GitHub attempt

GitHub documents an endpoint for [getting a workflow run attempt](https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run-attempt). With authenticated GitHub CLI access to the repository, substitute the values extracted from the verified certificate:

```bash
gh api repos/OWNER/REPOSITORY/actions/runs/RUN_ID/attempts/ATTEMPT \
  --jq '{id,run_attempt,head_sha,event,status,conclusion,html_url}'
```

Compare `run_attempt` and `head_sha` with your evidence record. Next inspect the jobs and logs belonging to that attempt, not just a similarly timed successful build. A rerun may have different runner placement or artifacts, but it uses the original triggering actor’s privileges and the same source commit and Git ref.

A 404 response is ambiguous. Check repository permissions, whether the repository was renamed, and retention or deletion of run data. Do not conclude that the certificate contains a false claim merely because your account cannot retrieve a private run.

## Correlate more than the link

Compare the source repository digest, build signer URI, and build configuration metadata with the workflow under investigation. A reusable workflow may be the signer while a different top-level workflow initiated execution. Preserve both relationships rather than flattening them into one filename.

The run URI identifies an execution context; it does not by itself prove which command produced the bytes in your container image. Use the verified signature and any authenticated provenance to connect the artifact digest with that context. Logs then help explain what happened within it.

Avoid automatically fetching arbitrary certificate URLs from privileged infrastructure. Select the expected CI hostname and API route after validating the issuer and URI shape. That also makes provider-specific handling explicit.

Store the exact attempt, immutable source digest, and certificate fingerprint in the incident record. If the invocation extension is missing, document which other evidence established the run association and how confident that association is. A clear evidence gap is preferable to silently treating the latest attempt as the signing attempt.
