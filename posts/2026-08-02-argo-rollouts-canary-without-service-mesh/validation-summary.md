# Validation Summary: Can Argo Rollouts Do a Canary Without a Service Mesh? Replica-Based Routing Explained

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Argo Rollouts canary strategy
- Kubernetes Rollouts, ReplicaSets, Pods, Services, and EndpointSlices
- Kubernetes readiness probes and `minReadySeconds`
- Kubernetes Horizontal Pod Autoscaler (`autoscaling/v2`)
- Argo Rollouts AnalysisRuns and AnalysisTemplates
- Argo Rollouts kubectl plugin
- NGINX Ingress Controller traffic routing
- AWS Load Balancer Controller and Application Load Balancer weighted target groups
- Kubernetes Gateway API traffic-router plugin for Argo Rollouts
- GitOps management of HPA-owned replica fields

## Sources Consulted

- [Argo Rollouts: Canary deployment strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Traffic management overview](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Traffic-router plugins](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/plugins/)
- [Argo Rollouts: NGINX traffic management](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/)
- [Argo Rollouts: AWS ALB traffic management](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/)
- [Argo Rollouts: HPA support](https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/)
- [Argo Rollouts: Analysis and progressive delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts kubectl plugin: get rollout](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/)
- [Argo Rollouts kubectl plugin: promote](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Virtual IPs and Service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Topology Aware Routing](https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: Configure liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Ingress-NGINX: Canary annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary)
- [AWS: Application Load Balancer target-group attributes and stickiness](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)

## Issues Found

- The HPA used a CPU `averageUtilization` target, but the Rollout's container did not declare a CPU request. Kubernetes calculates CPU utilization relative to `resources.requests.cpu`; without that request, the Pod's CPU utilization is undefined and the HPA cannot act on the metric. Added a `100m` CPU request to the Rollout example and explained the requirement beside the HPA example.
- The post described ingress/ALB/Gateway routing as "precise" and referred to AWS ALB as an ingress controller. Router integrations decouple configured weights from Pod counts, but finite samples and sticky routing can still differ from the target percentage; AWS's Kubernetes integration is provided by the AWS Load Balancer Controller. Updated the terminology, controller name, heading, and decision guidance accordingly.
- The Gateway API traffic-router plugin was described as supported without noting its maturity. Argo's official documentation identifies the traffic-router plugin system as an experimental alpha feature. Added that qualification where the plugin is introduced and recommended.
- The slower-canary bullet was framed as an effect that skews request traffic. At a fixed arrival rate, slower service time directly increases concurrent in-flight requests rather than necessarily changing request-arrival share. Reworded the bullet to apply specifically to concurrency-based measurements.

## Review Notes

- The documented `argoproj.io/v1alpha1` Rollout API, `autoscaling/v2` HPA API, canary step fields, readiness fields, Service fields, and CLI commands are current and correctly formed.
- The basic-canary rounding examples, stable/canary Service selector behavior, analysis behavior, HPA aggregation across ReplicaSet-based canary Pods, and `setCanaryScale` traffic-router requirement agree with current Argo Rollouts documentation.
- The Gateway API integration should be reevaluated before production adoption because its plugin framework remains alpha. The post now makes that maturity caveat explicit.
