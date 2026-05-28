# Validation Summary: Configure GKE Autopilot Resource Requests to Avoid Pod Scheduling Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine (GKE) Autopilot
- Kubernetes resource requests and limits
- Kubernetes Deployments
- GKE Autopilot ComputeClasses
- Vertical Pod Autoscaler
- Horizontal Pod Autoscaler
- GKE Spot Pods

## Sources Consulted
- Google Cloud documentation: Resource requests in Autopilot - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Google Cloud documentation: About Balanced and Scale-Out ComputeClasses in Autopilot clusters - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-compute-classes
- Google Cloud documentation: Choose compute classes for Autopilot Pods - https://cloud.google.com/kubernetes-engine/docs/how-to/autopilot-compute-classes
- Google Cloud documentation: Run fault-tolerant workloads at lower costs in Spot Pods - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/autopilot-spot-pods
- Google Cloud documentation: Vertical Pod autoscaling - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- Google Cloud documentation: Horizontal Pod autoscaling - https://cloud.google.com/kubernetes-engine/docs/concepts/horizontalpodautoscaler
- Google Cloud pricing: Google Kubernetes Engine pricing - https://cloud.google.com/kubernetes-engine/pricing

## Issues Found
- The post stated that Autopilot limits always default to match requests. Updated the example comment because current GKE behavior depends on whether the cluster supports bursting; explicitly setting equal requests and limits gives Guaranteed QoS.
- The post listed fixed default general-purpose minimums of 250m CPU and 512Mi memory. Updated this to note that bursting clusters allow 50m CPU and 52Mi memory, while non-bursting clusters use 250m CPU and 512Mi memory.
- The post listed the general-purpose maximum as 28 vCPU and 80Gi memory. Updated this to the current 30 vCPU and 110Gi memory maximums.
- The CPU-to-memory ratio section did not specify that the 1:1 to 1:6.5 ratio applies to the default general-purpose compute class. Clarified the scope.
- The ComputeClasses section described Balanced, Scale-Out, and Performance inaccurately. Updated the descriptions to match current Google Cloud documentation.
- The Scale-Out example used 250m CPU and 512Mi memory, which does not meet the Scale-Out 1:4 CPU-to-memory ratio. Updated memory to 1Gi.
- The post claimed Scale-Out has lower minimums and is cheaper for small pods. Replaced this with the documented Scale-Out behavior: a 1:4 CPU-to-memory ratio and suitability for horizontally scaled workloads.
- The scheduling failure description mapped "Insufficient cpu" and "Insufficient memory" only to maximum-limit violations. Updated this to the broader and more accurate explanation that the requested resources cannot currently be satisfied.
- The cost section implied all Autopilot billing is per pod resource request. Clarified that this applies to general-purpose Autopilot workloads.

## Review Notes
The Kubernetes API snippets use current stable APIs for Deployment, HorizontalPodAutoscaler autoscaling/v2, and VerticalPodAutoscaler autoscaling.k8s.io/v1. The Spot Pod nodeSelector and toleration match current GKE Autopilot documentation.
