# Validation Summary: How to Apply Azure Well-Architected Framework Cost Optimization Recommendations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Well-Architected Framework
- Azure Advisor
- Azure Monitor metrics
- Azure CLI
- Azure Virtual Machines
- Azure Reserved VM Instances
- Azure savings plans for compute
- Azure VM auto-shutdown
- Start/Stop VMs v2
- Azure Blob Storage lifecycle management
- Azure Cost Management budgets and anomaly alerts
- Azure Spot Virtual Machines
- Azure Policy

## Sources Consulted
- Azure Well-Architected Framework overview: https://learn.microsoft.com/en-us/azure/well-architected/what-is-well-architected-framework
- Azure Well-Architected Cost Optimization checklist: https://learn.microsoft.com/en-us/azure/well-architected/cost-optimization/checklist
- Azure Advisor WAF assessments: https://learn.microsoft.com/en-us/azure/advisor/advisor-assessments
- Azure Advisor cost recommendations: https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations
- Azure CLI `az monitor metrics list`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Azure CLI `az vm auto-shutdown`: https://learn.microsoft.com/en-us/cli/azure/vm
- Monitor Azure Virtual Machines: https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm
- Azure VM monitoring data reference: https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm-reference
- Azure Reserved VM Instance size flexibility: https://learn.microsoft.com/en-us/azure/virtual-machines/reserved-vm-instance-size-flexibility
- Decide between a savings plan and a reservation: https://learn.microsoft.com/azure/cost-management-billing/savings-plan/decide-between-savings-plan-reservation
- Azure Reserved Virtual Machine Instances pricing: https://azure.microsoft.com/en-us/pricing/reserved-vm-instances/
- Azure savings plans pricing: https://azure.microsoft.com/en-us/pricing/offers/savings-plan-compute
- Start/Stop VMs v2 overview: https://learn.microsoft.com/en-us/azure/azure-functions/start-stop-v2/overview
- Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Azure Cost Management anomaly detection: https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/analyze-unexpected-charges
- Azure Spot Virtual Machines: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms

## Issues Found
- The Azure Monitor CLI example said it queried average CPU for all VMs in a resource group, but the command targets a single VM resource. I changed the comment to describe one VM and included both `Average` and `Maximum` aggregations to match the later guidance about average and peak utilization.
- The Azure Monitor CLI example used `--metric`; the current CLI reference documents `--metrics`, so I updated the command to the current parameter name.
- The memory-sizing advice implied memory metrics are available the same way as default platform CPU metrics. I clarified that memory analysis requires guest OS metrics from Azure Monitor Agent, VM insights, or another monitoring agent.
- The commitment discount section said both Reserved Instances and Savings Plans provide discounts up to 72%. Current Microsoft pricing states VM Reserved Instances can save up to 72%, while Azure savings plans for compute can save up to 65% on eligible compute services. I corrected the percentages and scope.
- The reservation portability example was too absolute. I updated it to mention reservation scope and instance size flexibility groups.
- The Start/Stop VMs v2 section incorrectly described the current solution as Azure Automation-based. Current docs state v2 is based on Azure Functions and Logic Apps, so I corrected that wording.
- The `az vm auto-shutdown` example used a `--timezone` flag that is not in the current CLI reference. I removed the invalid flag and changed the comment to note that `--time` is UTC.
- The storage lifecycle wording mixed access-based guidance with a modification-age JSON example. I clarified that lifecycle policies can use modification age, or access patterns when last access time tracking is enabled.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
