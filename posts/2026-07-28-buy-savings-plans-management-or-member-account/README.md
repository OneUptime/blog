# Should You Buy Savings Plans in the AWS Management Account or a Member Account?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, AWS Organizations, Multi-Account, FinOps

Description: Choose a Savings Plans purchasing account by balancing organization-wide optimization, account affinity, security, group sharing, and cost accountability.

---

For centralized FinOps, buy Savings Plans centrally, often in a dedicated member account with little or no workload, using management-account recommendations and intentional discount sharing. Buy in a workload member account when that business unit must own the commitment and receive its benefit first.

AWS allows Savings Plans purchases in accounts within an AWS Organizations consolidated billing family. The account that purchases the plan owns the commitment and is responsible for it, even when billing transfer or the management account handles payment. The benefit applies to the owner account's eligible usage first.

## Ownership Changes Allocation

AWS applies a Savings Plan in this order:

1. eligible usage in the account that owns the plan;
2. eligible usage in other allowed accounts under the configured sharing mode;
3. within the allowed pool, usage prioritized by calculated savings under AWS's application rules.

This “owner first” affinity means purchasing-account choice can change which workloads receive benefit. If a workload-heavy member account buys a Compute Savings Plan, its eligible usage consumes the plan before a different account with a potentially larger discount. If a central purchasing account has no workload, the plan can flow into the allowed shared pool immediately.

The fee remains attributed to the purchasing account even when other accounts receive covered usage. That creates an internal allocation requirement in a centralized model.

## Management-Account Recommendations and Member Recommendations Differ

AWS calculates management-account recommendations using eligible usage across sharing-enabled accounts in the organization. This view can combine complementary patterns; for example, one account's daytime workload and another account's night-time batch usage.

Member-account recommendations optimize each account in isolation. Independently adding all member recommendations can produce a different and potentially larger total commitment than the management view because each account loses cross-account diversification.

AWS also warns that Compute and EC2 Instance recommendations use the same usage set and should not be treated as additive. Choose the account scope first, then the plan mix.

## Option 1: Purchase in the Management Account

Advantages include:

- centralized ownership and procurement;
- direct alignment with management-account recommendations;
- one portfolio inventory;
- broad sharing under organization-wide mode;
- fewer engineering teams with purchase permissions.

Potential drawbacks include:

- Savings Plans purchasing access in the sensitive management account;
- internal chargeback is required when member accounts receive benefit;
- owner-first application can consume benefit if the management account itself has eligible workload;
- current group-sharing requirements need careful review because the management account cannot belong to a Cost Category sharing group.

The management account should normally be reserved for organization administration rather than workloads. If it is already tightly protected, granting a FinOps team purchasing permissions there may conflict with security policy.

## Option 2: Use a Dedicated Central Member Account

An AWS-authored Cloud Financial Management article recommends a designated account with minimal or no workloads as a centralized option. This approach:

- avoids granting Savings Plans buyers access to the management account;
- removes most owner-account eligible usage, allowing shared application to begin immediately;
- preserves centralized governance;
- gives the commitment portfolio a clear account boundary.

It still requires:

- discount sharing activated for the owner account and intended beneficiaries;
- a chargeback or showback policy;
- monitoring for the dedicated account leaving the organization;
- intentional Cost Category group membership when group sharing is used.

Because group sharing uses account-based Cost Categories and each account can belong to only one sharing group, place a dedicated purchasing account in the group whose usage should be prioritized or restricted. Validate the exact sharing outcome in the current Billing console before purchase.

## Option 3: Purchase in the Workload Member Account

Advantages include:

- the account's eligible usage receives benefit first;
- ownership and budget accountability are visible in the same account;
- an autonomous business unit controls its own commitment;
- restricted group sharing can keep remaining benefit inside an intended boundary;
- less synthetic chargeback may be needed.

Drawbacks include:

- account-level optimization may miss organization-wide savings;
- teams can double-count usage or buy overlapping plans;
- purchasing permissions are distributed;
- moving the workload to another account does not move plan ownership;
- unused benefit may go elsewhere under open or prioritized sharing;
- a member account leaving the organization takes its owned plan out of the consolidated bill.

Decentralized purchasing works best when business units are financially independent and have mature commitment governance.

## Use Current Sharing Modes Intentionally

AWS Billing supports the following sharing controls. Group sharing is available in all AWS Regions except AWS GovCloud (US) and China Regions:

- **Open (organization-wide) sharing:** owner first, then other sharing-activated accounts.
- **Prioritized group sharing:** owner first, then accounts in its defined group, then the wider eligible organization.
- **Restricted group sharing:** owner first, then only accounts in the defined group; unused benefit does not escape the group.
- **Account-level activation:** the management account can activate or deactivate individual accounts for sharing.

Group sharing uses Cost Categories. AWS documents these constraints:

- each account can belong to only one sharing group;
- the management account cannot belong to a group;
- the grouping Cost Category uses the Accounts dimension;
- both owner and beneficiary accounts must have sharing activated;
- the Savings Plans owner must remain active in sharing preferences.

Restricted sharing improves financial isolation but can reduce utilization. Prioritized sharing preserves an organization-wide outlet after the group is satisfied.

## Centralized, Decentralized, or Hybrid?

| Governance need | Likely model |
| --- | --- |
| Maximize organization-wide utilization | Central account with open (organization-wide) sharing |
| Protect management-account access | Dedicated central member account |
| Keep benefits within a business unit | Member account plus restricted group sharing |
| Give a unit priority but retain overflow | Member account plus prioritized group sharing |
| Independent P&Ls and procurement | Decentralized member purchases |
| Shared core plus specialized commitments | Controlled hybrid |

A hybrid model may centralize general Compute Savings Plans while allowing specialist accounts to buy narrower commitments. It increases the risk of overlapping recommendations and requires one portfolio authority.

## Account for Billing Transfer

AWS says Savings Plans can be purchased only in the AWS Organization where they apply. They cannot be shared across separate Organizations merely because billing is transferred to another account. The purchasing account remains responsible for the purchase even when another account pays its bill.

Treat the Organization boundary, not the payment destination, as the discount-sharing boundary.

## Establish a Purchase Policy

Before enabling purchases:

1. Choose centralized, decentralized, or hybrid ownership.
2. Define the sharing mode and Cost Category groups.
3. Select the recommendation scope that matches the model.
4. Inventory active and queued commitments across all accounts.
5. Create a chargeback policy for shared benefit and unused commitment.
6. Restrict `savingsplans:CreateSavingsPlan` permissions.
7. Test the proposed commitment in Purchase Analyzer.
8. Record who can approve, buy, return, and queue plans.

For most multi-account organizations focused on total savings, centralized ownership in a dedicated no-workload member account offers a strong balance of optimization and security. Use workload-account ownership when owner-first benefit and financial independence are more important than pooling.

## Official Documentation

- [Purchasing Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase.html)
- [Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding AWS Savings Plan recommendations: payer vs linked account views](https://aws.amazon.com/blogs/aws-cloud-financial-management/understanding-aws-savings-plan-recommendations-payer-vs-linked-account-views/)
- [Understanding consolidated bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
