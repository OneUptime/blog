# Validation Summary: How to Rotate Talos API CA Certificates

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Talos Linux (operating system / Kubernetes distribution)
- `talosctl` CLI
- X.509 / PKI / mTLS
- Kubernetes (peripheral — health checks via `kubectl`)
- etcd (peripheral — snapshots and member listing via `talosctl etcd`)
- OpenSSL (certificate inspection)
- Bash scripting

## Sources Consulted
- Talos Linux CA Rotation guide (v1.8): https://docs.siderolabs.com/talos/v1.8/security/ca-rotation
- Talos Linux Certificate Authorities reference (v1.10): https://docs.siderolabs.com/talos/v1.10/security/certificate-authorities
- `talosctl` CLI reference (v1.10): https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos `machine` configuration reference (v1.10): https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Official Talos blog/docs on `talosctl rotate-ca`: https://www.talos.dev/v1.10/advanced/ca-rotation

## Issues Found

1. **Fundamentally wrong rotation mechanism — "CA bundle in `machine.ca.crt`"**
   The original post instructed readers to concatenate the old and new CA into a single PEM bundle and place it in `machine.ca.crt`. Talos's `machine.ca` field holds a single issuing CA certificate (and, on control plane nodes, its key). Additional trusted CAs go in the separate `machine.acceptedCAs` array (a list of raw PEM certificates, not base64). I rewrote Steps 4, 5, 7 (was "Step 8: Remove the Old CA"), the intro paragraph of "Performing the Rotation", and the conclusion to follow the official three-phase flow: (a) add new CA to `acceptedCAs`, (b) swap `machine.ca` to the new CA while keeping the old one in `acceptedCAs`, (c) remove the old CA from `acceptedCAs`.

2. **Wrong worker-node CA format**
   The post applied an identical `machine.ca` (with `key`) to both workers and control planes. Talos worker nodes' `machine.ca` contains only `crt`, not `key`. I called this out in Step 7 ("Promote the New CA") with separate YAML examples for control plane vs worker.

3. **Invalid `talosctl etcd member list` command**
   The correct subcommand is `talosctl etcd members` (singular subcommand verb is not used; it is one word "members"). Fixed in Step 5 verification block.

4. **Wrong/non-existent `--name` flag on `talosctl gen ca`**
   Current `talosctl gen ca` accepts `--organization`, `--hours`, `--rsa`, not `--name`. Changed `talosctl gen ca --name "talos" --hours 87600` to `talosctl gen ca --organization "talos" --hours 87600` and adjusted the comment.

5. **Non-existent `talosctl get certificate` resource**
   There is no `certificate` resource type in Talos's COSI resource definitions. Replaced with `talosctl get rd | grep -i cert` so the reader can discover the actual cert-related resources available on their version.

6. **Missing reference to the automated `talosctl rotate-ca` command**
   Talos ships a first-class `talosctl rotate-ca --talos=true --kubernetes=false` command that automates the entire procedure. I added a short callout block after Step 3 pointing readers at it (with `--dry-run=true`) as the recommended path, while preserving the manual procedure for fine-grained control.

7. **Stale "bundle" wording**
   After rewriting the mechanism, removed lingering references to "CA bundle" in the Step 5 verification heading, the "Handling Rotation Failures" rollback note, and the conclusion. Replaced with accurate language about `acceptedCAs`.

## Review Notes
- `kubectl get cs` (component status) is deprecated since Kubernetes 1.19, but still works on supported clusters. Left as-is because it is technically valid and replacing it with `kubectl get --raw='/readyz?verbose'` or similar would be a stylistic change rather than a correctness fix.
- The `base64 -w0` flag is GNU-coreutils-only and will not work on macOS without `gbase64` (coreutils). The post is implicitly Linux-targeted, which matches the Talos admin workflow, so I did not change this.
- The post uses `apply-config` to install the swap config. In practice, simple field additions/removals to `acceptedCAs` are often expressed as JSON/strategic patches via `talosctl patch machineconfig`; I used `patch machineconfig --patch @file.yaml` for the additive Step 4 and kept `apply-config` for the full-config swap in Step 7. Both are valid `talosctl` workflows.
- `talosctl health` is functional but the command has been moved/marked for cleanup across versions; on very recent Talos releases it lives under cluster checks. If the post is updated in the future for a specific Talos version, double-check this command.
- The original step numbering (1–9) was preserved in spirit but renumbered to 1–8 after collapsing the old "Step 4: Bundled CA" + "Step 5: Apply Bundle" into a single Step 4. No other structural changes were made.
