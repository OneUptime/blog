# How to Spread Kubernetes Replicas Across Spot Capacity Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, Spot, Scheduling, High Availability

Description: Use zone and node topology constraints to reduce correlated Spot failures, and understand why instance diversity alone does not enforce replica placement.

---

Three replicas on three EC2 instances can still share one Spot capacity pool. The machines are separate, but AWS might reclaim capacity from their common instance type and Availability Zone. Counting nodes is therefore an incomplete resilience check.

A Spot capacity pool is capacity for an instance type in an Availability Zone. Diversifying provisionable instance types increases launch options, while scheduling constraints determine where actual replicas run. These are related but different controls. [AWS Spot concepts](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)

The examples below target a Kubernetes cluster with three eligible zones and Karpenter-managed nodes. Substitute your Region and zones, and confirm that subnet discovery, quotas, and workload architecture allow capacity in all three.

## Inspect actual placement before changing policy

Collect the labels that describe the placement dimensions:

```bash
kubectl get nodes \
  -L topology.kubernetes.io/zone,node.kubernetes.io/instance-type,karpenter.sh/capacity-type
kubectl get pods -l app=checkout -o wide
```

Join each Pod's assigned node to the node's zone and instance type. Distinct hostnames are useful for reducing a single-machine failure, but two `m6i.large` nodes in the same zone still share a pool.

Also inspect node selectors, affinity, tolerations, PersistentVolumes, and resource requests. A workload pinned to one zone by an EBS volume cannot gain cross-zone placement simply by adding a topology rule.

## Require three zones for a three-replica workload

Merge this fragment into a Deployment whose Pod labels include `app: checkout`:

```yaml
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: checkout
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          minDomains: 3
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          nodeAffinityPolicy: Honor
          nodeTaintsPolicy: Honor
          labelSelector:
            matchLabels:
              app: checkout
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: checkout
```

The zone rule is hard; the hostname rule is a preference. For three replicas, `minDomains: 3` and `maxSkew: 1` prevent all three being packed into two eligible zones. With fewer than three eligible domains, the skew calculation uses a global minimum of zero. The missing replica can remain Pending. These fields and their version requirements are defined in [Kubernetes topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/).

Use Kubernetes 1.33 or later for stable node inclusion policies in this example. On older clusters, check feature gates and API support. A successful YAML parser does not verify that a particular API server accepts a field.

With more than three replicas, zone spreading balances counts; it does not promise that every replica occupies a unique capacity pool. Two replicas in one zone can still share a type and therefore share a pool.

## Give the provisioner enough options

The following is a requirements fragment for an existing Karpenter NodePool. Merge it with its existing EC2NodeClass reference and operational settings:

```yaml
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: [spot]
        - key: kubernetes.io/arch
          operator: In
          values: [amd64]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: [c, m, r]
        - key: topology.kubernetes.io/zone
          operator: In
          values: [us-east-1a, us-east-1b, us-east-1c]
```

Choose instance categories only after testing the application's CPU, memory, storage, and network requirements. Let resource requests and other documented limits eliminate unsuitable sizes. Karpenter intersects NodePool requirements with Pod requirements when provisioning; a broad pool cannot override a restrictive Pod selector. [Karpenter NodePools](https://karpenter.sh/docs/concepts/nodepools/)

The scheduler reasons about existing node topology. An autoscaler must also understand the constraints to create capacity in a missing domain. A pool allowing three zones is necessary but does not guarantee capacity in each zone at the moment it is requested.

## Decide what should happen when a zone is unavailable

Hard distribution buys isolation by permitting Pending replicas. That is sensible when concentrating all replicas in surviving zones would violate the application's availability model, but it can reduce usable capacity during a prolonged shortage.

Choose and document one recovery policy:

- Keep hard distribution and supply On-Demand capacity in the missing zone.
- Temporarily relax the zone rule after assessing the failure risk.
- Accept fewer replicas while a queue or upstream rate limit reduces demand.

Allowing both Spot and On-Demand in a compatible provisioner configuration can help with capacity shortages, but placement preferences and provider capacity still apply. Test the behavior rather than assuming the label list establishes a fixed On-Demand baseline.

Avoid adding a hard instance-type spread as a quick fix. Spreading independently by zone and type balances two marginal distributions; it does not necessarily balance each `(zone, type)` pair. A composite pool label would need reliable provisioning support and lifecycle management. Zone isolation is usually the simpler enforceable boundary for a small replica set.

## Test scheduling and recovery separately

Save the Deployment to `checkout.yaml`, then ask the target API server to check it:

```bash
kubectl apply --dry-run=server -f checkout.yaml
kubectl get pods -l app=checkout -o wide
kubectl describe pod checkout-pending-example
```

A Pending Pod's events should identify whether topology, taints, resources, or volume affinity blocked placement. Do not interpret every Pending Pod as a Spot supply failure.

In staging, make one zone unavailable to the test workload and observe the selected recovery policy. Restore eligibility and check distribution after replacements are created. Topology constraints guide scheduling; they do not continuously move existing Pods into a newly available zone. Plan a controlled rollout if rebalancing is required.

## Conclusion

Use zone spread to establish failure boundaries and instance diversity to improve launch opportunities. Verify the actual zone/type pairs, decide whether Pending replicas are acceptable, and test the autoscaler when an eligible zone has no available nodes.

## Official Documentation

- [AWS Spot concepts](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [Kubernetes topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes node assignment](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Karpenter NodePool requirements](https://karpenter.sh/docs/concepts/nodepools/)
