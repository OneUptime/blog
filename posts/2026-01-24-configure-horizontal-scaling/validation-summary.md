# Validation Summary: How to Configure Horizontal Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes resource requests and metrics
- Kubernetes custom and external metrics
- Kubernetes PodDisruptionBudget
- Kubernetes pod anti-affinity
- kubectl
- Vertical Pod Autoscaler (VPA)
- AWS CloudFormation
- Amazon EC2 Auto Scaling Groups
- Google Cloud managed instance groups
- Terraform Google provider
- Redis
- Prometheus alerting

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes assigning Pods to nodes / pod anti-affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- AWS CloudFormation AWS::AutoScaling::ScalingPolicy: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-scalingpolicy.html
- AWS CloudFormation TargetTrackingConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-autoscaling-scalingpolicy-targettrackingconfiguration.html
- Google Cloud Terraform autoscaling sample for zonal MIGs: https://docs.cloud.google.com/compute/docs/samples/compute-zonal-mig-set-autoscaling
- Terraform Google provider google_compute_autoscaler reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_autoscaler

## Issues Found
- The AWS CloudFormation target tracking policy placed `ScaleInCooldown` and `ScaleOutCooldown` inside `TargetTrackingConfiguration`. Those fields are not valid for `AWS::AutoScaling::ScalingPolicy` target tracking policies. Replaced them with top-level `EstimatedInstanceWarmup`, which AWS documents as valid for target tracking and step scaling policies.
- The CloudFormation snippet referenced undefined `WebServerSecurityGroup` and `WebServerTargetGroup` resources. Replaced those references with placeholder security group and target group ARN values so the snippet is structurally self-contained.
- The deployment comment said resource requests are required for HPA to work. Updated it to say they are required for utilization-based HPA metrics, because HPA can also use absolute-value, custom, or external metrics depending on the metrics APIs available.
- The PodDisruptionBudget section said PDBs prevent scaling events from causing outages. Updated it to describe voluntary disruptions such as node drains, matching Kubernetes PDB behavior.
- The anti-affinity section said the shown rule spreads pods across nodes and zones, but the snippet uses `topology.kubernetes.io/zone`, so it spreads across zones. Updated the text accordingly.
- The load-test `kubectl run` command omitted `--restart=Never`. Added it so the temporary load-test pod behaves as a one-off pod with `--rm`.

## Review Notes
- The Kubernetes HPA examples use the current `autoscaling/v2` API and valid `behavior`, resource, pods, and external metric fields.
- The GCP Terraform autoscaler example matches the official zonal managed instance group autoscaling pattern.
- `kubectl top` and VPA recommendations require Metrics Server or another compatible metrics source to be installed; the post's commands assume that supporting infrastructure exists.
- The Prometheus alert assumes kube-state-metrics-style HPA metrics with matching HPA labels.
