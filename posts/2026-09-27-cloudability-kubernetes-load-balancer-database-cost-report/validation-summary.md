# Validation Summary: How to Combine Kubernetes and Off-Cluster Costs in Cloudability

## Status
validated

## Post Type
Technical guide. Although it contains no executable code, it provides implementation guidance for report dimensions, Business Mapping rules, metric selection, filters, and cost allocation, so a technical review applies.

## Technologies Covered
- IBM Cloudability reporting and Business Mappings
- Kubernetes namespaces and application labels
- Container utilized, idle, and fairshare cost metrics
- Cloud database and load balancer cost allocation
- FinOps showback, chargeback, and shared-cost policies

## Sources Consulted
- [IBM: Container Cost Allocation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=insights-container-cost-allocation) — combined reporting, label mappings, dimensions, filtering, and container metric behavior.
- [IBM: Analyze data for your Kubernetes containers](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=allocation-analyze-data-your-containers) — cost bases and idle allocation.
- [IBM: Business mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=spend-cloudability-business-mapping) — rule evaluation, default values, and historical reprocessing.
- [IBM: Structure of a Business Mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=point-structure-business-mapping) — ordered statements and matching expressions.
- [IBM Apptio: Cost Sharing](https://www.apptio.com/products/cloudability/cost-sharing/) — fixed, proportional, and telemetry-based sharing, including shared databases.
- [Author GitHub profile](https://github.com/nawazdhandala) — author link verification.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The ownership worksheet and reconciliation checks are sound operational recommendations; the named applications and amounts are illustrative, not claims about an actual deployment.
- Confirmed that application labels and Business Mappings can bring container and external resource costs together. First-match rule evaluation supports placing specific exceptions before account fallbacks.
- Confirmed that Containers metrics exclude external spend by returning zero, while general cost measures support combined reporting. Filtering on a cluster can exclude external resources.
- Verified the arithmetic independently: $900 + $300 = $1,200 in container fairshare; adding $500 and $100 gives $1,800. Adding overlapping node-cost measures would double count charges.
- IBM documents a separate IDLE RESOURCES row by default for namespace reporting. The post appropriately requires idle reconciliation before calling an application subtotal fully loaded; its example presumes the idle share has already been assigned.
- Shared-cost allocation is distinct from assigning a single Business Dimension value. IBM documents fixed percentages and telemetry-based allocation for shared infrastructure.
- Future operational detail could mention that Business Mapping changes apply automatically to the current month; older periods require reprocessing. This does not invalidate the post's recommendation to compare equivalent dates and processing states.
- IBM also documents differences between the Containers page and Reports, including cluster-level storage or non-node costs that may lack namespace attribution. The post does not promise automatic allocation of every such charge.
- Direct retrieval of the three IBM URLs in the post returned HTTP 403 in the research tool. Relevant documentation was available through search-indexed official IBM pages, including the exact Premium Container Cost Allocation URL. The Enterprise URLs are plausible IBM documentation routes, but their exact live destinations could not be conclusively verified; a 403 was not treated as proof of a broken link. The author URL resolves to the expected GitHub profile.
- No CLI commands, code blocks, configuration snippets, or explicit software versions require execution or version-specific testing. This was a documentation review, not a live Cloudability tenant test.
