# Validation Summary: How to Deploy Ray Cluster on Kubernetes with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- KubeRay operator
- RayCluster
- RayService
- Ray Serve
- HelmRepository
- HelmRelease
- Flux Kustomization

## Sources Consulted
- Ray documentation: KubeRay operator installation, https://docs.ray.io/en/latest/cluster/kubernetes/getting-started/kuberay-operator-installation.html
- Ray documentation: KubeRay autoscaling, https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/configuring-autoscaling.html
- Ray documentation: RayCluster configuration, https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/config.html
- Ray documentation: RayService and Ray Serve on Kubernetes, https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/rayservice.html
- Ray documentation: Ray Serve autoscaling, https://docs.ray.io/en/latest/serve/autoscaling-guide.html
- Ray documentation: Configure Ray Serve deployments, https://docs.ray.io/en/latest/serve/configure-serve-deployment.html
- Flux documentation: HelmRelease API v2, https://fluxcd.io/flux/components/helm/api/v2/
- Flux documentation: Kustomization dependencies and wait behavior, https://fluxcd.io/flux/components/kustomize/kustomizations/
- KubeRay Helm chart values, https://raw.githubusercontent.com/ray-project/kuberay/v1.6.0/helm-chart/kuberay-operator/values.yaml

## Issues Found
- The KubeRay HelmRelease used deprecated or unsupported chart values. The chart documents `batchScheduler.enabled` as a legacy option and uses `metrics.enabled` plus `service.port` rather than a top-level `metricsPort`, so the values were updated accordingly.
- The Ray Serve deployment configured `num_replicas: 2` together with `autoscaling_config`. Current Ray Serve documentation states that numeric `num_replicas` cannot be set when autoscaling is configured, so it was changed to `num_replicas: auto`.
- The Ray Serve autoscaling config used the old `target_num_ongoing_requests_per_replica` field. It was updated to the current `target_ongoing_requests` field.
- The Flux Kustomization depended on `kuberay-operator`, but Flux `dependsOn` references other Flux `Kustomization` objects, not HelmRelease objects. The dependency was changed to an `infrastructure` Kustomization that reconciles the KubeRay HelmRelease.
- The local Python connection example used the dashboard HTTP URL with `ray.init`. The RayCluster service exposes Ray Client on port 10001, so the port-forward and `RAY_ADDRESS` example were updated to use `ray://localhost:10001`.

## Review Notes
- The example assumes the `ray-workloads` namespace and the `app-repo` GitRepository are managed elsewhere in the Flux repository.
- The custom Docker images must contain the same Ray version specified by `spec.rayVersion`; this is already noted in the post and matches Ray's KubeRay guidance.
