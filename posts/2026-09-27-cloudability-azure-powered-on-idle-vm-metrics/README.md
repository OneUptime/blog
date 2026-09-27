# How to Find Azure VMs That Are Powered On but Idle Using Cloudability CPU, Memory, and Network Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Azure, Cost Optimization, Troubleshooting

Description: Identify idle Azure VM candidates in Cloudability and corroborate CPU, memory, network, power state, and workload ownership before acting.

A virtual machine can remain powered on long after its useful workload has disappeared. Finding it requires more than sorting a CPU average: a quiet failover node, a memory-heavy service, and an abandoned development server can all look similar in a summary table.

Use Cloudability to shortlist candidates, then verify the resource's current state and operational purpose. The result should be an evidence-backed action proposal, not an automatic deletion list.

## Start with Azure Compute recommendations

Open **Optimize > Rightsizing > Azure > Compute** and select the intended subscription scope and lookback period. IBM documents analysis of CPU, memory, network, and disk utilization, with an Idle column representing time below 2% CPU on a 1–100 scale. [Azure rightsizing documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-azure)

A value near 100 means CPU was usually below that boundary. It does not mean every resource dimension was idle, and it does not prove the virtual machine is unnecessary.

Preserve the resource ID, subscription, resource group, selected dates, data source, and recommendation. Names alone are weak identifiers because teams can reuse them in different subscriptions.

## Confirm that monitoring is actually connected

Billing data and utilization data have different prerequisites. Azure subscription-level advanced credentials enable optimization data collection; successfully connecting a billing account is insufficient proof that each subscription's metrics are available. [Azure advanced credential setup](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cma-set-up-advanced-credentials-azure-rightsizing-reserved-instance-planning)

Inspect the details charts for the candidate. An empty memory graph is missing evidence, not zero memory consumption. The same applies to network and disk gaps.

As of IBM's March 2026 release, Azure's standard Available Memory Bytes metric is used as a fallback when custom memory utilization data is unavailable. Check the current data source before following older advice that custom memory collection is always required. [Azure memory fallback announcement](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in)

## Review the dimensions together

Use a simple investigation worksheet. The following values are illustrative, and the decisions describe an analyst's process rather than Cloudability's proprietary algorithm:

| Candidate | CPU pattern | Other evidence | Next step |
| --- | --- | --- | --- |
| Old test server | Consistently low | Low memory, little network, no scheduled work | Ask owner to confirm retirement |
| Cache server | Low | Large working set, ongoing requests | Assess memory capacity and hit rate |
| Batch worker | Mostly low | Weekly CPU/network peak | Review the full job cycle |
| Failover server | Low | Documented recovery role | Evaluate resilience requirement |

Compare charts over the same window. A CPU chart from last month and a network chart from yesterday do not jointly establish idleness.

Inspect peaks as well as averages. A five-minute nightly task can matter operationally while contributing little to a daily average. Conversely, monitoring agents can generate small continuous traffic after the application has been removed.

## Verify the current Azure power state

The recommendation reflects an observation period. The VM may already have been stopped, replaced, or deallocated since that period.

A read-only Azure CLI check is:

```bash
az vm get-instance-view \
  --resource-group example-app-rg \
  --name example-worker \
  --query "instanceView.statuses[?starts_with(code, 'PowerState/')].[code,displayStatus]" \
  --output table
```

Set the intended Azure subscription before running the command. The filter looks for the power-state entry rather than assuming a particular array position.

Azure distinguishes Stopped from Deallocated: a stopped, still-allocated VM can continue to incur compute charges. Microsoft documents `get-instance-view` as a way to inspect power state. [Azure VM management and power states](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-manage-vm)

Keep current state separate from historical utilization in the worksheet. “Running now, quiet for the review period” is a stronger candidate description than simply “idle.”

## Turn candidates into reviewed actions

Check the owner, deployment system, scheduled jobs, backup role, attached storage, and dependencies. For a development machine, a shutdown schedule may be appropriate. For a memory-heavy service, a different size could help. For an abandoned machine, retirement can be considered after the owner confirms data retention and recovery requirements.

Use the same cost basis when comparing opportunities. A rightsizing savings estimate is not the complete application bill, and changing a covered VM may interact with reservations or other commitments. Have FinOps review the expected bill impact alongside the workload owner's capacity review.

After implementation, verify workload health, current power state, and later billing data. Record which expenses remain so the next savings report does not assume all attached infrastructure disappeared with the VM.

## Conclusion

Cloudability's idle CPU indicator is an efficient starting point. Confirm complete utilization evidence, current Azure state, and the workload's purpose before turning an idle candidate into an infrastructure change.
