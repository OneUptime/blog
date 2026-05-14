# Validation Summary: How to Automate Calico IPAM Checks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes CronJobs
- Kubernetes IPAM
- Bash
- Prometheus textfile metrics
- Slack incoming webhooks

## Sources Consulted
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks

## Issues Found
- The CronJob command used `calicoctl ipam check && echo ... || echo ...`, which logs a failure but still exits successfully when the final `echo` succeeds. Changed it to an explicit `if` block that exits with status 1 when `calicoctl ipam check --show-problem-ips` fails.
- The Calico image tag was pinned to `calico/ctl:v3.27.0`, which is older than the currently documented Calico release. Updated it to `calico/ctl:v3.32.0`.
- The utilization scripts searched for a text line containing `IPs in use`, but the documented `calicoctl ipam show` output is a table with `IPS TOTAL`, `IPS IN USE`, and `IPS FREE` columns. Changed the scripts to calculate utilization from `IP Pool` rows in the documented table format.
- The utilization exporter claimed to expose Prometheus metrics on port 9099, but the script only writes a metrics file. Changed the comment to describe it as Prometheus textfile metrics.
- The conclusion said leaked IPs would not appear in utilization metrics. Changed this to say consistency checks catch leaked or incorrectly allocated IPs that utilization metrics cannot identify.

## Review Notes
- The CronJob references a `calico-diagnostics` ServiceAccount but does not include RBAC. Operators should ensure that ServiceAccount has the Kubernetes and Calico permissions needed by `calicoctl ipam` commands.
