# Choose Requests or Usage for Kubernetes Showback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Showback, FinOps, Resource Requests, Utilization, OpenCost, Amazon EKS

Description: Compare request-based, usage-based, and max-of-both Kubernetes cost drivers, then choose a model that matches capacity economics and team control.

---

Kubernetes teams can reserve far more CPU and memory than they use, or burst well above small requests when a node has room. A showback based only on actual usage rewards accurate consumption measurement but can hide capacity blocked by oversized requests. A showback based only on requests reflects scheduler commitments but can miss unrequested bursts.

There is no universal provider answer. Choose the driver that represents the behavior the report is meant to influence, and publish the other measurements as efficiency context.

## Requests and Usage Mean Different Things

Kubernetes uses container CPU and memory requests when scheduling Pods. A request is the amount used to decide whether a Pod fits on a node. A container can use more than its request when capacity is available. Limits are enforcement settings: CPU limits throttle and memory limits can lead to reactive out-of-memory termination.

That yields three distinct quantities:

- **requested capacity:** what the scheduler must accommodate;
- **actual usage:** resources observed as consumed over time;
- **limit:** a ceiling or enforcement configuration, not generally a cost driver.

Do not use limits as a substitute for requests. A very high limit does not reserve that amount in scheduler placement, and a missing limit does not mean infinite billed consumption.

## Model 1: Allocate by Requests

For each short interval:

```text
requested_CPU_cost
  = requested_CPU_cores * CPU_rate * interval_hours

requested_memory_cost
  = requested_memory_GiB * memory_rate * interval_hours
```

Request-based showback is appropriate when:

- node capacity is provisioned mainly to satisfy scheduler requests;
- teams control requests through manifests;
- the objective is to encourage rightsizing and improve bin packing;
- actual utilization telemetry is incomplete or too short-lived;
- scarce accelerators are allocated as indivisible requested resources.

It makes an idle but oversized reservation visible to the owner. However, a workload with no requests may receive zero cost even while consuming resources. That is a governance gap, not free compute. Enforce request policies or define a documented fallback.

AWS EKS split cost allocation explicitly offers a Resource requests mode. AWS notes that only Pods configured with CPU and memory requests participate; Pods with no requests do not receive split cost data in that mode.

## Model 2: Allocate by Actual Usage

Usage-based showback integrates observations over time:

```text
CPU_core_hours = integral(CPU_cores_used, time)

memory_GiB_hours = integral(memory_GiB_in_use, time)
```

Use counters and gauges according to their metric semantics. CPU commonly comes from a cumulative CPU-seconds counter converted to a rate; memory is a sampled gauge. A single peak, a current `kubectl top` value, or an average taken only while the Pod existed is not a monthly resource-hour total.

Actual usage is useful when:

- the platform can safely overcommit and usage drives scaling;
- the goal is consumption accountability;
- telemetry resolution captures short workloads;
- teams can change runtime demand independently of requests.

Its main weakness is capacity causality. A Pod that requests 8 CPUs and uses 0.5 can prevent other Pods from fitting even though a usage-only report charges it for 0.5. The remaining node cost then looks like generic idle rather than request-driven headroom.

## Model 3: Use the Higher of Request and Usage

OpenCost specifies workload allocation cost for CPU, memory, and GPU as the greater of requested and used resources where the asset has allocation cost. AWS's Amazon Managed Service for Prometheus option for EKS split cost allocation similarly uses the higher of Pod requests and actual utilization for CPU and memory.

Calculate the maximum at each aligned interval:

```text
allocated_resource_t
  = max(requested_resource_t, used_resource_t)
```

Then integrate those interval values. Do not compare one monthly request average with one monthly usage average; bursts and scaling events can occur at different times.

This model captures both capacity reservation and consumption above the request. It is often the most balanced default for shared node economics. It can allocate more resource units than a node physically contains when telemetry, interval alignment, or metric definitions are inconsistent, so cap and reconcile only through a documented cost model rather than silently clipping raw data.

