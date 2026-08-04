# Centralize or Pass Through AWS Enterprise Discounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Showback, FinOps, Enterprise Discounts, Cost Allocation, CUR 2.0, Billing Conductor

Description: Choose a transparent policy for negotiated AWS discounts while preserving gross, net, and internal showback amounts and a complete reconciliation.

---

A negotiated AWS discount raises a governance question that billing data cannot answer: should consuming teams receive the benefit, or should a central organization retain it to fund commitments, support, platform work, and commercial risk?

Both approaches can be valid. The failure is to let an implementation detail decide. If one dashboard uses net fields and another uses non-net effective cost, the company has adopted two discount policies without approving either.

This article uses *enterprise discount* as a general internal term for negotiated post-list or post-service pricing. The exact eligibility, calculation, and confidentiality obligations come from the customer's agreement with AWS. Do not infer contract terms from a generic percentage or from public prices.

## Preserve Three Cost Layers

Store three separate amounts for every attributable billing row:

| Layer | Meaning |
| --- | --- |
| `gross_economic_cost` | Non-net effective cost under AWS commitment semantics |
| `net_economic_cost` | Corresponding effective cost after applicable discounts |
| `internal_showback_cost` | Amount produced by the approved company policy |

For ordinary usage, gross and net may come from `line_item_unblended_cost` and `line_item_net_unblended_cost`. For RI-covered usage, use `reservation_effective_cost` and `reservation_net_effective_cost`. For Savings Plan-covered usage, use `savings_plan_savings_plan_effective_cost` and `savings_plan_net_savings_plan_effective_cost`.

The negotiated benefit for a like-for-like scope, after verifying that other discount effects are excluded, is:

```text
enterprise_benefit = gross_economic_cost - net_economic_cost
```

Net fields represent cost after applicable discounts, so do not label the gross-to-net difference as enterprise benefit until other discount effects have been separated. Do not calculate this as public On-Demand cost minus net cost. That larger difference can include RI or Savings Plan benefit, tiering, Spot pricing, or other effects that are not the enterprise discount.

## Understand How Discounts Appear in CUR 2.0

CUR 2.0 has a `discount` map for specific discounts and `discount_total_discount`, which is the sum of the discount columns for a line item. For customers onboarded to the Discount Automation program, enabling `INCLUDE_MANUAL_DISCOUNT_COMPATIBILITY` removes those fields and presents discounts in the older, usually separate-line style.

Net cost columns are also conditional: AWS includes them when an account has an applicable discount in the billing period. Do not assume that the columns are always available or that every row is discounted merely because they are present. A present discount map also does not mean every service or charge is eligible under the same terms.

Record the export configuration with each run. Downstream logic written for one discount representation can fail when expected columns disappear or omit discounts when separate discount lines are excluded.

## Policy 1: Pass the Discount Through

Under pass-through, each team receives its attributable net economic cost:

```text
team_showback = sum(team_net_economic_cost)
```

This works well when showback is intended to represent the organization's attributed net economic cost and teams control the consumption. It also makes product unit economics reflect negotiated pricing.

Advantages include:

- straightforward cost ownership;
- consumers see the benefit of company scale;
- team totals naturally approach the selected net cost control.

Risks include exposing commercially sensitive rates, creating sudden team-rate changes at agreement renewal, and giving high-spend teams more absolute benefit even when central functions negotiated and guaranteed the agreement.

If rates are confidential, report net dollars or indexed rates only to authorized audiences. Access control is part of the design, not a dashboard afterthought.

## Policy 2: Centralize the Discount

Under centralization, teams receive gross economic cost and a central bucket receives the discount as a negative amount:

```text
team_showback = sum(team_gross_economic_cost)

central_discount_pool
  = -sum(gross_economic_cost - net_economic_cost)
```

The company total remains net economic cost:

```text
sum(team_showback) + central_discount_pool = sum(net_economic_cost)
```

