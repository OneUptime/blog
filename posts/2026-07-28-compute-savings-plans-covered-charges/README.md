# Are EC2, Fargate, Lambda, EMR, ECS, and EKS Covered by Compute Savings Plans?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Compute Savings Plans, Amazon EC2, AWS Fargate, AWS Lambda

Description: Map Compute Savings Plans to eligible compute line items without mistaking a service name for blanket coverage of its bill.

---

Compute Savings Plans apply to eligible Amazon EC2 instance usage, AWS Fargate vCPU and memory usage, and AWS Lambda compute usage. They can also discount underlying EC2 instances used by Amazon EMR, Amazon ECS, and Amazon EKS. They do not automatically discount every charge from those services.

Always evaluate the billing line item, not just the product name.

## Coverage at a Glance

| Service or charge | Compute Savings Plans treatment |
| --- | --- |
| EC2 On-Demand instance compute | Eligible, subject to plan application |
| EC2 instance in an EMR cluster | Underlying EC2 usage eligible |
| EC2 instance in an ECS cluster | Underlying EC2 usage eligible |
| EC2 instance in an EKS cluster | Underlying EC2 usage eligible |
| Fargate vCPU and memory for ECS | Eligible |
| Fargate vCPU and memory for EKS | Eligible |
| Lambda execution duration | Eligible discounted component |
| Lambda requests | No discount in AWS's published application example |
| EMR service charge | Not covered as EC2 instance usage |
| ECS management or service-specific fee | Not covered merely because the workload uses ECS |
| EKS cluster charge | Not covered; underlying EC2 or eligible Fargate compute is separate |
| EC2 Spot or Fargate Spot | Not covered by Savings Plans |
| EBS, network transfer, public IPv4, and unrelated add-ons | Not EC2 instance compute coverage |

Eligibility and rates evolve. Confirm current offering rates and CUR line items before sizing a commitment.

## Amazon EC2 Instance Usage

Compute Savings Plans provide broad EC2 flexibility across:

- instance family;
- instance size;
- AWS Region;
- operating system;
- tenancy, including supported Dedicated and Dedicated Host usage.

That means eligible usage can move from one family or Region to another without changing the plan. The commitment still has to be consumed every hour.

Not every charge attached to an instance is its covered compute rate. Separate:

- EBS volume and snapshot charges;
- data transfer;
- public IPv4 addresses;
- Elastic Load Balancing;
- dedicated regional fees;
- software and operating-system fee components where AWS identifies them separately;
- CPU credit and specialized feature surcharges.

AWS explicitly states that the per-Region Dedicated Instance fee is not discounted by Savings Plans. Its recommendation guidance also notes that some license costs are not eligible after certain pricing changes. Use the current AWS price list and detailed billing usage type rather than assuming the full instance-shaped invoice line is discounted.

Savings Plans do not apply to Spot usage or usage already covered by an RI. EC2 RIs apply first.

## AWS Fargate through ECS or EKS

AWS says Fargate is eligible for Compute Savings Plans whether tasks run through Amazon ECS or pods run through Amazon EKS. Current ECS pricing documentation is more precise: Savings Plans apply to Fargate vCPU and memory charges.

Fargate pricing can also include:

- additional ephemeral storage;
- operating-system dimensions;
- public IPv4;
- data transfer;
- CloudWatch and other attached services.

Do not assume those separate charges receive the same benefit. AWS's pricing page specifically names vCPU and memory for Savings Plans application. Inspect the current rate sheet for the exact platform configuration.

Fargate Spot is a separate Spot-priced option for Amazon ECS; it is not available for Amazon EKS and is not a way to consume Savings Plans commitment. An ECS portfolio can use Savings Plans for stable Fargate vCPU and memory while using Fargate Spot for appropriate interruptible demand.

## AWS Lambda

Compute Savings Plans apply to Lambda compute usage. AWS's documented application example separates:

- Lambda duration, measured in GB-seconds, with a discounted Compute Savings Plans rate;
- Lambda requests, with the same rate as On-Demand and a 0% discount in that example.

In that example, request charges remain eligible and can consume commitment after usage with a higher savings percentage, but they generate no savings because the two rates are equal. Treat requests separately from discounted duration when estimating savings.

