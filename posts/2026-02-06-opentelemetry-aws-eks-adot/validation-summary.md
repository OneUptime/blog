# Validation Summary: How to Set Up OpenTelemetry on AWS EKS with ADOT (AWS Distro for OpenTelemetry)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Distro for OpenTelemetry (ADOT)
- Amazon EKS
- OpenTelemetry Collector and OpenTelemetry Operator
- Kubernetes DaemonSets and custom resources
- cert-manager
- IAM Roles for Service Accounts (IRSA)
- AWS X-Ray
- Amazon CloudWatch / CloudWatch EMF
- Python OpenTelemetry SDK and OTLP exporter

## Sources Consulted
- Amazon EKS documentation: Send metric and trace data with ADOT Operator - https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html
- Amazon EKS documentation: Create an Amazon EKS add-on - https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html
- Amazon EKS documentation: AWS add-ons, AWS Distro for OpenTelemetry - https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
- AWS Distro for OpenTelemetry documentation: Getting Started with AWS Distro for OpenTelemetry using EKS Add-Ons - https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/
- AWS Distro for OpenTelemetry documentation: Installation using EKS Add-Ons - https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/installation/
- AWS Distro for OpenTelemetry documentation: Requirements for EKS Add-Ons - https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/requirements/
- AWS Distro for OpenTelemetry documentation: Collector Configuration - https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/config-collector-intro/
- AWS Distro for OpenTelemetry documentation: Configuring Permissions - https://aws-otel.github.io/docs/setup/permissions/
- AWS Distro for OpenTelemetry documentation: CloudWatch Metrics with ADOT - https://aws-otel.github.io/docs/getting-started/cloudwatch-metrics/
- AWS Distro for OpenTelemetry Collector releases - https://github.com/aws-observability/aws-otel-collector/releases
- cert-manager documentation: kubectl install - https://cert-manager.io/docs/installation/kubectl/
- cert-manager documentation: Supported releases - https://cert-manager.io/docs/releases/
- Kubernetes documentation: DaemonSet communication patterns - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- OpenTelemetry documentation: OpenTelemetry Operator for Kubernetes - https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry documentation: Python instrumentation - https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry specification: OTLP exporter configuration - https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post claimed the guide collected traces, metrics, and logs, but the provided Collector configuration only receives OTLP traces and metrics and exports traces to X-Ray and metrics to CloudWatch EMF. Updated the description and architecture diagram to describe traces and metrics only.
- The cert-manager manifest pinned `v1.14.5`, which is end-of-life. Updated it to the current supported `v1.20.2` manifest and adjusted the Kubernetes prerequisite wording so readers check version compatibility instead of assuming older EKS minors are supported.
- The prerequisites listed Helm 3, but the guide does not use Helm. Removed the unused prerequisite.
- The ADOT EKS add-on command pinned `v0.92.1-eksbuild.1`, which is stale and may not be compatible with current EKS versions. Removed the hardcoded add-on version so EKS selects a compatible default unless the user intentionally chooses a version.
- The IAM policy omitted several actions from the ADOT permissions documentation, including `logs:DescribeLogGroups`, `logs:PutRetentionPolicy`, `xray:GetSamplingStatisticSummaries`, and `ssm:GetParameters`. Updated the policy to match the documented ADOT permission set for X-Ray and CloudWatch EMF.
- The IRSA command used the `opentelemetry` namespace before the guide created it. Added namespace creation before creating the IAM service account.
- The Collector custom resource used `opentelemetry.io/v1alpha1` with a string-valued `config`. Updated it to `opentelemetry.io/v1beta1` with object-style `config`, matching the current OpenTelemetry Operator API style.
- The application configuration told pods to send telemetry to `status.hostIP`, but the Collector DaemonSet did not expose OTLP on the node network. Added `hostNetwork: true` to make the node-IP endpoint pattern work.
- The Collector image pinned `v0.39.0`, which is old. Updated it to the current ADOT Collector release `v0.48.0`.

## Review Notes
- Local `aws` and `kubectl` binaries were not installed in the review environment, so CLI behavior was validated against official AWS and Kubernetes documentation rather than local command execution.
- The guide still uses IRSA, which remains valid. EKS Pod Identities are also supported for many add-on workflows and could be covered in a future update.