## Know the AWS EKS Choices

AWS currently documents these EKS split cost allocation preferences:

- **Resource requests:** uses Pod CPU and memory requests only.
- **Amazon Managed Service for Prometheus:** uses the higher of requests and actual utilization.
- **Amazon CloudWatch Container Insights:** provides a telemetry-backed option for more granular allocation.

The CUR 2.0 split columns include:

- `split_line_item_reserved_usage` for configured resource usage;
- `split_line_item_actual_usage` for measured usage;
- `split_line_item_split_usage`, defined as the maximum of reserved and actual usage;
- `split_line_item_split_usage_ratio` for the Pod's share of parent capacity;
- split and unused cost fields, including conditional net fields.

Accelerated computing instances have a special rule: AWS documents only Resource requests as supported, and defaults accelerator, CPU, and memory calculation to requests even if another measurement option is enabled.

These are AWS allocation calculations for supported EKS data. They do not automatically allocate every load balancer, volume, control-plane fee, or organizational overhead charge.

## Use Cost-Weighted CPU and Memory

Never add CPU cores and memory GiB directly. They are different units. Allocate each resource independently or derive explicit rates whose total equals the node cost.

For example:

```text
workload_cost
  = allocated_CPU_core_hours * CPU_cost_per_core_hour
  + allocated_memory_GiB_hours * memory_cost_per_GiB_hour
```

AWS's split cost example derives CPU and memory rates with a documented relative weighting. OpenCost derives component rates from provider or custom asset pricing. If an organization creates its own weights, label them as an internal cost model.

## Publish More Than One Signal

A useful team report contains:

- allocated cost under the selected model;
- requested CPU- and memory-hours;
- actual CPU- and memory-hours;
- request utilization ratio;
- usage above request;
- limit and throttling or OOM context;
- shared and idle cost handled by separate policy;
- telemetry coverage and estimation flags.

This lets a team distinguish two actions: lower an oversized request, or reduce real consumption. A dollar total alone cannot explain which is needed.

## Make the Decision Explicit

Use this practical rule:

- choose **requests** when reserving schedulable capacity is the main cost-causing act;
- choose **usage** when metered consumption is the intended contract and capacity blocking is handled elsewhere;
- choose **max(request, usage)** when both scheduler reservation and above-request consumption should be accountable;
- keep **limits** as reliability context, not the primary allocation driver;
- keep **node residual and platform overhead** outside direct workload cost until a shared-cost policy assigns them.

Version the choice by cluster and effective date. Changing from requests to actual usage can move substantial cost even when no workload changed.

## Validate the Model

- Requests are summed across regular containers with correct handling for init and Pod-level resource semantics used by the cluster version.
- Usage is integrated over time with a resolution appropriate for workload duration.
- CPU and memory units are not mixed.
- Pod identity includes cluster, namespace, and UID.
- Missing requests and missing metrics have distinct exception codes.
- Direct workload cost plus idle and platform pools equals asset cost.
- The report identifies whether AWS split data, OpenCost, or a custom model supplied each amount.

## Official Documentation

- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Tools for monitoring resources](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
- [OpenCost: Cost allocation specification](https://opencost.io/docs/specification/)
- [OpenCost: Allocation API and resolution behavior](https://opencost.io/docs/integrations/api/)
- [AWS Data Exports: Enabling EKS split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/enabling-split-cost-allocation-data.html)
- [AWS Data Exports: Split line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html)
- [Amazon EKS: View costs by Pod with split cost allocation](https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html)

## Conclusion

Requests represent schedulable capacity, actual metrics represent consumption, and the higher of the two captures both. Choose the model that reflects team control and platform economics, calculate it at aligned time intervals, and publish requests, usage, idle, and telemetry quality separately. The driver is a showback policy even when AWS or OpenCost performs the arithmetic.
