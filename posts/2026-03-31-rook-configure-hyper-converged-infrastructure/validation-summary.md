# Validation Summary: How to Configure Ceph for Hyper-Converged Infrastructure

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSDs, MONs, MGRs)
- Kubernetes (Deployments, TopologySpreadConstraints, Pod Anti-Affinity, QoS classes)
- Kubelet configuration (eviction thresholds, system/kube reserved resources)
- Linux cgroups (v1 blkio controller, v2 io controller)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Pod QoS Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Reserve Compute Resources: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Linux kernel cgroups v1 blkio controller docs: https://docs.kernel.org/admin-guide/cgroup-v1/blkio-controller.html
- Linux kernel cgroups v2 docs: https://www.kernel.org/doc/html/v5.15/admin-guide/cgroup-v2.html
- Red Hat Ceph OSD performance metrics: https://access.redhat.com/solutions/3661401

## Issues Found

### 1. Incorrect comment and value in cgroups I/O isolation section
- **What was wrong:** The comment said "Set I/O weight for Ceph processes" but the cgroup path (`/sys/fs/cgroup/blkio/kubepods/besteffort/blkio.weight`) targets BestEffort pods, not Ceph processes. Additionally, the value 500 is the default blkio.weight, so writing it is effectively a no-op — it doesn't change any I/O priority.
- **What was changed:** Fixed the comment to accurately describe the action (lowering BestEffort pod I/O weight to give Ceph relative priority). Changed the value from 500 to 100 to actually deprioritize BestEffort pods.
- **Why:** The original was misleading about what the command targets and the value had no practical effect.

### 2. Missing cgroups v2 guidance
- **What was wrong:** The cgroups command used cgroups v1 blkio paths only. Most modern Kubernetes clusters (1.25+) default to cgroups v2, where the interface is `io.weight` with a different path structure and value range.
- **What was changed:** Added a commented-out cgroups v2 equivalent command showing the correct path and file (`io.weight`).
- **Why:** Without this, readers on modern clusters would find the v1 command doesn't work.

### 3. Clarified Guaranteed QoS requirement
- **What was wrong:** The comment said "This happens automatically when requests == limits" but the CephCluster resource spec earlier in the post shows OSD requests ≠ limits (requests: cpu 1, memory 3Gi vs limits: cpu 2, memory 6Gi), which produces Burstable QoS, not Guaranteed.
- **What was changed:** Clarified the comment to state the requirement explicitly ("This requires requests == limits for all containers in the pod") rather than implying it was already configured.
- **Why:** The original comment could mislead readers into thinking the shown CephCluster config already achieves Guaranteed QoS, when it actually produces Burstable QoS.

## Review Notes
- The CephCluster resource spec intentionally sets different requests and limits for OSDs (Burstable QoS). This is a valid design choice for flexibility, but readers should be aware it conflicts with the Guaranteed QoS recommendation in the cgroups section. If Guaranteed QoS is desired, the CephCluster spec should be updated to have equal requests and limits.
- The `ceph osd perf | sort -k3 -n` command assumes table output format. In some Ceph versions or configurations, the output may default to JSON. Adding `--format plain` could make this more robust.
- The Rook CephCluster CRD fields (`spec.resources`, `spec.placement`) are all verified correct against current Rook documentation.
- The kubelet configuration fields (`evictionHard`, `systemReserved`, `kubeReserved`) and the Kubernetes TopologySpreadConstraints spec are all correct.
