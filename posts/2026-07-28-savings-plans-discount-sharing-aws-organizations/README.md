# How Does Savings Plans Discount Sharing Work Across AWS Organizations?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, AWS Organizations, Consolidated Billing, Discount Sharing

Description: Explain owner-first Savings Plans application and current organization-wide, prioritized-group, restricted-group, and account-level sharing controls.

---

Savings Plans discounts can be shared among eligible accounts inside one AWS Organizations consolidated billing family. AWS applies a plan to eligible usage in its owner account first. Remaining benefit can then flow according to organization-wide, prioritized-group, or restricted-group sharing settings.

The commitment itself is not transferred. The account that purchased the plan remains the owner and carries the fee, even when another member account receives the discounted usage.

## Sharing Happens inside One Organization

Consolidated billing treats participating account usage together for several pricing benefits. For Savings Plans:

- the plan must be owned by an account in the organization;
- the owner account must be active in RI and Savings Plans sharing preferences;
- a receiving account must also be active for sharing;
- benefit cannot cross into a separate AWS Organization;
- billing transfer does not merge separate Organizations' discount boundaries.

AWS notes that if a Savings Plans owner account leaves the organization, its plans no longer apply to the former organization's consolidated bill. The plan remains tied to its owning account.

## Owner-First Application

Before cross-account sharing, AWS applies eligible benefit to the purchasing account. This is sometimes called account affinity.

Within Savings Plans billing more broadly:

1. matching EC2 RI benefits apply before Savings Plans;
2. EC2 Instance Savings Plans apply before Compute Savings Plans;
3. the Savings Plan owner account is considered before shared accounts;
4. eligible usage with the greatest calculated savings is prioritized;
5. remaining eligible usage after commitments is charged On-Demand.

The owner-first rule means a plan purchased in a workload account can be consumed there even when another account has usage with a higher potential discount. A central account with no eligible workload avoids that first local consumption step.

## Organization-Wide Sharing

With organization-wide sharing:

1. the owner account receives benefit first;
2. remaining benefit is available to other sharing-activated accounts;
3. AWS prioritizes eligible usage under its documented savings calculations.

This mode is designed to maximize overall commitment utilization and discounts. It is appropriate when the organization treats cloud savings as a common pool and can allocate costs internally after billing.

Its governance drawback is that the business unit paying for a plan may not be the only beneficiary. Use CUR 2.0 or AWS Data Exports to identify the accounts whose usage received the benefit.

## Prioritized Group Sharing

Prioritized sharing uses Cost Categories to create account groups. Application is:

1. owner account first;
2. other eligible accounts inside the defined group;
3. if benefit remains, other sharing-activated accounts in the organization.

This gives a business unit, project, or geography priority while retaining an organization-wide outlet for otherwise unused commitment. It can reduce chargeback disputes without deliberately sacrificing all overflow utilization.

It is not a hard isolation boundary. If the group cannot consume the commitment, other eligible organization accounts can still benefit.

## Restricted Group Sharing

Restricted sharing applies:

1. to the owner account first;
2. then exclusively inside the defined group;
3. never outside that group, even when commitment remains unused.

Use it when legal, grant, contractual, geographic, or strict P&L rules are more important than maximizing organization-wide utilization.

The tradeoff is explicit: unused benefit can remain trapped in the group. AWS warns that group-based restricted sharing may lead to underutilized commitments.

## Account-Level Activation Still Matters

The management account can activate or deactivate discount sharing for individual member accounts. Both purchasing and receiving accounts must be active for cross-account sharing.

Deactivation can:

- prevent an account's owned plan from sharing;
- prevent an account's usage from receiving shared benefit;
- change recommendations;
- increase the consolidated bill;
- alter chargeback allocations.

Do not treat the account toggle and group mode as separate independent systems. The activation state is a prerequisite for sharing within the chosen mode.

## Cost Category Group Requirements

AWS documents important constraints:

- each AWS account can belong to only one sharing group;
- the payer or management account cannot be part of a group;
- only the Accounts dimension can define sharing groups;
- Cost Categories must be configured through the Billing console;
- the Uncategorized default value must not overlap a group name;
- an existing Cost Category can be reused only if it satisfies the group-sharing requirements.

These rules mean a tag-based resource split inside one account cannot place fractions of that account into different Savings Plans sharing groups. The unit of membership is the AWS account.

Design the account structure and Cost Category rules together. A business unit spread across shared accounts cannot be isolated cleanly by resource tag alone.

## Sharing Preferences Affect Recommendations

AWS calculates management-account recommendations from usage in accounts that have discount sharing enabled. Member-account recommendations optimize individual accounts.

After changing:

- account activation;
- sharing mode;
- group membership;
- account organization membership,

refresh and re-evaluate recommendations before purchasing. A commitment sized for one eligible pool may be too large when restricted to a smaller pool.

AWS says recommendations are historical, assume immediate purchase, and do not account for queued plans. Maintain a central queue inventory.

## Timing of Preference Changes

AWS currently states that each estimated bill uses the latest preferences, while the final bill for the month uses the preferences set at `23:59:59 UTC` on the month's last day.

That rule makes end-of-month changes financially significant. Use change control:

- record the old and new modes;
- preview the impact;
- validate Cost Category membership;
- obtain finance approval;
- preserve preference history;
- reconcile the finalized bill.

Do not repeatedly toggle sharing as a daily allocation mechanism. Use stable policy and CUR-based internal allocation.

## Billing Conductor and Billing Transfer

AWS says sharing-preference changes affect the standard AWS bill when Billing Conductor is used, including with billing transfer. Each AWS Organization controls its own preferences, and the settings cannot be shared across multiple Organizations.

Billing Conductor can produce pro forma views, but it does not change the fact that the standard AWS computation and Savings Plans sharing boundary remain organization-specific.

## Choose a Mode from Policy

Use:

- **Organization-wide** for maximum pooling and central chargeback.
- **Prioritized group** when teams need first claim but the organization wants overflow utilization.
- **Restricted group** for hard financial or regulatory boundaries.
- **Deactivated account sharing** only when an account must neither give nor receive shared commitment benefit.

Then monitor both utilization and beneficiary allocation. A high organization-wide utilization percentage can hide a restricted group with unused commitment, while an owner account's fee can differ from the effective cost attributed to its usage.

Savings Plans sharing is best understood as controlled discount allocation: ownership stays fixed, owner usage comes first, and the management account defines how far any remaining benefit is allowed to travel.

## Official Documentation

- [Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Customizing AWS Billing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Consolidating billing for AWS Organizations](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html)
- [Control commitments with RI and Savings Plans group sharing](https://aws.amazon.com/blogs/aws-cloud-financial-management/control-your-aws-commitments-with-risp-group-sharing/)
