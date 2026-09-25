# How to Distinguish Cloud Quota, Rate Limit, and Regional Capacity Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Azure, GCP, Troubleshooting

Description: Classify cloud allocation ceilings, API throttling, and physical capacity failures so retries and quota requests address the actual blocking condition.

---

A deployment that fails while creating virtual machines can be blocked by three different systems: an allocation quota, an API rate limiter, or a shortage of suitable hardware. They can occur in the same rollout, but they require different responses.

Classify the error from the failed operation before changing concurrency, requesting quota, or moving workloads.

## Separate allocation amount from request rate

Allocation quotas bound quantities such as regional vCPUs, addresses, or disks. API rate limits bound operations over time. Some providers call both “quotas,” so the word alone is insufficient.

Physical capacity is a third constraint: a permitted request can still lack a matching host in the selected zone and machine family. Additional quota does not reserve that host.

| Failure class | Evidence to collect | First corrective direction |
| --- | --- | --- |
| Allocation quota | Named metric, limit, usage, requested additional allocation, scope | Reduce accounted use or obtain the relevant increased ceiling |
| API throttling | Operation, request rate, error details, retry guidance | Bound retries and reduce concurrency or polling |
| Physical capacity | SKU, zone, placement constraints, provider allocation error | Use an approved alternate placement or wait for capacity |

These are diagnostic directions, not automatic production changes. Moving a database to another region can change latency, residency, and recovery assumptions.

## Use provider error codes, not HTTP status alone

For EC2, [AWS documents](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html) `InstanceLimitExceeded` as a quota-related launch failure and `InsufficientInstanceCapacity` as a lack of available On-Demand capacity. Other quota errors identify specific resource limits; preserve the complete message and consult the [EC2 error reference](https://docs.aws.amazon.com/ec2/latest/devguide/errors-overview.html).

EC2 API throttling uses `RequestLimitExceeded`. Its [throttling model](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-throttling.html) includes request and resource token buckets. A large launch can consume resource tokens even if it uses relatively few API calls. Reducing only the number of calls may therefore leave the limiting dimension unchanged.

Azure Resource Manager's [throttling documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/request-limits-and-throttling) describes HTTP 429 responses and `Retry-After` guidance. Read the provider error body as well: a 429 can carry resource-provider details beyond the general ARM request budget. Quota messages about regional or family vCPUs are different from allocation failures such as `AllocationFailed`.

Google Compute Engine distinguishes [allocation quotas](https://docs.cloud.google.com/compute/resource-usage) from [API rate quotas](https://docs.cloud.google.com/compute/api-quota). Resource availability errors such as `ZONE_RESOURCE_POOL_EXHAUSTED` belong to its [capacity troubleshooting workflow](https://docs.cloud.google.com/compute/docs/troubleshooting/troubleshooting-resource-availability). Do not map every quota or capacity failure to one expected HTTP code.

## Check the exact allocation dimension

If the error names a resource ceiling, compare current use and the proposed peak in the same scope. Confirm account, subscription or project, region, machine family, purchase model, and resource context.

A replacement rollout may need both old and new resources concurrently. For example, eight existing four-vCPU VMs plus four replacement VMs require forty-eight vCPUs at peak, even if the final fleet still contains eight VMs. A thirty-two-vCPU limit fits steady state but blocks that transition.

Also check whether stopped or reserved resources remain charged to the particular quota. Provider accounting differs. A dashboard showing low CPU utilization is not evidence of unused vCPU allocation quota.

Request the needed total ceiling and track its applied value. Retrying an unchanged allocation request while the quota is still exhausted usually repeats the same failure.

## Make retries bounded and observable

For a rate limit, follow the provider SDK's documented retry behavior and any valid `Retry-After` instruction. Use backoff and jitter, limit concurrent workers, and set a deadline. Audit nested retry layers: an orchestrator, provider SDK, and wrapper script can multiply attempts.

Protect non-idempotent operations using the API's supported request token or reconciliation model. After an ambiguous timeout, discover whether the resource was created before issuing a new creation request.

A deployment's status polling can contribute to throttling. Reduce unnecessary reads, paginate inventories, and distinguish request failures from infrastructure failures. Retain operation names and throttling counts so a slower deployment can be explained rather than mistaken for capacity exhaustion.

## Treat capacity alternatives as design decisions

For physical shortage, inspect hard placement constraints first: zone, machine size, affinity, reservation targeting, accelerator type, or specialized networking. An alternative zone or supported machine family can help only if the application and its dependencies allow it.

Where predictable starts are required, evaluate the provider's capacity-reservation product and its specific matching and quota requirements. A billing discount or quota approval alone is not a capacity guarantee.

Reclassify after each remedy. Reducing API concurrency may expose a previously hidden vCPU quota failure; obtaining quota may expose a capacity shortage. Close the incident with the final error class, the evidence that supported it, and the control that will detect the same constraint before the next rollout.
