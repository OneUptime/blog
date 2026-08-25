# How to Avoid Publishing Sensitive Email or Repository Identity Data in Fulcio’s Public CT Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Certificate Transparency, Privacy, OIDC, Cosign, Supply Chain Security

Description: Prevent accidental identity disclosure by inventorying Fulcio certificate fields before signing, choosing non-sensitive workload identities, and using a private trust domain when public transparency is incompatible with privacy requirements.

---

There is no private mode for a certificate issued by Sigstore's public Fulcio service. Public Fulcio issuance is designed to be transparent: the certificate is submitted to a public certificate-transparency (CT) log, and identity owners are expected to monitor that log for unexpected certificates.

If an email address, repository name, workflow path, environment, or run URL must remain confidential, the safe answer is to avoid putting it in a public Fulcio certificate. Disabling a later Rekor upload does not undo Fulcio's CT publication.

## Know What Becomes Public

A Fulcio certificate can expose:

- its email or URI Subject Alternative Name;
- the OIDC issuer;
- the raw token subject in modern certificates;
- Build Signer and Build Config URIs and immutable digests;
- source repository URI, ref, digest, numeric identifiers, and owner;
- runner environment and build trigger;
- a unique Actions run and attempt URL;
- repository visibility at signing; and
- a deployment environment name.

For current GitHub Actions mapping, the SAN contains `https://github.com/` plus `job_workflow_ref`. Provider-generic OID extensions can identify the source repository, top-level workflow, commit, ref, owner, run, and whether the repository was `public`, `private`, or `internal` when the certificate was issued.

The certificate does not contain the complete raw OIDC token, its bearer-token signature, or the source artifact. However, the visible metadata can still reveal an internal project name, release schedule, employee email, environment name, or repository relationship.

Rekor is separate from Fulcio CT. A normal Cosign signing event publishes the artifact digest, signature, and certificate-related verification material to Rekor. Hashes are not encryption: if an observer can guess or obtain an artifact, its digest can link that artifact to a public signing event.

## Public Append-Only Means Not Deletable

Transparency logs are useful precisely because entries cannot be quietly removed or rewritten. Fulcio's security model relies on certificate publication so identity owners can detect CA or OIDC mis-issuance. Cosign warns during identity-based signing that personally identifiable information can be stored in public transparency logs and cannot be removed later.

Do not plan on a support ticket, account deletion, certificate expiry, or repository rename removing historical data. A ten-minute certificate stops being usable for new signing quickly, but its public record remains useful for auditing old signatures.

## Inventory Claims Before the First Public Signature

Create a data-classification table for each signer:

| Candidate field | Example | Publicly acceptable? | Action |
| --- | --- | --- | --- |
| email SAN | `alice@corp.example` | no | use a governed workload identity or private deployment |
| workflow URI | `github.com/acme/secret-launch/...` | no | do not use public Fulcio for this workflow |
| environment | `customer-red-production` | no | rename to a non-sensitive class or keep signing private |
| source ref | `refs/heads/acquisition-target` | no | redesign branch naming or trust domain |
| public release workflow | `github.com/acme/widget/...` | yes | document and monitor it |

Decode a representative OIDC token locally without logging it, then map its claims through the exact Fulcio configuration version. GitHub's public mapping is visible in `config/identity/config.yaml`; a private instance's templates are under your control.

Use a canary identity containing no real personal or secret names, issue a staging or local certificate, and inspect it with:

```bash
openssl x509 -in fulcio-leaf.pem -noout \
  -subject -issuer -text
```

Search for the full Sigstore OID arc `1.3.6.1.4.1.57264`, not only the SAN. A certificate that has a safe-looking workflow SAN can still expose repository or environment data in its extensions.

Remember that a public staging log is still public. Use a fully local test trust domain for sensitive pre-production metadata.

## Prefer Workload Identity over Personal Email for Automation

For public automated releases, a CI workflow URI usually expresses policy better than a maintainer's email:

```text
https://github.com/acme/widget/.github/workflows/release.yml@refs/tags/v1.2.3
```

It avoids exposing a personal account and lets verifiers authorize a governed workflow identity. It still exposes the repository and workflow path, so it is appropriate only when those values are intended to be public.

Do not solve email privacy by creating a misleading shared mailbox unless the identity provider and organizational policy genuinely govern it as the signing principal. A verifier must be able to understand who or what controls the identity.

