# How to Set Up API Gateway Usage Plans and API Keys

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Serverless

Description: Learn how to create usage plans and API keys in AWS API Gateway to throttle and meter API consumers with different tiers.

---

If you're building an API that multiple clients or partners consume, you need a way to control who gets how much access. API Gateway usage plans let you set rate limits and quotas per consumer, and API keys identify who's making the requests. Think of it as building a basic API management layer without running a separate product like Kong or Apigee.

## How Usage Plans Work

A usage plan ties together three things:
1. **API stages** - which APIs and stages the plan applies to
2. **Throttle settings** - requests per second and burst limits
3. **Quota settings** - total requests allowed per day, week, or month

You then associate API keys with usage plans. Each key inherits the plan's limits. One key might be on a "free" plan with 100 requests per day, while another is on an "enterprise" plan with 10,000 requests per day.

## Step 1: Require API Keys on Your Methods

Before setting up usage plans, you need to tell API Gateway which methods require an API key.

Enable API key requirement on a method:

```bash
# Update a method to require an API key
aws apigateway update-method \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method GET \
  --patch-operations \
    op=replace,path=/apiKeyRequired,value=true

# Deploy the changes
aws apigateway create-deployment \
  --rest-api-id abc123api \
  --stage-name prod
```

In CloudFormation, it's a property on the method:

```yaml
Resources:
  GetItemsMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref MyApi
      ResourceId: !Ref ItemsResource
      HttpMethod: GET
      AuthorizationType: NONE
      ApiKeyRequired: true  # This is the key setting
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${GetItemsFunction.Arn}/invocations"
```

## Step 2: Create API Keys

API keys are unique identifiers for your consumers. They're not meant for authentication (use Cognito or IAM for that) - they're for identification and metering.

Create API keys for different consumers:

```bash
# Create an API key for a partner
aws apigateway create-api-key \
  --name "Partner-Acme-Corp" \
  --description "API key for Acme Corp integration" \
  --enabled

# Create another key for a different consumer
aws apigateway create-api-key \
  --name "Partner-Widget-Inc" \
  --description "API key for Widget Inc" \
  --enabled

# Create a key with a specific value (useful for migration)
aws apigateway create-api-key \
  --name "Legacy-Client" \
  --value "custom-api-key-value-here-min-20-chars" \
  --enabled
```

## Step 3: Create Usage Plans

Now create the plans that define the limits.

Create a free tier and a premium tier:

```bash
# Free tier - 100 requests/day, 10 per second
aws apigateway create-usage-plan \
  --name "Free Tier" \
  --description "Free plan for evaluation" \
  --throttle burstLimit=20,rateLimit=10 \
  --quota limit=100,period=DAY \
  --api-stages apiId=abc123api,stage=prod

# Premium tier - 10000 requests/day, 100 per second
aws apigateway create-usage-plan \
  --name "Premium Tier" \
  --description "Premium plan for production use" \
  --throttle burstLimit=200,rateLimit=100 \
  --quota limit=10000,period=DAY \
  --api-stages apiId=abc123api,stage=prod

# Enterprise tier - 100000 requests/day, 500 per second
aws apigateway create-usage-plan \
  --name "Enterprise Tier" \
  --description "Enterprise plan with high limits" \
  --throttle burstLimit=1000,rateLimit=500 \
  --quota limit=100000,period=DAY \
  --api-stages apiId=abc123api,stage=prod
```

The throttle settings work like a token bucket:
- `rateLimit` is the steady-state rate (requests per second)
- `burstLimit` is the maximum concurrent requests before throttling kicks in

## Step 4: Associate Keys with Plans

Link your API keys to the appropriate usage plans.

Add keys to their plans:

```bash
# Add Acme Corp to the premium tier
aws apigateway create-usage-plan-key \
  --usage-plan-id plan123 \
  --key-id key-acme-456 \
  --key-type API_KEY

# Add Widget Inc to the free tier
aws apigateway create-usage-plan-key \
  --usage-plan-id plan789 \
  --key-id key-widget-012 \
  --key-type API_KEY
```

## Complete CloudFormation Setup

Here's everything together in a CloudFormation template:

