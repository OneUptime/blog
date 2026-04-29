# Validation Summary: How to Configure K3s Audit Logging

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes audit logging
- kube-apiserver audit policy and audit log flags
- `k3s kubectl`
- Fluentd
- Elasticsearch
- `jq`
- JSON Lines

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s CIS Hardening Guide: https://docs.k3s.io/security/hardening-guide
- K3s CLI Tools: https://docs.k3s.io/cli
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Cluster Load Balancer: https://docs.k3s.io/datastore/cluster-loadbalancer
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes `kube-apiserver` command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Fluentd Kubernetes deployment docs: https://docs.fluentd.org/container-deployment/kubernetes
- Fluentd config file syntax: https://docs.fluentd.org/configuration/config-file
- Fluentd `in_tail` input plugin: https://docs.fluentd.org/input/tail
- Fluentd Kubernetes DaemonSet repository: https://github.com/fluent/fluentd-kubernetes-daemonset

## Issues Found
- The audit policy comments and rule ordering were inaccurate. I corrected the `omitStages` comment and moved the generic `get`/`list`/`watch` rule below the `None` rules so the health-check and noisy-system exclusions actually take effect. Kubernetes audit policies use first-match semantics.
- The draft logged Secret access at `RequestResponse`, which would record Secret bodies. I changed that rule to `Metadata` to avoid logging sensitive values while still preserving access visibility.
- The `/api*` and `/version` rule was described as authentication logging. I corrected the description to API discovery and version requests because those are non-resource endpoints, not authentication requests.
- The verification example used `python3 -m json.tool` on an audit log file written in JSON Lines format. I replaced it with a line-by-line Python parser that works with multiple audit events and updated the test command to `k3s kubectl`, which is the embedded K3s CLI documented upstream.
- The Fluentd example would not have shipped the audit log as written because it only mounted `/var/log/k3s` and never configured Fluentd to tail `audit.log`. I replaced it with a working `ConfigMap` plus `DaemonSet` example that sets `FLUENT_CONF`, tails `/var/log/k3s/audit.log`, stores a `pos_file`, and matches the control-plane node label patterns shown in K3s documentation.
- The `logrotate` step conflicted with kube-apiserver's built-in audit log rotation flags and relied on `systemctl reload k3s`, which is not how K3s documents applying config changes. I replaced that section with the correct guidance to use `audit-log-maxage`, `audit-log-maxbackup`, and `audit-log-maxsize`.

## Review Notes
- The post uses custom paths such as `/etc/rancher/k3s/audit-policy.yaml` and `/var/log/k3s/audit.log` instead of the paths shown in the K3s CIS hardening guide. This is still valid because kube-apiserver audit flags accept arbitrary readable and writable paths.
- The `apt-get install -y jq` example is Debian and Ubuntu specific.
- The sample audit event in Step 4 is illustrative. Fields such as timestamps and `userAgent` vary by cluster and client version.
