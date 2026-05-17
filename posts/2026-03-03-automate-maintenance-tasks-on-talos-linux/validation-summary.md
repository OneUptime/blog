# Validation Summary: How to Automate Maintenance Tasks on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9.x)
- `talosctl` CLI
- Kubernetes (CronJobs, ConfigMaps, Service Accounts)
- etcd
- kubectl
- jq
- AWS CLI (S3)
- Bash scripting
- GitOps workflows

## Sources Consulted
- Talos Linux official documentation: https://www.talos.dev/v1.9/
- `talosctl` CLI reference: https://www.talos.dev/v1.9/reference/cli/
- Talos etcd backup/recovery docs: https://www.talos.dev/v1.9/advanced/disaster-recovery/
- Talos upgrade docs: https://www.talos.dev/v1.9/talos-guides/upgrading-talos/
- Talos Kubernetes upgrade docs: https://www.talos.dev/v1.9/kubernetes-guides/upgrading-kubernetes/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Sidero Labs container images on GHCR: https://github.com/orgs/siderolabs/packages

## Issues Found
- **`talosctl config rotate-certs` is not a valid command.** The `talosctl config` subcommand handles client-side configuration (contexts, endpoints, nodes), not certificate rotation. Talos automatically rotates node-level certificates internally, and Kubernetes control plane certificates are refreshed via `talosctl upgrade-k8s`. Replaced the invocation in the certificate renewal script with an alert message and a comment pointing to `talosctl upgrade-k8s --to <target-k8s-version>` as the correct mechanism for refreshing Kubernetes control plane certs.

## Review Notes
- The `talosctl get certificate` command in the certificate renewal script relies on a singular `certificate` resource name. Talos exposes various certificate-related COSI resources (e.g., resources in the `kubernetespki` and `etcdpki` namespaces, plus PKI status resources), and exact resource availability/shape may vary by Talos version. Readers should run `talosctl get rd` to discover resource definitions on their cluster and adjust the jq expression to match the actual `spec` schema for whichever resource they query.
- The etcd backup CronJob assumes `talosctl` inside the container has access to a valid talosconfig with appropriate endpoints/nodes/certs. In practice, you must mount the talosconfig as a Secret/volume into the Job container — not shown in the example. This is a reasonable simplification for a tutorial but worth being aware of.
- `talosctl version --short` is supported, but its output format includes both client and server "Tag:" lines, so the `grep Tag | awk '{print $2}'` parsing will return both versions concatenated. Using `grep -m1 Tag` or filtering by `Server` section would be more robust if running against a single node.
- Image tags pinned to `v1.9.0` (talosctl) are valid at time of writing; readers should pin to their cluster's actual Talos version.
- The `maintenance-pipeline.yaml` snippet is illustrative pseudo-YAML rather than a real Kubernetes or pipeline-tool resource (Tekton/Argo/etc.), which is reasonable for high-level conceptual framing.
- The CronJob schedules, tolerations, `nodeSelector`, `hostNetwork`, and `successfulJobsHistoryLimit`/`failedJobsHistoryLimit` fields all match the Kubernetes CronJob v1 spec.
