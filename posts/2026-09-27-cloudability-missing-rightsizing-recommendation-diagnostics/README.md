# How to Diagnose Missing Cloudability Rightsizing Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Optimization, Troubleshooting, Cloud

Description: Distinguish missing Cloudability rightsizing data from filtering, young resources, permissions, unsupported scope, and recommendations with no default action.

A resource appears in a cloud bill but has no visible Cloudability rightsizing recommendation. That does not prove it is optimally sized. It may lack monitoring data, be too new, fall outside the supported analysis, or be hidden by a preference or View.

Investigate one resource with a stable ID and a clear timeline. This separates a data collection problem from an expected recommendation outcome.

## Identify the recommendation engine first

Cloudability Basic and Premium's Advanced rightsizing are different systems. Basic recommendations refresh daily and use the supported 10- or 30-day lookback. Advanced actions come from Turbonomic, refresh hourly, and require its additional credential permissions. [Basic rightsizing FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-faq), [Advanced rightsizing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cloudability-advanced-rightsizing)

Record which tab the user is examining. A change to Basic preferences is not a reliable fix for an Advanced action, and upgrading the subscription does not automatically grant new cloud permissions.

Also establish whether the resource's service is supported in that engine. Use the current provider page rather than an old screenshot or a list copied from another engine.

## Rule out a visibility problem

Keep a record of the selected View, cloud account filters, service tab, risk selection, and cost basis. Search by resource ID where available and inspect snoozed recommendations using the supported controls.

An administrator should compare the intended scope without expanding the affected user's permissions unnecessarily. A missing row under one View can be correct if the resource does not match that View's account or Business Mapping criteria. Container rightsizing supports only Views based on Account Id, Account Name, Account groups, and Vendor dimensions; check the feature's View support before relying on Business Mapping criteria. [Views compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=views-feature-compatibility)

Global Basic preferences can exclude recommended instance types, enforce minimum savings, or exclude recommendations for long-inactive resources. [Rightsizing preferences](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-preferences)

In Premium, check Settings > Rightsizing Preferences > Advanced. The Hide Basic setting grays out the Basic tab for all users while Cloudability continues generating Basic recommendations. [Advanced rightsizing preferences](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-advanced-preferences)

Treat “generated but hidden” differently from “never generated.” Record a preference change before making it, because a global adjustment can affect every team's opportunity list.

## Check the resource timeline

IBM documents recommendations becoming accessible around 24 hours after creation when sufficient utilization data exists. Resource age alone is therefore not an acceptance guarantee. [Rightsizing lifecycle guidance](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=optimize-rightsizing)

For the missing resource, record:

| Event | Evidence to collect |
| --- | --- |
| Resource created | Provider timestamp |
| Correct account credentialed | Cloudability verification result |
| Monitoring available | First and latest metric timestamps |
| Billing ingested | Relevant reporting period present |
| Recommendation checked | Engine, scope, and check time |

A three-week-old machine whose monitoring permissions were fixed this morning does not have three weeks of collected utilization evidence in every downstream system. Avoid applying a universal waiting period without checking what was actually collected.

## Verify the permissions for the missing data

Inspect the vendor credential's detailed verification result and compare the deployed policy with the current setup for that provider and engine. Billing permissions, resource discovery, utilization retrieval, and commitment retrieval serve different purposes.

Cloudability's vendor-credential guidance explains that verification checks can identify permissions it could not verify. Review the exact failed operation and scope instead of replacing the role with unrestricted administrator access. [Vendor Credentials](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-vendor-credentials)

For Azure, inspect subscription-level advanced credentialing as well as billing connectivity. For Advanced rightsizing, verify the Turbonomic-specific requirements. Use a known working resource in the same account as a comparison, but remember different services may require different permissions.

## Distinguish missing metrics from a legitimate outcome

Inspect CPU, memory, network, and storage data appropriate to the resource. Gaps should remain gaps in the investigation; replacing them with zeros would manufacture an idle workload.

A **No Action** result is also different from an absent resource. IBM describes it as no default recommendation at the current risk level, with possible alternatives in the details panel. Rightsizing totals should not be treated as a full inventory or reconciled directly to the entire cloud bill. [Recommendation interpretation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-faq)

An illustrative decision sequence is:

```text
Resource absent from intended scope?
  Check View, account, service support, and discovery.
Resource present but metrics missing?
  Check utilization permissions and collection freshness.
Metrics present but no default savings action?
  Review preferences, risk, existing capacity, and cost basis.
```

This sequence is an operational troubleshooting method, not a public description of the proprietary recommendation algorithm.

## Escalate with a bounded reproduction

Provide the resource ID, account, creation time, engine, failed permission details, metric timestamps, and a screenshot or export of the applied scope. Include a comparable working resource if available. Redact credentials and customer-sensitive metadata.

A precise case lets support distinguish a processing delay, policy restriction, or service-specific defect. Repeatedly re-credentialing an entire organization without evidence can obscure the original issue.

## Conclusion

Missing recommendations need evidence from identity, scope, monitoring, and timing. Confirm those inputs before deciding whether the result represents a healthy resource, a filtered opportunity, or an ingestion problem.
