# Validation Summary: Allocate Untaggable Cloud Cost with an Association Table

## Status
validated

## Post Type
Technical guide / Architecture and data-governance reference

## Technologies Covered
- AWS Cost and Usage Reports (CUR and CUR 2.0)
- AWS Data Exports
- AWS Organizations account cost allocation tags
- AWS Cost Categories
- SQL window functions and effective-dated association tables
- FinOps showback and cloud cost allocation
- Bitemporal data modeling and allocation controls

## Sources Consulted
- [AWS Data Exports: CUR 2.0 line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html) - verified optional resource IDs, blank resource-ID cases, charge types, and inclusive/exclusive usage timestamps.
- [AWS Data Exports: legacy CUR line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html) - verified the documented `lineItem/ResourceId` behavior cited by the post.
- [AWS Data Exports: CUR 2.0 identity columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html) - verified that `identity_line_item_id` is unique only within a partition and is not stable across reports.
- [AWS Data Exports: CUR 2.0 tags column](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-tag-columns.html) - verified the `tags` map and the resource, user-attribute, account, cost-category, and IAM-principal prefixes.
- [AWS Data Exports: export delivery](https://docs.aws.amazon.com/cur/latest/userguide/dataexports-export-delivery.html) - verified partition identity, create-new execution IDs, refresh behavior, and overwrite behavior.
- [AWS Billing: account tags for cost allocation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/account-tags-cost-allocation.html) - verified account-grain allocation and coverage of otherwise untaggable costs.
- [AWS Billing: activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html) - verified activation requirements for cost allocation tags.
- [AWS Billing: creating Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/create-cost-categories.html) - verified available rule dimensions, ordered evaluation, and first-match behavior.
- [PostgreSQL window functions](https://www.postgresql.org/docs/current/functions-window.html) and [SQLite window functions](https://sqlite.org/windowfunctions.html) - verified `DENSE_RANK()` semantics used to preserve tied top-precedence candidates.

## Issues Found
1. **Unmatched rows were absent from the SQL result.** The final query aggregated only `top_candidates`, so a source row with zero matching rules produced no output row even though the text says zero candidates must be routed as unmatched. Changed the final query to start from `canonical_cost` and left join the top candidates. It now emits `winning_rule_count = 0` for unmatched rows, `1` for a safe direct match, and more than `1` for an ambiguity.
2. **Rule-version lineage was incomplete.** The schema and effective-time discussion rely on immutable rule versions, but the candidate query and output fields retained only `rule_id`. Added `rule_version` to the candidate and result data and added `allocation_rule_version` to the recommended allocation fields so a historical result identifies the exact rule version used.
3. **The globally unique source-key guidance did not name the export identity and could imply that AWS deliveries are inherently immutable.** CUR 2.0 IDs are only partition-unique, while AWS Data Exports can overwrite a partition on refresh. Updated the guidance to combine the line-item ID with export identity, partition identity, and an immutable ingestion snapshot of the delivery.
4. **The provider-tag example mixed legacy CUR and CUR 2.0 naming.** `resourceTags/user:Owner` is a legacy CUR-style column name, whereas the surrounding claim discusses CUR 2.0's consolidated `tags` map and source prefixes. Changed the example to the CUR 2.0 `tags` map key `resourceTags/Owner`.

## Review Notes
- The corrected SQL was executed against SQLite 3.51 with single-match, tied-match, and no-match fixtures; it returned winning-rule counts of 1, 2, and 0 respectively.
- The SQL is intentionally expressed against a canonical cost model rather than raw CUR 2.0 column names. An implementation should keep `rule_id` non-null and use timestamp types with a consistent UTC interpretation.
- If split weights use floating-point storage, production validation should compare their sum to 1 within a documented tolerance; an exact decimal type permits the equality check shown in the post.
