# Validation Summary: How to Perform Automated CA Rotation in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, CA rotation, talosctl)
- Kubernetes (kubectl health checks)
- OpenSSL (CA certificate generation)
- Bash / yq / jq scripting
- GitHub Actions (CI/CD workflows)
- etcd (cluster health checks via `talosctl etcd status`)

## Sources Consulted
- Talos CA Rotation guide — https://www.talos.dev/v1.10/advanced/ca-rotation/ and https://docs.siderolabs.com/talos/v1.10/security/ca-rotation
- Talos v1alpha1 config reference (`machine.acceptedCAs`, `cluster.acceptedCAs`) — https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- "What's New in Talos 1.7" — https://docs.siderolabs.com/talos/v1.7/getting-started/what's-new-in-talos
- Editing Machine Configuration (use `yq .spec` pattern) — https://www.talos.dev/v1.10/talos-guides/configuration/editing-machine-configuration/
- Talos GitHub issue #10399 (talosctl get machineconfig output format) — https://github.com/siderolabs/talos/issues/10399
- talosctl CLI reference (apply-config, health, etcd) — https://docs.siderolabs.com/talos/v1.7/reference/cli
- etcd Maintenance docs — https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance

## Issues Found

1. **Wrong CA rotation mechanism (concatenated `ca.crt` instead of `acceptedCAs`).** The original Step 1 and Step 2 built a "bundle" by `cat old.crt new.crt > bundle.crt` and assigned it to `.machine.ca.crt` / `.cluster.ca.crt`. Those fields hold a single active issuing CA (with a matching key on control planes), so concatenated PEMs do not constitute the documented rotation flow and the resulting `ca.key` would no longer match `ca.crt`. Fixed by switching to Talos's documented procedure: add the new CA to `.machine.acceptedCAs` / `.cluster.acceptedCAs` during the trust-bundle phase, then swap the active `.ca` and keep the old CA in `acceptedCAs` for the grace period. Also added a note that this requires Talos v1.7+ (where `acceptedCAs` / `rotate-ca` shipped) and pointed to the built-in `talosctl rotate-ca` alternative.

2. **Wrong yq paths on `talosctl get machineconfig` output.** `talosctl -n <IP> get machineconfig -o yaml` returns a COSI resource wrapper where the v1alpha1 config lives under `.spec`, so `yq '.machine.ca.crt'` returns null. Fixed by piping through `yq '.spec'` to strip the wrapper before downstream yq queries (Steps 1 and 2), and by using `.spec.machine.ca.crt` / `.spec.cluster.ca.crt` directly in Step 5's expiry monitoring script.

3. **`generate-configs.sh` never populated the final-phase directory.** The original script created `FINAL_DIR` but only generated configs in `BUNDLE_DIR`, so the Step 4 GitHub Actions job that runs `rolling-deploy.sh ./ca-rotation/configs-final` would have applied an empty directory. Fixed by extending the per-node generator to also write the final-phase configs (active CA swapped to new, old CA retained in `acceptedCAs`).

4. **Broken `grep -cv "Ready"` Kubernetes node check.** `NotReady` contains the substring `Ready`, so `grep -v "Ready"` skips it and the script would report a healthy cluster even when nodes were down. Fixed by using `awk '$2 != "Ready"'` to compare the STATUS column exactly, and tightened the error path so a failed `kubectl` call no longer silently passes.

5. **Apply-config feeding wrapper-format YAML.** Because the unfixed Step 2 wrote out the COSI-wrapper YAML from `talosctl get machineconfig`, the Step 3 `talosctl apply-config --file ...` calls would have rejected it. Fixed implicitly by Step 2 now stripping `.spec` before any patching, leaving a flat v1alpha1 document.

## Review Notes

- `talosctl -n <IP> health --wait-timeout 10s` is syntactically valid (the flag exists, default 20m) but semantically misleading: `talosctl health` is a cluster-wide health check; the `-n <IP>` argument only selects the API endpoint to query, not a per-node scope. Leaving the existing loop in place since it doesn't error and conveys the author's intent of pausing between node updates; a future revision could replace it with `talosctl -n <IP> service` or `talosctl -n <IP> version` if a true liveness probe is desired.
- The post does not call out the built-in `talosctl rotate-ca --talos=true|--kubernetes=true` command beyond the new intro note. For most operators this is the recommended path; the scripted approach in this post is most useful when you need finer-grained control over each phase or pipeline integration.
- Reading the live machine config with `talosctl get machineconfig` and re-applying a modified copy is workable but fragile — runtime-derived fields can drift, and Talos versions ≤1.9 occasionally emit `.spec` as an escaped string (issue #10399). Operators on those versions may need `yq '.spec | from_yaml'` or `talosctl read /system/state/config.yaml` instead.
- The cron expression `'0 6 1 */3 *'` is valid and runs at 06:00 UTC on the 1st of every third month (Jan, Apr, Jul, Oct), matching the "quarterly" comment.
- OpenSSL CA generation, `actions/checkout@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, and `talosctl etcd status` / `talosctl apply-config --file` are all current and correct.
