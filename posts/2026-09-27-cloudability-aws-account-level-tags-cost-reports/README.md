# How to Bring AWS Account-Level Tags into Cloudability Cost Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, AWS Organizations, Cloud Tags, Cost Reporting

Description: Bring AWS Organizations account tags into Cloudability reporting with verified permissions, explicit identifiers, and tested resource-level fallback rules.

AWS account tags are useful when an account belongs to a business unit or cost center, including charges that do not have useful resource-level tags. They are separate metadata from tags attached to EC2 instances or other individual resources.

Cloudability can ingest AWS Organizations account tags through an API permission and expose them for mapping. Establish that source connection before expecting the account's owner to appear on a cost report.

## Confirm the tag is attached to the account

Choose one account as a test case. In AWS Organizations, inspect the account object and its tags. A similarly named tag on an organizational unit or root is a different object; do not assume it is an account tag merely because the account sits beneath that organizational unit.

Using an appropriately authorized AWS CLI identity, a read-only check is:

```bash
aws organizations list-tags-for-resource \
  --resource-id 111122223333 \
  --output json
```

The account ID is illustrative. AWS documents this operation for account and other Organizations resource tags, with calls permitted from the management account or a delegated administrator. [AWS ListTagsForResource](https://docs.aws.amazon.com/organizations/latest/APIReference/API_ListTagsForResource.html)

Record the exact key and value, such as `cost-center=CC-210`. Keep the test result alongside the account ID and retrieval time so later renames can be distinguished from ingestion failures.

## Verify Cloudability's integration permission

IBM requires `organizations:ListTagsForResource` for AWS account-level tag collection. It exposes account tags using `cldy:aws:accountLevelTag:<tag key>` and notes that this feature is not available in Cloudability Gov. [Cloudability tag-source reference](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=spend-cloudability-tag-label-mapping)

Compare the current Cloudability role template with the deployed integration role and inspect credential verification. A successful CLI call with your personal administrator profile does not prove that Cloudability's assumed role can make the same call.

If the permission is missing, update the integration through your normal reviewed infrastructure process. Preserve the correct role trust, account scope, and existing permissions. Adding the single action to an unrelated IAM role will not repair the integration.

## Create an account-only diagnostic dimension

In Tags & Labels, select the actual ingested account-tag identifier and map it to a clearly named reporting dimension, such as Account Cost Center. Start with this isolated dimension before combining multiple metadata sources.

Build a small report with account ID, the mapped value, and one cost metric for a completed period. Validate at least one known tagged account and one account where that tag is absent.

An illustrative acceptance table is:

| Account | Organizations tag | Expected report value |
| --- | --- | --- |
| Engineering test account | CC-210 | CC-210 |
| Analytics test account | CC-340 | CC-340 |
| Unassigned sandbox | Missing | Missing/unallocated for investigation |

A meaningful test includes a missing value. Otherwise, a broad fallback rule can conceal a broken source and still make every row look complete.

## Add resource-level exceptions deliberately

An account-level cost center may be a fallback while resource owners override it. Document that rule explicitly. For example, a shared account could default to Platform, while a tagged database belongs to Checkout.

IBM's AWS support guidance states that identifier order matters: the first nonempty match wins. It also warns that inventing an AWS resource-tag prefix modeled on Azure causes the intended resource match to be skipped. [AWS resource/account tag precedence](https://www.ibm.com/support/pages/aws-resource-level-tag-value-not-appearing-reports-when-both-resource-tag-and-account-level-tag-exist-same-key)

Select the real resource identifier from your environment and place it before the account identifier when resource ownership is meant to win. Verify all combinations:

- Both values present and different: the intended source wins.
- Resource value absent: account fallback appears.
- Both absent: the unresolved bucket remains visible.

Do not combine a resource's technical maintainer with an account's financial sponsor unless both are intended to mean the same reporting concept.

## Review history before using the result for chargeback

Account metadata can change when teams reorganize. Decide whether a report should represent ownership at usage time or the current organization applied to historical expense. Those are different financial questions.

Inspect the current reporting result and agree the affected historical period before requesting reprocessing or refetching. IBM explains that reprocessing stored billing and refetching source data are separate operations. [Data availability and reprocessing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reports-cost-usage-data-availability-in-reporting)

Preserve exports used for a closed chargeback period. If history is intentionally reassigned, publish the reason and the account-to-owner changes so finance can reconcile the revision.

## Conclusion

Account tags become reliable reporting inputs when the Organizations source, integration permission, mapped identifier, and fallback order are all verified. Test a small account set first, then expand the mapping with a clear policy for unresolved ownership and historical changes.
