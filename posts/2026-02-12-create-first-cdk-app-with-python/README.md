# How to Create Your First CDK App with Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Python, Infrastructure as Code

Description: Build your first AWS CDK application using Python with step-by-step instructions covering project setup, resource definitions, and deploying to AWS.

---

Python is one of the most popular languages for AWS CDK, especially among teams that already use Python for data engineering, machine learning, or scripting. If TypeScript isn't your thing, Python gives you the same CDK power with familiar syntax and the massive Python ecosystem at your fingertips.

This guide walks you through building a real CDK application in Python - a DynamoDB table with a Lambda API, something you can actually use as a foundation for a real project.

## Prerequisites

You need Python 3.8 or later, pip, and the CDK CLI.

```bash
# Verify Python is installed
python3 --version

# Verify pip is available
pip3 --version

# Install CDK CLI via npm (even for Python CDK, the CLI is a Node.js tool)
npm install -g aws-cdk

# Verify CDK
cdk --version
```

## Creating the Project

CDK has a built-in init command for Python projects.

```bash
# Create a project directory
mkdir dynamo-api && cd dynamo-api

# Initialize a Python CDK app
cdk init app --language python
```

CDK generates the following structure.

```
dynamo-api/
  app.py                     # App entry point
  dynamo_api/
    __init__.py
    dynamo_api_stack.py      # Stack definition
  tests/
    __init__.py
    unit/
      __init__.py
      test_dynamo_api_stack.py
  cdk.json                    # CDK configuration
  requirements.txt            # Python dependencies
  requirements-dev.txt        # Dev dependencies
  source.bat                  # Windows activation script
```

Now activate the virtual environment and install dependencies.

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

## Understanding the Entry Point

Let's look at the generated app.py file.

```python
# app.py
# CDK app entry point - this is where stacks are instantiated
import aws_cdk as cdk
from dynamo_api.dynamo_api_stack import DynamoApiStack

app = cdk.App()

DynamoApiStack(app, "DynamoApiStack",
    env=cdk.Environment(
        account=None,  # Uses CDK_DEFAULT_ACCOUNT
        region=None,   # Uses CDK_DEFAULT_REGION
    ),
)

app.synth()
```

The `app.synth()` call at the end is important - it triggers the synthesis process that converts your Python code into CloudFormation templates.

## Building a DynamoDB API Stack

Let's replace the generated stack with something practical - a DynamoDB table with Lambda functions for CRUD operations and an API Gateway to expose them.

```python
# dynamo_api/dynamo_api_stack.py
# Stack that creates a serverless API backed by DynamoDB
from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_logs as logs,
)
from constructs import Construct


class DynamoApiStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create the DynamoDB table
        table = dynamodb.Table(
            self, "ItemsTable",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING,
            ),
            # Sort key for querying items within a partition
            sort_key=dynamodb.Attribute(
                name="created_at",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            # Enable point-in-time recovery for data safety
            point_in_time_recovery=True,
        )

        # Add a Global Secondary Index for querying by status
        table.add_global_secondary_index(
            index_name="StatusIndex",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="created_at",
                type=dynamodb.AttributeType.STRING,
            ),
        )

        # Create the Lambda function for handling API requests
        api_handler = _lambda.Function(
            self, "ApiHandler",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=_lambda.Code.from_inline(self._get_handler_code()),
            timeout=Duration.seconds(10),
            memory_size=256,
            log_retention=logs.RetentionDays.ONE_WEEK,
            environment={
                "TABLE_NAME": table.table_name,
            },
        )

        # Grant the Lambda full access to the table
        table.grant_read_write_data(api_handler)

        # Create the API Gateway
        api = apigw.RestApi(
            self, "ItemsApi",
            rest_api_name="Items Service",
            description="CRUD API for items",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
            ),
        )

        # Create the /items resource and connect it to Lambda
        items = api.root.add_resource("items")
        items_integration = apigw.LambdaIntegration(api_handler)

        # Wire up HTTP methods
        items.add_method("GET", items_integration)
        items.add_method("POST", items_integration)

        # Create /items/{id} resource for individual items
        single_item = items.add_resource("{id}")
        single_item.add_method("GET", items_integration)
        single_item.add_method("PUT", items_integration)
        single_item.add_method("DELETE", items_integration)

        # Output the API endpoint
        CfnOutput(self, "ApiEndpoint",
            value=api.url,
            description="API Gateway endpoint URL",
        )

        CfnOutput(self, "TableName",
            value=table.table_name,
            description="DynamoDB table name",
        )

    def _get_handler_code(self) -> str:
        """Return the Lambda handler code as a string."""
        return '''
import json
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

def handler(event, context):
    method = event["httpMethod"]
    path = event["path"]

    try:
        if method == "GET" and path == "/items":
            result = table.scan()
            return response(200, result["Items"])

        elif method == "POST" and path == "/items":
            body = json.loads(event["body"])
            body["created_at"] = datetime.utcnow().isoformat()
            table.put_item(Item=body)
            return response(201, body)

        elif method == "GET":
            item_id = event["pathParameters"]["id"]
            result = table.get_item(Key={"id": item_id})
            if "Item" in result:
                return response(200, result["Item"])
            return response(404, {"error": "Not found"})

        elif method == "DELETE":
            item_id = event["pathParameters"]["id"]
            table.delete_item(Key={"id": item_id})
            return response(200, {"message": "Deleted"})

        return response(400, {"error": "Unsupported operation"})

    except Exception as e:
        return response(500, {"error": str(e)})

def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=str),
    }
'''
```

