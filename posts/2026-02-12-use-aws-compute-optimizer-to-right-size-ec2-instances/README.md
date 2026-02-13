# How to Use AWS Compute Optimizer to Right-Size EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Compute Optimizer, Cost Optimization, Right-Sizing, Performance

Description: Use AWS Compute Optimizer to analyze EC2 instance utilization and get right-sizing recommendations that reduce costs while maintaining performance.

---

Most EC2 instances are over-provisioned. Engineers pick instance sizes based on worst-case estimates, add a safety buffer, and never revisit the decision. The result is that many organizations are paying for capacity they'll never use. AWS Compute Optimizer analyzes your actual utilization data and tells you exactly which instances could be smaller (or need to be bigger) - with projected cost savings and performance risk scores.

## What Compute Optimizer Does

Compute Optimizer collects CloudWatch metrics for your running instances over the past 14 days (or up to 93 days with enhanced recommendations). It analyzes CPU utilization, memory utilization (if the CloudWatch agent is installed), network throughput, and disk I/O. Then it compares your usage patterns against the specifications of all available instance types and gives you ranked recommendations.

Each recommendation includes:
- The recommended instance type
- Projected performance risk (1-5 scale)
- Estimated monthly savings or additional cost
- Detailed metric comparisons

## Enabling Compute Optimizer

Compute Optimizer needs to be opted in at the account level:

```bash
# Opt in to Compute Optimizer
aws compute-optimizer update-enrollment-status --status Active

# Verify enrollment
aws compute-optimizer get-enrollment-status
```

For organizations, you can enable it across all member accounts:

```bash
# Opt in all accounts in the organization
aws compute-optimizer update-enrollment-status \
  --status Active \
  --include-member-accounts
```

After enabling, it takes about 12 hours to generate initial recommendations (it needs to analyze your CloudWatch data).

## Getting Recommendations

Once data is available, pull recommendations for your instances:

```bash
# Get all EC2 instance recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --query 'instanceRecommendations[*].{
    InstanceId: instanceArn,
    CurrentType: currentInstanceType,
    Finding: finding,
    RecommendedType: recommendationOptions[0].instanceType,
    Risk: recommendationOptions[0].performanceRisk,
    SavingsOpportunity: recommendationOptions[0].savingsOpportunity.estimatedMonthlySavings.value
  }' \
  --output table
```

The `finding` field tells you the overall assessment:
- **UNDER_PROVISIONED**: Instance is too small for its workload
- **OVER_PROVISIONED**: Instance is bigger than needed
- **OPTIMIZED**: Instance is right-sized
- **NOT_OPTIMIZED**: Could benefit from a different instance type or family

## Understanding the Output

Let's look at a typical recommendation in detail:

```bash
# Get detailed recommendations for a specific instance
aws compute-optimizer get-ec2-instance-recommendations \
  --instance-arns "arn:aws:ec2:us-east-1:123456789:instance/i-0abc123" \
  --output json
```

The response includes recommendation options ranked from best to least optimal:

```json
{
  "instanceRecommendations": [
    {
      "instanceArn": "arn:aws:ec2:us-east-1:123456789:instance/i-0abc123",
      "currentInstanceType": "m5.2xlarge",
      "finding": "OVER_PROVISIONED",
      "findingReasonCodes": ["CPUOverprovisioned", "MemoryOverprovisioned"],
      "utilizationMetrics": [
        {"name": "CPU", "statistic": "MAXIMUM", "value": 22.5},
        {"name": "MEMORY", "statistic": "MAXIMUM", "value": 35.0}
      ],
      "recommendationOptions": [
        {
          "instanceType": "m5.large",
          "performanceRisk": 2.0,
          "savingsOpportunity": {
            "estimatedMonthlySavings": {"value": 145.20, "currency": "USD"},
            "savingsOpportunityPercentage": 75.0
          }
        },
        {
          "instanceType": "m5.xlarge",
          "performanceRisk": 1.0,
          "savingsOpportunity": {
            "estimatedMonthlySavings": {"value": 96.80, "currency": "USD"},
            "savingsOpportunityPercentage": 50.0
          }
        }
      ]
    }
  ]
}
```

This instance is using a max of 22.5% CPU and 35% memory. Going from m5.2xlarge to m5.large would save $145/month with a performance risk of 2 (low-moderate). Going to m5.xlarge is more conservative - saves less but has almost no performance risk.

## Enhanced Recommendations

By default, Compute Optimizer analyzes 14 days of data. For more accurate recommendations, enable enhanced infrastructure metrics which looks at 93 days:

```bash
# Enable enhanced infrastructure metrics (requires paid tier)
aws compute-optimizer put-recommendation-preferences \
  --resource-type Ec2Instance \
  --scope '{
    "name": "AccountId",
    "value": "123456789"
  }' \
  --enhanced-infrastructure-metrics Active
```

This costs $0.0003360219 per resource per hour but gives you much better recommendations, especially for workloads with weekly or monthly patterns.

## Exporting Recommendations

For large fleets, export recommendations to S3 for analysis:

