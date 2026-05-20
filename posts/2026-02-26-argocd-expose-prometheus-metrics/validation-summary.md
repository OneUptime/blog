# Validation Summary: How to Expose ArgoCD Prometheus Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Helm
- NetworkPolicy

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/install.yaml
- Argo CD command parameter reference: https://raw.githubusercontent.com/argoproj/argo-cd/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD application controller command flags: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd-application-controller/commands/argocd_application_controller.go
- Argo CD server command flags: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd-server/commands/argocd_server.go
- Argo CD repo server command flags: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd-repo-server/commands/argocd_repo_server.go
- Argo Helm chart values and templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The post described three Argo CD components as "every" component / "three main components." Current Argo CD also documents additional metrics-producing components such as ApplicationSet and commit server, so I narrowed the wording to the three core components covered by the guide.
- The pod annotation example used `kind: Deployment` for `argocd-application-controller`. Argo CD deploys the application controller as a StatefulSet in the official manifests and Helm chart, so I changed the example to `kind: StatefulSet` and clarified that the API server and repo server are Deployments.
- The custom metrics port example used `argocd-cmd-params-cm` keys such as `controller.metrics.port`, `server.metrics.port`, and `reposerver.metrics.port`. Those keys are not in the current Argo CD command parameter reference. I replaced the example with current Argo Helm values that set `containerPorts.metrics` and matching metrics service ports, and noted that non-Helm installs should update each component's `--metrics-port` argument plus the Service/ServiceMonitor.
- The verification section labeled `grpc_server_handled_total` as a general API server request metric. Argo CD documents it under gRPC metrics and notes that gRPC metrics require `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true`, so I added that caveat.
- The services section implied readers always need to create metrics Services. Official Argo CD manifests and the Helm chart can already create metrics Services, so I qualified the instruction to create them only if the installation does not already include them.

## Review Notes
The examples are intentionally generic. In real clusters, ServiceMonitor labels and namespace selection must match the Prometheus resource's `serviceMonitorSelector` and `serviceMonitorNamespaceSelector`.
