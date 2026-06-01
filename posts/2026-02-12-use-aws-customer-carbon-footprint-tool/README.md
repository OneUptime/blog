# How to Use AWS Customer Carbon Footprint Tool

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Sustainability, Carbon Footprint, Green Computing, Cloud Optimization, ESG

Description: Learn how to use the AWS Customer Carbon Footprint Tool to measure, track, and reduce the carbon emissions associated with your AWS workloads.

---

Every workload you run on AWS has a carbon footprint. The servers consume electricity, the cooling systems run around the clock, and the electricity itself may come from fossil fuels depending on the region. For organizations with sustainability goals or ESG reporting requirements, understanding this footprint is not optional anymore.

AWS provides the Customer Carbon Footprint Tool to give you visibility into the carbon emissions associated with your AWS usage. It is free, built into the console, and requires zero setup. AWS has announced that the Customer Carbon Footprint Tool will be deprecated on June 30, 2026 in favor of the AWS Sustainability service, but the same core concepts apply. Using it effectively takes some understanding of what the numbers mean and how to act on them.

## What the Tool Actually Measures

The AWS Customer Carbon Footprint Tool estimates your greenhouse gas emissions from AWS usage based on three factors:

1. **Your resource consumption** - The compute, storage, networking, and other services you use
2. **The energy and infrastructure allocated to those resources** - Estimated through AWS's carbon allocation methodology
3. **The emissions calculation method** - Location-based and market-based methods account for regional grids and AWS carbon-free energy purchases

The tool reports emissions in metric tons of carbon dioxide equivalent (MTCO2e), covering Scope 1, Scope 2, and Scope 3 emissions related to your AWS usage.

```mermaid
graph TD
    A[Your AWS Usage] --> B[Resource Consumption Data]
    B --> C[Energy Estimation Model]
    C --> D[Location-Based Calculation]
    C --> E[Market-Based Calculation]
    F[AWS Carbon-Free Energy Purchases] --> E
    D --> G[LBM Emissions - MTCO2e]
    E --> H[MBM Emissions - MTCO2e]
```

## Accessing the Tool

The Carbon Footprint Tool is available in the AWS Billing Console:

1. Sign in to the AWS Management Console
2. Navigate to **Billing and Cost Management**
3. Click **Carbon Footprint** in the left navigation
4. The dashboard loads with your emissions data

You need the `sustainability:GetCarbonFootprintSummary` permission to access the Customer Carbon Footprint Tool data. If you are using AWS Organizations, the management account can see the aggregate footprint across all member accounts. For the newer AWS Sustainability APIs, grant the `sustainability:GetEstimatedCarbonEmissions` and `sustainability:GetEstimatedCarbonEmissionsDimensionValues` permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sustainability:GetCarbonFootprintSummary",
        "sustainability:GetEstimatedCarbonEmissions",
        "sustainability:GetEstimatedCarbonEmissionsDimensionValues"
      ],
      "Resource": "*"
    }
  ]
}
```

## Understanding the Dashboard

The dashboard shows several key visualizations:

### Emissions Over Time

A bar chart showing your monthly emissions in MTCO2e. This is your primary trend indicator. You want this trend going down over time, or at least staying flat as your usage grows.

### Emissions by Service

A breakdown showing which AWS services contribute most to your footprint. In the Customer Carbon Footprint Tool, the service view highlights Amazon EC2, Amazon S3, and Amazon CloudFront, with other products grouped under Other. In the newer AWS Sustainability APIs and Data Exports, you can also group emissions data by service.

### Emissions by Region

This is one of the most actionable views. Different regions have vastly different carbon intensities based on their local electricity grid. A workload running in a region powered primarily by renewable energy will have a fraction of the footprint compared to one running on coal-heavy grids.

### Avoided Emissions

AWS reports emissions using location-based and market-based methods. The emissions savings figure is the difference between the location-based emissions calculation and the market-based calculation, which accounts for AWS carbon-free energy purchases.

## Exporting and Automating Reports

For ESG reporting, you need to get the data out of the console. The tool supports CSV export:

1. Click the **Download CSV** button on the dashboard
2. Save the exported file for your reporting workflow

For automated reporting, use the AWS SDK:

```python
# Retrieve carbon footprint data programmatically

import boto3
from datetime import datetime, timezone

sustainability = boto3.client('sustainability')

response = sustainability.get_estimated_carbon_emissions(
    TimePeriod={
        'Start': datetime(2025, 1, 1, tzinfo=timezone.utc),
        'End': datetime(2026, 1, 1, tzinfo=timezone.utc)
    },
    EmissionsTypes=[
        'TOTAL_LBM_CARBON_EMISSIONS',
        'TOTAL_MBM_CARBON_EMISSIONS'
    ],
    Granularity='YEARLY_CALENDAR'
)

for result in response['Results']:
    values = result['EmissionsValues']
    lbm = values['TOTAL_LBM_CARBON_EMISSIONS']
    mbm = values['TOTAL_MBM_CARBON_EMISSIONS']
    print(f"Location-based emissions: {lbm['Value']} {lbm['Unit']}")
    print(f"Market-based emissions: {mbm['Value']} {mbm['Unit']}")
