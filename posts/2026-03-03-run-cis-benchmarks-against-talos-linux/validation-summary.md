# Validation Summary: How to Run CIS Benchmarks Against Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- CIS (Center for Internet Security) Kubernetes Benchmark
- kube-bench (Aqua Security)
- Kubernetes Jobs and CronJobs
- Pod Security Admission
- Kubernetes NetworkPolicy
- talosctl CLI

## Sources Consulted
- kube-bench documentation: https://aquasecurity.github.io/kube-bench/
- kube-bench GitHub: https://github.com/aquasecurity/kube-bench
- Talos CLI reference: https://www.talos.dev/v1.10/reference/cli/
- Talos default hardening and CIS compliance: https://docs.siderolabs.com/talos/v1.12/security/talos-default-hardening-and-cis-compliance
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
1. **Misleading claim about a "Talos-specific kube-bench configuration"** — The original section heading and intro stated that "Talos provides a custom kube-bench configuration that accounts for its unique architecture." In reality, upstream kube-bench does not ship a `cis-x.x-talos` benchmark, and Sidero Labs does not publish a custom config file; users run the standard CIS Kubernetes benchmarks (and optionally `--skip` known false positives caused by Talos's immutable layout). Reworded the section to "Selecting a Specific Benchmark Version" and clarified that the example pins the benchmark for reproducibility, which keeps the YAML example useful without making an inaccurate claim.

## Review Notes
- kube-bench flags `--targets`, `--benchmark`, and `--json`, and target values `master`, `node`, `controlplane`, `etcd`, `policies` are all valid. The `aquasec/kube-bench` image is the official one.
- All talosctl commands used (`talosctl get securitystate`, `talosctl read /proc/...`, `talosctl services`, `talosctl get machineconfig -o yaml`) are valid in current Talos versions. `talosctl read` does support reading from `/proc`.
- The Job and CronJob manifests use the correct `batch/v1` apiVersion and place `backoffLimit` at the correct level (sibling of `template` in the Job spec, sibling of `template` within `jobTemplate.spec` in the CronJob).
- Pod Security Admission labels (`pod-security.kubernetes.io/enforce|audit|warn` with value `restricted`) and the default-deny `NetworkPolicy` (`networking.k8s.io/v1`, empty `podSelector`, `policyTypes: [Ingress]`) are correct per current Kubernetes docs.
- Minor caveat: using `image: aquasec/kube-bench:latest` is convenient for a tutorial but would be worth pinning to a specific tag in production for reproducibility. Not corrected since it isn't technically wrong.
- Minor caveat: `backoffLimit: 0` on the CronJob means failed runs won't be retried before the next scheduled run; this is a reasonable choice for benchmark jobs but worth being aware of. Not corrected.
