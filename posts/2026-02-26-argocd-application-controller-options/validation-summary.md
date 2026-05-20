# Validation Summary: How to Configure argocd-application-controller Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Kustomize
- Redis
- Prometheus metrics

## Sources Consulted
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD high availability and controller scaling guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD additional command configuration method: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/additional-configuration-method/
- Argo CD command parameters ConfigMap reference: https://raw.githubusercontent.com/argoproj/argo-cd/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Official Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Official Argo CD Helm package metadata: https://artifacthub.io/packages/helm/argo/argo-cd

## Issues Found
- The post said the controller runs as a StatefulSet or Deployment in newer versions. The standard upstream install uses a StatefulSet, so the wording was corrected to avoid implying that Deployment is the normal newer default.
- The `--app-resync` default was listed as 180 seconds. Current stable command documentation lists a 120 second default with `--app-resync-jitter` defaulting to 60 seconds, so the default description and trade-off bullet were updated.
- The `--self-heal-timeout-seconds` option was described as a maximum duration for self-healing sync operations. Official docs describe it as the timeout between self-heal attempts, so the description was corrected.
- The post used a nonexistent `--controller-sharding-algorithm` flag and omitted `consistent-hashing` from current supported sharding methods. This was corrected to `--sharding-method` with `legacy`, `round-robin`, and `consistent-hashing`, plus the documented `controller.sharding.algorithm` alternative.
- The post documented a nonexistent `--resource-parallelism-limit` controller flag. That section was replaced with the valid `--persist-resource-health` flag and its actual behavior.
- Redis compression was described as simply enabling compression. Current docs show `--redis-compress` selects `gzip` or `none` and defaults to `gzip`, so the wording was corrected.
- The production example pinned the old `quay.io/argoproj/argocd:v2.10.0` image. It was updated to the current Argo CD `v3.4.1` image referenced by the official Helm package metadata.
- The metrics example port-forwarded the controller StatefulSet directly. Official metrics docs document the controller metrics endpoint as `argocd-metrics:8082/metrics`, so the command was changed to port-forward `svc/argocd-metrics`.
- The metrics list used Prometheus histogram series names for reconciliation instead of the documented metric name and omitted the documented Kubernetes request metric. It now lists `argocd_app_reconcile` and `argocd_app_k8s_request_total`.
- The environment variable example included undocumented or misleading controller environment variables. It was replaced with the documented `argocd-cmd-params-cm` configuration pattern using `controller.` keys.

## Review Notes
The tuning recommendations are still general guidance and should be validated against real controller, repo-server, Redis, and Kubernetes API server metrics before applying them in production. The `round-robin` and `consistent-hashing` sharding methods are documented as experimental in the high availability guide.
