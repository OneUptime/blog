# Validation Summary: kube-hunter vs kube-bench: How to Combine Attack-Surface Testing with CIS Configuration Audits

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes
- kube-hunter
- kube-bench
- CIS Kubernetes Benchmark
- Kubernetes security auditing and attack-surface testing
- DevSecOps remediation workflows

## Sources Consulted

- [kube-hunter documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter report implementation and schema](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [Aqua Security kube-bench repository and documentation](https://github.com/aquasecurity/kube-bench)
- [kube-bench flags and commands](https://github.com/aquasecurity/kube-bench/blob/main/docs/flags-and-commands.md)
- [kube-bench platform and benchmark support](https://github.com/aquasecurity/kube-bench/blob/main/docs/platforms.md)
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes security checklist](https://kubernetes.io/docs/concepts/security/security-checklist/)

## Issues Found
No technical issues found.

## Review Notes
The kube-hunter command uses documented `--remote`, `--report json`, and `--log WARNING` options. The warning about `--active` accurately reflects upstream documentation, and the stated top-level JSON collections agree with the report implementation. The kube-bench command uses documented `run --targets`, `--json`, and `--outputfile` syntax; the listed targets appear in the official example. The post appropriately qualifies target and benchmark selection by build, Kubernetes distribution, platform, and node role. Its managed-control-plane caveat, distinction between scanner vantage and local configuration evidence, kubelet port example, and PASS/FAIL/WARN/INFO terminology are consistent with the official sources. All six links in the post's Official References section returned HTTP 200 during validation. Because the article recommends pinning tool artifacts and selecting an applicable benchmark rather than asserting a fixed release, readers should continue to consult the linked platform matrix when tool or Kubernetes versions change.
