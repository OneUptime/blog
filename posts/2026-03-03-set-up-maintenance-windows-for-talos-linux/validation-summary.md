# Validation Summary: How to Set Up Maintenance Windows for Talos Linux

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- Kubernetes
- System Upgrade Controller
- Kubernetes admission webhooks
- Kubernetes CronJobs
- `kubectl`
- `talosctl`
- YAML configuration

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos Linux certificate management documentation: https://docs.siderolabs.com/talos/v1.10/security/cert-management
- Talos Linux upgrade documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Linux disaster recovery documentation: https://www.talos.dev/latest/advanced/disaster-recovery/
- System Upgrade Controller README: https://github.com/rancher/system-upgrade-controller
- System Upgrade Controller Plan API documentation: https://github.com/rancher/system-upgrade-controller/blob/master/doc/plan.md
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The System Upgrade Controller install URL pointed to `siderolabs/system-upgrade-controller`, which is not the upstream System Upgrade Controller repository used by the `upgrade.cattle.io/v1` Plan API. Updated it to the Rancher upstream manifest URL.
- The post described a "Talos System Upgrade Controller", but the referenced `upgrade.cattle.io/v1` API is Rancher's general System Upgrade Controller. Updated the wording to avoid implying it is Talos-specific.
- The upgrade Plan used an inline shell date check instead of the controller's native `spec.window` field. Replaced it with `window.days`, `startTime`, `endTime`, and `timeZone`, matching the Plan API documentation.
- The Plan attempted to run `talosctl` from the Talos installer image and omitted a target node. Updated the example to use a Talos CLI image, mount a Talos config Secret, and include `talosctl upgrade --nodes <target-node-ip> --image ...`.
- The validating webhook rule included `CREATE` for the `nodes/status` subresource, which is not a normal operation for node status updates. Changed it to `UPDATE`.
- The CronJob claimed a UTC schedule but did not set `.spec.timeZone`; Kubernetes otherwise interprets CronJob schedules in the kube-controller-manager's local timezone. Added `timeZone: "Etc/UTC"`.
- The node health check used `grep -v "Ready"`, which fails to count `NotReady` nodes because `NotReady` contains the string `Ready`. Replaced it with an `awk` check against the node status column.
- The certificate verification command used `talosctl get certificate`, while Talos documentation recommends checking Kubernetes dynamic certificates with `talosctl get KubernetesDynamicCerts -o yaml`. Updated the command accordingly.

## Review Notes
- `talosctl` was not installed in the local review environment, so CLI validation was performed against official Talos documentation rather than local `--help` output.
- The System Upgrade Controller Talos upgrade example remains environment-dependent because real clusters need a valid Talos API credential and a reliable way to target each node's Talos API address.
