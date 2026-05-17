# Validation Summary: How to Configure etcd Extra Args in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- etcd (command-line flags, tuning, TLS, metrics)
- Kubernetes (control plane storage)
- Prometheus (etcd metrics scraping)

## Sources Consulted
- etcd configuration reference: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd tuning guide: https://etcd.io/docs/v3.4/tuning/
- etcd request/response size limits: https://etcd.io/docs/v3.3/dev-guide/limit/
- etcd "slow fdatasync" warning behavior: https://github.com/etcd-io/etcd/issues/15247
- Talos etcd maintenance / `talosctl etcd`: https://www.talos.dev/v1.7/advanced/etcd-maintenance/
- Talos `apply-config`: https://www.talos.dev/v1.10/talos-guides/configuration/editing-machine-configuration/
- Talos etcd service source (extraArgs denylist): https://github.com/siderolabs/talos/blob/main/internal/app/machined/pkg/system/services/etcd.go

## Issues Found
1. **Incorrect comment on `max-request-bytes`** — the post described it as "Maximum number of committed transactions to keep in memory". That description belongs to `snapshot-count`. The etcd flag `max-request-bytes` is the maximum client request size in bytes the server will accept (default 1.5 MB). Updated the comment to reflect the actual meaning.

2. **Security Configuration recommended flags that Talos blocks** — the post told readers to set `client-cert-auth`, `peer-client-cert-auth`, and `tls-min-version` via `cluster.etcd.extraArgs`. All three are in Talos's `argsbuilder.WithDenyList` for etcd (see `internal/app/machined/pkg/system/services/etcd.go`) because Talos manages them itself. Attempting to set them via `extraArgs` will be rejected. Only `cipher-suites` is allowed through. Rewrote the section to explain what Talos manages on the user's behalf and to show only the `cipher-suites` knob, also flattening the YAML folded scalar into a single comma-separated string without spaces (etcd expects no spaces between entries).

## Review Notes
- The `quota-backend-bytes` default is technically `0` in the etcd flag reference, with `0` meaning "use the built-in low space quota" of approximately 2 GiB. Calling it "2GB" is a defensible simplification and was left as-is.
- The post uses `snapshot-count: "10000"` in the small-cluster example. etcd's documented default is `100000`, so the post's value is a deliberate tuning recommendation rather than a stated default. No change needed.
- The `cipher-suites` example originally used a YAML folded scalar (`>-`) with spaces after commas; etcd parses this list without trimming, so spaces can leak into individual cipher names and cause silent mismatches. The fix replaces it with a single inline string.
- All `talosctl` subcommands referenced (`etcd defrag`, `etcd members`, `etcd status`, `logs etcd`, `apply-config`) are valid in current Talos releases.