Notice the Python naming conventions. CDK uses `_lambda` because `lambda` is a reserved word in Python. This is one of the small quirks you'll encounter.

## Working with Python-Specific Features

Python's flexibility makes CDK code very readable. You can use list comprehensions, f-strings, and other Pythonic patterns.

```python
# Creating multiple SQS queues using a list comprehension
from aws_cdk import aws_sqs as sqs

queue_configs = [
    {"name": "orders", "retention": 14},
    {"name": "notifications", "retention": 7},
    {"name": "analytics", "retention": 3},
]

queues = [
    sqs.Queue(
        self, f"{config['name'].title()}Queue",
        queue_name=f"app-{config['name']}",
        retention_period=Duration.days(config["retention"]),
    )
    for config in queue_configs
]
```

You can also use Python dataclasses for configuration.

```python
# Using dataclasses for type-safe configuration
from dataclasses import dataclass

@dataclass
class EnvironmentConfig:
    environment: str
    instance_type: str
    min_capacity: int
    max_capacity: int
    enable_monitoring: bool

# Define configurations for each environment
ENVIRONMENTS = {
    "dev": EnvironmentConfig("dev", "t3.small", 1, 2, False),
    "prod": EnvironmentConfig("prod", "r5.large", 3, 10, True),
}
```

## Synthesizing and Deploying

The deployment workflow is the same regardless of language.

```bash
# Make sure your virtual environment is active
source .venv/bin/activate

# Synthesize the CloudFormation template
cdk synth

# Review changes
cdk diff

# Deploy
cdk deploy
```

## Testing Your API

Once deployed, test the API endpoint shown in the output.

```bash
# Create an item
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/items \
  -H "Content-Type: application/json" \
  -d '{"id": "item-001", "name": "Test Item", "status": "active"}'

# List all items
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/items

# Get a specific item
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/items/item-001
```

## Managing Dependencies

Keep your requirements.txt updated as you add new CDK modules.

```
# requirements.txt
aws-cdk-lib==2.170.0
constructs>=10.0.0,<11.0.0
```

In CDK v2, everything is in `aws-cdk-lib`, so you rarely need additional packages. But if you use experimental modules or third-party constructs, add them to requirements.txt.

```bash
# Install a third-party construct library
pip install cdk-nag
pip freeze | grep -E "aws-cdk|constructs|cdk-nag" > requirements.txt
```

## Cleaning Up

```bash
# Destroy the stack when you're done
cdk destroy
```

For the TypeScript version of this tutorial, check out [creating your first CDK app with TypeScript](https://oneuptime.com/blog/post/2026-02-12-create-first-cdk-app-with-typescript/view). To understand the different levels of CDK constructs used in this post, read about [CDK constructs L1, L2, and L3](https://oneuptime.com/blog/post/2026-02-12-understand-cdk-constructs-l1-l2-l3/view).

Python CDK gives you the same power as TypeScript CDK with the added benefit of Python's extensive ecosystem. If your team already thinks in Python, there's no reason to switch languages just for infrastructure code.
