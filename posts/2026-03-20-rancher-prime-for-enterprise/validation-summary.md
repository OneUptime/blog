# Validation Summary: How to Set Up Rancher Prime for Enterprise - For

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime / Rancher Manager
- Helm
- cert-manager
- RKE2
- Kubernetes audit logging
- SUSE Security (NeuVector)
- SUSE Customer Center / SUSE support lifecycle

## Sources Consulted
- Rancher Prime install guide: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher API audit log guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher TLS secrets guide: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/add-tls-secrets
- SUSE Rancher Prime lifecycle: https://www.suse.com/lifecycle/#rancher
- Rancher Prime support and maintenance: https://www.suse.com/support/rancher-prime/
- SUSE Priority entitlement handbook: https://www.suse.com/support/handbook/priority-entitlement/
- Rancher Prime chart repository index: https://charts.rancher.com/server-charts/prime/index.yaml
- Rancher Prime v2.13.4 release notes: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/release-notes/v2.13.4.html
- RKE2 hardened images: https://documentation.suse.com/cloudnative/rke2/latest/en/security/about_hardened_images.html
- RKE2 hardening guide: https://documentation.suse.com/cloudnative/rke2/latest/en/security/hardening_guide.html
- RKE2 server configuration reference: https://documentation.suse.com/cloudnative/rke2/latest/en/reference/server_config.html
- Rancher Manager RKE2 cluster configuration reference: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/cluster-deployment/configuration/rke2.html
- SUSE Security Helm deployment guide: https://documentation.suse.com/cloudnative/security/latest/en/helm.html
- Rancher supportconfig bundle documentation: https://ranchermanager.docs.rancher.com/v2.8/integrations-in-rancher/cloud-marketplace/supportconfig

## Issues Found
- The comparison table overstated and misstated Prime entitlements. It claimed a 30-month lifecycle, blanket 24/7 support, generic “priority CVE patching,” and a 4-hour critical SLA. I corrected this to the documented 18-month lifecycle for Rancher Prime v2.9+ releases, Standard vs Priority support models, trusted Prime artifacts, and Priority SLTs of 1 hour for Sev 1 and 2 hours for Sev 2.
- Step 1 incorrectly referred to a downloadable Rancher Prime license key and used `registry.suse.com`. Rancher Prime access is tied to SCC-backed Prime registry/chart access, so I changed the step to use SCC credentials and a Prime registry pull secret against `registry.rancher.com`.
- Step 2 omitted the required `cert-manager` installation for the `letsEncrypt` flow, used the obsolete `global.cattle.psp.enabled=false` flag, omitted `letsEncrypt.ingress.class`, and pinned an outdated Rancher version (`2.8.0`). I added the documented cert-manager install, removed the deprecated PSP flag, added the ingress class, added `privateCA=true` for the strict agent TLS default, wired in the pull secret, and updated the pinned chart version to the current Prime patch release line (`2.13.4`) validated on 2026-04-23.
- Step 3 claimed Rancher Prime lifecycle is configured through SUSE Manager with `rhnreg_ks`. That is not the documented Rancher Prime lifecycle flow. I replaced it with the actual lifecycle and support-matrix verification workflow and included the current 2.13.x GA/EOM/EOL dates.
- Step 4 hardcoded unsupported RKE2 `systemImages` overrides and old image tags. Current guidance is to use the Prime registry plus the RKE2 CIS profile. I replaced the snippet with a Rancher provisioning example using `system-default-registry: registry.rancher.com`, `profile: cis`, and the Rancher PSA template.
- Step 4 and the conclusion referred to FIPS 140-2 images. Current RKE2 hardened-image documentation states a FIPS 140-3 compliant build process and notes that only Linux AMD64 is FIPS compliant. I updated the wording accordingly.
- Step 5 tried to enable Rancher audit logging by patching a `rancher-config` ConfigMap. Current Rancher documentation enables API audit logging through Helm values (`auditLog.enabled` and `auditLog.level`). I replaced the invalid ConfigMap patch with a `helm upgrade` command and also normalized the RKE2 API-server audit-log path to the documented location.
- Step 6 used an unsupported `kubectl rancher-support-bundle collect` command and outdated support-response times. I replaced it with the documented Rancher UI path and the documented supportconfig extraction method, updated the support-case URL to its current destination, and corrected the Standard/Priority service-level targets.
- Step 7 stated that NeuVector is simply “included with Prime” and used an unsupported Helm command/repository. Current SUSE Security docs use the `rancher-charts` repo, a separate `neuvector-crd` install, PSA namespace labeling when required, and Prime-specific Helm values. I replaced the example with that supported flow and kept the chart version as a support-matrix-driven placeholder.
- The deployment checklist and conclusion repeated the incorrect lifecycle, licensing, SUSE Manager, FIPS, and NeuVector assertions. I updated both sections to match the corrected technical guidance.

## Review Notes
- The post now reflects the current Prime release line as of 2026-04-23 by pinning Rancher Prime `2.13.4`. That pin should be revisited if the article remains published after a newer supported Prime patch release becomes standard.
- The Let’s Encrypt flow for Rancher Prime requires additional CA handling when `agent-tls-mode` is `strict` on new installs. The post now notes that requirement, but operators still need to supply the CA material appropriate for their environment.
- The NeuVector chart version intentionally remains a placeholder because SUSE documents chart compatibility through the support matrix rather than a single fixed version across all Rancher release lines.
