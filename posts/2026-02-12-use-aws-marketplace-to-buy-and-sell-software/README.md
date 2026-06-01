# How to Use AWS Marketplace to Buy and Sell Software

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Marketplace, SaaS, Software Procurement, ISV, Licensing

Description: Navigate AWS Marketplace as a buyer to discover and purchase software, and as a seller to list and monetize your products through the AWS ecosystem.

---

AWS Marketplace is a digital store with thousands of software products that run on or integrate with AWS. It handles everything from AMIs with pre-installed software to SaaS subscriptions to machine learning models. For buyers, it simplifies procurement by consolidating software spend on your AWS bill. For sellers, it provides access to millions of AWS customers with built-in billing and fulfillment.

Whether you are looking to buy software for your team or sell your own product, understanding how Marketplace works will save you time and potentially a lot of money.

## Marketplace as a Buyer

### Finding and Evaluating Products

The Marketplace catalog includes several product types:

```mermaid
graph TD
    A[AWS Marketplace Products] --> B[AMI-Based]
    A --> C[Container-Based]
    A --> D[SaaS Products]
    A --> E[Data Products]
    A --> F[ML Models]
    A --> G[Professional Services]
    B --> B1[Pre-configured EC2 images]
    C --> C1[ECS/EKS containers]
    D --> D1[Web applications with API integration]
    E --> E1[Datasets on S3/Data Exchange]
    F --> F1[SageMaker compatible models]
```

You can search and filter Marketplace listings from the CLI:

```bash
# Search for products in the Marketplace
aws marketplace-discovery search-listings \
  --search-text "security monitoring" \
  --filters '[
    {
      "filterType": "FULFILLMENT_OPTION_TYPE",
      "filterValues": ["AMAZON_MACHINE_IMAGE"]
    }
  ]'
```

### Subscribing to Products

Different product types have different subscription flows.

**AMI products** are the simplest. You subscribe and then launch EC2 instances with the product's AMI:

```bash
# After subscribing in the Marketplace console, launch the AMI
aws ec2 run-instances \
  --image-id "ami-0123456789abcdef0" \
  --instance-type "m5.xlarge" \
  --key-name "my-key" \
  --security-group-ids "sg-abc123" \
  --subnet-id "subnet-abc123" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=marketplace-product}]'
```

**SaaS products** redirect you to the seller's website for account setup, then bill through AWS. Buyers can review subscriptions and agreements in the AWS Marketplace console or through the AWS Marketplace Agreement API:

```bash
# List agreements where your account is the buyer
aws marketplace-agreement search-agreements \
  --filters '[
    {
      "name": "PartyType",
      "values": ["Acceptor"]
    },
    {
      "name": "AgreementType",
      "values": ["PurchaseAgreement"]
    }
  ]'
```

**Container products** can be deployed to ECS or EKS:

```bash
# Authenticate to ECR and pull a container product image (after subscribing)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/marketplace-product:latest

# Deploy to ECS
aws ecs create-service \
  --cluster "my-cluster" \
  --service-name "marketplace-product" \
  --task-definition "marketplace-product-task" \
  --desired-count 2
```

### Managing Spend with Private Marketplace

For organizations that need to control which products teams can subscribe to, Private Marketplace lets you create a curated catalog:

```bash
# Create a private marketplace experience
aws marketplace-catalog start-change-set \
  --catalog "AWSMarketplace" \
  --change-set '[
    {
      "ChangeType": "CreateExperience",
      "Entity": {
        "Type": "Experience@1.0"
      },
      "Details": "{\"Name\": \"Approved Software Catalog\", \"Description\": \"IT-approved software for our organization\"}"
    }
  ]'
```

Private Marketplace can be associated with your AWS organization, organizational units, or individual accounts. Users in the associated accounts can procure only the products that your IT team has approved.

### Procurement Integration

One of the biggest benefits of Marketplace for enterprise buyers is procurement simplification. All Marketplace charges appear on your AWS bill, which means:

- Fewer separate vendor invoices to manage
- Some Marketplace purchases can count toward an Enterprise Discount Program (EDP) or private pricing commitment, depending on your agreement
- Promotional AWS credits generally do not apply to AWS Marketplace charges, except where the specific credit terms allow it
- Finance gets a single consolidated view of all software spend

## Marketplace as a Seller

If you have built a product that runs on or integrates with AWS, Marketplace gives you distribution and billing infrastructure without building it yourself.

### Registering as a Seller

First, register your AWS account as a Marketplace seller:

```bash
# The registration process is primarily done through the AWS Marketplace
# Management Portal (AMMP). After registration, you can list your draft products via CLI.
aws marketplace-catalog list-entities \
  --catalog "AWSMarketplace" \
  --entity-type "AmiProduct" \
  --entity-type-filters '{
    "AmiProductFilters": {
      "Visibility": {
        "ValueList": ["Draft"]
      }
    }
  }'
```

