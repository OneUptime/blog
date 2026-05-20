# Validation Summary: How to Deploy Ray Clusters with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- KubeRay operator
- RayCluster and RayService custom resources
- Ray Serve
- Prometheus Operator PodMonitor
- NGINX Ingress

## Sources Consulted
- KubeRay Helm chart documentation: https://ray-project.github.io/kuberay/deploy/helm/
- Ray KubeRay RayCluster configuration documentation: https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/config.html
- Ray KubeRay autoscaling documentation: https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/configuring-autoscaling.html
- Ray KubeRay RayService documentation: https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/rayservice.html
- KubeRay API reference: https://ray-project.github.io/kuberay/reference/api/
- Ray Prometheus and Grafana documentation for KubeRay: https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/prometheus-grafana.html
- Ray KubeRay upgrade guidance: https://docs.ray.io/en/latest/cluster/kubernetes/getting-started.html
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The post manually created a `Service` named `ml-cluster-head-svc`, but KubeRay automatically creates the Ray head service using the RayCluster name plus the `-head-svc` suffix. I changed Step 3 to use the KubeRay-managed head service and only define the Ingress.
- The RayCluster explicitly listed head container ports but omitted the metrics port. KubeRay exposes only the listed head ports when a custom ports list is provided, so I added `metrics-export-port: '8080'` and a named `metrics` container port.
- The worker groups did not expose a named metrics port for Prometheus scraping. I added `metrics-export-port: '8080'` and a named `metrics` container port to both worker groups.
- The RayService example used `serviceUnhealthySecondThreshold` and `deploymentUnhealthySecondThreshold`, which are deprecated in the current KubeRay API reference. I removed those fields.
- The upgrade section said ArgoCD would perform a rolling update of the Ray cluster. RayCluster does not provide native zero-downtime rolling upgrades for Ray version changes, so I changed the wording to say ArgoCD applies the manifest and KubeRay reconciles the cluster, then recommended creating a new RayCluster for production upgrades.
- The monitoring example used a `ServiceMonitor` against `/api/prometheus_health`, which is not the Ray Prometheus metrics scrape endpoint. I replaced it with `PodMonitor` examples that scrape the named `metrics` port on Ray head and worker pods.

## Review Notes
The snippets are version-specific around KubeRay 1.1.0 and Ray 2.9.0. KubeRay 1.1.0 supports `ray.io/v1` CRDs and Ray 2.8.0 or later, so the selected Ray version is compatible. The edited YAML snippets were parsed locally with PyYAML.