For a private CI provider, choose opaque stable identifiers only if operators and verifiers can resolve and govern them securely. Hashing the identity inside a SAN is not automatically private: small identity spaces can be guessed, and opaque values make monitoring and policy harder.

## Keep Secrets Out of Identity Claims and Templates

OIDC claims used for certificate identity or extensions are metadata, not secret storage. Never place these in a SAN or extension template:

- access tokens, API keys, or signed URLs;
- customer names or ticket contents;
- private registry credentials;
- unredacted user input;
- internal hostnames whose disclosure is prohibited; or
- environment variables copied wholesale from a job.

Use purpose-built claim names with defined formats. Review identity-provider and Fulcio configuration changes like public API changes, because a newly mapped claim can begin appearing in every certificate immediately after rollout.

## Use a Private Trust Domain for Confidential Work

If the signing identity or artifact relationship is confidential, operate a private Sigstore deployment or use another signing architecture whose audit model fits the requirement. A production private Sigstore deployment should address:

- a durable, protected CA signing backend;
- a trusted OIDC issuer and deliberately minimal identity mapping;
- a private CT log or documented equivalent CA audit mechanism, plus an accepted private timestamping path and any signature-transparency service required by verifier policy;
- authenticated distribution of current `trusted_root` and `signing_config` documents, preferably through private TUF or another secure out-of-band channel;
- access control, retention, monitoring, and incident-response policy; and
- a clear separation from public and staging roots.

“Private” must cover the logs and metadata distribution, not only the Fulcio HTTP endpoint. Configuring private Fulcio to use a public CT log that accepts its CA chain, or configuring signing clients to upload to public Rekor, still publishes the submitted information.

The Fulcio architecture allows private deployments to use another audit mechanism when public transparency is not necessary. That is a conscious security tradeoff: without independently monitored transparency, CA mis-issuance is harder to detect.

## Why `--tlog-upload=false` Is Not a Privacy Fix

In current Cosign, omit Rekor by using a signing configuration with no transparency-log service; the older `--tlog-upload=false` flag is deprecated and is incompatible with the default signing-config path. Neither choice stops public Fulcio from submitting its certificate or precertificate to Fulcio's CT log. Omitting Rekor removes its public log-inclusion evidence. Rekor v1 provided a signed `integratedTime`, but Rekor v2 does not provide signed time, so verification after an ephemeral certificate expires requires another accepted timestamp, such as an RFC 3161 timestamp.

Likewise, suppressing an interactive consent prompt with `--yes` only makes automation non-interactive. It does not make the transparency entries private.

If policy forbids publication, fail before obtaining a public Fulcio certificate. Do not issue first and attempt to redact the bundle afterward; Fulcio CT already holds the certificate or precertificate, including its identity metadata, and any completed Rekor upload has already exposed its signing material.

## Respond to an Accidental Disclosure

When sensitive metadata is accidentally logged:

1. Preserve the certificate fingerprint, CT/Rekor indices, and affected artifact digests for investigation.
2. Disable or constrain the OIDC identity and signing workflow so no further certificates are issued.
3. Rotate any actual secret if one was embedded; public-log immutability means it must be treated as compromised.
4. Update verifier policy to reject unauthorized artifacts or signer revisions.
5. Monitor both Fulcio CT and Rekor for additional occurrences.
6. Follow legal and privacy incident procedures; certificate expiry does not erase the disclosure.

Do not describe a public log entry as revoked or deleted when it remains visible. Communicate what verifier policy changed and which artifact digests are no longer trusted.

## Official Documentation

- [Fulcio certificate-transparency behavior](https://github.com/sigstore/fulcio#certificate-transparency)
- [Fulcio security model](https://github.com/sigstore/fulcio/blob/main/docs/security-model.md)
- [Sigstore threat model and identity monitoring](https://docs.sigstore.dev/about/threat-model/)
- [Current Fulcio GitHub identity and extension templates](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml)
- [Fulcio OID directory](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Cosign README privacy notice for keyless signing](https://github.com/sigstore/cosign#quick-start)
- [Fulcio architecture specification for private transparency choices](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#4-certificate-transparency)

## Conclusion

Public Fulcio certificates are public by design and cannot be redacted later. Inventory every SAN and OID before signing, prefer a non-personal workload identity for public automation, keep secrets out of claims, and move confidential identities and signing events into a deliberately private trust and audit domain.