```bash
# Export all EC2 recommendations to S3
aws compute-optimizer export-ec2-instance-recommendations \
  --s3-destination-config '{
    "bucket": "my-compute-optimizer-exports",
    "keyPrefix": "ec2-recommendations"
  }' \
  --file-format Csv \
  --include-member-accounts
```

Then analyze the CSV with your preferred tool to prioritize which instances to resize first.

## Prioritizing Right-Sizing Actions

Not all recommendations should be acted on immediately. Here's a prioritization framework:

```bash
# Find the biggest savings opportunities
aws compute-optimizer get-ec2-instance-recommendations \
  --filters '[
    {"name": "Finding", "values": ["OVER_PROVISIONED"]},
    {"name": "RecommendationSourceType", "values": ["Ec2Instance"]}
  ]' \
  --query 'instanceRecommendations | sort_by(@, &recommendationOptions[0].savingsOpportunity.estimatedMonthlySavings.value) | reverse(@) | [0:10].{
    Instance: instanceArn,
    Current: currentInstanceType,
    Recommended: recommendationOptions[0].instanceType,
    MonthlySavings: recommendationOptions[0].savingsOpportunity.estimatedMonthlySavings.value,
    Risk: recommendationOptions[0].performanceRisk
  }' \
  --output table
```

Start with:
1. High savings, low risk (performance risk <= 2)
2. Non-production environments (less impact if something goes wrong)
3. Stateless instances behind a load balancer (easy to change)

## Actually Right-Sizing an Instance

Once you've decided to resize, here's the process:

```bash
# Step 1: Verify the instance isn't in an Auto Scaling group
aws autoscaling describe-auto-scaling-instances \
  --instance-ids i-0abc123

# Step 2: If standalone, stop the instance
aws ec2 stop-instances --instance-ids i-0abc123

# Wait for it to stop
aws ec2 wait instance-stopped --instance-ids i-0abc123

# Step 3: Change the instance type
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123 \
  --instance-type '{"Value": "m5.large"}'

# Step 4: Start the instance
aws ec2 start-instances --instance-ids i-0abc123

# Step 5: Verify it's running with the new type
aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].{
    Type: InstanceType,
    State: State.Name
  }'
```

For instances in an Auto Scaling group, update the launch template instead:

```bash
# Update the launch template with the new instance type
aws ec2 create-launch-template-version \
  --launch-template-id lt-0abc123 \
  --source-version '$Latest' \
  --launch-template-data '{"InstanceType": "m5.large"}'

# Set the new version as default
aws ec2 modify-launch-template \
  --launch-template-id lt-0abc123 \
  --default-version '$Latest'

# Start an instance refresh to roll out the change
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name my-asg \
  --preferences '{
    "MinHealthyPercentage": 90,
    "InstanceWarmup": 300
  }'
```

## Monitoring After Right-Sizing

After changing instance types, watch the metrics closely for a week:

```bash
# Check CPU and memory after right-sizing
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average Maximum \
  --output table
```

If CPU or memory regularly exceeds 80% after resizing, you may have gone too aggressive and should bump up one size.

For comprehensive instance monitoring, make sure you've got the [CloudWatch agent installed](https://oneuptime.com/blog/post/2026-02-12-install-and-configure-the-cloudwatch-agent-on-ec2/view) so you can track memory usage alongside the standard metrics.

## Automating Right-Sizing Reviews

Set up a monthly review process:

```bash
#!/bin/bash
# monthly-rightsizing-report.sh
# Generate a monthly right-sizing report

DATE=$(date +%Y-%m)
BUCKET="my-reports-bucket"

# Export recommendations
JOB_ID=$(aws compute-optimizer export-ec2-instance-recommendations \
  --s3-destination-config "{
    \"bucket\": \"${BUCKET}\",
    \"keyPrefix\": \"rightsizing/${DATE}\"
  }" \
  --file-format Csv \
  --query 'jobId' --output text)

echo "Export job started: $JOB_ID"
echo "Results will be in s3://${BUCKET}/rightsizing/${DATE}/"

# Also get a summary of total potential savings
aws compute-optimizer get-ec2-instance-recommendations \
  --query '{
    TotalInstances: length(instanceRecommendations),
    OverProvisioned: length(instanceRecommendations[?finding==`OVER_PROVISIONED`]),
    UnderProvisioned: length(instanceRecommendations[?finding==`UNDER_PROVISIONED`]),
    Optimized: length(instanceRecommendations[?finding==`OPTIMIZED`])
  }'
```

## Graviton Recommendations

Compute Optimizer also recommends Graviton (ARM) instances when appropriate. These typically offer 20-40% better price-performance than x86 equivalents. If you see recommendations for c7g, m7g, or r7g instances, it's worth investigating.

The catch is that your application needs to support ARM. Most modern applications do, but check for any native binaries or architecture-specific dependencies first.

Right-sizing is the lowest-hanging fruit in cloud cost optimization. Compute Optimizer does the analysis for free (basic tier) and tells you exactly where the money is. All you have to do is act on it. Make it a monthly practice, and you'll consistently trim 20-30% off your EC2 bill without any impact on performance.
