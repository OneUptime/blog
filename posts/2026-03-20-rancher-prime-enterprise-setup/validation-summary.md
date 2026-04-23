# Validation Summary: How to Set Up Rancher Prime for Enterprise

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- SUSE Rancher Prime (Rancher Manager)
- RKE2
- Kubernetes
- Helm
- cert-manager
- Active Directory / LDAP
- Rancher Backups
- SUSE Customer Center (SCC)
- S3-compatible object storage

## Sources Consulted
- SUSE Rancher Prime installation docs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/install-rancher.html
- Rancher HA RKE2 setup guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- RKE2 CIS hardening guide: https://docs.rke2.io/security/hardening_guide
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 SELinux documentation: https://docs.rke2.io/security/selinux
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher TLS secret documentation: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/add-tls-secrets
- cert-manager compatibility guidance for Rancher: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/upgrade-cert-manager
- Rancher Active Directory configuration guide: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-active-directory
- Rancher API audit log documentation: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log
- SUSE Customer Center registration docs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/scc-registration.html
- Rancher notifications documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/notification-center
- Rancher security advisories page: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/security/cves.html
- Rancher backup installation/migration docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher backup configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher backup examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Official Rancher Prime chart index: https://charts.rancher.com/server-charts/prime/index.yaml
- Official Rancher charts index: https://charts.rancher.io/index.yaml

## Issues Found
- The post hard-coded stale Rancher and RKE2 versions and used deprecated RKE2 CIS guidance. I replaced those pins with supported-version placeholders, changed the CIS profile to `cis`, and clarified the first-node versus additional-node RKE2 HA configuration.
- The TLS flow was inconsistent: the draft installed cert-manager but used `ingress.tls.source=secret` without creating the required `tls-rancher-ingress` secret. I marked cert-manager as optional for secret-based installs and added the documented TLS secret creation steps, including the private CA note.
- The Rancher Prime Helm repository step used a hard-coded public URL even though the primary SUSE install docs describe an authenticated Prime repo URL. I changed the command to use the authenticated repo URL placeholder from the official docs.
- The Rancher install command used obsolete or misleading chart values, including `rancherImageTag=v2.8.3`, `global.cattle.psp.enabled=false`, and `privateCA=false`. I removed those values, added the documented `antiAffinity` setting, and kept only supported Helm options.
- The Active Directory section used the wrong UI path and field names. I updated it to the current `Users & Authentication -> Auth Provider -> ActiveDirectory` flow and aligned the field names with the official AD documentation.
- The HA section showed a partial Deployment manifest instead of a real verification procedure. I replaced it with commands that inspect the deployed Rancher installation.
- The audit logging section patched deployment environment variables directly. I replaced that with the supported Helm chart configuration using `auditLog.enabled` and `auditLog.level`.
- The backup operator instructions were incorrect: wrong chart repository, duplicate Helm release name, wrong Helm value key for persistence storage class, missing S3 credentials secret, and missing required backup fields such as `resourceSetName`. I corrected the repo, release names, values, and backup manifest to match current Rancher backup documentation.
- The SCC registration flow used the wrong Rancher UI path and overstated what registration directly activates. I updated it to `Global Settings -> Registration` and corrected the explanation.
- The security advisories section used an unsupported `v3/settings/notification-email` API example. I replaced it with the supported Notification Center and official security advisory sources.
- The product feature list included unsupported claims such as Prime-only audit log retention and bundled compliance reporting. I rewrote that list to stay within what the official Rancher Prime documentation explicitly describes.

## Review Notes
- Version-specific commands now intentionally use supported-version placeholders where the official docs defer to the Rancher support matrix, because those compatibility windows change over time.
- The backup example now uses `rancher-resource-set-full`, which includes secrets. A future revision could strengthen this further by also documenting `encryptionConfigSecretName` and the `encryptionconfig` secret from the backup docs.
- The optional private registry step remains environment-dependent. If registry authentication is required, the `imagePullSecrets` Helm value must be set during Rancher installation, as noted in the updated post.