Lambda bills other dimensions as well, including additional ephemeral storage, response streaming, provisioned concurrency, SnapStart, and event-source features. Do not classify those as covered solely from the broad phrase “Lambda usage.”

Use the Savings Plans rate file or `DescribeSavingsPlanRates` for the active plan and match the CUR usage types. This is especially important as Lambda introduces new compute modes and pricing dimensions.

For Lambda Managed Instances, current Lambda pricing separates EC2 instance charges from Lambda request and management charges. Eligible underlying EC2 pricing options can apply to the EC2 instance component; the management premium and requests are separate charges.

## Amazon EMR

An EMR cluster using EC2 generates at least two conceptual cost layers:

- underlying EC2 instances;
- the EMR service charge and other attached resources.

AWS documents that both Compute and EC2 Instance Savings Plans can apply to the EC2 instances that are part of EMR clusters. AWS Prescriptive Guidance explicitly distinguishes this from the EMR charge itself, which is not covered as Savings Plans compute.

Storage, data transfer, and services such as S3 also retain their own pricing.

If an EMR cluster uses Spot instances, that Spot usage is not covered by Savings Plans. Mixed instance fleets can therefore contain RI-covered, Savings Plans-covered, Spot, and On-Demand portions at the same time.

## Amazon ECS

ECS can run several capacity models:

- self-managed EC2 capacity;
- ECS Managed Instances backed by EC2;
- Fargate;
- Fargate Spot;
- external capacity.

For EC2-backed ECS, the eligible EC2 instance component can receive a Compute Savings Plans rate. ECS Managed Instances pricing explicitly separates the EC2 instance price from its management fee; the EC2 price can use EC2 pricing options, while the management fee remains separate.

For Fargate, eligible vCPU and memory can receive Compute Savings Plans pricing. Fargate Spot uses Spot pricing.

Do not label the full ECS service total “covered.” Break it into capacity and non-capacity line items.

## Amazon EKS

AWS explicitly states that Amazon EKS charges are not covered by Savings Plans, while the underlying EC2 instances can be. EKS on Fargate can receive Compute Savings Plans pricing on eligible Fargate vCPU and memory.

Therefore distinguish:

- EKS cluster fee: not Savings Plans-covered compute;
- EC2 worker node instance usage: eligible when otherwise qualifying;
- Fargate pod vCPU and memory: eligible for Compute Savings Plans;
- storage, networking, observability, and data transfer: separately priced;
- Spot worker nodes: Spot, not Savings Plans.

The orchestrator does not determine coverage; its chosen compute capacity and billing usage types do.

## How AWS Allocates a Limited Commitment

Eligible does not mean every charge receives a discount. AWS:

1. applies matching EC2 RI benefits;
2. applies EC2 Instance Savings Plans before Compute Savings Plans;
3. applies Savings Plans to eligible usage with the highest savings percentage first;
4. uses the lowest Savings Plans rate as a tie-breaker;
5. charges remaining usage On-Demand when commitment is exhausted.

In a consolidated billing family, Savings Plans apply first to the owner account's usage and then to other accounts only when sharing is enabled.

This means an eligible Lambda duration line can remain On-Demand because higher-discount EC2 usage consumed the full commitment first.

## Validate with Billing Data

Before purchase and during investigation:

- obtain current Savings Plans offering rates;
- filter CUR 2.0 for `SavingsPlanCoveredUsage`;
- inspect product, usage type, operation, Region, and account;
- compare covered and negation line items;
- separate service fees and attached resources;
- check RI, Spot, and sharing configuration;
- analyze hourly consumption.

The phrase “Compute Savings Plans cover ECS” is too imprecise for cost modeling. The defensible statement is: they cover qualifying underlying EC2 or Fargate compute dimensions, while ECS, EKS, EMR, and adjacent service charges remain governed by their own pricing.

## Official Documentation

- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Services eligible for Savings Plans benefits](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-services.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Compute Savings Plans pricing](https://aws.amazon.com/savingsplans/compute-pricing/)
- [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [Amazon ECS pricing](https://aws.amazon.com/ecs/pricing/)
- [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/)
- [Optimize spending for Windows on Amazon EC2](https://docs.aws.amazon.com/prescriptive-guidance/latest/optimize-costs-microsoft-workloads/savings-plans.html)
