# Validation Summary: How to Reserve Kubernetes Headroom Without Permanently Idle Nodes

## Status
validated

## Post Type
Technical guide with a Kubernetes configuration example and a capacity-planning calculation.

## Technologies Covered
- Kubernetes Deployments, Pods, resource requests, and scheduling
- PriorityClass and Pod preemption
- Horizontal Pod Autoscaler (HPA)
- Cluster Autoscaler and node groups
- Topology spread constraints and failure domains
- Cloud capacity provisioning and reservations

## Sources Consulted
- Cluster Autoscaler FAQ, including overprovisioning, priority cutoff, HPA interaction, scale-down, and minimum-size enforcement: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Pod priority and preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes node autoscaling: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Kubernetes Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Official registry manifest for the example image (HTTP 200): https://registry.k8s.io/v2/pause/manifests/3.10
- Amazon EC2 Capacity Reservations: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html

## Issues Found
1. **Scheduled minimum-size changes:** Added the requirement for provider enforcement or `--enforce-node-group-min-size=true` (Cluster Autoscaler 1.26+). Changing only the autoscaler's minimum does not normally initiate provisioning without unschedulable Pods.
2. **Preemption behavior:** Qualified preemption on scheduling need and feasibility, identified the unschedulable placeholders as replacement Pods, and specified the real workloads' default `PreemptLowerPriority` policy. Higher priority alone does not allow a Pod with `preemptionPolicy: Never` to preempt placeholders.
3. **Post-burst scale-down:** Made the final test step conditional on reduced workload replicas or temporary reserve. Restoring placeholders does not itself make the capacity they require removable.

## Review Notes
- Parsed both YAML documents successfully. The stable `scheduling.k8s.io/v1` and `apps/v1` APIs, matching Deployment selector and template labels, PriorityClass reference, zero termination grace period, and CPU/memory request syntax are valid. Two replicas request four CPU units and eight GiB in total; the example does not enforce topology spreading.
- Confirmed the default expendable priority cutoff is -10 and the boundary is inclusive for scale-up eligibility. Deployment-specific settings still need checking.
- Verified the headroom calculation: 1,000 RPS divided by 300 RPS per minute is approximately 3.33 minutes. The seven-minute supply delay is an illustrative assumption, not a Kubernetes guarantee. Coincident-event sizing and measuring end-to-end latency are appropriate.
- Scheduling reservations depend on requests and placement constraints; they do not establish measured application throughput. Ready node capacity still requires Pod startup and application readiness before serving traffic.
- Scale-from-zero topology behavior, provider capacity, quotas, admission policies, and preemption latency require environment-specific testing. The existing staging guidance is appropriate.
- All five official documentation links resolve to the intended resources. The image tag exists; no manifest change was needed. No terminal command examples occur in the original post.
- Validation used official documentation, YAML parsing, and an image-manifest lookup. No live cluster deployment, server-side admission validation, burst test, or cloud provisioning test was performed.
