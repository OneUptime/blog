# How to Use AWS Compute Optimizer for Right-Sizing Recommendations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Compute Optimizer, Right-Sizing, Cost Optimization

Description: Learn how to enable and use AWS Compute Optimizer to get data-driven right-sizing recommendations for EC2, Lambda, EBS, and ECS resources.

---

Guessing the right instance size when you first deploy a workload is expected. Still running that same guess six months later when you have actual utilization data is leaving money on the table. AWS Compute Optimizer analyzes your resource metrics and recommends the optimal configuration - whether that means downsizing an oversized EC2 instance, changing your EBS volume type, or adjusting your Lambda memory allocation.

It's free to use (the enhanced recommendations feature has a small cost), and it works across EC2, Lambda, EBS, ECS, and Auto Scaling groups. Let's set it up and act on what it finds.

## Enabling Compute Optimizer

Compute Optimizer needs to be opted in. You can do this at the account level or across your entire organization.

```bash
# Enable for the current account
aws compute-optimizer update-enrollment-status \
  --status Active

# For organizations, enable from the management account
aws compute-optimizer update-enrollment-status \
  --status Active \
  --include-member-accounts
```

After enabling, Compute Optimizer needs at least 30 hours of metric data to generate its first recommendations. For meaningful recommendations, it works best with 14 days or more of data.

Check the enrollment status.

```bash
aws compute-optimizer get-enrollment-status
```

## Getting EC2 Recommendations

EC2 instances are typically the biggest opportunity for right-sizing. Compute Optimizer analyzes CPU utilization, memory utilization (if the CloudWatch agent is installed), network I/O, and disk I/O.

This script pulls all EC2 right-sizing recommendations.

```python
import boto3

co = boto3.client("compute-optimizer")

def get_ec2_recommendations():
    """Get EC2 instance right-sizing recommendations."""
    response = co.get_ec2_instance_recommendations()

    for rec in response["instanceRecommendations"]:
        instance_id = rec["instanceArn"].split("/")[-1]
        current_type = rec["currentInstanceType"]
        finding = rec["finding"]

        print(f"\nInstance: {instance_id}")
        print(f"  Current type: {current_type}")
        print(f"  Finding: {finding}")

        # Show utilization summary
        for util in rec.get("utilizationMetrics", []):
            print(f"  {util['name']}: {util['value']:.1f}% ({util['statistic']})")

        # Show recommendations (up to 3)
        if rec.get("recommendationOptions"):
            print("  Recommendations:")
            for i, opt in enumerate(rec["recommendationOptions"][:3], 1):
                instance_type = opt["instanceType"]
                rank = opt["rank"]

                # Calculate savings
                for proj in opt.get("projectedUtilizationMetrics", []):
                    if proj["name"] == "CPU":
                        projected_cpu = proj["value"]

                savings = opt.get("savingsOpportunity", {})
                savings_pct = savings.get("savingsOpportunityPercentage", 0)
                monthly = savings.get("estimatedMonthlySavings", {}).get("value", 0)

                print(f"    {rank}. {instance_type} "
                      f"(save {savings_pct:.0f}% / ~${monthly:.2f}/mo)")

get_ec2_recommendations()
```

The findings fall into these categories:

- **OVER_PROVISIONED**: Instance is larger than needed. Downsize it.
- **UNDER_PROVISIONED**: Instance is too small. It might be struggling.
- **OPTIMIZED**: Current configuration is appropriate.
- **NOT_OPTIMIZED**: The instance type family may not be ideal for the workload.

## Getting Lambda Recommendations

Lambda right-sizing is about memory allocation. Too much memory wastes money. Too little increases duration (and may also increase cost since you pay for memory x duration).

```python
import boto3

co = boto3.client("compute-optimizer")

def get_lambda_recommendations():
    """Get Lambda function memory recommendations."""
    response = co.get_lambda_function_recommendations()

    for rec in response["lambdaFunctionRecommendations"]:
        func_name = rec["functionArn"].split(":")[-1]
        finding = rec["finding"]
        current_memory = rec["currentMemorySize"]

        if finding == "Optimized":
            continue

        print(f"\nFunction: {func_name}")
        print(f"  Current memory: {current_memory} MB")
        print(f"  Finding: {finding}")

        for reason in rec.get("findingReasonCodes", []):
            print(f"  Reason: {reason}")

        if rec.get("memorySizeRecommendationOptions"):
            print("  Recommendations:")
            for opt in rec["memorySizeRecommendationOptions"]:
                mem = opt["memorySize"]
                savings = opt.get("savingsOpportunity", {})
                monthly_savings = savings.get("estimatedMonthlySavings", {}).get("value", 0)
                print(f"    {mem} MB (save ~${monthly_savings:.2f}/mo)")

get_lambda_recommendations()
```

## Getting EBS Volume Recommendations

EBS volumes are often provisioned with more IOPS or throughput than needed, or using a more expensive volume type than necessary.

```python
import boto3

co = boto3.client("compute-optimizer")

def get_ebs_recommendations():
    """Get EBS volume recommendations."""
    response = co.get_ebs_volume_recommendations()

    for rec in response["volumeRecommendations"]:
        volume_id = rec["volumeArn"].split("/")[-1]
        finding = rec["finding"]
        current = rec["currentConfiguration"]

        if finding == "Optimized":
            continue

        print(f"\nVolume: {volume_id}")
        print(f"  Current: {current['volumeType']} / "
              f"{current['volumeSize']} GB / "
              f"{current.get('volumeBaselineIOPS', 'N/A')} IOPS")
        print(f"  Finding: {finding}")

        for opt in rec.get("volumeRecommendationOptions", [])[:2]:
            config = opt["configuration"]
            savings = opt.get("savingsOpportunity", {})
            monthly = savings.get("estimatedMonthlySavings", {}).get("value", 0)
            print(f"  Recommended: {config['volumeType']} / "
                  f"{config['volumeSize']} GB / "
                  f"{config.get('volumeBaselineIOPS', 'N/A')} IOPS "
                  f"(save ~${monthly:.2f}/mo)")

get_ebs_recommendations()
```

