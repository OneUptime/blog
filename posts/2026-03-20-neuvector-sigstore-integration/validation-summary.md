# Validation Summary: How to Configure NeuVector Sigstore Integration

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (admission control, Sigstore root-of-trust API)
- Sigstore / Cosign (image signing CLI, keypair and keyless modes)
- Kubernetes (admission webhooks, Pod manifests)
- GitHub Actions (sigstore/cosign-installer)
- OCI container registries

## Sources Consulted
- NeuVector Sigstore Cosign Signature Verifiers docs: https://open-docs.neuvector.com/policy/admission/sigstore/
- NeuVector Admission Controls docs: https://open-docs.neuvector.com/policy/admission/
- NeuVector REST API spec (apis.yaml): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector controller types (apis.go): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector criteria constants (share/criteria.go): https://github.com/neuvector/neuvector/blob/main/share/criteria.go
- NeuVector sigstore REST handler (controller/rest/sigstore.go): https://github.com/neuvector/neuvector/blob/main/controller/rest/sigstore.go
- NeuVector admission cache (controller/cache/admission.go): https://github.com/neuvector/neuvector/blob/main/controller/cache/admission.go
- Sigstore Cosign installation docs: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/

## Issues Found

1. **Wrong API endpoint path for Sigstore root of trust (Steps 4 and 6)** — Post used `/v1/scan/sigstore_root_of_trust` and `/v1/scan/sigstore_root_of_trust/{name}`. The correct paths per NeuVector's `apis.yaml` are `/v1/scan/sigstore/root_of_trust` and `/v1/scan/sigstore/root_of_trust/{root_name}`. Fixed in both steps.

2. **Invalid request body schema for Step 4 (root-of-trust POST)** — Post wrapped the body in `{ "config": {...} }` and used non-existent fields (`rootkeys[]`, `root_of_trust_type`, top-level `public_key`, `cfg_type`). The actual `REST_SigstoreRootOfTrust_POST` schema is unwrapped and only accepts `name`, `is_private`, `rootless_keypairs_only`, `rekor_public_key`, `root_cert`, `sct_public_key`, `comment`. Replaced the body with a valid root-of-trust create call (key-pair-only public root) and a separate POST to `/v1/scan/sigstore/root_of_trust/{root_name}/verifier` to add the keypair verifier (matching `REST_SigstoreVerifier`: `name`, `verifier_type` (enum `keypair`/`keyless`), `public_key`, `comment`).

3. **Invalid `cfg_type` value (Steps 4, 5, 6, 7)** — Post used `"cfg_type": "user"`. NeuVector defines this as an enum with values `learned`, `user_created`, `ground`, `federal` (see `share.CfgTypeUserCreated = "user_created"` in `apis.go`). Removed `cfg_type` from the sigstore body (the server hardcodes it to `user_created` for sigstore) and changed it to `"user_created"` in the admission rule bodies.

4. **Invalid `verifier_type` enum value in Step 6** — Post used `"type": "keylessKeyPair"` inside an unsupported nested `verifier` object. The `REST_SigstoreVerifier` schema's `verifier_type` enum is `[keypair, keyless]`. Step 6 has been rewritten to POST a keyless verifier to the verifier sub-resource using `verifier_type: "keyless"` with `cert_issuer` and `cert_subject`, which is the actual NeuVector keyless verifier shape. The step heading was retitled to reflect this (the original "registry-specific verification" framing did not map to any real NeuVector API; per-verifier registry filtering is not done here).

5. **Spurious `"type": "imageSigned"` field in Step 5 admission criterion** — The `RESTAdmRuleCriterion.type` field is for criterion-class metadata (e.g., `customPath`) and is not set to the criterion key for built-in criteria. Removed it. The `name: "imageSigned"`, `op: "="`, `value: "false"` triple matches `share.CriteriaKeyImageSigned` in `share/criteria.go` and the boolean compare in `controller/cache/admission.go`.

## Review Notes

- NeuVector documents that signature scanning currently supports **Cosign v2 only** — signatures created with Cosign v3 do not trigger Sigstore verification. The post links `sigstore/cosign-installer@v3` (the action major version, not a Cosign version) which by default installs the latest Cosign release, so users may end up with v3. Worth a future caveat once NeuVector adds v3 support.
- The `containsAny` operator with the comma-separated value list in Step 7 is correct: NeuVector splits on `,` and trims whitespace (`controller/cache/admission.go`), so `"kube-system, kube-public, cattle-system, neuvector"` parses cleanly.
- The Cosign install snippet uses `curl -Lo cosign …/cosign-linux-amd64`, which is functionally equivalent to the docs' `curl -O -L … && mv cosign-linux-amd64 …/cosign`. Left as-is.
- For Cosign 2.x keyless signing, non-interactive use needs `--yes` to skip the transparency-log confirmation prompt. The post's interactive `cosign sign ${IMAGE}` example works in a TTY; CI users may need `--yes`. Not corrected since the sample is presented as an interactive example.
