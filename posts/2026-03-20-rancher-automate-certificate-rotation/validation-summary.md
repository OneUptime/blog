# Validation Summary: How to Automate Certificate Rotation in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- cert-manager
- Kubernetes Cron and CronJob concepts
- Prometheus
- Prometheus Blackbox Exporter
- TLS / X.509 certificates

## Sources Consulted
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Adding TLS Secrets: https://ranchermanager.docs.rancher.com/v2.10/getting-started/installation-and-upgrade/resources/add-tls-secrets
- Upgrading Cert-Manager: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/upgrade-cert-manager
- RKE2 Certificate Management: https://docs.rke2.io/security/certificates
- RKE2 Advanced Options and Configuration: https://docs.rke2.io/advanced
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP01 solver configuration: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate resource reference: https://cert-manager.io/docs/usage/certificate/
- Kubernetes CronJob concepts: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md

## Issues Found
- The cert-manager install example used an older static manifest and the Rancher install example omitted required Helm repo setup and namespace creation. I updated the commands to use a Rancher-compatible cert-manager Helm install, added the missing Helm repo steps, added `--create-namespace`, and set `letsEncrypt.ingress.class`.
- The Rancher Let's Encrypt section did not mention the `agentTLSMode=strict` behavior on newer Rancher installs. I added a note explaining that `privateCA=true` plus uploading the Let's Encrypt CA is required when keeping the default strict mode.
- The ACME solver example used `class: nginx`, while current cert-manager documentation recommends `ingressClassName` for this use case. I updated the example accordingly.
- The custom `ClusterIssuer` example did not clarify that the CA secret for a `ClusterIssuer` must live in the `cert-manager` namespace. I added that note directly to the YAML.
- The custom certificate example sat next to Rancher's built-in Let's Encrypt flow without clarifying that Rancher must use `ingress.tls.source=secret` when cert-manager is managing `tls-rancher-ingress`. I added that clarification.
- The RKE2 certificate check section used `rke2 certificate rotate --help` plus an `openssl` loop instead of the documented `rke2 certificate check --output table` command. I replaced it with the official check command.
- The RKE2 automation script incorrectly checked `server-ca.crt` and then called `rke2 certificate rotate`, even though CA rotation is handled separately with `rke2 certificate rotate-ca`. I rewrote the script to inspect documented certificate-check output, ignore CA entries, rotate only client/server certificates, and explicitly note that CA rotation is separate.
- The original RKE2 scheduling advice used a Kubernetes `CronJob` for node-level `systemctl` and `rke2` operations. That is not an accurate fit for how RKE2 rotation is performed on hosts, so I replaced it with a host-level cron example and noted that multi-server clusters should stagger rotation.
- The Prometheus alert examples used `ssl_certificate_expiry_seconds`, which is not the standard blackbox exporter certificate-expiry metric, and the annotations referenced labels/functions inconsistently. I replaced the rules with `probe_ssl_earliest_cert_expiry`, fixed the annotation templates, and aligned them with Prometheus templating behavior.
- The blackbox exporter module did not explicitly require TLS. I added `fail_if_not_ssl: true` so the probe fails if the endpoint is not actually serving HTTPS.

## Review Notes
- Rancher documentation currently notes compatibility with the `cert-manager.io/v1` API and says Rancher was last tested with cert-manager `v1.13.1`; newer cert-manager releases may still work, but Rancher’s docs do not currently make a stronger compatibility statement.
- Current RKE2 documentation states that client/server certificates are automatically renewed on restart when expired or within 120 days of expiry; older release lines used a 90-day threshold.
- The blackbox exporter monitoring examples assume Prometheus is already scraping the blackbox exporter with an HTTPS probe module; the post still does not include the matching Prometheus scrape configuration, only the module definition.
