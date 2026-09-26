# Why Cloudability Business Mapping Rules Return the Wrong Owner: First-Match Order, Boolean Logic, and Defaults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Management, Troubleshooting, Automation

Description: Diagnose Cloudability ownership mappings by tracing the first matching statement, testing grouped conditions, and preserving visible defaults for unallocated costs.

An ownership mapping can contain a correct rule and still assign the wrong owner. If a broader statement matches first, the intended exception never runs. Other failures come from conditions grouped differently than intended or a default that hides missing metadata.

Debug one real billing item from input attributes through the ordered statements. Starting with the complete monthly total makes those errors much harder to distinguish.

## Write down the ownership decision

Before editing expressions, describe the policy in plain language. For example:

1. Charges from the designated shared account belong to Platform.
2. Otherwise, production charges tagged for Payments or Checkout belong to Commerce.
3. Otherwise, retain an Unallocated result for investigation.

This order is a business decision. If resource tags should override shared-account ownership, the first two rules should change. Neither ordering is universally correct.

Cloudability evaluates Business Mapping statements in order and stops after the first match. If none matches, it assigns the default. The evaluation happens during processing of billing data. [IBM Business Mapping behavior](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=spend-business-mapping)

Keep the plain-language policy next to the exported mapping. It gives reviewers something meaningful to compare with the expression syntax.

## Trace the first match, including overlaps

Consider this original example for the policy above:

```json
{
  "name": "Accountable Owner",
  "kind": "BUSINESS_DIMENSION",
  "defaultValue": "Unallocated",
  "statements": [
    {
      "matchExpression": "DIMENSION['vendor_account_identifier'] == '111122223333'",
      "valueExpression": "'Platform'"
    },
    {
      "matchExpression": "(TAG['service'] == 'payments' || TAG['service'] == 'checkout') && TAG['environment'] == 'production'",
      "valueExpression": "'Commerce'"
    }
  ]
}
```

The account ID is illustrative. Use the actual account identifier and confirm that the referenced tags are available on the ingested billing item.

For a production Payments item in the shared account, both conditions can be true. Platform still wins because its statement is first. That is the expected result under this policy.

For each disputed item, record the result of every condition, the first matching statement, and the resulting owner. This distinguishes an incorrect condition from a correct condition that lost to an earlier match.

## Make Boolean grouping explicit

The intended condition is:

```text
(payments OR checkout) AND production
```

Without parentheses, a reviewer can easily read a different policy into:

```text
payments OR checkout AND production
```

Cloudability's DSL supports `&&`, `||`, `!`, and parentheses. Its text comparisons are case-insensitive, and `EXISTS` checks for a present, nonempty text value. Use those documented semantics when constructing fixtures. [Business Mapping expression language](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-business-mapping-expression-language)

Do not attempt to distinguish teams solely through capitalization such as `Payments` versus `payments`. Also distinguish existence from membership in an approved taxonomy: a nonempty owner tag containing an obsolete team name is still not an approved owner.

Prefer a small allowlist or another authoritative ownership lookup over sending every arbitrary tag value directly into chargeback.

## Build a fixture table before saving

Use examples that force each branch and each overlap:

| Account | Service | Environment | Expected owner |
| --- | --- | --- | --- |
| Shared account | payments | production | Platform |
| Another account | payments | production | Commerce |
| Another account | checkout | production | Commerce |
| Another account | payments | development | Unallocated |
| Another account | analytics | production | Unallocated |
| Another account | missing | production | Unallocated |

Add empty strings, historical tag values, and unexpected spelling variants from real billing data. Include an item with a missing environment tag so the rule does not accidentally treat absence as production.

This fixture table expresses intended behavior. A local Python implementation of similar Boolean logic can help reason about cases, but it does not validate Cloudability's parser or its ingested attribute values. Verify the saved mapping and observed processed output in the product as well.

## Keep the default visible

An Unallocated bucket is a useful diagnostic output. Setting the default to the largest business unit can make the report look complete while transferring every unrecognized charge to that team.

Track the unallocated amount by account and service. A rising amount can indicate a new workload, an ownership rename, missing tag activation, or a rule that no longer matches the ingested data.

An explicit fallback account rule can be appropriate, but document why it exists and put it after the more specific exceptions it should not override. Avoid a catch-all statement near the top of the list.

For dynamic value expressions, confirm that the output has the desired normalized form. Literal output labels are expression strings, which is why the JSON example uses `"'Commerce'"` rather than assuming the bare word is a literal.

## Separate a rule defect from old processed data

After saving a correction, verify the current mapping definition and then inspect data processed under that definition. IBM explains that current-month data receives mapping changes automatically, while historical periods require reprocessing. [Business Mapping processing behavior](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=spend-business-mapping)

Record the mapping version, save time, tested period, and report scope. If an older month retains the previous owner, that may be a processing-state issue rather than a failed rule.

Finally, compare the total cost before and after regrouping. An ownership-only change should explain how amounts moved between owners, while any change to the overall total deserves a separate investigation into freshness, filters, pricing, or allocations.

The strongest fix includes both the corrected statement order and examples that would fail if someone later broadens a rule or changes its precedence.
