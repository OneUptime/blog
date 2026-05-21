# Validation Summary: How to Configure Istiod High Availability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio and istiod
- IstioOperator
- Helm
- Kubernetes Deployments
- Kubernetes PodDisruptionBudget
- Kubernetes pod anti-affinity
- Kubernetes HorizontalPodAutoscaler
- Kubernetes readiness probes
- Kubernetes resource requests, limits, and QoS classes
- Istio multi-cluster deployments

## Sources Consulted
- Istio Install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Customizing the installation configuration: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio istiod Helm chart values and templates: https://github.com/istio/istio/tree/master/manifests/charts/istio-control/istio-discovery
- Istio Install Multi-Primary: https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio Install Multi-Primary on different networks: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio Deployment Models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Pod QoS classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The Helm replica example used `--set pilot.replicaCount=3`. Current Istio Helm chart values use the top-level `replicaCount`, and the chart only renders Deployment replicas when `autoscaleEnabled` is disabled. I changed the command to set `autoscaleEnabled=false` and `replicaCount=3`.
- The replica-count guidance said a two-replica deployment temporarily drops to one replica during a rolling update and that three replicas always keep two available. That depends on rollout and disruption settings, so I revised the wording to focus on spare capacity and planned disruptions with a PDB.
- The PodDisruptionBudget explanation implied all evictions are covered. Kubernetes PDBs govern voluntary evictions, so I narrowed the wording to voluntary evictions.
- The Guaranteed QoS explanation said istiod "will not be evicted" under memory pressure. Guaranteed pods are the least likely QoS class to be evicted, but they are not completely immune, so I corrected the wording.
- The health check example configured `livenessProbe` under `components.pilot.k8s`, but the IstioOperator `KubernetesResourcesSpec` exposes `readinessProbe` and not `livenessProbe`. I removed the unsupported liveness probe from the example and narrowed the surrounding text to readiness.
- The graceful shutdown example used an unsupported `components.pilot.k8s.deployment.spec.template.spec.terminationGracePeriodSeconds` path. I changed it to an IstioOperator overlay patch for `spec.template.spec.terminationGracePeriodSeconds`.
- The multi-cluster HA section claimed another cluster's control plane could serve as a direct backup if one control plane was completely down. Istio multi-primary improves fault isolation and endpoint discovery across clusters, but it is not a blanket transparent replacement for all local control-plane functions. I revised the wording to describe workload traffic failover across clusters with a multi-primary setup and remote secrets.

## Review Notes
- The resource sizing examples are reasonable illustrative starting points, but actual istiod sizing should be validated with production metrics and load characteristics.
- The PDB and anti-affinity examples use broad `app: istiod` matching. In revisioned control-plane installs, include revision-specific labels such as `istio.io/rev` where appropriate.
