# Can You Cancel, Modify, Transfer, or Return an AWS Savings Plan?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Billing, Cost Governance, FinOps

Description: Distinguish immutable active Savings Plans from deletable queued purchases, shared discounts, renewals, and AWS's limited return mechanism.

---

An active AWS Savings Plan generally cannot be canceled, resized, exchanged, sold, or transferred during its term. Its commitment terms cannot be changed after purchase. AWS now provides a limited return path for recent purchase errors, but it is constrained by time, commitment amount, account, quota, state, and seller-of-record rules.

Queued purchases are different: a future-dated Savings Plan can be deleted before its start date. Discount sharing is also different: it lets other accounts benefit from a plan without transferring ownership or the payment obligation.

## What You Can and Cannot Do

| Action | Active Savings Plan | Queued future purchase |
| --- | --- | --- |
| Cancel for convenience | No | Delete before start |
| Change hourly commitment | No | Delete and create a new queued order |
| Change plan type, term, payment option, family, or Region | No | Delete and re-create before start |
| Exchange as with a Convertible RI | No | Not applicable |
| Sell through the RI Marketplace | No | No |
| Transfer ownership to another AWS account | No supported customer operation | No supported transfer operation |
| Share discount benefit in an organization | Yes, under sharing settings | Applies after activation |
| Return after a purchase error | Only if all return conditions are met | Wait for activation or delete while queued |
| Add more commitment | Buy another Savings Plan | Create another purchase |

AWS's published Savings Plans API operations include create, describe, delete queued purchase, return, and tag operations. They do not expose an active-plan modification or ownership-transfer action.

## Active Plans Cannot Be Resized or Reconfigured

AWS states that Savings Plans terms cannot be changed after purchase. For Compute and EC2 Instance Savings Plans, those terms include:

- hourly commitment;
- plan type;
- one-year or three-year term;
- payment option;
- instance family and Region for an EC2 Instance Savings Plan;
- activation and expiration times.

If usage grows, the supported path is to purchase an additional plan. If usage shrinks, the existing financial obligation remains. A renewal is also a new queued purchase at current Savings Plans rates; it is not an extension that edits the active plan.

This immutability makes pre-purchase review important. AWS provides recommendations and Purchase Analyzer, but explicitly says their analyses are historical rather than forecasts.

## The Limited Return Mechanism

AWS documents a return path for a recently purchased active Savings Plan when all core conditions are met:

- hourly commitment is `$100` or less;
- the plan was purchased within the last seven days;
- the return occurs in the same calendar month in UTC;
- the plan is active;
- the applicable return quota has not been reached;
- the request has the required permission;
- the relevant management-account and seller-of-record restrictions are satisfied.

The current quota is a maximum of 10 purchased Savings Plans returned per calendar year per management account. The management account used for the return must be the same one used when the plan was purchased.

AWS also documents a seller-of-record restriction: All Upfront or Partial Upfront Savings Plans registered under AWS Brazil or AWS Turkey are ineligible for this return path.

Only the root user or an IAM principal with `savingsplans:ReturnSavingsPlan` can request the return. The AWS-managed `AWSSavingsPlansFullAccess` policy includes that permission.

## What Happens after a Return

AWS says a successful return provides a 100% refund of upfront charges, reflected in the bill within 24 hours. Usage that had received the returned plan's benefit is recalculated: it is charged at On-Demand rates or covered by another applicable Savings Plan.

Returned plans appear with the `Returned` status. The return cannot be reversed.

This means the refund is not necessarily the complete change to the bill. The organization can also see new On-Demand charges for usage that lost the returned discount. Review the recalculated usage before treating the upfront refund as net savings.

When billing transfer is in use, the account that purchased the plan must request the return even if another account pays its bill.

Do not design governance around the return window. It is an error-correction mechanism, not a general cancellation policy. Its amount and quota limits make it unsuitable as a substitute for approval controls.

## Queued Purchases Are Reversible before Activation

AWS lets a purchase be scheduled up to three years into the future, with a start date specified to the second. Any upfront or recurring fee is charged only when the queued purchase is processed.

A queued purchase can be deleted at any time before its start date. This is the cleanest correction path when a planned renewal or future purchase is no longer appropriate.

Use future dating carefully:

- the purchase is processed and validated at its start time;
- it must complete within the same calendar month as the start date;
- a failed payment can leave it without providing discounts;
- recommendations do not account for queued purchases.

Maintain a separate queue register so a second buyer does not purchase a duplicate commitment while an order is waiting to activate.

## Sharing Is Not Transfer

Savings Plans can be purchased in a management account or member account. With AWS Organizations discount sharing enabled, benefit can apply beyond the purchasing account according to open, prioritized-group, or restricted-group sharing settings.

AWS first applies a plan to the owner account's eligible usage and then shares remaining benefit where allowed. The purchasing account remains responsible for the plan fee. Other accounts receiving a discount do not become co-owners.

This distinction matters when:

- a business unit moves to another account;
- an account is scheduled to leave the organization;
- central FinOps wants to reassign the financial obligation;
- chargeback needs to follow benefit rather than ownership.

Sharing or internal chargeback can redistribute benefit or internal cost, but neither changes the AWS contract owner.

## Renewal and Replacement

The console can use an active plan as a reference to queue a replacement beginning one second after expiration. AWS calls this renewal, but the replacement uses current rates and creates a new commitment.

Before submitting it:

- re-evaluate usage and architecture;
- choose the current plan type and payment option intentionally;
- check whether commitment should change;
- inspect other scheduled purchases;
- confirm the exact start date.

Because a queued replacement can be deleted before it starts, use the review period to catch mistakes. Once active, normal immutability and return restrictions apply.

## Put Controls before the Buy Button

Require a decision record containing:

- recommendation and Purchase Analyzer exports;
- current RI and Savings Plans inventory;
- queued purchases;
- hourly utilization scenarios;
- planned migrations and retirements;
- selected account and sharing mode;
- plan type, term, payment option, and commitment;
- independent approver.

Limit `savingsplans:CreateSavingsPlan`, `savingsplans:DeleteQueuedSavingsPlan`, and `savingsplans:ReturnSavingsPlan` to appropriate roles. A plan can be easy to purchase in the console but creates a long-lived obligation.

The operational summary is simple: delete a queued mistake before activation; use AWS's limited return path immediately for an eligible recent mistake; otherwise, an active plan remains in force and its terms stay fixed until expiration.

## Official Documentation

- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Returning a purchased Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html)
- [Savings Plans quotas and restrictions](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-quotas.html)
- [Queuing a Savings Plan purchase](https://docs.aws.amazon.com/savingsplans/latest/userguide/queued-sp-cart.html)
- [Deleting a queued Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-queued-delete.html)
- [Savings Plans API operations](https://docs.aws.amazon.com/savingsplans/latest/APIReference/API_Operations.html)
- [IAM actions, resources, and condition keys for AWS Savings Plans](https://docs.aws.amazon.com/service-authorization/latest/reference/list_savingsplans.html)
