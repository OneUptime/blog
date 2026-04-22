# Validation Summary: How to Configure Serverless Autoscaling in Rancher

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Rancher
- Kubernetes autoscaling
- Knative Serving and Knative Pod Autoscaler (KPA)
- KEDA ScaledObject, Prometheus scaler, and Kafka scaler
- OpenFaaS autoscaling
- Kubernetes Cluster Autoscaler
- Helm

## Sources Consulted
- Knative Serving autoscaling overview: https://knative.dev/docs/serving/autoscaling/
- Knative supported autoscaler types and global autoscaler settings: https://knative.dev/docs/serving/autoscaling/autoscaler-types/
- Knative autoscaling targets: https://knative.dev/docs/serving/autoscaling/autoscaling-targets/
- Knative concurrency and target utilization settings: https://knative.dev/docs/serving/autoscaling/concurrency/
- Knative scale bounds and scale-to-zero settings: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- KEDA deployment with Helm: https://keda.sh/docs/2.19/deploy/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Prometheus scaler: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA Apache Kafka scaler: https://keda.sh/docs/2.19/scalers/apache-kafka/
- OpenFaaS autoscaling documentation: https://docs.openfaas.com/architecture/autoscaling/
- Rancher cluster autoscaler with AWS EC2 Auto Scaling Groups: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/manage-clusters/install-cluster-autoscaler/use-aws-ec2-auto-scaling-groups
- Cluster API autoscaling documentation: https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/autoscaling

## Issues Found
- The Knative Service example used `autoscaling.knative.dev/scale-up-rate`, `autoscaling.knative.dev/scale-down-rate`, `autoscaling.knative.dev/panic-threshold-percentage`, and `autoscaling.knative.dev/panic-window-percentage` as per-revision annotations. Knative documents these as global autoscaler ConfigMap settings, not per-revision annotations, so they were removed from the Service snippet.
- The Knative scale-to-zero comment implied that `min-scale: "0"` alone enables scale-to-zero. Knative scale-to-zero is controlled at the cluster level and only applies to KPA, so the comment was clarified.
- The KEDA install command pinned `--version 2.12.0`, while current official KEDA documentation is for 2.19. The version pin was removed so the Helm command follows the current documented install flow.
- The KEDA Prometheus scaler example included `metricName`, which is not part of the current KEDA Prometheus scaler metadata. It was removed.
- The KEDA `cooldownPeriod` comment said it waits after the last request. KEDA documents cooldown as applying after a trigger reports inactive and only for scaling to zero, so the comment was corrected.
- The OpenFaaS example used `com.openfaas.scale.factor` alongside Pro autoscaler labels. Current OpenFaaS Pro autoscaling uses `com.openfaas.scale.target-proportion` for target utilization behavior, so the label was replaced.
- The cluster autoscaler example put Cluster API autoscaler min/max annotations under a Rancher `management.cattle.io/v3` Cluster machine pool. Rancher documentation for AWS custom clusters uses worker Auto Scaling Group tags and cluster-autoscaler ASG auto-discovery. The snippet was replaced with those tags and the relevant cluster-autoscaler command arguments.
- The monitoring section referenced `knative_serving_autoscaler_actual_pods`, which is not the portable Knative metric name across exporters. The note now refers to Knative autoscaler `actual_pods` and `requested_pods` metrics more generically.

## Review Notes
The KEDA Prometheus example is valid as metric-driven scaling, but it does not provide HTTP request buffering. For true request-buffered scale-from-zero HTTP behavior, Knative or the KEDA HTTP add-on would be a better future expansion.
