# Validation Summary: How to Size ArgoCD Components for Large Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Helm chart
- Kubernetes
- kubectl
- Prometheus
- Redis HA
- Helm, Kustomize, and Config Management Plugins

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Redis HA Helm chart values used by the Argo CD chart: https://github.com/DandyDeveloper/charts/blob/master/charts/redis-ha/values.yaml
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The high-frequency sync tuning snippet used `controller.k8s.client.config.qps` and `controller.k8s.client.config.burst`, which are not the documented Argo CD command parameter keys. Changed them to `controller.k8s.client.qps` and `controller.k8s.client.burst`.
- The measuring section described `kubectl top pods --containers` as historical usage. Kubernetes documents `kubectl top` as current CPU and memory usage, so the comment was changed to per-container current usage.
- The pprof heap command did not mention that Argo CD profile endpoints must be enabled first. Added a note that it requires `controller.profile.enabled: "true"`.
- The final diagnostic command was labeled as a CPU throttling check, but `kubectl top` shows current CPU and memory usage, not throttling. Changed the label to high current CPU usage.

## Review Notes
The sizing values are capacity-planning recommendations rather than strict API behavior. They are plausible but should be treated as starting points and validated with workload-specific measurements, as the post already recommends. The Redis memory metric depends on Redis exporter metrics being scraped.
