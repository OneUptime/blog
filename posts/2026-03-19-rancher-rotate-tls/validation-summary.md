# Validation Summary: How to Rotate Rancher TLS Certificates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- cert-manager
- TLS certificates
- OpenSSL
- Prometheus

## Sources Consulted
- Rancher: Updating the Rancher Certificate: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/update-rancher-certificate
- Rancher: Adding TLS Secrets: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/add-tls-secrets
- Rancher: TLS Settings: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/tls-settings
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- cert-manager: The cert-manager Command Line Tool (cmctl): https://cert-manager.io/docs/reference/cmctl/
- cert-manager: Certificate resource: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager: Annotated Ingress resource: https://cert-manager.io/docs/usage/ingress/
- cert-manager: FAQ: https://cert-manager.io/docs/faq/
- Kubernetes: `kubectl create secret tls`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes: `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: `kubectl rollout restart`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Prometheus: Understanding and using the multi-target exporter pattern: https://prometheus.io/docs/guides/multi-target-exporter/

## Issues Found
- The Let's Encrypt section used `kubectl delete secret tls-rancher-ingress` as the force-renewal mechanism. I replaced it with `cmctl renew -n cattle-system tls-rancher-ingress` because cert-manager documents `cmctl renew` as the recommended manual reissuance path and explicitly warns against deleting the target `Secret` for manual rotation.
- The cert-manager troubleshooting command used a label selector that is not guaranteed across installs. I changed it to `kubectl logs -n cert-manager deploy/cert-manager --all-pods=true --tail=50`, which matches current `kubectl logs` resource syntax.
- The custom certificate update flow deleted and recreated `tls-rancher-ingress` and `tls-ca`. I changed those commands to in-place secret updates using `--dry-run=client -o yaml | kubectl apply -f -`, which aligns with Rancher’s documented certificate update flow and avoids unnecessary secret removal.
- The post said Rancher should always be restarted to pick up the new certificate. I narrowed that guidance to CA changes only, because Rancher documents that the `tls-ca` secret is read when Rancher starts.
- The post instructed readers to patch the Rancher `cacerts` setting manually. I removed that unsupported patch step and changed the section to verification, because Rancher documents that `cacerts` should reflect the `tls-ca` secret after the Rancher pods restart.
- The downstream agent update step restarted `cattle-cluster-agent` and `cattle-node-agent` directly. I replaced that with Rancher’s documented `io.cattle.agent.force.deploy=true` annotation flow and added the Fleet `Force Update` requirement for CA changes.
- The in-cluster verification command checked `rancher.cattle-system.svc:443`, which is not the right validation point for Rancher HA installs because TLS is terminated at the ingress controller. I replaced it with verification of the `tls-rancher-ingress` secret in `cattle-system`.
- The monitoring section assumed `probe_ssl_earliest_cert_expiry` would already exist. I made the blackbox-exporter dependency explicit so the `PrometheusRule` is not presented as self-contained.

## Review Notes
- The guide now accurately covers certificate rotation for existing Rancher certificate modes. If a reader is migrating between certificate sources, such as `letsEncrypt` to `secret`, Rancher also requires Helm value changes like `ingress.tls.source=secret` and `privateCA=true`.
- The cert-manager `Certificate` example is valid as written. Newer cert-manager releases also support `renewBeforePercentage`, but `renewBefore` remains current and supported.