```

For detailed reporting, create a Data Export for the `CARBON_EMISSIONS` table:

```bash
# Create a carbon emissions Data Export
aws bcm-data-exports create-export \
  --export '{
    "Name": "carbon-emissions",
    "Description": "Monthly carbon emissions export",
    "DataQuery": {
      "QueryStatement": "SELECT * FROM CARBON_EMISSIONS"
    },
    "DestinationConfigurations": {
      "S3Destination": {
        "S3Bucket": "my-carbon-reports-bucket",
        "S3BucketOwner": "123456789012",
        "S3Prefix": "sustainability",
        "S3Region": "us-east-1",
        "S3OutputConfigurations": {
          "OutputType": "CUSTOM",
          "Format": "TEXT_OR_CSV",
          "Compression": "GZIP",
          "Overwrite": "OVERWRITE_REPORT"
        }
      }
    },
    "RefreshCadence": {
      "Frequency": "SYNCHRONOUS"
    }
  }'
```

## Interpreting Your Numbers

Raw MTCO2e numbers are hard to contextualize. Here are some reference points:

- 1 MTCO2e is roughly equivalent to driving a passenger car 2,500 miles
- A typical US household produces about 8 MTCO2e per year from electricity
- A small AWS workload (a few EC2 instances, some S3) might produce 1-5 MTCO2e per year
- Enterprise workloads with hundreds of instances can produce 100+ MTCO2e per year

The important thing is not the absolute number but the trend and the ratio of emissions to business value delivered.

## Taking Action: Reducing Your AWS Carbon Footprint

Once you understand your footprint, here are concrete steps to reduce it:

### 1. Right-Size Your Instances

Oversized instances waste energy. Use AWS Compute Optimizer to find instances that are larger than needed:

```bash
# Get right-sizing recommendations from Compute Optimizer
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=Overprovisioned \
  --query 'instanceRecommendations[*].{Instance:instanceArn,Current:currentInstanceType,Recommended:recommendationOptions[0].instanceType}'
```

### 2. Use Graviton Instances

AWS Graviton processors deliver better performance per watt than x86 alternatives. Switching to Graviton can reduce energy consumption by up to 60% for the same workload. See our detailed guide on [using Graviton instances to reduce energy consumption](https://oneuptime.com/blog/post/2026-02-12-use-graviton-instances-to-reduce-energy-consumption/view).

### 3. Choose Low-Carbon Regions

Move workloads that do not have strict latency requirements to regions with cleaner energy grids. We cover this in depth in our post on [choosing AWS regions for lower carbon footprint](https://oneuptime.com/blog/post/2026-02-12-choose-aws-regions-for-lower-carbon-footprint/view).

### 4. Shut Down Idle Resources

Development and staging environments that run 24/7 when they are only used during business hours waste energy. Use AWS Instance Scheduler or simple Lambda functions to stop them off-hours:

```python
# Lambda function to stop dev instances outside business hours
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')

    # Find running dev instances
    response = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Environment', 'Values': ['dev', 'staging']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )

    instance_ids = []
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])

    if instance_ids:
        ec2.stop_instances(InstanceIds=instance_ids)
        print(f"Stopped {len(instance_ids)} dev/staging instances")
```

### 5. Use Spot and Serverless

Spot instances use spare EC2 capacity, which can improve utilization of existing AWS infrastructure. Serverless services like Lambda only allocate compute to your function while it is processing requests, so you do not keep dedicated compute running during idle periods.

### 6. Optimize Storage

Move infrequently accessed data to S3 Glacier or S3 Glacier Deep Archive. These storage classes are designed for archive access patterns and help you avoid keeping data in higher-performance storage classes when you do not need frequent access.

```bash
# Create an S3 lifecycle rule to move old data to Glacier
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-data-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "MoveToGlacier",
        "Status": "Enabled",
        "Filter": {"Prefix": "archive/"},
        "Transitions": [
          {
            "Days": 90,
            "StorageClass": "GLACIER"
          },
          {
            "Days": 365,
            "StorageClass": "DEEP_ARCHIVE"
          }
        ]
      }
    ]
  }'
```

## Setting Up Carbon Footprint Alerts

You can create custom CloudWatch alarms based on carbon footprint trends. While there is no direct CloudWatch metric for carbon, you can build a pipeline:

1. Export the `CARBON_EMISSIONS` table to S3 with AWS Data Exports
2. Process it with a Lambda function on a schedule
3. Publish a custom CloudWatch metric
4. Alert when emissions exceed a threshold

For broader monitoring of both your sustainability metrics and operational health, [OneUptime](https://oneuptime.com) provides unified dashboards that can track custom metrics alongside your standard infrastructure monitoring.

## Reporting for ESG Compliance

Many organizations need to include cloud carbon emissions in their ESG reports. The Carbon Footprint Tool provides data suitable for:

- **GHG Protocol** - The emissions use Scope 1, Scope 2, and Scope 3 categories attributed to your AWS usage
- **CDP (Carbon Disclosure Project)** - Use the exported CSV data for your annual disclosure
- **Science Based Targets initiative (SBTi)** - Track progress toward reduction targets

When preparing reports, always note:
- New data is usually published between the 15th and 21st of the month after the usage occurs
- Historical data is available back to January 2022 in the AWS Sustainability service, while the Customer Carbon Footprint Tool console shows the previous 38 months
- Numbers are estimates based on AWS's models, not direct measurements

## Wrapping Up

The AWS Customer Carbon Footprint Tool is your starting point for understanding and reducing the environmental impact of your cloud workloads. It is free, requires no setup, and provides the data you need for both operational optimization and ESG reporting.

The key actions are: access the tool regularly, export data for trend analysis, right-size your instances, choose low-carbon regions where possible, and shut down what you are not using. For a deeper dive into optimizing your AWS workloads for sustainability, check out our guide on [optimizing AWS workloads for sustainability](https://oneuptime.com/blog/post/2026-02-12-optimize-aws-workloads-for-sustainability/view).

Small changes across many workloads add up. And in most cases, reducing your carbon footprint also reduces your AWS bill - sustainability and cost optimization go hand in hand.
