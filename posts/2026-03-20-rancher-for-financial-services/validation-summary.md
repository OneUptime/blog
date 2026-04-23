# Validation Summary: How to Set Up Rancher for Financial Services - For

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Kubernetes NetworkPolicy
- Kubernetes audit logging
- Pod Security Admission
- HashiCorp Vault Transit
- cert-manager
- Rancher Logging / Logging operator
- Rancher Compliance scans

## Sources Consulted
- RKE2 Secrets Encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CIS Self-Assessment Guide: https://docs.rke2.io/security/cis_self_assessment111
- Kubernetes Pod Security Admission configuration: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes admission controllers reference: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes audit logging: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Vault Transit secrets engine: https://developer.hashicorp.com/vault/docs/secrets/transit
- Vault transit encryption tutorial: https://developer.hashicorp.com/vault/tutorials/encryption-as-a-service/eaas-transit
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- cert-manager CA issuer configuration: https://cert-manager.io/docs/configuration/ca/
- Rancher logging integration: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- Logging operator CRD reference: https://kube-logging.dev/docs/configuration/crds/
- Logging operator HostTailer guide: https://kube-logging.dev/5.0/docs/configuration/extensions/kubernetes-host-tailer/
- Rancher compliance configuration reference: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher compliance scan guides: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan-periodically-on-a-schedule
- Rancher CIS operator API types (authoritative source for scheduled scan fields): https://raw.githubusercontent.com/rancher/cis-operator/main/pkg/apis/cis.cattle.io/v1/types.go

## Issues Found
- The RKE2 hardening snippet declared `kube-apiserver-arg` twice, which made the YAML invalid and would drop the first list in normal YAML parsing. I merged it into a single valid list.
- The RKE2 snippet used a manual `encryption-provider-config` example and described it as general etcd encryption. I updated it to the documented RKE2 `secrets-encryption` settings and clarified the text to Kubernetes Secrets encryption at rest.
- The audit log path in the RKE2 snippet did not match documented RKE2 audit log locations used in hardening guidance. I changed it to `/var/lib/rancher/rke2/server/logs/audit.log`.
- The Vault example described Transit as tokenization and passed a `context` parameter even though the example key was not configured for derived-key usage. I corrected the comments to describe encryption and simplified the command to a valid Transit encrypt example.
- The cert-manager installation command used older Helm chart conventions and flags. I updated it to the current OCI-based install pattern with `--create-namespace`, an explicit chart version, and `--set crds.enabled=true`.
- The CA `ClusterIssuer` example assumed the backing secret already existed but did not say so. I added that requirement because the issuer will not become ready without the referenced key pair secret.
- The Rancher logging example would not actually collect kube-apiserver audit files because `ClusterFlow` routes collected logs but does not ingest host files by itself. I added a `HostTailer` and changed the `ClusterFlow` match to the labels/container names that the host tailer produces.
- The logging example referenced a Splunk-specific output name while the text also mentioned other SIEMs. I changed the reference to a generic `siem-output` and noted that a matching `ClusterOutput` must already exist.
- The CIS scan example claimed to schedule a monthly scan but actually created a one-off scan. I updated it to use `scheduledScanConfig.cronSchedule` and `retentionCount`.
- The Rancher scan API example used the older `cis.cattle.io/v1` API group and an invalid `clusterscansummary` inspection command. I updated it to the current `compliance.cattle.io/v1` `ClusterScan` example and corrected the review commands to inspect the `ClusterScan` resource itself.
- The PCI-DSS mapping table and conclusion used outdated or imprecise terms such as `etcd encryption` and `Trivy` as a Rancher-native control. I corrected those references to Rancher compliance scans and Kubernetes Secrets encryption.

## Review Notes
- Rancher’s scan functionality has been renamed from CIS scanning to Compliance scanning in newer releases, and the API group changed accordingly. Future edits should keep profile names and API groups aligned with the Rancher version being targeted.
- `scanProfileName` values are version-sensitive. The example now uses a current documented profile name, but production teams should confirm the installed `ClusterScanProfile` names in their target Rancher release before applying it unchanged.
- PCI-DSS alignment still depends on controls outside Rancher itself, including key management, SIEM retention/immutability settings, vulnerability management, and formal audit evidence collection.
