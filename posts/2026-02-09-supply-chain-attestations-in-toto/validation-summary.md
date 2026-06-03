# Validation Summary: Generate Supply Chain Attestations for Kubernetes Container Images Using In-Toto

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- in-toto
- Kubernetes admission webhooks
- GitHub Actions
- Sigstore cosign
- ORAS and OCI registry referrers
- SLSA provenance
- PrometheusRule
- Python and Flask

## Sources Consulted
- in-toto getting started: https://in-toto.io/docs/getting-started/
- in-toto `in-toto-run` CLI documentation: https://in-toto.readthedocs.io/en/latest/command-line-tools/in-toto-run.html
- in-toto Python API documentation: https://in-toto.readthedocs.io/en/latest/api.html
- in-toto layout creation example: https://in-toto.readthedocs.io/en/latest/layout-creation-example.html
- in-toto metadata model documentation: https://in-toto.readthedocs.io/en/latest/model.html
- securesystemslib Signer API documentation: https://python-securesystemslib.readthedocs.io/en/latest/signer.html
- Sigstore cosign attestation documentation: https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore cosign `attest` command documentation: https://github.com/sigstore/cosign/blob/main/doc/cosign_attest.md
- ORAS `attach`, `discover`, and `pull` command documentation: https://oras.land/docs/commands/oras_attach/, https://oras.land/docs/commands/oras_discover/, https://oras.land/docs/commands/oras_pull/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- SLSA build provenance v1.2 documentation: https://slsa.dev/spec/v1.2/build-provenance
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/

## Issues Found
- Replaced the nonexistent or outdated `in-toto-keygen` workflow with OpenSSL-generated Ed25519 PEM keys, which match the PEM key format accepted by current in-toto tooling.
- Fixed the layout creation script to use current in-toto model helpers, `securesystemslib` signers, real key IDs, and `Metablock.create_signature()` before dumping `root.layout`.
- Removed Docker image tag patterns from in-toto artifact rules because in-toto records filesystem artifacts, not Docker daemon image tags. The corrected layout records `image-digest.txt`, `test-results.xml`, and `signature.bundle`.
- Updated `in-toto-run --key` to `--signing-key`, which is the current documented CLI option.
- Moved digest creation inside the build command wrapped by `in-toto-run`, so `image-digest.txt` exists when products are recorded.
- Changed the test command to mount the workspace so `test-results.xml` is created on the host and can be recorded by in-toto.
- Updated GitHub Actions examples from deprecated `actions/checkout@v3` and `actions/upload-artifact@v3` to current v4 actions.
- Replaced the incorrect `cosign attach attestation` use for a tarball with ORAS OCI referrers, because cosign's attestation attach flow expects attestation envelopes or bundles, not arbitrary tar archives of traditional in-toto link metadata.
- Updated the webhook verifier to retrieve the ORAS referrer bundle, extract the link metadata, load the layout with `Metadata.load()`, load the root verification key, and call the current `in_toto_verify()` API.
- Updated the SLSA provenance example from the older v0.2 predicate shape to the current `https://slsa.dev/provenance/v1` structure and added `--type slsaprovenance1` to the cosign command.

## Review Notes
The corrected examples are still illustrative. A production webhook should use a non-adhoc TLS certificate, hardened tar extraction, registry authentication, timeouts tuned for admission latency, and a high-availability dependency strategy for registry lookups.
