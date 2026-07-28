# Do AWS Savings Plans Apply to Spot Instances or On-Demand Capacity Reservations?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, EC2 Spot, Capacity Reservations, Amazon EC2

Description: Distinguish Spot pricing from Savings Plans discounts and combine a Savings Plan with an On-Demand Capacity Reservation when both price and capacity matter.

---

AWS Savings Plans do not apply to EC2 Spot Instance usage. They can apply to matching On-Demand Capacity Reservation charges, including used and eligible unused reserved capacity. A Savings Plan supplies a billing discount; an On-Demand Capacity Reservation supplies capacity assurance in a specific Availability Zone.

These are separate dimensions. Buying a Savings Plan does not reserve capacity, and creating a Capacity Reservation does not by itself provide a discount.

## Spot Uses Its Own Pricing Model

EC2 Spot Instances use spare AWS capacity at a variable Spot price and can be interrupted by EC2. AWS explicitly states that Savings Plans do not apply to Spot usage.

The same principle applies when Spot is consumed through:

- EC2 Auto Scaling;
- Amazon ECS capacity providers;
- Amazon EKS worker nodes;
- Amazon EMR instance fleets.

The orchestrating service does not turn Spot usage into On-Demand usage. It remains outside Savings Plans coverage.

Fargate Spot is likewise a separate Fargate Spot pricing option. Current ECS pricing describes using Savings Plans for baseline Fargate capacity and Spot for suitable burst or flexible workloads; the Spot layer does not consume the Savings Plans commitment.

## Why Combining Spot and Savings Plans Still Makes Sense

A workload portfolio can use:

- Savings Plans for predictable, non-interruptible baseline compute;
- Spot for interruption-tolerant variable demand;
- On-Demand for uncertain or non-interruptible bursts;
- Capacity Reservations for specific capacity assurance.

Moving baseline workloads to Spot reduces the eligible usage available to consume an existing Savings Plan. Perform that migration for sound cost and resilience reasons, but include the resulting utilization change in commitment planning.

Do not size a new plan from total EC2 spend without removing Spot line items.

## What an On-Demand Capacity Reservation Does

An EC2 On-Demand Capacity Reservation reserves capacity for matching instances in a specific Availability Zone. For immediate-use reservations, billing starts when the reservation is provisioned and continues while it remains provisioned.

AWS charges the equivalent On-Demand rate whether the capacity is occupied or not:

- when a matching instance runs in the reservation, the instance is charged and the reservation has no separate duplicate charge;
- when capacity is unused, the unused reservation is charged;
- when partially used, the account pays for running instances and the unused remainder.

This capacity construct does not require a Savings Plan, but an eligible discount can reduce the billing cost.

## How Savings Plans Apply to Capacity Reservations

AWS documents that Savings Plans and matching Regional RI billing discounts apply to On-Demand Capacity Reservations.

Application priority is important:

1. discounts apply preferentially to running instance usage;
2. remaining matching benefit can cover unused Capacity Reservation charges;
3. any usage or unused reservation beyond available benefit remains at On-Demand pricing.

The reservation still preserves capacity even if the Savings Plan commitment is exhausted. The plan still provides no capacity if the reservation does not exist.

For an EC2 Instance Savings Plan, the family and Region scope must match. A Compute Savings Plan has broader family and Region flexibility, but the Capacity Reservation itself remains tied to its configured Availability Zone and attributes.

## A Used Reservation Example

Suppose an account creates a reservation for a matching EC2 instance and runs that instance inside it.

- The Capacity Reservation provides the launch assurance.
- The account is billed for the running EC2 instance.
- A matching Savings Plan can apply its rate to the eligible instance usage.
- There is no extra reservation charge for the occupied slot.

This is the standard combination when a critical workload needs both discounted baseline pricing and assurance that capacity is available.

## An Unused Reservation Example

Suppose the same reservation remains provisioned but no instance occupies it.

- AWS bills the unused reservation at the equivalent On-Demand rate.
- A matching Savings Plan can apply if commitment remains after preferential application to running instances.
- If no matching commitment remains, the unused reservation is billed On-Demand.

An unused reservation covered by a Savings Plan is still an unused infrastructure commitment. The discount reduces price; it does not make idle capacity economically free.

Monitor both:

- Savings Plans utilization and coverage;
- Capacity Reservation utilization.

Optimizing only one can hide waste in the other.

## Shared Capacity Reservations Add an Account Dimension

Capacity Reservations can be shared through AWS Resource Access Manager under supported conditions. By default:

- the owner pays for its own running instances and unused capacity;
- consumers pay for instances they run in shared capacity;
- available-capacity billing can be assigned under AWS's documented rules.

Savings Plans sharing and Capacity Reservation sharing are separate systems. Determine which account receives each charge and whether that account is eligible for the relevant shared Savings Plans benefit.

Do not assume sharing the capacity automatically shares the plan or vice versa.

## Choose the Right Tool by Requirement

| Requirement | Appropriate model |
| --- | --- |
| Lowest-cost interruptible compute | Spot |
| Flexible compute with no term commitment | On-Demand |
| Discount for a durable hourly baseline | Savings Plans |
| Capacity assurance in an Availability Zone | On-Demand Capacity Reservation |
| Capacity assurance plus discounted eligible usage | Capacity Reservation plus Savings Plan or matching Regional RI |

Savings Plans and Spot solve price in different ways. Capacity Reservations solve availability. A resilient architecture can use all three for different workload segments.

## Avoid Common Misunderstandings

Do not assume:

- a Savings Plan reserves EC2 capacity;
- a Capacity Reservation includes a discount;
- Spot usage consumes Savings Plans commitment;
- unused Capacity Reservations are free;
- every Capacity Reservation charge is covered when a plan exists;
- a broad Compute plan changes the Availability Zone scope of a reservation;
- capacity sharing and discount sharing have identical account rules.

Also distinguish On-Demand Capacity Reservations from other capacity products such as EC2 Capacity Blocks, which have their own terms and pricing.

## Validate the Bill

Use detailed billing data to separate:

- running On-Demand instance usage;
- `UnusedBox` or other unused Capacity Reservation usage types;
- Spot usage;
- Savings Plans-covered usage;
- RI-covered usage;
- owner and consumer accounts for shared capacity.

Check the Savings Plans application order: EC2 RIs apply first, EC2 Instance Savings Plans before Compute Savings Plans, and eligible usage is prioritized by savings percentage. This determines whether commitment remains for an unused reservation.

For each critical workload, document:

- capacity requirement;
- interruption tolerance;
- baseline and peak;
- reservation attributes and owner;
- Savings Plan scope and owner;
- discount-sharing and capacity-sharing configuration;
- failover behavior.

The concise answer is: no discount for Spot, but matching discounts can apply to On-Demand Capacity Reservations. Use Spot for flexible capacity, Savings Plans for rate savings, and Capacity Reservations when the workload must be able to launch.

## Official Documentation

- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Capacity Reservation pricing and billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-pricing-billing.html)
- [Reserve compute capacity with On-Demand Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html)
- [Shared Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservation-sharing.html)
- [Amazon EC2 billing and purchasing options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-purchasing-options.html)
