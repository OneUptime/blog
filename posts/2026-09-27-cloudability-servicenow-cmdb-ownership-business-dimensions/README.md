# How to Sync ServiceNow CMDB Ownership into Cloudability Business Dimensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Management, ServiceNow, Automation

Description: Sync ServiceNow ownership into Cloudability Business Dimensions with tested credentials, scoped table access, reviewed statement templates, and publication checks.

A cloud resource can have a valid technical owner tag while the financial owner lives in ServiceNow. Copying that ownership manually into Cloudability creates a second mapping that drifts whenever applications or cost centers change.

IBM's ServiceNow CMDB integration can generate Cloudability Business Dimension statements from ServiceNow data. The important implementation work is deciding which records are authoritative and proving that generated rules identify the intended cloud spend.

## Agree on a join key and ownership policy

Start with a narrow application set and a stable identifier present in both systems, such as an application ID carried in a cloud tag. Avoid joining on display names that can change or collide.

Create a review table before configuring the integration:

| CMDB application ID | Cloud identifier | Expected cost owner | Exception |
| --- | --- | --- | --- |
| APP-104 | `app-104` | Payments | None |
| APP-205 | `app-205` | Analytics | Owner changed this month |
| APP-309 | Missing | Unallocated | Cloud tag remediation required |

Decide how retired applications, missing owners, duplicate identifiers, and future ownership changes should behave. A missing join is not a reason to assign the resource to whichever CMDB row appears first.

## Install and prove authentication

IBM documents installing the Cloudability application from the ServiceNow Store, configuring its connection and credential aliases, and testing the Cloudability Integration - Get Frontdoor Token action in Workflow Studio.

The KeyAccess and KeySecret values are a Frontdoor credential pair. Configure the region-specific Frontdoor connection URL and test token acquisition before investigating mapping expressions. Store secrets in the integration's credential records, not in statement templates or scripts.

A successful token test narrows the problem to later stages; it does not prove table access or publication will work.

## Grant the application the required table access

Configure cross-scope read privileges for the ServiceNow tables or views selected by the integration. Begin with the smallest relevant application or service table. Verify that the integration can read the identifier and ownership columns used by the template.

An administrator's successful interactive table query does not prove the application scope can read the same data. Test through the integration and inspect its execution details when fields are absent.

For the initial rollout, use a query that selects a known set of active records. Count those records independently and compare the count with the generated mapping statements. Unexpectedly broad queries can create many rules and alter ownership outside the intended application set.

## Build a draft Business Dimension

Create a draft ServiceNow Business Dimension, select its Cloudability target, choose the source table, and define the statement-template query. Set the effective date deliberately.

Use statement templates to substitute table columns into the match and value expressions. Construct a match from the stable cloud identifier and a result from the financial owner column. Inspect generated examples with punctuation, missing values, and duplicate owners before publishing.

This is a policy transformation, not a generic database replication job. Review rule ordering and the default owner along with each generated expression. Two CMDB records that match the same cloud identifier need a conflict decision before publication.

## Publish and observe the result

IBM distinguishes publication by effective date: a draft with a current or past effective date updates Cloudability immediately; a future date produces a pending version until that date arrives. Verify the resulting status and retain the previous mapping for comparison.

Check the deployed Business Dimension in Cloudability and run a small cost report for the test applications. Compare its assigned owners with the review table. Include an unmatched application so the fallback path is exercised.

Publishing a mapping and reprocessing historical cost data are separate concerns. The current definition can be correct while older reporting periods still reflect prior processing. Plan historical reconciliation with the documented Business Mapping reprocessing workflow rather than repeatedly publishing the same draft.

## Operate the synchronization

Assign someone to review integration failures, stale mappings, and unallocated spend. Track when the CMDB record changed, when a mapping version was published, and when the cost report reflected that version. Avoid promising a refresh interval that has not been verified in the installed integration.

## Conclusion

Use the CMDB as an ownership source only after proving the key, permissions, and generated rules. A controlled draft-and-publish workflow keeps automated mapping changes explainable when financial ownership changes.

## Official Documentation

- [IBM ServiceNow CMDB integration](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloudability-connect-servicenow-cmdb)
- [IBM Business Mapping structure](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=point-structure-business-mapping)
- [IBM Business Mappings API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-business-mappings-end-point)
