# Validation Summary: How to Distinguish a Service Quota Error from Rate Limiting and Regional Capacity Exhaustion

## Status

validated

## Post Type

Technical troubleshooting guide. Although it contains no executable code, commands, or configuration snippets, it includes concrete implementation details about cloud API errors, quota accounting, token buckets, retry handling, idempotency, and capacity reservations, so a technical review applies.

## Technologies Covered

- AWS EC2 allocation quotas, API throttling, idempotency, and On-Demand Capacity Reservations.
- Azure Resource Manager throttling, VM vCPU quotas, allocation failures, and capacity reservations.
- Google Cloud Compute Engine allocation quotas, API rate quotas, resource availability, and reservations.
- Deployment peak sizing, bounded retries, backoff, jitter, polling, and placement constraints.

## Sources Consulted

- [AWS EC2 instance launch troubleshooting](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html).
- [AWS EC2 API error reference](https://docs.aws.amazon.com/ec2/latest/devguide/errors-overview.html).
- [AWS EC2 API request throttling](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-throttling.html).
- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html).
- [AWS EC2 API idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html).
- [AWS EC2 On-Demand Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html).
- [Azure Resource Manager request limits and throttling](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/request-limits-and-throttling).
- [Azure VM vCPU quotas](https://learn.microsoft.com/en-us/azure/virtual-machines/quotas).
- [Azure VM allocation failure troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure).
- [Azure on-demand capacity reservations](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-overview).
- [Google Compute Engine allocation quotas](https://docs.cloud.google.com/compute/resource-usage).
- [Google Compute Engine rate quotas and system limits](https://docs.cloud.google.com/compute/api-quota).
- [Google Compute Engine resource availability troubleshooting](https://docs.cloud.google.com/compute/docs/troubleshooting/troubleshooting-resource-availability).
- [Google Compute Engine reservations](https://docs.cloud.google.com/compute/docs/instances/reservations-overview).

## Issues Found

No technical issues found.

## Review Notes

- Confirmed the distinction between allocation ceilings, request throttling, and physical capacity. Quota approval does not itself reserve hardware.
- Verified the classifications of EC2 `InstanceLimitExceeded`, `InsufficientInstanceCapacity`, and `RequestLimitExceeded`; Azure `AllocationFailed`; and Compute Engine `ZONE_RESOURCE_POOL_EXHAUSTED`.
- Confirmed that EC2 uses separate request and resource token buckets for applicable operations. Pagination and filtering can avoid the smaller bucket used for certain unpaginated, unfiltered reads.
- Confirmed Azure's HTTP 429 and `Retry-After` behavior, including resource-provider errors that are not simply exhaustion of the ARM request budget. Compute Engine documents HTTP 403 for rate-quota exhaustion, supporting the advice against classifying failures by HTTP status alone.
- Checked the rollout arithmetic: eight four-vCPU VMs consume 32 vCPUs; four additional four-vCPU replacements bring concurrent demand to 48 vCPUs. The example assumes the replacements have the same size and count against the same quota scope.
- Confirmed that quota accounting depends on resource state and provider rules. Azure explicitly counts allocated and deallocated VM cores, and reservations have their own quota implications. CPU utilization does not measure allocated quota headroom.
- Retry guidance is consistent with documented bounded attempts, exponential backoff, jitter, and API-specific idempotency. Nested retries multiply attempts by composition; deadlines and concurrency limits remain application responsibilities. Request tokens must be used within the API's documented parameter and scope rules.
- Confirmed that reservation consumption depends on matching resource properties and that reservation creation can itself fail for quota or capacity reasons. Billing discounts alone do not establish capacity availability.
- All seven technical documentation links in the post resolved to relevant official resources. The author link also resolved to the expected GitHub profile.
- No version-specific commands, deprecated APIs, or executable examples require runtime testing. No cloud resources were provisioned. README.md was left unchanged.