You will need to provide business details, banking information for payouts, and tax documentation. AWS takes a listing fee from paid sales; standard fees vary by offer type and deployment method, such as 3% for SaaS public offers and 20% for server public offers.

### Listing an AMI Product

To list an AMI product, you need to create a properly configured AMI and submit it for review:

```bash
# Create an AMI from your configured instance
aws ec2 create-image \
  --instance-id "i-abc123" \
  --name "MyProduct-v1.0.0" \
  --description "My awesome product ready for Marketplace" \
  --no-reboot
```

Use the AWS Marketplace Management Portal to run Test 'Add Version' for AMI scanning, then submit the version for review. AWS scans the AMI for security vulnerabilities and compliance with Marketplace policies before approving it.

### Listing a SaaS Product

SaaS products are more involved. You need to integrate with the Marketplace Metering and Entitlement APIs:

```python
# saas_integration.py - Marketplace SaaS integration endpoints
import boto3
from datetime import datetime, timezone

metering = boto3.client('meteringmarketplace')
entitlement = boto3.client('marketplace-entitlement')

def resolve_customer(registration_token):
    """Called when a customer subscribes through Marketplace."""
    response = metering.resolve_customer(
        RegistrationToken=registration_token
    )
    return {
        'customer_id': response['CustomerIdentifier'],
        'product_code': response['ProductCode'],
        'customer_account_id': response['CustomerAWSAccountId'],
        'license_arn': response.get('LicenseArn')
    }

def report_usage(customer_account_id, product_code, dimension, quantity):
    """Report metered usage for a customer."""
    response = metering.batch_meter_usage(
        ProductCode=product_code,
        UsageRecords=[
            {
                'Timestamp': datetime.now(timezone.utc),
                'CustomerAWSAccountId': customer_account_id,
                'Dimension': dimension,
                'Quantity': quantity
            }
        ]
    )
    return response

def check_entitlement(product_code, customer_account_id):
    """Check if a customer has an active entitlement."""
    response = entitlement.get_entitlements(
        ProductCode=product_code,
        Filter={
            'CUSTOMER_AWS_ACCOUNT_ID': [customer_account_id]
        }
    )
    return len(response['Entitlements']) > 0
```

### Pricing Models

Marketplace supports several pricing models:

**Free** - no charge, great for open source projects or freemium models.

**Bring Your Own License (BYOL)** - customers use their existing licenses.

**Hourly/Annual** - fixed rate per hour or year the resource runs.

**Usage-based (metered)** - charge based on consumption (API calls, data processed, etc.).

**Contract** - customers commit to a fixed term with upfront or scheduled payments.

```json
{
  "PricingModel": "Usage",
  "UsageDimensions": [
    {
      "Name": "api_calls",
      "Description": "Number of API calls",
      "Type": "Metered",
      "Unit": "Requests",
      "Rates": {
        "USD": "0.001"
      }
    },
    {
      "Name": "data_processed_gb",
      "Description": "Data processed in GB",
      "Type": "Metered",
      "Unit": "GB",
      "Rates": {
        "USD": "0.10"
      }
    }
  ]
}
```

### Channel Partner Private Offers

If you work with resellers or want to offer special pricing to specific customers, Private Offers let you create custom deals:

```bash
# Create a private offer for a specific customer (done through AMMP)
# The offer includes custom pricing, terms, and EULA
# Customers see the private offer in their Marketplace console
```

Private Offers are also how you handle enterprise negotiated pricing, multi-year deals, and custom payment schedules.

## Cost Management for Marketplace Purchases

Keep track of your Marketplace spending:

```bash
# View Marketplace costs using Cost Explorer
aws ce get-cost-and-usage \
  --time-period '{"Start": "2026-02-01", "End": "2026-02-12"}' \
  --granularity "MONTHLY" \
  --metrics '["UnblendedCost"]' \
  --filter '{
    "Dimensions": {
      "Key": "BILLING_ENTITY",
      "Values": ["AWS Marketplace"]
    }
  }'
```

Set up budgets specifically for Marketplace spending:

```bash
# Create a budget alert for Marketplace spending
aws budgets create-budget \
  --account-id "123456789012" \
  --budget '{
    "BudgetName": "Marketplace-Spend",
    "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
    "BudgetType": "COST",
    "TimeUnit": "MONTHLY",
    "FilterExpression": {
      "Dimensions": {
        "Key": "BILLING_ENTITY",
        "Values": ["AWS Marketplace"]
      }
    },
    "Metrics": ["UnblendedCost"]
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "finance@yourcompany.com"
        }
      ]
    }
  ]'
```

## Wrapping Up

AWS Marketplace streamlines software procurement for buyers and provides distribution infrastructure for sellers. As a buyer, the key benefits are consolidated billing, procurement simplification, and the ability to track Marketplace purchases alongside AWS spend. As a seller, you get access to a massive customer base with built-in billing and fulfillment. Whether you are buying or selling, Marketplace reduces the friction in getting software into production on AWS.
