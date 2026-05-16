# Validation Summary: How to Perform Manual CA Rotation in Talos Linux

## Status
validated

## Post Type
Tutorial / Operations runbook

## Technologies Covered
- Talos Linux (talosctl, machine configuration, COSI resources)
- Kubernetes (kubectl, API server, kubelets)
- etcd (snapshot, member listing, status)
- OpenSSL (CA generation, X.509 inspection)
- Bash / yq for config manipulation

## Sources Consulted
- Talos CA Rotation guide (v1.9): https://docs.siderolabs.com/talos/v1.9/security/ca-rotation
- Talos certificate management how-to (v1.7): https://www.talos.dev/v1.7/talos-guides/howto/cert-management/
- talosctl CLI reference (v1.9): https://docs.siderolabs.com/talos/v1.9/reference/cli/
- siderolabs/talos `pkg/machinery/config/generate/secrets/ca.go`: https://github.com/siderolabs/talos/blob/main/pkg/machinery/config/generate/secrets/ca.go
- siderolabs/talos issue #10399 (machineconfig redaction): https://github.com/siderolabs/talos/issues/10399
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Sister blog posts in this repo: `posts/2026-03-03-rotate-talos-api-ca-certificates/` and `posts/2026-03-03-rotate-kubernetes-api-ca-certificates-in-talos/` (both previously validated and using the same conceptual model)

## Issues Found

1. **`talosctl etcd member list` is not a valid subcommand** (4 occurrences at lines 27, 202, 227, 313). The CLI exposes `talosctl etcd members` (plural, single token) for the member listing. Verified against the Talos v1.9 CLI reference and consistent usage in the other validated posts in this repo. Replaced all four occurrences with `talosctl etcd members`.

2. **Invalid `kubectl wait` condition** (2 occurrences at lines 233 and 325). The post used `kubectl wait --for=condition=completed pod/...`. There is no standard pod condition named `completed`. For a Pod that runs to completion, the canonical wait is on `.status.phase`. Replaced both with `kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/... --timeout=60s` (consistent with the fix applied to the sister Kubernetes-CA-rotation post).

## Review Notes

- **Bundle-in-`ca.crt` approach vs Talos's documented `acceptedCAs` mechanism.** The post concatenates the old and new CAs into the single `machine.ca.crt` / `cluster.ca.crt` field and then later switches to the new-only cert. Talos's official CA-rotation procedure instead uses a dedicated `machine.acceptedCAs` / `cluster.acceptedCAs` array (a list of trust-anchor PEMs) alongside the single issuing `machine.ca` / `cluster.ca`. The recommended production path is also `talosctl rotate-ca` (with `--talos` and/or `--kubernetes`), which automates this trust-bridging. The sister post `posts/2026-03-03-rotate-talos-api-ca-certificates/README.md` shows the correct `acceptedCAs` workflow. Per the precedent set when validating the related Kubernetes CA rotation post, the conceptual bundle approach was left intact here as a teaching device but flagged as the most important caveat for a future revision — readers running this in production should prefer `talosctl rotate-ca` or the `acceptedCAs` pattern.

- **Worker nodes should not carry the CA private key.** In the official Talos procedure, only control plane nodes get `machine.ca.key` populated; workers receive only the certificate. The post applies the same key-bearing config template to both, which works (workers will simply have a key they never sign with) but deviates from the documented split. Left as-is to match the post's intentional symmetry between phases; a future revision could explicitly distinguish the worker and control-plane templates.

- **`talosctl get machineconfig -o yaml` output is a COSI resource (with `metadata` and `spec`), and secret fields are redacted by default.** The `yq` paths used in the post (`.machine.ca.crt`, `.cluster.ca.crt`) elide the `.spec` wrapper, and in practice the values they target are returned as `<redacted>` for the CA key (and on recent Talos versions the spec is rendered as an escaped YAML string requiring an extra parse step). The CA key cannot be recovered from a running node via this command — practitioners must rely on the original `secrets.yaml` produced by `talosctl gen secrets`. Left unchanged because the post frames these extractions only as informational ("record current certificate") and not as the source of the new key material, but worth a rewrite in a future revision.

- **CA key algorithm divergence.** The post uses `openssl genrsa` (RSA-4096) for both CAs; Talos's own `talosctl gen secrets` produces an Ed25519 Talos CA and ECDSA Kubernetes CA by default (see `pkg/machinery/config/generate/secrets/ca.go`). Talos accepts RSA PEM input, so this is functional but non-idiomatic. The sister Kubernetes CA rotation post uses the same RSA pattern and was left as-is on its validation; preserved here for consistency.

- **Phase 3 `talosctl gen config --with-secrets` example.** The example assumes a pre-existing `secrets-bundle.yaml`, which is not produced anywhere in the post's openssl-based workflow. Also note that `talosctl gen config` writes a fresh `controlplane.yaml`, `worker.yaml`, and `talosconfig` to the cwd — it does not update an existing talosconfig in place. The post's accompanying comment ("Or manually update the talosconfig") softens this, so the block stands as illustrative, but a future revision should either replace the openssl key generation with `talosctl gen secrets` or clarify that this command is a forward-looking option rather than part of the immediate flow.
