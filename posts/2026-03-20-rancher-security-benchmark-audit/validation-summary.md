# Validation Summary: How to Audit Cluster Configuration Against Security Benchmarks in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher CIS Scans / Compliance Scans
- Kubernetes
- `kubectl`
- Bash
- Python 3
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes Secrets

## Sources Consulted
- Rancher Compliance Scans overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher Compliance Scans configuration reference (v2.14): https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher Compliance Scans run guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan
- Rancher Compliance Scans report guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/view-reports
- Rancher CIS Scans configuration reference (v2.11): https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/cis-scans/configuration-reference
- Rancher CIS Scans run guide (v2.10): https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/advanced-user-guides/cis-scan-guides/run-a-scan
- Rancher CIS Scans report guide (v2.11): https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/cis-scan-guides/view-reports
- Rancher compliance operator source (`ClusterScan`, `ClusterScanStatus`, `ClusterScanReport`): https://github.com/rancher/compliance-operator/blob/main/pkg/apis/compliance.cattle.io/v1/types.go
- Rancher compliance operator chart default profiles: https://github.com/rancher/compliance-operator/blob/main/chart/templates/configmap.yaml
- Rancher CIS operator source (`ClusterScan`, `ClusterScanStatus`, `ClusterScanReport`): https://github.com/rancher/cis-operator/blob/main/pkg/apis/cis.cattle.io/v1/types.go
- Rancher CIS operator chart default profiles: https://github.com/rancher/cis-operator/blob/main/chart/templates/configmap.yaml
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes security context docs: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Secrets docs: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes encryption at rest docs: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/

## Issues Found
- The post treated Rancher CIS Scans as a single stable interface across all supported Rancher versions. Current Rancher releases use `rancher-compliance` and `compliance.cattle.io/v1`, while older releases use `rancher-cis-benchmark` and `cis.cattle.io/v1`. I updated the prerequisites and Step 1 to be version-aware.
- The original scan example hardcoded `rke2-cis-1.6-profile-hardened`, which is not a safe universal profile name for current Rancher releases. I changed the example to require a profile that actually exists on the target cluster.
- Step 1 said “Get the report” but the command queried `.status.summary` from `ClusterScan`, which is a scan summary rather than the full `ClusterScanReport`. I corrected the wording.
- The RBAC wildcard audit only checked `ClusterRole` objects while the heading claimed to audit “Roles.” I expanded the command to include both `Role` and `ClusterRole`.
- The pod security script labeled containers as “running as root” even when the spec only lacked an explicit non-root setting. I corrected the heading and output so the script distinguishes explicit root from missing non-root configuration.
- The pod security checks originally ignored `initContainers` and `ephemeralContainers`. I expanded the loops so the audit covers all container sections exposed in the Pod spec.
- The NetworkPolicy audit used `kubectl get ... --no-headers | wc -l`, which can miscount empty results, and the output overstated the result as “coverage.” I switched to `-o name` counting and relabeled the output as presence-based analysis.
- The secrets audit heading framed all secret-backed environment variables as an inherent “Security Risk” and only checked `env[].valueFrom.secretKeyRef`. I made the wording neutral and added `envFrom[].secretRef` detection.
- The encryption-at-rest check used `kubectl get apiserver`, which is not a standard Kubernetes resource for Rancher-managed clusters. I replaced it with guidance to inspect `kube-apiserver` arguments for `--encryption-provider-config` on self-managed control planes.
- The final report step created `/tmp/full-security-audit.sh` but never executed it. I fixed the step to run the script, use timestamped archive names, and collect cluster scan resources when available.

## Review Notes
- The NetworkPolicy section now accurately measures namespace-level presence, not full pod-level isolation coverage. A namespace can still contain pods with no effective isolation depending on selectors and the network plugin.
- The encryption-at-rest verification remains cluster-type dependent. Self-managed control planes can inspect `kube-apiserver` configuration directly; hosted control planes such as EKS, AKS, and GKE require provider-specific verification paths.
- `kubectl` was not installed in the review workspace, so CLI validation was done against official Kubernetes and Rancher documentation plus upstream Rancher operator source, not local `--help` output.
