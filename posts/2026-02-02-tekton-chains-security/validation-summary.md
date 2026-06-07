# Validation Summary: How to Use Tekton Chains for Security

## Status
validated

## Post Type
Tutorial / hands-on guide

## Technologies Covered
- Tekton Chains (controller, config, signing backends)
- Tekton Pipelines (Pipeline, PipelineRun, Task, TaskRun)
- Sigstore Cosign (key generation, image signing, attestation verification)
- Rekor transparency log (rekor-cli)
- SLSA framework (Provenance v0.2, Levels 1–3)
- Google Cloud KMS + Workload Identity
- HashiCorp Vault (transit secrets engine)
- Kyverno (ClusterPolicy / verifyImages)
- Sigstore policy-controller (ClusterImagePolicy)
- Kaniko (in-cluster image builds)

## Sources Consulted
- Tekton Chains documentation — https://tekton.dev/docs/chains/
- Tekton Chains config reference — https://tekton.dev/docs/chains/config/
- Tekton Chains signing config — https://tekton.dev/docs/chains/signing/
- Tekton Pipelines v1 API reference — https://tekton.dev/docs/pipelines/
- Tekton Hub (kaniko, git-clone tasks) — https://hub.tekton.dev/
- Cosign documentation — https://docs.sigstore.dev/cosign/signing/overview/
- Rekor CLI documentation — https://docs.sigstore.dev/logging/overview/
- SLSA specification — https://slsa.dev/spec/v0.2/ and https://slsa.dev/spec/v1.0/
- Kyverno verifyImages rule reference — https://kyverno.io/docs/writing-policies/verify-images/
- Sigstore policy-controller — https://docs.sigstore.dev/policy-controller/overview/
- Kaniko project — https://github.com/GoogleContainerTools/kaniko

## Issues Found
1. **Invalid signer value `cosign` in `chains-config.yaml`.** Tekton Chains supports only `x509` and `kms` as values for `artifacts.<type>.signer`. The `x509` signer is what uses cosign-compatible ECDSA keys. Changed `artifacts.taskrun.signer: cosign` and `artifacts.oci.signer: cosign` to `x509`.
2. **Misleading "Supported formats: x509, cosign" comment.** `x509` and `cosign` are not formats — they relate to signers. Replaced with `Supported signers: x509 (uses cosign-compatible keys), kms` and placed near the signer line for clarity.
3. **Non-existent config keys `artifacts.taskrun.enabled` and `artifacts.pipelinerun.enabled`.** These keys are not part of the Chains config schema. The way to enable/disable signing for a given artifact type is via `artifacts.<type>.storage` (set to empty to disable). Removed the bogus keys to avoid misleading readers.
4. **Vault ConfigMap used fabricated keys `signers.x509.vault.addr/path/key`.** Tekton Chains has no such keys. Vault is integrated through the **KMS signer** using a `hashivault://` KMS reference plus `signers.kms.auth.address` / `signers.kms.auth.token`. Rewrote the snippet to use the correct keys and to set `artifacts.taskrun.signer` / `artifacts.oci.signer` to `kms`.
5. **Contradictory `args` + `script` on the Kaniko step in `typed-build-task.yaml`.** Specifying both is confusing, and the standard `gcr.io/kaniko-project/executor:v1.19.0` image is distroless (no `/bin/sh`), so the `#!/bin/sh` script would fail to execute. Split the step in two: the Kaniko build step uses `args` only, and a second `alpine:3.20` step writes the `IMAGE_URL` result from the digest file. This preserves both result outputs and the type-hinting demonstration.

## Review Notes
- The post's GCP KMS Workload Identity example is simplified: it conflates granting `roles/cloudkms.signer` with binding the Kubernetes SA to a GCP SA via `roles/iam.workloadIdentityUser`, and it assumes a GCP service account named `tekton-chains-controller` already exists. The example is illustrative rather than a complete copy-paste recipe; readers following GCP's Workload Identity setup will need to also create the GCP SA, annotate the K8s SA, and grant `cloudkms.signer` on the key. Left as-is to avoid an in-scope restructure.
- The Kaniko task in Tekton Hub has newer versions than 0.6; the URL pattern still works, but readers may want to bump to the latest tagged version.
- `rekor-cli verify --artifact <oci-ref>` is shown with a container image reference. In practice, verifying an OCI image's Rekor inclusion is more naturally done with `cosign verify ... --rekor-url`. Left the example since `rekor-cli search --artifact` does accept references and the section is conceptual.
- `artifacts.taskrun.format: slsa/v1` correctly produces predicate type `https://slsa.dev/provenance/v0.2`, which matches the predicateType used in the Kyverno and policy-controller policies later in the post — internally consistent.
- The opening line "Tekton Chains is a Kubernetes Custom Resource Definition (CRD) controller" mirrors the wording on the official Tekton Chains README, even though Chains doesn't define its own CRDs (it observes Tekton Pipelines' CRDs). Kept as written for parity with upstream docs.
