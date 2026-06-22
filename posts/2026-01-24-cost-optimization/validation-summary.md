# Validation Summary: How to Configure Cost Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, CronJobs, HPA, VPA, taints, tolerations, node affinity, PVCs, and kubectl
- Google Kubernetes Engine Spot VMs and node pools
- AWS EC2 Spot Instance interruption notices and IMDSv2
- AWS S3 lifecycle configuration with CloudFormation
- Python
- Prometheus, PrometheusRule, kube-state-metrics, and Grafana dashboards
- Cloud cost optimization, reserved capacity, and FinOps practices

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes HPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes VPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes node assignment and affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Google Cloud GKE Spot VMs documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/spot-vms
- AWS EC2 Spot Instance interruption notices documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS CloudFormation S3 Bucket LifecycleConfiguration documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-lifecycleconfiguration.html
- AWS CloudFormation S3 Bucket Rule documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-rule.html
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The utilization analysis script compared pod-level `kubectl top` output with only the first container's resource requests. It now uses `kubectl top pods --containers` and looks up requests for the matching container, which avoids misleading output for multi-container pods.
- The Kubernetes Deployment examples omitted `spec.selector` and matching pod template labels. In `apps/v1`, Deployments need selectors that match the pod template labels, so both Deployment snippets were updated with `matchLabels` and `template.metadata.labels`.
- The GKE Spot node pool example used a Kubernetes-style `NodePool` manifest with `apiVersion: container.google.com/v1beta1`, which is not the documented way to create a GKE Spot node pool. It was replaced with a `gcloud container node-pools create` command using `--spot`, autoscaling flags, and `--node-taints`.
- The AWS Spot interruption handler queried instance metadata without an IMDSv2 token. AWS documents retrieving `spot/instance-action` with IMDSv2, so the example now fetches a token and sends it on the metadata request.
- The reservation calculator used an undefined `percentile` function. A small percentile helper was added so the Python example is self-contained.
- The Prometheus cost alert multiplied memory request bytes directly by the per-GiB cost. The query now divides memory by `1073741824` before applying the memory rate, matching the Grafana example and kube-state-metrics units.

## Review Notes
The cost rates and cost breakdown percentages are illustrative and should be replaced with organization-specific cloud pricing and measured spend before production use. The scheduled scaling CronJob commands are valid, but production clusters also need appropriate ServiceAccount RBAC for the in-cluster `kubectl scale` calls.
