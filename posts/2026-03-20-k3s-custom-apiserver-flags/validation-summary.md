# Validation Summary: How to Configure K3s with Custom kube-apiserver Flags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- `kube-apiserver`
- `kubectl`
- OpenSSL
- OIDC
- kube-bench

## Sources Consulted
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s configuration file documentation: https://docs.k3s.io/installation/configuration
- K3s requirements documentation: https://docs.k3s.io/installation/requirements
- K3s CIS hardening guide: https://docs.k3s.io/security/hardening-guide
- K3s CIS 1.24 self-assessment guide: https://docs.k3s.io/security/self-assessment-1.24
- Kubernetes `kube-apiserver` command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes generated API reference v1.36: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- kube-bench repository and job manifest: https://github.com/aquasecurity/kube-bench and https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

## Issues Found
- The install-script example used `sh -`. Updated it to `sh -s -`, which matches the current K3s installation pattern documented by K3s.
- The audit log and audit policy examples used generic paths under `/var/log/k3s` and `/etc/rancher/k3s`. Updated them to the K3s hardening guide paths under `/var/lib/rancher/k3s/server/...`, which are the documented K3s locations for these examples.
- The post used `PodSecurityAdmission` as an admission plugin name. Current Kubernetes admission plugin naming uses `PodSecurity`, and K3s documents `PodSecurity` as enabled by default on current releases. I corrected the examples to use valid non-default admission plugins and the documented `admission-control-config-file` approach for PodSecurity tuning.
- The post recommended `insecure-port=0`, `default-watch-cache-size`, `api-burst`, and `api-qps` as `kube-apiserver` flags. Those are not current `kube-apiserver` flags in the official command reference. I removed the invalid flags and replaced the watch cache example with the current `watch-cache-sizes` flag.
- The feature gate example enabled `EphemeralContainers` and `ServerSideApply`, which are removed feature gates, and it said `SidecarContainers` is GA in Kubernetes 1.29+. Current Kubernetes documentation shows `SidecarContainers` reached GA in Kubernetes 1.33. I replaced the example with currently documented feature gates and corrected the GA note.
- The TLS SAN example had an empty `kube-apiserver-arg:` key and implied the setting belonged under that section. I fixed it to a valid top-level `tls-san` K3s configuration example.
- The verification section suggested grepping a `kube-apiserver` process and using `kubectl get componentstatuses`. K3s documents that core components are packaged inside the `k3s` binary, and Kubernetes documents `healthz`/`componentstatuses` as deprecated in favor of `readyz` and `livez`. I updated verification to use the K3s journal plus `kubectl get --raw='/readyz?verbose'`.
- The audit log verification command piped `tail -f` into `python3 -m json.tool`. Kubernetes audit logs are written in JSON Lines format, so that pipeline is not appropriate. I replaced it with a direct tail of the audit log file.
- The TLS verification example connected to `localhost:6443`. K3s documents local kube-apiserver access on port `6444`, and the K3s self-assessment guide shows the kube-apiserver secure port as `6444` in K3s. I updated the command accordingly.
- The webhook verification commands used incorrect resource names. I corrected them to `validatingwebhookconfigurations` and `mutatingwebhookconfigurations`, which match the Kubernetes API resource names.

## Review Notes
- The full hardened example still includes several kubelet CLI flags. These remain usable in K3s, but upstream Kubernetes documents many kubelet CLI flags as deprecated in favor of kubelet config files. K3s 1.32+ supports kubelet config files and drop-in configuration, so that may be worth a future follow-up.
- `encryption-provider-config` is still a valid `kube-apiserver` flag, but K3s can also manage secret encryption automatically with the top-level `secrets-encryption: true` setting.
- Feature gate examples are inherently version-specific. Operators should confirm support against the exact Kubernetes version bundled with their K3s release before enabling them.
