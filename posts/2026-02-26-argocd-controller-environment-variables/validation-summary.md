# Validation Summary: How to Configure ArgoCD Controller Environment Variables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD application controller
- Argo CD `argocd-cmd-params-cm` and `argocd-cm` ConfigMaps
- Kubernetes StatefulSets
- Kubernetes `kubectl`
- Prometheus metrics and PromQL

## Sources Consulted
- Argo CD `argocd-cmd-params-cm.yaml` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd-cm.yaml` example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD High Availability guide: https://argo-cd.readthedocs.io/en/latest/operator-manual/high_availability/
- Argo CD Resource Tracking guide: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/resource_tracking/
- Argo CD Metrics guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Diff Strategies guide: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/diff-strategies/
- Argo CD application controller command source: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd-application-controller/commands/argocd_application_controller.go
- Argo CD common environment variable constants: https://github.com/argoproj/argo-cd/blob/master/common/common.go

## Issues Found
- The post used `controller.repo.server.timeout.seconds` as the reconciliation polling interval. Changed this to `timeout.reconciliation` and `timeout.reconciliation.jitter`, and noted these are `argocd-cm` settings.
- The reconciliation timeout examples used numeric strings like `"300"` instead of duration strings such as `"300s"`. Updated them to the documented duration format.
- The direct environment variable examples used `ARGOCD_CONTROLLER_STATUS_PROCESSORS`, `ARGOCD_CONTROLLER_OPERATION_PROCESSORS`, and `ARGOCD_LOG_LEVEL`. Updated them to the current controller command environment variables `ARGOCD_APPLICATION_CONTROLLER_STATUS_PROCESSORS`, `ARGOCD_APPLICATION_CONTROLLER_OPERATION_PROCESSORS`, and `ARGOCD_APPLICATION_CONTROLLER_LOGLEVEL`.
- The processor recommendations were far above the official HA guide's 1000-application example. Reduced the examples and made them conditional on observed reconciliation or sync processing pressure.
- The PromQL example described histogram bucket math as queue depth. Replaced it with a reconciliation latency query and added `argocd_kubectl_exec_pending`.
- The sharding example implied `controller.sharding.algorithm` sets the number of shards and that `ARGOCD_CONTROLLER_REPLICAS` alone enables sharding. Added a StatefulSet `replicas` example and changed the algorithm environment variable to `ARGOCD_CONTROLLER_SHARDING_ALGORITHM`.
- The resource health setting was described as a manifest memory cache limit. Reworded it as per-resource health persistence in the Application CR and set the Argo CD 3.x performance-oriented value to `false`.
- The repo-server address and parallelism keys were incorrect. Changed `controller.repo.server.address` to `repo.server` and `controller.repo.server.parallelism.limit` to `reposerver.parallelism.limit`.
- `application.resourceTrackingMethod` was shown as a controller command parameter. Moved it into an `argocd-cm` example.
- The server-side diff recommendation overstated it as a production default. Reworded it to describe the dry-run behavior and beta status.

## Review Notes
The post remains version-sensitive because Argo CD 2.x and 3.x differ in defaults such as reconciliation jitter and resource health persistence. The corrected text follows the current stable documentation as of 2026-05-20.
