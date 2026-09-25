# How to Identify the Exact Regional Cloud Quota Blocking an AWS, Azure, or GCP Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Azure, GCP, Service Quotas

Description: Trace a failed deployment to the exact cloud account, location, quota identifier, and usage dimension before requesting an increase.

---

“Quota exceeded” is not a complete diagnosis. A deployment can have room under a regional CPU ceiling but exceed a particular machine-family quota, a global ceiling, or a limit belonging to a different account than the one an engineer checked.

Start with one failed API operation and carry its identity through every lookup. This workflow uses compute examples; storage, networking, and managed services have their own quota dimensions.

## Preserve the error and its scope

Record the provider error code and message, request or operation ID, UTC timestamp, calling account, region and zone, resource type, machine family, and requested quantity. Inspect nested errors: an infrastructure deployment service may wrap the original compute error in a generic operation failure.

Build a small evidence row before changing anything:

| Field | Example purpose |
| --- | --- |
| Principal and account | Verify the deployment and quota lookup use the same identity |
| Region, zone, resource context | Select the correct quota scope |
| Service and quota identifier | Avoid matching only a translated display name |
| Applied limit and observed use | Calculate remaining headroom |
| Requested additional demand | Include replacement overlap and concurrent changes |

A quota default from documentation is not necessarily the applied value for this account. Also distinguish quota exhaustion from physical capacity errors; additional permission to allocate does not create available hardware.

## AWS: identify the service and quota code

Check identity and list EC2 quotas in the deployment region:

```bash
region=eu-west-1
aws sts get-caller-identity
aws service-quotas list-service-quotas \
  --service-code ec2 --region "$region" \
  --query 'Quotas[].{Name:QuotaName,Code:QuotaCode,Value:Value,Unit:Unit,Global:GlobalQuota,Adjustable:Adjustable}' \
  --output table
```

Then query the matching code. This example is the EC2 On-Demand Standard instance vCPU quota; do not reuse it for GPU families or Spot without checking the intended category:

```bash
aws service-quotas get-service-quota \
  --service-code ec2 --quota-code L-1216C47A --region "$region"
```

Service Quotas returns the quota value, not a universal live usage counter. Use the service's inventory or the supported quota usage metric for the same resource grouping. The [AWS quota guide](https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html) also distinguishes account-level and resource-level quotas. For the latter, preserve the resource ARN and context when looking up or requesting a change.

Check whether the quota is global before assuming every region has its own independent limit. Follow the service's documented endpoint and accounting rules.

## Azure: check both regional and family ceilings

Make the subscription explicit and retrieve the regional usage inventory:

```bash
subscription_id=00000000-0000-0000-0000-000000000000
location=westeurope
az account show --subscription "$subscription_id" \
  --query '{subscription:id,tenant:tenantId,name:name}' -o json
az vm list-usage --subscription "$subscription_id" \
  --location "$location" -o table
```

For standard VM deployments, inspect Total Regional vCPUs and the requested VM size family's vCPU entry. The [Azure vCPU quota documentation](https://learn.microsoft.com/en-us/azure/virtual-machines/quotas) explains these two tiers and notes that allocated and deallocated VMs contribute to quota accounting. A stopped fleet can therefore explain a surprising usage value.

Check any separate Spot or service-specific quota relevant to the actual deployment. Do not treat an available VM SKU listing as a promise of current zonal capacity. If the error is `AllocationFailed` or `ZonalAllocationFailed`, investigate allocation constraints and inventory instead of blindly increasing a CPU quota.

## Google Cloud: compare regional and project scope

Query the project named in the failed request, not merely the active CLI default:

```bash
project_id=my-production-project
region=us-central1
gcloud compute regions describe "$region" --project "$project_id" \
  --flatten='quotas[]' --format='table(quotas.metric,quotas.usage,quotas.limit)'
gcloud compute project-info describe --project "$project_id" \
  --flatten='quotas[]' --format='table(quotas.metric,quotas.usage,quotas.limit)'
```

Google's [quota overview](https://docs.cloud.google.com/compute/quotas-limits) documents these regional and project-wide lookups. Inspect the exact metric from the failure, including machine-family or all-region dimensions where applicable. Not every quota is represented by one generic `CPUS` line; use the service's quota page and [Cloud Quotas dimensions](https://docs.cloud.google.com/docs/quotas/configure-dimensions) for the relevant API.

## Confirm the arithmetic and the remedy

Calculate the peak additional allocation, including create-before-destroy replacements and other deployments using the same budget. Compare units carefully: vCPUs, instances, addresses, and requests per minute are different limits.

Attach the evidence row and the desired total ceiling to an increase request. If the error and measured headroom disagree, recheck identity, scope, timestamps, family classification, and concurrent activity. After approval, verify the applied value in that exact scope before rerunning the failed stage. Close the investigation with a specific quota identifier and calculation rather than a generic claim that the cloud ran out of resources.
