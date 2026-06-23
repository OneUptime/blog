# Validation Summary: How to Run Security Audits on Kubernetes Clusters with kube-bench

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- kube-bench (Aqua Security)
- Kubernetes (control plane, kubelet, etcd, RBAC, NetworkPolicy, Pod Security Standards)
- CIS Kubernetes Benchmark
- Kubernetes EncryptionConfiguration (encryption at rest)
- Kubernetes audit policy
- Docker
- GitHub Actions
- jq / bash

## Sources Consulted
- kube-bench flags & commands docs: https://github.com/aquasecurity/kube-bench/blob/main/docs/flags-and-commands.md (raw fetched)
- kube-bench running docs: https://github.com/aquasecurity/kube-bench/blob/main/docs/running.md
- kube-bench source structs (JSON field names): check/check.go, check/controls.go — https://raw.githubusercontent.com/aquasecurity/kube-bench/main/check/check.go and .../controls.go
- kube-bench releases (binary asset naming): https://github.com/aquasecurity/kube-bench/releases
- Kubernetes docs — Encrypting Secret Data at Rest (apiserver.config.k8s.io/v1, aescbc): https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes docs — Auditing (audit.k8s.io/v1 Policy): https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes docs — Pod Security Standards / Admission labels: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes docs — Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- GitHub Actions — actions/upload-artifact deprecation of v3: https://github.com/actions/upload-artifact

## Issues Found
1. **`--check` used to run whole sections (incorrect flag).** The "Scan Specific Sections" examples used `kube-bench run --targets master --check 1.2` (and `--check 2`, `--check 5.1`). Per the official flags doc, `--check` takes a comma-delimited list of *individual* check IDs (e.g. `1.2.1`), while `--group` "runs all the checks under this comma-delimited list of groups." Since the intent (per the section heading and comments) is to run an entire section, I changed `--check` to `--group` for all three commands and added a one-line clarifying comment.

2. **Incorrect jq query against the JSON output.** The post used `jq '.Controls[] | select(.id == "1.2") | .tests[] | select(.status == "FAIL")'`. Verified against the kube-bench source structs: the top-level `Controls[]` has `id` like `cis-1.x` (not a section number); a section number lives on the Group struct's `section` field (JSON tag `json:"section"`) nested under `.tests[]`; and `status` is on the individual Check struct (`.results[]`, JSON tag `json:"status"`), not on the group. Corrected the query to `jq '.Controls[].tests[] | select(.section == "1.2") | .results[] | select(.status == "FAIL")'` and added an explanatory comment.

3. **Retired GitHub Action version.** The CI example used `actions/upload-artifact@v3`, which GitHub fully deprecated/retired (no longer executes) in early 2025. Bumped to `actions/upload-artifact@v4`. The `name:`/`path:` inputs used here behave the same in v4, so no other changes were needed.

## Review Notes
- The `--check` flag semantics are genuinely confusing because the upstream docs' own "group" example mistakenly writes `--check="1.1,2.2"`. The authoritative flags table (`--check` = list of checks, `--group` = all checks under groups) was used as the source of truth for the fix.
- CIS check numbers cited (1.2.1, 1.2.6, 1.2.16, 1.2.21, 2.1, 4.2.1, 4.2.6, 5.1.5, 5.2.2, 5.3.2) are illustrative and drift between CIS Benchmark versions; they are reasonable representatives and were left as-is since the post does not pin a specific benchmark revision.
- The binary download (`v0.7.0`, asset `kube-bench_0.7.0_linux_amd64.tar.gz`) follows the correct release-asset naming and is a real release; newer releases exist (e.g. 0.10.x) but the pinned version remains valid.
- Benchmark identifiers `eks-1.2.0`, `gke-1.2.0`, `aks-1.0` are valid kube-bench cfg benchmark names.
- `EncryptionConfiguration` (`apiserver.config.k8s.io/v1`) with the `aescbc` provider and trailing `identity: {}` fallback, the `audit.k8s.io/v1` Policy, Pod Security Admission labels, and the default-deny NetworkPolicy all match current Kubernetes documentation.
- `azure/k8s-set-context@v3` still functions (v4 exists); left unchanged to keep edits minimal.
- Minor stylistic note (not changed): appending YAML to `/var/lib/kubelet/config.yaml` with `cat >>` can produce duplicate top-level keys; the post already flags this with a "use a proper YAML merge tool" caveat.
