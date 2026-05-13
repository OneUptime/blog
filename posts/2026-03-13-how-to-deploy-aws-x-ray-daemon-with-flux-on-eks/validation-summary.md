# Validation Summary: How to Deploy AWS X-Ray Daemon with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS X-Ray
- AWS X-Ray daemon
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS CLI
- Kubernetes DaemonSet, Service, ServiceAccount, ConfigMap, and Deployment manifests
- Flux Kustomization
- Kustomize
- AWS Distro for OpenTelemetry (ADOT)

## Sources Consulted
- AWS X-Ray daemon documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html
- AWS X-Ray daemon configuration documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-configuration.html
- AWS X-Ray SDK and daemon support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- AWS CLI `xray create-sampling-rule` reference: https://docs.aws.amazon.com/cli/latest/reference/xray/create-sampling-rule.html
- AWS CLI `xray get-trace-summaries` reference: https://docs.aws.amazon.com/cli/latest/reference/xray/get-trace-summaries.html
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service account role association documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service protocol documentation: https://kubernetes.io/docs/reference/networking/service-protocols/
- AWS Distro for OpenTelemetry X-Ray collector configuration: https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/config-xray/
- AWS X-Ray and ADOT documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-services-adot.html

## Issues Found
- The post said deploying the daemon on EKS lets all workloads send trace data without individual configuration. Updated this to clarify that workloads still need instrumentation and daemon endpoint configuration.
- The post omitted the current X-Ray SDK and daemon lifecycle status. Added a maintenance-mode note for February 25, 2026 and AWS's OpenTelemetry migration recommendation.
- The Flux Kustomization used `wait: true` together with `healthChecks`, but Flux ignores explicit health checks when `wait` is true. Removed `wait: true` so the DaemonSet health check is the active check.
- Option A was labeled as using the DaemonSet host IP, but the manifest used Kubernetes Service DNS. Renamed the option and corrected the explanation.
- The X-Ray sidecar example enabled TCP binding but only declared the UDP container port. Added the TCP port and clarified that the pod service account needs X-Ray permissions.
- The sampling section used an unwired Kubernetes ConfigMap with SDK-style local sampling JSON. Replaced it with AWS CLI `xray create-sampling-rule` examples using the X-Ray service sampling rule schema.
- The ADOT section used a Helm chart intended for EKS/EC2 telemetry rather than an X-Ray trace collector configuration. Replaced it with an `OpenTelemetryCollector` resource that receives OTLP traces and exports them with the `awsxray` exporter.
- The verification command used BSD/macOS `date -v-1H`, which fails on typical Linux shells. Replaced it with GNU `date -d '1 hour ago'`.
- The conclusion implied DaemonSet deployment always minimizes latency through a local collector. Revised it to say each node has a trace collector available, which is accurate regardless of whether applications route through Service DNS or a node-local address.

## Review Notes
The manifests use a fixed daemon image tag. That is acceptable for reproducibility, though teams should periodically review the latest supported `3.x` daemon image while X-Ray daemon remains in maintenance mode. The ADOT example assumes the ADOT Operator and its CRDs are already installed before Flux applies the `OpenTelemetryCollector` resource.
