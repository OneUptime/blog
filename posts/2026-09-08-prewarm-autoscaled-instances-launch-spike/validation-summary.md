# Validation Summary: How to Pre-Warm Autoscaled Instances Before a Marketing or Launch-Day Spike

## Status
validated

## Post Type
Technical operations guide with capacity calculations and an illustrative YAML launch gate.

## Technologies Covered
- AWS EC2 Auto Scaling scheduled and dynamic scaling
- AWS predictive scaling and warm pools
- Kubernetes Horizontal Pod Autoscaling, node capacity, readiness, and disruptions
- Load testing, capacity planning, application initialization, and dependency budgets
- YAML

## Sources Consulted
- AWS scheduled scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- AWS predictive scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-predictive-scaling.html
- AWS predictive scaling behavior and scheduling buffer: https://docs.aws.amazon.com/autoscaling/ec2/userguide/predictive-scaling-policy-overview.html
- AWS warm pools: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html
- AWS lifecycle hooks: https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes node overprovisioning: https://kubernetes.io/docs/tasks/administer-cluster/node-overprovisioning/
- Kubernetes probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Google SRE, Reliable Product Launches at Scale: https://sre.google/sre-book/reliable-product-launches/
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The startup example allowed nine minutes for cold-to-serving plus three minutes of buffer, but did not account for the later gate requiring ten continuous healthy minutes. Added an explicit instruction to include the observation period and schedule at least 22 minutes before the gate deadline for these example values. The arithmetic follows the post's own gate requirement; Google SRE's staged-rollout guidance also describes observing new capacity for a validation period.

## Review Notes
- Verified the capacity arithmetic: ceil(50,000 / 1,250) = 40; adding the stated four-instance policy reserve yields 44. The reserve is an assumed policy input, not an AWS guarantee about physical-host placement. Actual failure-domain exposure must support that assumption.
- The per-instance throughput, forecast percentile, startup percentile, and gate thresholds are illustrative workload-specific inputs, not externally verified benchmark results. End-to-end percentiles cannot generally be obtained by summing stage percentiles. A per-instance p99 also does not guarantee that every member of a large fleet is ready by that time; fleet readiness must be measured and gated.
- Scheduled actions can change desired, minimum, and maximum capacity and coexist with dynamic policies within those bounds. Restoration requires another action or operational change. AWS documents possible scheduling delays of up to two minutes, which must fit the operational buffer.
- Predictive scaling uses historical recurring patterns, supports forecast-only evaluation and pre-launch buffering, and does not itself scale in. Warm pools support stopped, running, and hibernated instances; initialization lifecycle hooks and state-specific resume behavior matter.
- Kubernetes minimum application replicas and advance node capacity are appropriate. Placeholder Pods reserve resources and can be preempted by higher-priority workloads. Node autoscaler settings and placeholder priority thresholds are implementation-specific. Pod disruption budgets do not prevent all involuntary disruptions or directly constrain workload replica reductions.
- Parsed the YAML snippet successfully with PyYAML. Its eight fields describe an illustrative operational gate, not a native AWS or Kubernetes configuration schema; enforcing the thresholds requires a runbook or custom automation. The duration and comparison values are strings, as intended for this checklist.
- The post contains no executable programs, terminal commands, or version-pinned APIs to run. No cloud resources were provisioned and no live load test was performed.
- Confirmed all six documentation links resolve to the intended resources, and the author link resolves to the stated GitHub profile. Google SRE explicitly supports the discussion of nonlinear overload, workload-dependent load tests, dependency provisioning, and staged launches.
