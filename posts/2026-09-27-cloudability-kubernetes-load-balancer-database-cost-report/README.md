# How to Combine Kubernetes and Off-Cluster Costs in Cloudability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Kubernetes, Cost Reporting, Cost Allocation

Description: Build a Cloudability application cost report that combines Kubernetes allocation with off-cluster databases and load balancers without dropping or double counting charges.

An application's Kubernetes cost is only part of its infrastructure bill. It may also use a managed database, an external load balancer, object storage, and shared platform services. A namespace-only report cannot reliably show that complete picture.

Cloudability supports reporting container costs alongside other cloud costs. The practical task is to establish a common application identity and select measures that remain meaningful for both kinds of infrastructure.

## Define the application boundary first

Consider Checkout running in a namespace named `commerce-prod`. It also uses a dedicated database and a load balancer billed outside the cluster. A defensible report should contain those three components once each.

Create an ownership worksheet before editing mappings:

| Component | Available ownership evidence | Intended application |
| --- | --- | --- |
| Checkout pods | Kubernetes application label | Checkout |
| Managed database | Resource tag or dedicated resource rule | Checkout |
| Load balancer | Resource tag or reviewed ownership rule | Checkout |
| Shared observability | Shared platform bucket | Separate allocation policy |

Do not infer database ownership from a similar-looking name without checking with the service owner. Naming conventions are useful evidence but can outlive the service that originally created a resource.

## Map equivalent identifiers into one reporting concept

IBM documents combining container and off-cluster costs through Kubernetes labels and Business Mappings. Container labels become available for reporting through label mappings after cluster provisioning. [Container Cost Allocation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=insights-container-cost-allocation)

Use an Application dimension that means the same thing across pods, databases, and networking. Where spelling differs, normalize the output through reviewed Business Mapping rules rather than requiring every reporting user to remember aliases.

For example, `checkout`, `checkout-api`, and `commerce-checkout` might all represent Checkout. But `commerce-prod` could contain other applications, so treating that namespace as synonymous with Checkout could transfer unrelated expense.

Business Mapping statements are ordered and stop at the first matching condition. Put narrow resource exceptions ahead of broader account fallbacks. [IBM Business Mapping behavior](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=spend-business-mapping)

Review conflicting evidence explicitly: a database tag claiming Search should not silently become Checkout because both live in the same account.

## Select a metric that includes off-cluster spend

Start with a general cost metric and group by Application and Service Name. Add Cluster Name or Namespace only as a diagnostic dimension. Retain rows where those container dimensions are not set, because that is where legitimate databases and load balancers can appear.

The dedicated Containers measures return zero for non-container costs. They are useful for utilized/idle analysis but cannot, alone, represent the entire application bill. [Container metric scope](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=insights-container-cost-allocation)

A common mistake is filtering Cluster Name to the production cluster while expecting the external database to survive. That filter answers “cost attributed to this cluster,” not “all infrastructure used by Checkout.” Filter on the verified application identity for the combined report.

## Keep idle allocation visible

For a simplified example period, suppose the report contains:

| Component | Amount |
| --- | ---: |
| Checkout's utilized Kubernetes allocation | $900 |
| Checkout's assigned Kubernetes idle portion | $300 |
| Dedicated database | $500 |
| Dedicated load balancer | $100 |

The application total is $1,800 when all four amounts are included exactly once. Its container fairshare is $1,200. Adding that $1,200 to another measure that already contains the same node charges would double count infrastructure.

Use one reconciled combined-cost report and a companion utilized/idle breakdown. Before combining exported measures, write down whether each amount replaces or supplements another. A table column's descriptive name is not enough to prove that two metrics are additive.

If ordinary namespace reporting leaves idle in a separate bucket, do not relabel the subtotal as the application's fully loaded cost. State the allocation policy and reconcile the idle component separately.

## Test with deliberately different cases

Validate a dedicated database, a shared database, an untagged load balancer, and a namespace containing more than one application. Each case exercises a different ownership assumption.

A shared database needs its own allocation driver, such as a reviewed fixed split or supported usage-based rule. A Business Mapping that assigns one owner does not measure several applications' relative consumption. Keep direct ownership and cost sharing as separate policy decisions.

Compare before-and-after totals over the same completed dates, currency, View, and cost basis. Regrouping a complete dataset should not make the bill vanish. If the total changes, inspect filters and processing freshness before rewriting ownership rules.

Finally, have one application owner trace a database charge and one container charge from the report back to the ownership evidence. That practical review often reveals mistakes an aggregate check misses.

## Conclusion

A complete application report depends on a shared ownership dimension and compatible cost measures. Preserve off-cluster rows, explain idle allocation, and ensure every underlying charge appears once before using the result for showback or chargeback.
