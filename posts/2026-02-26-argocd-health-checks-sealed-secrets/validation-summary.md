# Validation Summary: How to Configure Health Checks for Sealed Secrets in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD custom resource health checks
- Lua health check scripts
- Bitnami Sealed Secrets
- Kubernetes Secrets and kubectl
- kubeseal CLI
- PrometheusRule alerting

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Bitnami Labs Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Labs Sealed Secrets API documentation: https://pkg.go.dev/github.com/bitnami-labs/sealed-secrets/pkg/apis/sealed-secrets/v1alpha1
- Bitnami Labs Sealed Secrets release notes: https://github.com/bitnami-labs/sealed-secrets/blob/main/RELEASE-NOTES.md
- Bitnami Labs Sealed Secrets controller metrics source: https://raw.githubusercontent.com/bitnami-labs/sealed-secrets/main/pkg/controller/metrics.go
- Bitnami Labs kubeseal CLI flags source: https://raw.githubusercontent.com/bitnami-labs/sealed-secrets/main/cmd/kubeseal/main.go
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The `kubeseal --validate` and `kubeseal --fetch-cert` examples used `--controller-name sealed-secrets`, while the post's controller log examples assume the default `sealed-secrets-controller` Deployment. Updated the controller name to `sealed-secrets-controller` for consistency with kubeseal's documented default.
- The sealing-key listing command selected all key secrets, including non-active keys. Updated the label selector to `sealedsecrets.bitnami.com/sealed-secrets-key=active` so it matches the keys the controller uses for unsealing.
- The enhanced Lua health check treated every non-`True` `Synced` condition as `Degraded`, even though the Sealed Secrets API allows `Unknown`. Updated the script to mark `False` as `Degraded` and `Unknown`/other statuses as `Progressing`.
- The Prometheus alert queried a cumulative counter directly with `sealed_secrets_controller_unseal_errors_total > 0`, which would keep firing after any historical error. Updated it to use `increase(sealed_secrets_controller_unseal_errors_total[5m]) > 0` to alert on recent unseal errors.
- The re-encryption example decrypted SealedSecrets with a recovery key and resealed them manually. Replaced it with the supported `kubeseal --re-encrypt` flow, which re-encrypts a SealedSecret with the latest cluster key.

## Review Notes
The Argo CD health customization key format, SealedSecret `status.conditions` and `observedGeneration` fields, `kubeseal --validate`, `kubeseal --recovery-unseal`, `kubectl events --for`, and `argocd app get --hard-refresh` usage were verified as current. The generated Secret name can differ from the SealedSecret name if `spec.template.metadata.name` is used; the post's verification command is correct for the default same-name case but could be expanded in a future revision.