## Getting ECS Service Recommendations

For containerized workloads on ECS, Compute Optimizer recommends optimal CPU and memory configurations.

```python
import boto3

co = boto3.client("compute-optimizer")

def get_ecs_recommendations():
    """Get ECS service task size recommendations."""
    response = co.get_ecs_service_recommendations()

    for rec in response["ecsServiceRecommendations"]:
        service_arn = rec["serviceArn"]
        service_name = service_arn.split("/")[-1]
        finding = rec["finding"]

        if finding == "Optimized":
            continue

        current = rec["currentServiceConfiguration"]["taskDefinition"]
        print(f"\nECS Service: {service_name}")
        print(f"  Current: CPU {current.get('cpu', 'N/A')} / "
              f"Memory {current.get('memory', 'N/A')}")
        print(f"  Finding: {finding}")

        for opt in rec.get("serviceRecommendationOptions", [])[:2]:
            task = opt.get("projectedUtilizationMetrics", [])
            savings = opt.get("savingsOpportunity", {})
            monthly = savings.get("estimatedMonthlySavings", {}).get("value", 0)
            print(f"  Saving opportunity: ~${monthly:.2f}/mo")

get_ecs_recommendations()
```

## Generating a Full Report

Create a comprehensive right-sizing report across all resource types.

```python
import boto3
import json
from datetime import datetime

co = boto3.client("compute-optimizer")

def generate_full_report():
    """Generate a comprehensive right-sizing report."""
    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_monthly_savings": 0,
            "resources_analyzed": 0,
            "over_provisioned": 0,
            "under_provisioned": 0,
            "optimized": 0
        },
        "recommendations": []
    }

    # EC2 recommendations
    ec2_recs = co.get_ec2_instance_recommendations()
    for rec in ec2_recs["instanceRecommendations"]:
        report["summary"]["resources_analyzed"] += 1
        finding = rec["finding"]

        if finding == "OVER_PROVISIONED":
            report["summary"]["over_provisioned"] += 1
        elif finding == "UNDER_PROVISIONED":
            report["summary"]["under_provisioned"] += 1
        elif finding == "Optimized":
            report["summary"]["optimized"] += 1

        if rec.get("recommendationOptions"):
            top_option = rec["recommendationOptions"][0]
            savings = top_option.get("savingsOpportunity", {})
            monthly = savings.get("estimatedMonthlySavings", {}).get("value", 0)
            report["summary"]["total_monthly_savings"] += monthly

            if finding != "Optimized":
                report["recommendations"].append({
                    "type": "EC2",
                    "resource": rec["instanceArn"].split("/")[-1],
                    "finding": finding,
                    "current": rec["currentInstanceType"],
                    "recommended": top_option["instanceType"],
                    "monthly_savings": monthly
                })

    # Sort by savings potential
    report["recommendations"].sort(
        key=lambda x: x["monthly_savings"], reverse=True
    )

    # Print summary
    s = report["summary"]
    print(f"\nRight-Sizing Report - {report['generated_at']}")
    print(f"{'='*50}")
    print(f"Resources analyzed: {s['resources_analyzed']}")
    print(f"Over-provisioned: {s['over_provisioned']}")
    print(f"Under-provisioned: {s['under_provisioned']}")
    print(f"Optimized: {s['optimized']}")
    print(f"Total potential savings: ${s['total_monthly_savings']:,.2f}/month")
    print(f"\nTop 10 Savings Opportunities:")
    for rec in report["recommendations"][:10]:
        print(f"  {rec['type']} {rec['resource']}: "
              f"{rec['current']} -> {rec['recommended']} "
              f"(${rec['monthly_savings']:,.2f}/mo)")

    return report

generate_full_report()
```

## Enhanced Recommendations

Compute Optimizer offers enhanced recommendations (at a small cost per resource) that use up to 93 days of historical data and consider infrastructure metrics at a 1-minute granularity instead of 5 minutes.

```bash
# Enable enhanced infrastructure metrics
aws compute-optimizer put-recommendation-preferences \
  --resource-type Ec2Instance \
  --scope '{
    "Name": "AccountId",
    "Value": "123456789012"
  }' \
  --enhanced-infrastructure-metrics Active
```

This gives better recommendations for workloads with variable usage patterns.

## Acting on Recommendations

Getting recommendations is the easy part. Acting on them requires a process. For a practical guide on implementing right-sizing changes, see our post on [reducing EC2 costs with right-sizing](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-right-sizing/view). For other cost reduction strategies, check out our guides on [Savings Plans](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-savings-plans/view) and [Spot Instances](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-spot-instances/view).

## Wrapping Up

Compute Optimizer takes the guesswork out of resource sizing. Enable it, wait for data to accumulate, then regularly review recommendations across EC2, Lambda, EBS, and ECS. The biggest savings usually come from oversized EC2 instances - it's common to find instances running at 10-15% CPU utilization that can safely be downsized. Generate reports monthly, prioritize by savings potential, and work through the list methodically. The data is right there, you just have to act on it.
