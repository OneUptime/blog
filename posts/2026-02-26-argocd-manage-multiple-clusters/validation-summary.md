# Validation Summary: How to Manage Multiple Clusters from a Single ArgoCD Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Argo CD AppProjects
- Kubernetes
- Prometheus metrics and PrometheusRule alerts
- GitOps repository structure

## Sources Consulted
- Argo CD declarative cluster setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet cluster generator: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Git generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD project specification: https://argo-cd.readthedocs.io/en/latest/operator-manual/project-specification/
- Argo CD high availability guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD disaster recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_export/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Kubernetes `kubectl scale` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The controller sharding section gave a fixed 10-15 cluster threshold and only scaled the StatefulSet. Argo CD documents sharding as appropriate when the controller manages too many clusters and uses too much memory, and requires `ARGOCD_CONTROLLER_REPLICAS` to match the replica count. Updated the text and example accordingly.
- The repo server and API server snippets looked like standalone `apps/v1` Deployment resources but omitted required selector metadata. Marked them as strategic merge patches, and added `ARGOCD_API_SERVER_REPLICAS` to the API server patch per Argo CD HA guidance.
- The Redis HA example used an Argo CD `Application` pointing at `manifests/ha/install`, which is not the documented HA installation manifest path. Replaced it with the official HA install manifest URL, which includes Redis HA.
- The cluster disconnection alert used `argocd_cluster_info == 0`, which is an information metric rather than the documented connection status metric. Replaced it with `argocd_cluster_connection_status{connection_status!="Successful"} == 1`.
- The disaster recovery restore command omitted the required `SOURCE` argument for `argocd admin import`, and the backup examples did not specify the Argo CD namespace. Updated the examples to use `argocd admin import -n argocd - < argocd-backup.yaml` and `argocd admin export -n argocd`.

## Review Notes
- The ApplicationSet examples use the default fasttemplate syntax (`{{name}}`, `{{server}}`, `{{path.basename}}`) rather than Go template syntax. This is valid because `goTemplate: true` is not set.
- The Argo CD HA documentation notes that `round-robin` controller sharding is experimental. The example remains usable, but production teams should evaluate the sharding algorithm choice against their Argo CD version and operational requirements.
