# Validation Summary: How to Migrate from RKE to RKE2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE/RKE1
- RKE2
- Kubernetes
- Rancher Manager
- kubectl
- Helm
- Velero
- AWS S3/EBS backup provider integration
- containerd/crictl

## Sources Consulted
- RKE2 Introduction: https://docs.rke2.io/
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Cluster Access: https://docs.rke2.io/cluster_access
- RKE2 Embedded Datastore: https://docs.rke2.io/datastore/embedded
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- RKE1 Overview: https://rke.docs.rancher.com/
- RKE1 Kubeconfig File: https://rke.docs.rancher.com/kubeconfig
- RKE1 Network Plug-ins: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- RKE1 Adding and Removing Nodes: https://rke.docs.rancher.com/managing-clusters
- Rancher RKE1 support/EOL notice: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/upgrade-kubernetes-without-upgrading-rancher
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes PodSecurityPolicy removal notice: https://kubernetes.io/docs/concepts/policy/pod-security-policy/
- Helm command documentation: https://helm.sh/docs/helm/
- Velero Basic Install: https://velero.io/docs/v1.18/basic-install/
- Velero Supported Providers: https://velero.io/docs/v1.18/supported-providers/
- Velero Cluster Migration: https://velero.io/docs/v1.18/migration-case/
- Velero Backup Reference: https://velero.io/docs/v1.18/backup-reference/
- Velero Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero File System Backup: https://velero.io/docs/v1.18/file-system-backup/
- Velero AWS plugin repository: https://github.com/velero-io/velero-plugin-for-aws
- kubectl-neat krew package: https://artifacthub.io/packages/krew/krew-index/neat

## Issues Found
1. **RKE2 CIS wording was too strong**: Changed "CIS Benchmark compliance by default" to RKE2's documented position: hardened defaults that pass the majority of controls with minimal operator intervention. Added the current RKE1 end-of-life and Rancher 2.12+ support status.

2. **`kubectl get all` was described as a full inventory**: Updated the comment to say it exports common workload resources, since `kubectl get all` does not include every Kubernetes resource type.

3. **Additional resource export produced invalid concatenated YAML**: Replaced the `xargs` export with a loop that adds YAML document separators between resource lists.

4. **Secret export did not exclude system/service-account token secrets**: Added a field selector to exclude `kube-system` and `kubernetes.io/service-account-token` secrets.

5. **RKE2 setup implied the same config could run on every server node**: Clarified that the shown config is for the first server node and noted that additional server/agent nodes need the same token plus `server: https://<fixed-registration-address>:9345`.

6. **Copied RKE2 kubeconfig could be unreadable by the normal user**: Added `chown` after copying `/etc/rancher/rke2/rke2.yaml`.

7. **Velero AWS example used an outdated plugin and incomplete snapshot config**: Updated the AWS plugin image to `v1.13.0`, added `--snapshot-location-config`, and added a caveat that cross-provider or cross-region PV migrations need File System Backup rather than provider snapshots alone.

8. **`kubectl rollout status deployment --all-namespaces` is not a valid kubectl command**: Replaced it with a loop over deployments from all namespaces, passing each deployment's namespace explicitly.

9. **Pod verification command printed the header and missed readiness**: Replaced the grep pipeline with a `--no-headers` and `awk` check that reports pods that are not completed and are either not fully ready or not running.

10. **PSP/PSA terminology was imprecise**: Updated the table to reflect that PodSecurityPolicy applies to Kubernetes versions before 1.25 and Pod Security Admission applies to Kubernetes 1.25 and later.

11. **RKE2 `crictl` example assumed `crictl` was on PATH and configured**: Updated the commands to use RKE2's bundled `crictl` binary and generated CRI config.

## Review Notes
- The guide remains a compact migration example. Production migrations should also review RBAC, ServiceAccounts, StorageClasses, CRDs, operator-managed resources, StatefulSets, DaemonSets, Jobs, CronJobs, HPAs, PDBs, and NetworkPolicies unless those are managed through Helm, GitOps, or Velero.
- Velero snapshot-based PV migration assumes compatible storage provider, region, and credentials. Cross-provider and cross-region moves need File System Backup or another data migration method.
- RKE2 documentation notes that Ingress NGINX is going end-of-life and Traefik becomes the default for new RKE2 clusters starting with v1.36, so ingress-controller steps may need revisiting for future RKE2 versions.
