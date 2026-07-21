# Allocating Savings Plan and Reserved Instance Discounts Fairly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Savings Plans, Reserved Instances, Commitment Discounts, Cost Allocation

Description: Allocate commitment costs, consumed discounts, and unused commitments across cloud teams with amortized data and an explicit risk policy.

---

Commitment discounts create two related but different questions: which workload consumed the benefit, and which budget accepted the obligation to pay for the commitment. Treating them as the same question can reward one team while leaving another with unused cost, or hide the financial risk in a central account.

A fair policy separates purchase responsibility, benefit consumption, and unused commitment. It uses amortized cost for workload showback, keeps cash purchases available for invoice reconciliation, and states who owns risk before a commitment is bought.

AWS, Azure, and Google Cloud use different product names and billing records. The allocation framework is portable, but eligibility, scope, sharing, and export fields are provider-specific.

## Keep Cash and Consumption Views Separate

An up-front purchase can create a large billed amount on one date while providing lower rates over a longer term. Assigning that entire purchase to the acquisition month distorts the cost of workloads running in later months.

FOCUS separates several useful metrics:

- `BilledCost` supports the amount charged for invoice reconciliation.
- `EffectiveCost` represents amortized cost after reduced rates, discounts, and the applicable portion of relevant purchases.
- `ListCost` represents cost at provider-published list price when that data is available.
- commitment discount identifiers, types, and status can distinguish used and unused commitment records when the provider supports those constructs.

Use effective or provider-amortized cost as the starting point for consumption showback. Keep billed cost in a parallel finance view. The sum of team allocations, unused commitment, central policy items, and adjustments must reconcile to the authoritative effective-cost scope.

Do not describe `ListCost - EffectiveCost` as cash savings without qualification. List price, contracted price, negotiated discounts, commitment discounts, and billed cash answer different comparisons. Label the baseline used for any savings measure.

## Build a Commitment Ledger

Create a ledger independent from the raw usage table. Each commitment record should include:

| Field | Purpose |
|---|---|
| Provider commitment ID | Joins purchase, benefit, and unused records |
| Product and eligible scope | Explains which usage can consume it |
| Owner and approver | Identifies who accepted the obligation |
| Start, end, and payment model | Supports amortization and forecasting |
| Sharing or attribution settings | Explains benefit distribution |
| Intended workloads | Records the purchase decision |
| Used and unused effective cost | Separates consumption from risk |
| Policy version | Makes allocation reproducible |

The intended owner should be a stable team, product, portfolio, or central procurement group, not the person who clicked Purchase. Record scope changes because a commitment can begin as workload-specific and later be shared more broadly.

## Allocate Used Commitment to the Beneficiary

For general showback, allocate the amortized effective cost of covered usage to the workload that consumed the benefit. This gives engineers the actual cost of running that workload under the organization's current rate strategy.

Also show the benefit separately. A useful team view contains eligible usage, effective cost, comparison baseline, and the portion of commitment consumed. That prevents a low total from being mistaken for an architectural efficiency improvement when the change actually came from a rate discount.

Use provider-produced benefit association where it is available. Avoid rebuilding discount application from public prices because providers apply eligibility, matching, scope, and sharing rules that can be complex. A custom allocation may be needed for an internal policy, but it should start from authoritative billing records.

When several teams consume one shared commitment, allocate used cost at the usage-line level or proportionally within the exact eligible pool. Do not distribute a compute commitment across storage, support, or unrelated services simply because those teams have cloud spend.

## Decide Who Owns Unused Commitment

Unused cost is where "fair" becomes a governance decision. Common policies include:

1. **Purchaser owns risk:** charge unused cost to the team or portfolio that requested the commitment. This aligns forecast quality and purchase risk.
2. **Central portfolio owns risk:** keep unused cost with a FinOps or central procurement budget when that group decides and manages a diversified pool.
3. **Intended workloads own risk:** divide unused cost among the workloads named in the purchase case, even if other workloads received some benefits.
4. **Consumers share risk:** allocate unused cost among actual beneficiaries using their consumed commitment share. This produces a fully loaded rate but can charge teams for a purchasing decision they did not control.
5. **Policy exception:** keep unused cost central after an approved migration, incident, or strategic capacity decision.

Choose the policy before purchase and include it in approval materials. If teams are charged for unused cost, they should have influence over term, scope, quantity, and exit or exchange options where the provider offers them.

