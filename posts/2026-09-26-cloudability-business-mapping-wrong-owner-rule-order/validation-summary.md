# Validation Summary: How to Debug Cloudability Mapping Owners: Rule Order, Logic, and Defaults

## Status
validated

## Post Type
Technical troubleshooting guide with a JSON Business Mapping example and Boolean logic fixtures.

## Technologies Covered
- IBM Cloudability Business Mappings and Business Dimensions
- Cloudability expression language and Boolean operators
- JSON mapping definitions
- Cloud billing tags, ownership attribution, and FinOps reporting

## Sources Consulted
- [IBM: Business mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=spend-business-mapping) — first-match evaluation, defaults, ingestion, and current-month versus historical processing.
- [IBM: Structure of a Business Mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=point-structure-business-mapping) — mapping fields, ordered statements, and Business Dimension kind.
- [IBM: Business Mapping Expression Language](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-business-mapping-expression-language) — field lookups, literals, comparisons, existence, logical operators, and parentheses.
- [IBM: Business Mappings End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-business-mappings-end-point) — object schema and account identifier examples.
- [IBM: Cloudability Business Mapping Templates](https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=point-cloudability-business-mapping-templates) — ownership fallbacks and explicit Unallocated defaults; supplementary example from the federal edition.
- [AWS: Activate cost allocation tags associated with the solution](https://docs.aws.amazon.com/pdfs/solutions/latest/connected-mobility-solution-on-aws/connected-mobility-solution-on-aws.pdf) — corroborates that missing cost allocation tag activation can affect cost visibility.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The article contains technical implementation details and qualifies for technical validation.
- Parsed the fenced JSON with Python's JSON parser successfully. Its name, kind, defaultValue, statements, matchExpression, and valueExpression fields agree with IBM's documented mapping structure. The account lookup and quoted output literals match official examples.
- Confirmed sequential first-match evaluation and the fallback when no statement matches. Reviewed all six fixture rows against the stated policy, including the shared-account overlap; their expected owners are consistent.
- Confirmed support for &&, ||, !, parentheses, case-insensitive text comparisons, and EXISTS checking a present, nonempty text value. The article correctly distinguishes existence from an approved ownership value.
- Confirmed that mapping changes apply automatically to current-month billing data and that historical updates require reprocessing. The article appropriately avoids promising immediate report updates.
- The total-cost comparison is valid for an ownership-only regrouping with the same cost metric, data, and report scope. The post explicitly calls for investigating other causes when totals differ.
- No CLI commands or version-pinned APIs require additional checks. No deprecated syntax was identified in the reviewed example.
- IBM direct page retrieval returned HTTP 403; the relevant official documentation content was available through indexed search results, including both IBM documentation URLs cited in the article. The author profile URL is structurally plausible and is not technical evidence.
- This was documentation-based validation, not execution in a live Cloudability tenant. Local JSON parsing does not validate Cloudability's DSL parser or actual ingested tags. The post correctly requires checking the saved mapping and processed output in the product.
