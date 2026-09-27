# Validation Summary: How to Find Powered-On but Idle Azure VMs with Cloudability Metrics

## Status

validated

## Post Type

Technical guide with a read-only Azure CLI example.

## Technologies Covered

- IBM Cloudability Azure Compute rightsizing and utilization metrics
- Azure Virtual Machines, monitoring permissions, and power states
- Azure CLI, Bash, and JMESPath
- Azure reservations and FinOps cost analysis

## Sources Consulted

- [IBM Azure rightsizing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-azure) — indexed documentation confirming the Idle definition.
- [IBM Azure Compute dashboard](https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=cloudability-azure-compute) — dashboard navigation, account filtering, timelines, data-source fields, and cost basis. This is the Federal documentation for the standard dashboard.
- [IBM Rightsizing FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=optimize-rightsizing) — utilization dimensions, lookback periods, recommendation scope, and workload-purpose caveats.
- [IBM Azure advanced credentials](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cma-set-up-advanced-credentials-azure-rightsizing-reserved-instance-planning) — subscription credentialing and metric-read permissions, reviewed through indexed official documentation.
- [IBM Cloudability release notes](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in) — March 4, 2026 Available Memory Bytes fallback announcement.
- [Azure CLI: az vm get-instance-view](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest#az-vm-get-instance-view) — supported command, arguments, query, and output options.
- [Microsoft Linux VM management tutorial](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-manage-vm) — instanceView.statuses response path, power-state inspection, and attached-resource behavior.
- [Microsoft VM states and billing](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing) — stopped versus deallocated states and continuing disk/network charges.
- [Microsoft reservation discount behavior](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/understand-vm-reservation-charges) — reservation utilization and unused reserved hours.
- [JMESPath specification](https://jmespath.org/specification.html#starts-with) — starts_with function, filter expressions, and multiselect lists.

## Issues Found

No technical issues found.

## Review Notes

- README.md required no changes. The post contains a valid technical workflow and CLI example, so it qualifies for technical validation.
- The Idle indicator describes CPU behavior; the post correctly avoids treating it as proof of inactivity across all resource dimensions or as authorization to retire a workload.
- IBM explicitly announced the memory fallback on March 4, 2026. The post correctly distinguishes unavailable metrics from zero utilization and avoids obsolete blanket requirements for custom memory collection.
- The Bash example passed a syntax check. Its exact JMESPath query passed local checks against representative instance-view JSON, including reversed status order and an empty status array. The command is documented as current and generally available. No live Azure VM query was performed; execution requires authentication, resource-read access, the intended subscription, and real resource names.
- The example correctly selects the power-state entry by code prefix. Current power state and historical utilization are appropriately treated as separate evidence.
- The worksheet is explicitly illustrative. Reviewing aligned observation windows, peaks, scheduled work, ownership, and recovery roles is appropriate; these examples do not claim to reproduce the proprietary recommendation algorithm.
- Standard rightsizing supports 10- and 30-day lookback periods. Workloads with longer cycles may need additional historical evidence. Premium Advanced Rightsizing has a separate interface; its navigation should not be substituted for the standard dashboard described here.
- The cost discussion correctly separates estimated resource savings from total application expenses and recognizes that commitments can affect realized savings.
- The four technical reference URLs identify relevant official resources. Direct retrieval of two IBM Premium pages returned HTTP 403; their indexed official content and related IBM documentation supplied corroborating evidence. This access limitation does not establish that the links are broken.
