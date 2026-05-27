# Validation Summary: How to Set Up Auto-Scaling Policies for Modernized Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE) Autopilot
- Kubernetes Deployments
- Horizontal Pod Autoscaler (HPA)
- Vertical Pod Autoscaler (VPA)
- PodDisruptionBudget
- Cloud Monitoring custom and external metrics
- Pub/Sub backlog-based autoscaling
- kubectl
- gcloud CLI

## Sources Consulted
- Google Cloud: Resource requests in Autopilot: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Google Cloud: Horizontal Pod autoscaling in GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/horizontalpodautoscaler
- Google Cloud: Optimize Pod autoscaling based on metrics: https://docs.cloud.google.com/kubernetes-engine/docs/tutorials/autoscaling-metrics
- Google Cloud sample: Pub/Sub HPA: https://docs.cloud.google.com/kubernetes-engine/docs/samples/container-pubsub-horizontal-pod-autoscaler
- Google Cloud: Vertical Pod autoscaling in GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- Kubernetes: Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes: HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Kubernetes: Disruptions and PodDisruptionBudget: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The deployment snippet said Autopilot limits default to requests if limits are not set. Google Cloud documents that this depends on whether the Autopilot cluster supports bursting, so the comment was changed to say that limits above requests allow bursting only on clusters that support bursting.
- The HPA example used `scaleUp.stabilizationWindowSeconds: 30` while describing rapid scale-up. Kubernetes documents that the default scale-up stabilization window is `0`, so the example was changed to `0` to match the intended behavior.
- The HPA behavior explanation incorrectly described default scale-up as conservative and default scale-down as immediate. Kubernetes documents default scale-up as up to 4 pods or 100% every 15 seconds, and default scale-down as using a 300 second stabilization window. The explanation was corrected.
- The custom metrics adapter setup only applied the adapter manifest. Google Cloud's Workload Identity Federation instructions also require granting the adapter's Kubernetes service account `roles/monitoring.viewer`, so the documented `gcloud projects add-iam-policy-binding` command was added.
- The PodDisruptionBudget section implied PDBs protect scale-down. Kubernetes documents PDBs as limiting voluntary disruptions and notes workload controllers are not limited by PDBs during controller-driven changes, so the wording was narrowed to node drains and VPA-initiated evictions.
- Resource-request wording was broadened from only throttling to CPU throttling or out-of-memory failures, matching GKE VPA guidance.

## Review Notes
The Kubernetes YAML uses current stable API versions: `apps/v1` for Deployments, `autoscaling/v2` for HPA, `autoscaling.k8s.io/v1` for VPA, and `policy/v1` for PodDisruptionBudget. The Pub/Sub external metric name and selector format match Google's official sample. Local `kubectl` and `gcloud` executables were not available in this workspace, so CLI help checks could not be run here. The `validation.json` file was parsed successfully with Node.js.
