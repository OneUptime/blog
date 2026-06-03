# Validation Summary: How to Deploy Ray Clusters on Kubernetes for Distributed ML Training and Serving

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- KubeRay operator
- RayCluster custom resources
- Ray Train
- Ray Tune
- Ray Serve
- Helm
- Prometheus metrics
- Python
- PyTorch

## Sources Consulted
- Ray KubeRay installation documentation: https://ray-project.github.io/kuberay/deploy/installation/
- Ray KubeRay RayCluster configuration documentation: https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/config.html
- Ray KubeRay autoscaling documentation: https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/configuring-autoscaling.html
- Ray Train TorchTrainer documentation: https://docs.ray.io/en/latest/train/api/doc/ray.train.torch.torch_trainer.TorchTrainer.html
- Ray Train ScalingConfig documentation: https://docs.ray.io/en/latest/train/api/doc/ray.train.ScalingConfig.html
- Ray Train report documentation: https://docs.ray.io/en/latest/train/api/doc/ray.train.report.html
- Ray Tune report documentation: https://docs.ray.io/en/latest/tune/api/doc/ray.tune.report.html
- Ray Tune metrics and RunConfig documentation: https://docs.ray.io/en/latest/tune/tutorials/tune-metrics.html
- Ray Serve Deployment documentation: https://docs.ray.io/en/latest/serve/api/doc/ray.serve.Deployment.html
- Ray Serve run documentation: https://docs.ray.io/en/latest/serve/api/doc/ray.serve.run.html
- Ray Serve HTTPOptions documentation: https://docs.ray.io/en/latest/serve/api/doc/ray.serve.config.HTTPOptions.html
- Ray metrics documentation: https://docs.ray.io/en/latest/cluster/metrics.html
- Ray system metrics reference: https://docs.ray.io/en/latest/ray-observability/reference/system-metrics.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The KubeRay operator and Ray examples used older pinned versions. Updated KubeRay from 1.0.0 to 1.6.0 and Ray examples from 2.9.0 to 2.55.1 to match current official documentation.
- The ML examples used the base Ray image even though the training, tuning, and serving snippets import PyTorch. Switched the main cluster and job images to `rayproject/ray-ml` so the examples use an ML-oriented Ray image.
- The RayCluster head container declared a custom port list but omitted the Ray Serve and metrics ports used later in the post. Added ports 8000 and 8080 and configured `metrics-export-port`.
- The worker containers did not expose the metrics port. Added `metrics-export-port` and a named metrics port for workers.
- The Kubernetes wait command used lowercase `ready`. Updated it to the standard `Ready` condition.
- The Ingress used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName`.
- The training job command used `kubectl run`, which creates a Pod rather than a Job. Changed it to `kubectl create job`.
- The Ray Train `ScalingConfig` example included a `memory` entry in `resources_per_worker`; current Ray docs describe CPU/GPU overrides there. Narrowed the example to the documented CPU override.
- The Ray Tune example called `tune.report` with keyword arguments and referenced `train.RunConfig` without importing `train`. Updated it to pass a metrics dictionary and use `tune.RunConfig`.
- The Ray Serve example used the older direct `Deployment.deploy()` style and did not bind the HTTP proxy to an externally reachable host. Updated it to `bind()` plus `serve.run()` and configured Serve HTTP host `0.0.0.0`.
- The GPU RayCluster example used `rayStartParams.resources` to declare GPU capacity. Current KubeRay documentation says `CPU`, `GPU`, and `memory` are forbidden in `rayStartParams.resources`; changed it to `num-gpus`.
- The Prometheus metrics list included `ray_tasks_execution_time_ms`, which is not in the current Ray system metrics reference. Replaced it with `sum(ray_tasks) by (State)`.

## Review Notes
The article is now technically valid as a tutorial. For production use, readers would still need to adapt storage, security, image pinning, authentication, ingress TLS, and Prometheus discovery to their cluster environment.