```yaml
Resources:
  # The API
  MyApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: my-metered-api

  # Usage Plans
  FreePlan:
    Type: AWS::ApiGateway::UsagePlan
    DependsOn: ProdStage
    Properties:
      UsagePlanName: free-tier
      Description: Free tier - limited access
      Throttle:
        BurstLimit: 20
        RateLimit: 10
      Quota:
        Limit: 100
        Period: DAY
      ApiStages:
        - ApiId: !Ref MyApi
          Stage: prod

  PremiumPlan:
    Type: AWS::ApiGateway::UsagePlan
    DependsOn: ProdStage
    Properties:
      UsagePlanName: premium-tier
      Description: Premium tier - production access
      Throttle:
        BurstLimit: 200
        RateLimit: 100
      Quota:
        Limit: 10000
        Period: DAY
      ApiStages:
        - ApiId: !Ref MyApi
          Stage: prod

  # API Keys
  AcmeKey:
    Type: AWS::ApiGateway::ApiKey
    DependsOn: ProdStage
    Properties:
      Name: acme-corp-key
      Enabled: true
      StageKeys:
        - RestApiId: !Ref MyApi
          StageName: prod

  # Link key to plan
  AcmeKeyPlanAssociation:
    Type: AWS::ApiGateway::UsagePlanKey
    Properties:
      KeyId: !Ref AcmeKey
      KeyType: API_KEY
      UsagePlanId: !Ref PremiumPlan
```

## Per-Method Throttle Overrides

You can set different limits for specific methods within a usage plan. This is useful when some endpoints are more expensive than others.

Override throttle settings for specific API methods:

```bash
# Create a usage plan with per-method throttle overrides
aws apigateway create-usage-plan \
  --name "Custom Plan" \
  --api-stages '[{
    "apiId": "abc123api",
    "stage": "prod",
    "throttle": {
      "/items/GET": {
        "burstLimit": 100,
        "rateLimit": 50
      },
      "/items/POST": {
        "burstLimit": 20,
        "rateLimit": 10
      },
      "/reports/GET": {
        "burstLimit": 5,
        "rateLimit": 2
      }
    }
  }]' \
  --throttle burstLimit=50,rateLimit=25 \
  --quota limit=5000,period=DAY
```

## Checking Usage

Monitor how much of their quota each key has consumed:

```bash
# Check usage for a specific key in a usage plan
aws apigateway get-usage \
  --usage-plan-id plan123 \
  --key-id key-acme-456 \
  --start-date "2026-02-01" \
  --end-date "2026-02-12"
```

The response shows daily usage numbers, so you can track consumption trends.

## Building a Usage Dashboard

You can build a simple dashboard that shows API key usage by querying the API:

```python
import boto3
from datetime import datetime, timedelta

apigw = boto3.client("apigateway")


def get_plan_usage(usage_plan_id, days=7):
    """Get usage data for all keys in a plan."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    # Get all keys in the plan
    keys = apigw.get_usage_plan_keys(usagePlanId=usage_plan_id)

    report = []
    for key in keys["items"]:
        usage = apigw.get_usage(
            usagePlanId=usage_plan_id,
            keyId=key["id"],
            startDate=start_date,
            endDate=end_date,
        )

        total_used = sum(
            day_usage[0] for day_usage in usage["items"].values()
        )

        report.append({
            "key_name": key["name"],
            "key_id": key["id"],
            "total_requests": total_used,
            "daily_breakdown": usage["items"],
        })

    return sorted(report, key=lambda x: x["total_requests"], reverse=True)


# Print usage report
for entry in get_plan_usage("plan123"):
    print(f"{entry['key_name']}: {entry['total_requests']} requests")
```

## Client-Side Usage

Clients pass the API key in the `x-api-key` header:

```bash
# Call the API with an API key
curl -H "x-api-key: your-api-key-here" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/items

# If the key is invalid or missing, you get a 403
# If the quota is exceeded, you get a 429 Too Many Requests
```

You can also configure API Gateway to accept the key as a query parameter, but the header approach is more secure and conventional.

## Handling Rate Limit Responses

When a client exceeds their rate limit, API Gateway returns a 429 status code. Your clients should handle this gracefully with exponential backoff:

```python
import requests
import time


def call_api_with_retry(url, api_key, max_retries=3):
    """Call API with retry logic for rate limiting."""
    headers = {"x-api-key": api_key}

    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)

        if response.status_code == 429:
            # Rate limited - wait and retry
            wait_time = 2 ** attempt  # 1, 2, 4 seconds
            print(f"Rate limited. Retrying in {wait_time}s...")
            time.sleep(wait_time)
            continue

        return response

    raise Exception("Max retries exceeded - still rate limited")
```

For comprehensive monitoring of your API usage patterns and rate limiting effectiveness, check out our post on [API performance monitoring](https://oneuptime.com/blog/post/2026-01-26-restful-api-best-practices/view).

## Wrapping Up

Usage plans and API keys give you a straightforward way to meter and throttle API consumers. They're not a replacement for proper authentication, but they're excellent for controlling access tiers, preventing abuse, and tracking consumption. The setup is declarative - define your tiers, create keys, and associate them. API Gateway handles the enforcement automatically on every request.
