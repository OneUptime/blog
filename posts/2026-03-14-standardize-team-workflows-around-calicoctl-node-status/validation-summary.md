# Validation Summary: Standardizing Team Workflows Around calicoctl node status

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico
- calicoctl
- BGP
- Kubernetes
- kubectl
- Bash
- Prometheus
- Grafana
- YAML
- Markdown

## Sources Consulted
- Calico Open Source documentation: `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source documentation: configuring BGP and viewing BGP peering status: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source documentation: troubleshooting commands for Calico components and BGP status: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Open Source documentation: installing `calicoctl` and version-matching guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes documentation: `kubectl run` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: `kubectl exec` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: CronJob concepts: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus documentation: exposition formats: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- The Bash examples used `grep -c ... || echo 0`, which can produce two zero lines in command substitution when no matches are found because `grep -c` prints `0` and exits non-zero. Changed those fallbacks to `|| true` so arithmetic receives a single numeric value.
- The peer-counting regex only matched `node-to-node` and `global` peer rows, missing Calico's documented `node specific` peer type. Updated the regex to count `node-to-node mesh`, `node specific`, and `global` peer rows.
- The incident response runbook was wrapped in a Markdown code block that contained unescaped inner triple backticks, causing malformed Markdown rendering. Changed the outer fence to four backticks and changed the inner closing fences from invalid ```text markers to standard closing fences.
- The dashboard script claimed to generate Prometheus/Grafana metrics but printed ad hoc key-value text. Updated it to emit Prometheus text exposition-style metric samples with a `node` label.
- The dashboard script executed `calicoctl node status` twice per pod, which could yield inconsistent counts if BGP state changed between calls. Updated it to capture status once and parse both values from the same output.

## Review Notes
- `calicoctl node status` communicates with the local Calico agent, so it must be run on the node whose status is being checked or from an environment equivalent to that node context.
- Calico's documentation recommends matching the `calicoctl` version to the Calico version running in the cluster; the post's troubleshooting guidance correctly calls out standardizing versions.
- Local command execution could not verify `calicoctl` or `kubectl` help output because those binaries are not installed in this workspace; command verification was performed against official documentation instead.
