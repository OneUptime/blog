# Validation Summary: How to Allocate Kubernetes Idle Node Costs by Owner in Cloudability

## Status

validated

## Post Type

Technical guide. Although it contains no executable code or commands, it provides technical implementation details for reporting dimensions, allocation calculations, and reconciliation, so it qualifies for technical review.

## Technologies Covered

- IBM Cloudability container cost allocation and reporting
- Kubernetes nodes, namespaces, labels, resource requests, usage, and pod QoS classes
- FinOps utilized, idle, and fairshare cost allocation
- Cash, amortized, and adjusted cost metrics
- Tag and Label Mapping and Business Dimensions

## Sources Consulted

- [IBM: Analyze data for your Kubernetes containers](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=allocation-analyze-data-your-containers) — allocation basis by QoS class, node-level idle distribution, and cost metrics; reviewed through indexed official documentation.
- [IBM: Container Cost Allocation, German-language Cloudability Gov documentation](https://www.ibm.com/docs/de/cloudability-gov/cloudability-federal/saas?topic=insights-container-cost-allocation) — accessible corroboration for IDLE RESOURCES reporting, adjusted metrics, label precedence, and container-based Business Mappings. Edition-specific coverage limitations were not generalized to the commercial product.
- [IBM: Tag and Label Mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=spend-cloudability-tag-label-mapping) — commercial-product support for mapping Kubernetes labels collected through container instrumentation.
- [IBM: Cost and Usage Data availability in Reporting](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reports-cost-usage-data-availability-in-reporting) — processing of container allocations and business dimensions, including historical reprocessing.
- [IBM: Report API Documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=points-report-api-documentation) — allocated, idle, and fairshare metric identities.
- [IBM: Rightsizing for Kubernetes Containers](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloudability-rightsizing-kubernetes-containers) — distinction between changing workload allocation and reducing the underlying infrastructure bill.
- [IBM: What you can do with Cloudability Essentials](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=started-what-you-can-do-cloudability-essentials) — Business Mappings and historical data refresh.
- [IBM: Cloudability Essentials — What's new in 2025](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-essentials-whats-new-in-2025) — checked relevant container changes, including Azure node-level allocation and the retirement of Container Insights 1.0.
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — requests, actual resource consumption, and scheduling capacity.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged; no stylistic edits or additional sections were needed.
- Recalculated the original example: node-a allocates its $20 idle pool as $15 to Checkout and $5 to Search; node-b allocates $90 to Search. Checkout totals $75 and Search totals $125, reconciling $90 utilized plus $110 idle to $200. The repeated node-a idle value is correctly excluded from double counting.
- Confirmed that allocation is proportional within each node, so applying one cluster-wide utilized-cost ratio would yield different team totals.
- Confirmed the documented Cloudability QoS allocation rules and the distinction between resource requests and observed usage. These are Cloudability cost-allocation rules, not a claim that Kubernetes itself calculates financial costs.
- The post appropriately keeps cost bases consistent, checks ownership mappings, preserves missing ownership, and reconciles only covered infrastructure.
- An entirely idle node is deliberately left as a product-result verification case. No unsupported allocation destination is asserted for a zero denominator.
- The IBM links use plausible product and topic paths. Direct retrieval of the linked commercial Enterprise and Premium container-allocation pages returned HTTP 403; the Standard analysis page was available through the search index. Relevant claims were cross-checked against accessible official documentation, including the translated Gov allocation page. This review does not establish that every original link is directly accessible in every environment.
- No executable examples, CLI flags, configuration manifests, or pinned software versions require runtime testing. No authenticated Cloudability tenant was available, so actual tenant rollups, processing latency, and zero-utilization-node behavior were not exercised.
