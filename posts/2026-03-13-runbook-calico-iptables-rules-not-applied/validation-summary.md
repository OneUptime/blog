# Validation Summary: Runbook: Calico iptables Rules Not Applied

## Status
validated

## Post Type
Runbook / Operational guide

## Technologies Covered
- Calico (CNI / network policy engine)
- Felix (Calico per-node agent)
- iptables (and the xtables lock)
- Kubernetes (kubectl, DaemonSet pods)
- calicoctl
- Bash / SSH

## Sources Consulted
- Calico `calico-node` health check flags — source code: https://github.com/projectcalico/calico/blob/master/node/pkg/health/health.go
- Calico data path / iptables chain naming — Tigera docs: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Felix iptables table generation — source: https://github.com/projectcalico/calico/blob/master/felix/iptables/table.go
- iptables(8) man page (xtables lock behavior): https://man7.org/linux/man-pages/man8/iptables.8.html
- calicoctl delete reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/delete/
- FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- **`calico-node -felix-health-check` is not a valid flag.** The `calico-node` binary exposes `-felix-live`, `-felix-ready`, `-bird-live`, `-bird-ready`, `-bird6-live`, `-bird6-ready` for in-process health probes; there is no consolidated `-felix-health-check` option (the binary will exit with the error "must specify at least one of -bird-live, -bird6-live, -felix-live, -bird, -bird6, or -felix"). Replaced the command in Step 1 with `calico-node -felix-ready -felix-live`, which matches what the standard liveness/readiness probes invoke.

## Review Notes
- The `cali-` prefix used to filter chains (`grep '^Chain cali'`) is correct — Felix-managed iptables chains are emitted as `cali-INPUT`, `cali-FORWARD`, `cali-OUTPUT`, `cali-nat-outgoing`, `cali-fw-*`, `cali-tw-*`, etc. (Note the `cali` interface-name prefix is *without* a dash — not relevant here, but a common source of confusion.)
- `/run/xtables.lock` is the correct default lock path on modern Linux systems (older distros may symlink from `/var/run/xtables.lock`). The `XTABLES_LOCKFILE` environment variable can override this.
- `calicoctl delete felixconfiguration default` is valid; both `felixconfiguration` and `felixconfigurations` are accepted. Worth knowing that the operator/calico-node will recreate the `default` FelixConfiguration shortly after deletion, so the runbook's restart-after-delete pattern is appropriate.
- The expected chain count of "≥ 10" is reasonable as a rough sanity check but will vary with the number of policies, pods, and tiers; treat the threshold as a heuristic, not a hard contract.
- `iptables -L` here implicitly inspects the filter table; if anyone wants to inspect NAT or mangle chains they will need `-t nat` / `-t mangle` (the verify step already does this for MASQUERADE).