Never smear unused cost into covered usage without a separate line. Teams need to see the difference between the effective cost of what they ran and the residual obligation the organization did not consume.

## Choose an Ownership Model That Matches Control

A centralized commitment portfolio can maximize sharing opportunities across variable workloads. It also centralizes forecasting skill and purchase authority. In that model, central ownership of residual risk with benefit-based showback is coherent.

A workload-specific model makes sense when demand is stable, eligibility is narrow, and the product controls the purchase. Charge that product the amortized commitment and its unused portion, while showing any benefits consumed elsewhere if sharing is enabled.

Avoid transferring discounts between teams through an arbitrary internal rate without disclosure. If the organization deliberately uses standard rates, document the markup or discount policy and preserve a reconciliation from internal charges to provider effective cost.

## Account for AWS Behavior

AWS Cost and Usage Reports include dedicated Savings Plans and reservation fields. For covered Savings Plans usage, `savingsPlan/SavingsPlanEffectiveCost` supports the amortized cost associated with usage. Reservation records provide corresponding effective-cost information for discounted usage and unused reservation cost. Use the current Data Exports data dictionary for the selected export because field availability and naming depend on export type.

AWS Organizations management accounts control Reserved Instance and Savings Plans discount sharing. Current AWS documentation describes organization-wide, group-based, and account-level options, with commitment benefits applied according to the configured sharing behavior. Allocation policy should capture those settings for each period rather than assume every linked account is always eligible.

The account that purchased a commitment and the account whose resource consumed its benefit can differ. Join benefit records to resource tags or account ownership after applying the provider's effective cost. Activate relevant cost-allocation tags and retain account mappings so the consumer can be identified.

## Account for Azure Behavior

Azure Cost Management provides Actual Cost and Amortized Cost datasets for savings plans and reservations. Actual Cost contains purchase and application information for invoice-oriented analysis. In Amortized Cost, commitment cost is applied to the resources that receive the benefit, and unused benefit is represented separately. Microsoft specifically describes the amortized view as useful for internal chargeback of savings plan utilization.

Reservation and savings-plan scope determines where benefits can apply. Scope options and matching behavior differ by benefit type and agreement, so capture the configuration rather than inferring it from the purchaser subscription.

Azure Cost Management cost allocation rules do not support purchases, including reservations and savings plans. Use the amortized benefit data for internal allocation rather than expecting a general shared-cost rule to move the purchase automatically.

## Account for Google Cloud Behavior

Google Cloud calls the process for distributing commitment fees and credits across eligible projects attribution. Its documentation describes attribution modes including unattributed, proportional, and prioritized behavior for supported commitments. The chosen mode affects how fees and benefits appear in billing reports and the BigQuery usage-cost export.

Use the export records to assign used commitment to projects and then map projects to internal owners. Keep fees that Google reports as not specific to a project in an explicit unattributed or unused pool until the internal policy assigns them. Confirm product-specific behavior because spend-based and resource-based commitments do not necessarily produce identical records.

## Report Benefit and Risk Together

A commitment report should answer, by owner and provider:

- who approved and owns each commitment;
- which teams consumed its benefit;
- effective cost allocated to covered usage;
- the comparison baseline and calculated benefit;
- unused effective cost and its policy owner;
- changes to scope, sharing, or attribution; and
- corrections or late provider adjustments.

Validate that used and unused components reconcile to the provider's amortized commitment total. Check that every commitment ID has a ledger record, every allocated consumer maps to an active owner, and the rule set matches the configuration effective during that period.

Fair commitment allocation is not simply "give everyone the discount." It gives beneficiaries an accurate workload cost, makes the purchasing obligation visible, and places unused risk with the group that policy says can control it.

## Official Documentation

- [FOCUS Specification 1.4](https://focus.finops.org/focus-specification/v1-4/)
- [FinOps Foundation: Allocation capability](https://www.finops.org/framework/capabilities/allocation/)
- [AWS: Understanding Savings Plans in Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS: Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Azure: View savings plan cost and usage details](https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/utilization-cost-reports)
- [Azure: Understand reservation usage for an Enterprise Agreement](https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/understand-reserved-instance-usage-ea)
- [Google Cloud: Attribution of committed use discount fees and credits](https://cloud.google.com/docs/cuds-attribution)
