# Validation Summary: How to Unify Inconsistent Tag Keys in Cloudability Reporting

## Status
validated

## Post Type
Technical guide. Although it contains no executable code or commands, it describes implementation details for tag mapping, source precedence, Business Dimensions, and historical reprocessing, so it qualifies for technical review.

## Technologies Covered
- IBM Cloudability Tag & Label Mapping
- Cloudability Business Dimensions and Business Mapping expression language
- AWS resource and account tags and billing exports
- Google Cloud tags and labels
- Kubernetes labels and container cost allocation
- FinOps cost allocation and reporting

## Sources Consulted
- [IBM: Tag and Label Mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=spend-cloudability-tag-label-mapping) — multiple-key selection, wildcard restrictions, export-format differences, provider-specific behavior, missing values, and Kubernetes label support.
- [IBM: AWS Resource-Level Tag Value Is Not Appearing in Reports When Both a Resource Tag and an Account-Level Tag Exist for the Same Key](https://www.ibm.com/support/pages/aws-resource-level-tag-value-not-appearing-reports-when-both-resource-tag-and-account-level-tag-exist-same-key) — identifier mistakes, ordered fallback, and historical reprocessing.
- [IBM: Business Mapping Expression Language](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-business-mapping-expression-language) — expression-language capabilities.
- [IBM: Cloudability Business Mapping Expression Language](https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=point-cloudability-business-mapping-expression-language) — corroborating documentation for typed lookups and case-insensitive text comparisons.
- [IBM: Structure of a Business Mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=point-structure-business-mapping) — ordered statements, output values, and explicit defaults for unmatched values.
- [IBM: GCP Tags and Labels](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloud-support-gcp-tags) — configurable tag-versus-label priority and the need to reprocess after changing it.

## Issues Found
No technical issues found.

## Review Notes
- Confirmed that tag mappings select the first valid source key with a value and do not expand regular expressions or wildcards into multiple source keys.
- Confirmed the distinction between consolidating keys and applying Business Dimension rules to normalize values. An unallocated result for unknown values is an explicit business policy/default, not automatic tag-mapping behavior.
- Checked all four fixture rows against first-match semantics. “Missing” and “Unresolved” are conceptual policy labels in the example; Cloudability reports can display “(not set)” for absent mapped values.
- Confirmed the cited AWS troubleshooting scenario. IBM pages describe differing AWS key formats across export contexts, so the post appropriately recommends inspecting ingested identifiers instead of hard-coding a universal format.
- Confirmed GCP tag-versus-label ordering and reprocessing. GCP's resource/project/system label hierarchy is a separate provider-specific behavior; the post does not claim that arbitrary hierarchy changes are supported.
- Kubernetes labels require the supported Cloudability container integration; the recommendation to review them separately is consistent with IBM's documentation.
- Reprocessing mappings does not itself rewrite historical cloud-provider tag values. The post discusses mapping application and does not promise retroactive changes to source tags.
- The four technical reference URLs identify the intended IBM resources. Some direct requests were blocked or returned cache errors; official indexed documentation and the corroborating IBM expression-language reference were used to complete the review.
- No executable snippets, CLI commands, or version-pinned APIs require runtime testing. No authenticated Cloudability tenant was used; this was a documentation-based review, not an execution of the fixtures against billing data.
- README.md was left unchanged.