This can fund a central commitment portfolio, cloud support, enablement, or contractual risk. It also publishes a stable pre-enterprise-discount signal to teams.

Do not call the negative pool an unallocated residual. Name it, budget it, give it an owner, and show how it is used. Otherwise, centralization becomes an invisible markup even though showback is nominally informational.

## Policy 3: Use a Hybrid

A hybrid can pass through a baseline benefit and centralize the remainder. Examples include:

- publish a fixed internal discount by service for a fiscal year;
- pass through service-specific negotiated pricing but centralize a portfolio-wide credit;
- return benefit up to a team's committed forecast and centralize benefit on burst usage;
- pass through discount to product cost while retaining a management reporting bridge.

The formula must be deterministic:

```text
internal_showback_cost
  = gross_economic_cost - approved_pass_through_benefit
```

with:

```text
0 <= approved_pass_through_benefit <= verified_enterprise_benefit
```

Any exception needs an effective period, approver, recipient, and policy version. Avoid allocating based on revenue unless leadership explicitly wants a commercial cross-subsidy; revenue is not a cloud consumption driver.

## Decide with Explicit Criteria

Document the decision across these dimensions:

- **Purpose:** invoice-equivalent reporting, engineering behavior, product margin, or budget recovery.
- **Control:** who negotiated the discount and who controls eligible consumption.
- **Risk:** who bears minimum-spend, renewal, scope, and forecast risk.
- **Stability:** whether teams need a predictable rate for planning.
- **Confidentiality:** who may see net rates and agreement effects.
- **Fairness:** whether scale benefit should follow consumers or fund shared capabilities.
- **Reconciliation:** where the retained or passed-through difference appears.

AWS consolidated billing may allocate some volume benefits to member accounts based on usage, and AWS commitment sharing has its own billing rules. Those provider mechanics are evidence inputs, not a substitute for the internal decision.

## Treat Billing Conductor as a Separate Price Domain

AWS Billing Conductor can create pro forma billing views with custom pricing and grouping for showback and chargeback. Pro forma rates and credits are not changes to the standard AWS invoice. If Billing Conductor is used, label outputs with their billing view and price domain:

- standard AWS billing cost;
- pro forma Billing Conductor cost;
- internally transformed showback cost.

Never reconcile a pro forma total directly to the standard invoice without the pricing-rule bridge.

## Controls for Discount Allocation

- Compare net and gross only at identical row and cost-component scope.
- Keep RI, Savings Plan, enterprise, bundled, volume, and credit effects distinct.
- Test whether net columns exist before selecting the net model.
- Save the CUR 2.0 discount configuration with the data snapshot.
- Require allocated pass-through benefit plus centralized benefit to equal verified total benefit.
- Route ineligible or ambiguous charges to a visible exception bucket.
- Prevent reports from revealing confidential effective rates to unauthorized recipients.
- Restate historical reports only through a documented correction process.

The policy should survive an agreement renewal. A rate change may alter amounts, but it should not silently change the meaning of the showback.

## Official Documentation

- [AWS Data Exports: CUR 2.0 discount columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-discount.html)
- [AWS Data Exports: CUR 2.0 table configurations](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)
- [AWS Data Exports: Line item and net unblended cost columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html)
- [AWS Data Exports: CUR 2.0 reservation net effective-cost fields](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-reservation.html)
- [AWS Data Exports: Savings Plan net effective-cost fields](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Cost Explorer: Net amortized cost](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html)
- [AWS Billing Conductor: What is AWS Billing Conductor](https://docs.aws.amazon.com/billingconductor/latest/userguide/what-is-billingconductor.html)

## Conclusion

An enterprise discount can be passed to consumers, retained centrally, or divided under a hybrid policy. Preserve gross, net, and internal amounts so any choice remains transparent. AWS billing data measures the benefit under the agreement; leadership and FinOps must decide who receives it, who bears its risk, and how the bridge reconciles.
