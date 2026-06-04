# Validation Summary: How to Use DaemonSets for Security Scanning Agents on Kubernetes Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes CronJobs
- Falco runtime security
- Trivy vulnerability scanning
- kube-bench CIS benchmark scanning
- AIDE file integrity monitoring
- Sysdig agent deployment
- Prometheus alerting rules

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes hostPath volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
- Falco Kubernetes Operator documentation: https://falco.org/docs/setup/operator/
- Falco container deployment documentation: https://falco.org/docs/setup/container/
- Falco 0.40.0 release notes for removed CLI options: https://falco.org/blog/falco-0-40-0/
- Falco rules documentation: https://falco.org/docs/concepts/rules/basic-elements/
- Falco default and local rules documentation: https://falco.org/docs/concepts/rules/default-custom/
- Trivy Kubernetes target documentation: https://trivy.dev/latest/docs/target/kubernetes/
- Trivy rootfs target documentation: https://trivy.dev/v0.65/docs/target/rootfs/
- Trivy cache configuration documentation: https://trivy.dev/docs/v0.52/configuration/cache/
- kube-bench official repository documentation: https://github.com/aquasecurity/kube-bench
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- AIDE project documentation: https://aide.github.io/

## Issues Found
- The Falco custom rules ConfigMap was defined but not mounted into the Falco DaemonSet, so the custom rules would not be loaded. Added a ConfigMap volume and mounted `custom_rules.yaml` under `/etc/falco/rules.d/`.
- The Falco rule referenced `allowed_processes` without defining it. Added an `allowed_processes` list to the custom rules file so the rule can parse.
- The Trivy DaemonSet used `crictl` and `jq` inside the `aquasec/trivy` image. Those tools are not part of the Trivy scanning interface and the example would fail as written. Changed the example to use `trivy rootfs` against a read-only host root mount.
- The Trivy database download command placed `--cache-dir` after the subcommand. Reordered it as a global Trivy option before `image`, matching the documented usage.
- The kube-bench DaemonSet ran a one-shot command. In a DaemonSet this would repeatedly exit and restart rather than behave like a node agent. Wrapped the command in a six-hour loop.
- The AIDE example mounted the host root as read-only but attempted to copy the database into `/host/var/lib/aide`. It also ran AIDE against the container filesystem by default. Added an explicit AIDE config that scans selected `/host` paths and stores the database in the writable `/var/lib/aide` mount.

## Review Notes
- The Falco example still uses Falco `0.36.0` and the `--cri` option. That is valid for the version shown, but Falco removed the deprecated `--cri` option in `0.40.0`; future updates should use current Falco configuration keys or the Falco Operator.
- The Sysdig example is plausible for Docker-based nodes, but modern Kubernetes clusters commonly use containerd. A production manifest should be generated from current Sysdig installation documentation for the target runtime.
- The Prometheus alerting syntax is valid, but the example assumes exporters or integrations provide the named metrics.
