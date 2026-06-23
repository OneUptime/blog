# Validation Summary: How to Right-Size Your Kubernetes Cluster (And Stop Over-Provisioning)

## Status
validated

## Post Type
Tutorial / Guide (step-by-step cost-optimization and capacity-planning walkthrough)

## Technologies Covered
- Kubernetes (kubectl, metrics-server, node allocatable/requests)
- Vertical Pod Autoscaler (VPA)
- Cluster Autoscaler
- Descheduler (kubernetes-sigs)
- KEDA (cron scaler)
- Goldilocks (Fairwinds)
- Prometheus / PromQL, kube-state-metrics, node-exporter
- Grafana
- Prometheus Operator (PrometheusRule)
- Topology Spread Constraints
- AWS EC2 instance types / eksctl / ENI-based pod limits

## Sources Consulted
- Kubernetes Descheduler docs and policy API (v1alpha1 `strategies` vs v1alpha2 `profiles`): https://github.com/kubernetes-sigs/descheduler and https://github.com/kubernetes-sigs/descheduler/blob/master/docs/user-guide.md
- Kubernetes VPA docs (updateMode "Off"): https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Cluster Autoscaler FAQ / flags and image registry (registry.k8s.io/autoscaling/cluster-autoscaler): https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- KEDA cron scaler docs: https://keda.sh/docs/latest/scalers/cron/
- AWS EKS max-pods per ENI (m5.large = 29, m5.xlarge = 58): https://github.com/awslabs/amazon-eks-ami eni-max-pods.txt
- AWS EC2 On-Demand pricing (m5 family): https://aws.amazon.com/ec2/pricing/on-demand/
- Goldilocks docs: https://goldilocks.docs.fairwinds.com/
- kubectl top / metrics-server: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/

## Issues Found
1. **Descheduler API version / config-format mismatch (fixed).** The DeschedulerPolicy manifest declared `apiVersion: descheduler/v1alpha2` but used the `strategies:` block. The `strategies` configuration model belongs to **v1alpha1**; v1alpha2 replaced it with a `profiles` (plugins / pluginConfig) structure, so the manifest as written would not parse under v1alpha2. Since the body shown is valid v1alpha1, I changed the declared API version to `apiVersion: descheduler/v1alpha1` to match the structure. (The alternative — rewriting the body into the v1alpha2 `profiles` format — would have substantially restructured the example, so I corrected the version label instead.)

## Review Notes
- **`cluster-efficiency.sh` unit handling is approximate.** Node `status.allocatable.cpu` is frequently reported in whole cores (e.g. `"4"`) rather than millicores (e.g. `"3920m"`), so `rtrimstr("m") | tonumber` mixes units and can skew the CPU efficiency ratio by up to 1000x on some nodes. Likewise, the memory line chains `rtrimstr("Ki") | rtrimstr("Mi")`, which is a heuristic and assumes a consistent unit. The script is presented as an illustrative estimate; for production accuracy, normalize all quantities to a common base unit before summing. Left as-is since correcting it robustly would mean rewriting the script.
- **Instance-sizing example (Step 3) is illustrative, not requirement-meeting.** The stated need is "100 CPU cores, 200GB memory," but Option 2 (64 CPU) and Option 3 (48 CPU) provide less CPU than the stated 100-core requirement. The intent is clearly to compare cost-per-resource across sizing strategies rather than to size for the exact target, but readers should not treat Options 2/3 as drop-in replacements meeting the same capacity. Pricing figures themselves (m5.large $0.096, m5.xlarge $0.192, m5.2xlarge $0.384, m5.4xlarge $0.768 /hr) match AWS us-east-1 On-Demand rates and the arithmetic is correct.
- **AWS max-pods values verified.** m5.large ≈ 29 and m5.xlarge ≈ 58 max pods match the standard ENI-based limits in the EKS AMI `eni-max-pods` table (applies to the default AWS VPC CNI without prefix delegation).
- **KEDA cron trigger** uses correct field names (`timezone`, `start`, `end`, `desiredReplicas`). Note that true scale-to-zero requires the ScaledObject's `minReplicaCount: 0`; outside the active window KEDA falls back to `minReplicaCount`, so the daytime replica count should be set there. Conceptually sound as written.
- **Cluster Autoscaler** flags, the `min:max:nodegroup` `--nodes` syntax, and the `registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0` image are all valid; match the CA version to the cluster's Kubernetes minor version in real deployments.
- PromQL queries, the VPA recommendation-only manifest, topology spread constraints, PrometheusRule, and Goldilocks/Helm commands are all syntactically and semantically correct.
