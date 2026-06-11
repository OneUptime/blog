# Validation Summary: How to Implement Instance Family Selection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 instance families and pricing
- AWS Graviton
- Amazon EKS
- Karpenter
- Kubernetes StatefulSets and node operations
- Docker Buildx and multi-platform Docker builds
- Prometheus/PromQL
- Python and pandas

## Sources Consulted
- AWS EC2 instance types: https://aws.amazon.com/ec2/instance-types/
- AWS Graviton processors: https://aws.amazon.com/ec2/graviton/
- Amazon EC2 M7g instances: https://aws.amazon.com/ec2/instance-types/m7g/
- Amazon EC2 On-Demand pricing: https://aws.amazon.com/ec2/pricing/on-demand/
- Amazon EKS Karpenter best practices: https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter upgrade guide: https://karpenter.sh/docs/upgrading/upgrade-guide/
- Karpenter scheduling and well-known labels: https://karpenter.sh/docs/concepts/scheduling/
- eksctl nodegroup documentation: https://docs.aws.amazon.com/eks/latest/eksctl/general-nodegroups.html
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/

## Issues Found
- The Karpenter examples used the deprecated `karpenter.sh/v1alpha5` `Provisioner` API. Updated them to current `karpenter.sh/v1` `NodePool` manifests with `spec.template.spec`, `nodeClassRef`, nested requirements, nested taints, and current disruption fields.
- The Karpenter `limits` example used `limits.resources`, which is not the current NodePool shape. Changed it to direct `limits.cpu` and `limits.memory`.
- The canary migration Karpenter example implied a mixed instance-type list and `weight` could directly create an 80/20 canary. Replaced it with a target-instance canary NodePool labeled for canary workloads.
- The Redis StatefulSet example omitted `serviceName` and matching pod template labels. Added `serviceName: redis` and `template.metadata.labels` so the StatefulSet selector matches the pod template.
- The multi-architecture Dockerfile copied `node_modules` from the build-platform stage into the target-platform image, which can break native dependencies. Changed the final stage to run `npm ci --omit=dev` on the target platform and copy only the built `dist` output from the builder.
- The storage optimized row claimed a fixed 1:4 vCPU:memory ratio and local NVMe SSDs for all I/D instances. Changed the ratio to `Varies` and the storage description to include local NVMe SSDs or HDDs.
- The accelerated instances row omitted Trainium's `Trn` family while mentioning Trainium chips. Added `Trn` to the family label.
- The C-family row claimed higher clock speeds broadly. Reworded it to the more generally accurate "More compute capacity per dollar."
- The Graviton claim said "20-40% better price-performance" and used all-caps ARM terminology. Updated it to AWS's current "up to 40%" phrasing and "64-bit Arm-based."
- The M7g pricing/performance row rounded hourly price to `$0.163` and claimed `+25-30%` performance. Updated it to `$0.1632` and `+25% vs M6g` to match AWS's M7g positioning.

## Review Notes
The post is technically relevant and suitable as a guide. The pricing examples remain region- and purchase-option-dependent, so they should be treated as illustrative and periodically rechecked against AWS pricing.
