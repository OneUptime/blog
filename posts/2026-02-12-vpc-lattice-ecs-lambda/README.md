# How to Use VPC Lattice with ECS and Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC Lattice, ECS, Lambda, Serverless

Description: Step-by-step guide to connecting ECS services and Lambda functions through VPC Lattice for seamless service-to-service communication across compute types.

---

One of the best things about VPC Lattice is that it doesn't care what your services run on. You can have an ECS Fargate service talking to a Lambda function, which in turn calls an EC2-based service - all through the same service network with consistent authentication and traffic management. No more managing separate load balancers and API gateways for each compute type.

Let's walk through setting up VPC Lattice with both ECS and Lambda, including the target group configurations, IAM setup, and some real-world patterns.

## Architecture Overview

Here's what we're building. An ECS service handles incoming API requests and communicates with a Lambda-based processing service through VPC Lattice:

```mermaid
graph LR
    Client[API Client] --> ALB[ALB]
    ALB --> ECS[ECS Order Service]
    ECS -->|VPC Lattice| Lambda[Lambda Processor]
    Lambda -->|VPC Lattice| ECS2[ECS Inventory Service]
```

Both the ECS services and the Lambda function are fronted by VPC Lattice services, so any of them can call any other through the service network.

## Setting Up ECS as a VPC Lattice Target

For ECS services, you create an IP-type target group. ECS tasks get dynamic IP addresses, so Lattice needs to track those IPs as tasks come and go.

Create an IP target group for ECS:

```bash
# Create the target group

aws vpc-lattice create-target-group \
  --name "order-service-ecs" \
  --type IP \
  --config '{
    "port": 8080,
    "protocol": "HTTP",
    "protocolVersion": "HTTP1",
    "vpcIdentifier": "vpc-0abc1234",
    "ipAddressType": "IPV4",
    "healthCheck": {
      "enabled": true,
      "protocol": "HTTP",
      "path": "/health",
      "port": 8080,
      "healthyThresholdCount": 2,
      "unhealthyThresholdCount": 3,
      "matcher": {
        "httpCode": "200"
      }
    }
  }'
```

Now attach the target group to the ECS service. ECS automatically registers and deregisters the service's tasks with the VPC Lattice target group as tasks start and stop.

Create an ECS service with a VPC Lattice configuration:

```json
{
  "serviceName": "order-service",
  "taskDefinition": "order-task-def",
  "vpcLatticeConfigurations": [
    {
      "targetGroupArn": "arn:aws:vpc-lattice:us-east-1:123456789012:targetgroup/tg-0abc123def4567890",
      "portName": "order-http",
      "roleArn": "arn:aws:iam::123456789012:role/ecsInfrastructureRoleVpcLattice"
    }
  ],
  "desiredCount": 3,
  "role": "ecsServiceRole"
}
```

Then create the service:

```bash
aws ecs create-service \
  --cluster production \
  --cli-input-json file://ecs-service-vpc-lattice.json
```

Make sure the ECS task security group allows inbound traffic from the VPC Lattice managed prefix list, or task and health check traffic can fail.

## Setting Up Lambda as a VPC Lattice Target

Lambda integration is much simpler. VPC Lattice natively supports Lambda target groups, so there's no need for the registration dance.

Create a Lambda target group:

```bash
# Create a Lambda target group
aws vpc-lattice create-target-group \
  --name "processor-lambda" \
  --type LAMBDA \
  --config '{
    "lambdaEventStructureVersion": "V2"
  }'

# Register the Lambda function as a target
aws vpc-lattice register-targets \
  --target-group-identifier tg-0fedcba9876543210 \
  --targets id=arn:aws:lambda:us-east-1:123456789012:function:order-processor
```

That's it. VPC Lattice will invoke the Lambda function directly when traffic is routed to this target group. The Lambda function receives the request as a standard event.

Lambda function that receives VPC Lattice requests:

```python
import json
from urllib.parse import urlsplit

def handler(event, context):
    """
    VPC Lattice sends HTTP request details in the event.
    The event structure is similar to ALB integration.
    """
    # Extract request details
    method = event.get('method', 'GET')
    path = urlsplit(event.get('path', '/')).path
    headers = event.get('headers', {})
    body = event.get('body', '')
    query_params = event.get('queryStringParameters', {})

    # Your business logic here
    if path == '/process' and method == 'POST':
        order_data = json.loads(body)
        result = process_order(order_data)

        return {
            'isBase64Encoded': False,
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'status': 'processed',
                'orderId': result['id']
            })
        }

    return {
        'isBase64Encoded': False,
        'statusCode': 404,
        'body': json.dumps({'error': 'Not found'})
    }


def process_order(data):
    # Processing logic
    return {'id': data.get('orderId', 'unknown')}
```

## Creating Lattice Services for Both

Now create VPC Lattice services that front both your ECS and Lambda target groups.

Create services and listeners:

```bash
# Create the ECS-backed service
aws vpc-lattice create-service \
  --name "order-service" \
  --auth-type AWS_IAM

aws vpc-lattice create-listener \
  --service-identifier svc-0abc123def4567890 \
  --name "http" \
  --protocol HTTP \
  --port 80 \
  --default-action '{
    "forward": {
      "targetGroups": [
        {"targetGroupIdentifier": "tg-0abc123def4567890", "weight": 100}
      ]
    }
  }'

# Create the Lambda-backed service
aws vpc-lattice create-service \
  --name "processor-service" \
  --auth-type AWS_IAM

aws vpc-lattice create-listener \
  --service-identifier svc-0fedcba9876543210 \
  --name "http" \
  --protocol HTTP \
  --port 80 \
  --default-action '{
    "forward": {
      "targetGroups": [
        {"targetGroupIdentifier": "tg-0fedcba9876543210", "weight": 100}
      ]
    }
  }'

# Associate both services with the service network
aws vpc-lattice create-service-network-service-association \
  --service-network-identifier sn-0123456789abcdef0 \
  --service-identifier svc-0abc123def4567890

aws vpc-lattice create-service-network-service-association \
  --service-network-identifier sn-0123456789abcdef0 \
  --service-identifier svc-0fedcba9876543210
```

## Calling Services from ECS

Your ECS tasks need to call VPC Lattice services using SigV4-signed requests. Here's how to do it in your application code.

ECS application calling a Lattice service (Node.js):

```javascript
const { SignatureV4 } = require('@smithy/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const https = require('https');

async function callProcessorService(orderData) {
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: 'us-east-1',
    service: 'vpc-lattice-svcs',
    sha256: Sha256
  });

  const url = new URL('https://processor-service-svc-0fedcba9876543210.7d67968.vpc-lattice-svcs.us-east-1.on.aws/process');
  const body = JSON.stringify(orderData);

  const request = {
    method: 'POST',
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      host: url.hostname
    },
    body
  };

  // Sign the request
  const signedRequest = await signer.sign(request);

  // Make the HTTP call
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: signedRequest.hostname,
      path: signedRequest.path,
      method: signedRequest.method,
      headers: signedRequest.headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    req.write(signedRequest.body);
    req.end();
  });
}
```

## ECS Task Role Configuration

The ECS task role needs permission to invoke VPC Lattice services.

IAM policy for the ECS task role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "vpc-lattice-svcs:Invoke",
      "Resource": [
        "arn:aws:vpc-lattice:us-east-1:123456789012:service/svc-0fedcba9876543210",
        "arn:aws:vpc-lattice:us-east-1:123456789012:service/svc-0fedcba9876543210/*"
      ]
    }
  ]
}
```

## CloudFormation for the Complete Setup

Here's a CloudFormation template bringing it all together:

```yaml
AWSTemplateFormatVersion: '2010-09-09'

Resources:
  LambdaTargetGroup:
    Type: AWS::VpcLattice::TargetGroup
    Properties:
      Name: processor-lambda-tg
      Type: LAMBDA
      Config:
        LambdaEventStructureVersion: V2
      Targets:
        - Id: !GetAtt ProcessorFunction.Arn

  ProcessorService:
    Type: AWS::VpcLattice::Service
    Properties:
      Name: processor-service
      AuthType: AWS_IAM

  ProcessorListener:
    Type: AWS::VpcLattice::Listener
    Properties:
      ServiceIdentifier: !Ref ProcessorService
      Protocol: HTTP
      Port: 80
      DefaultAction:
        Forward:
          TargetGroups:
            - TargetGroupIdentifier: !Ref LambdaTargetGroup
              Weight: 100

  LatticeInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref ProcessorFunction
      Action: lambda:InvokeFunction
      Principal: vpc-lattice.amazonaws.com
      SourceArn: !GetAtt LambdaTargetGroup.Arn
```

Don't forget the Lambda permission resource - without it, VPC Lattice can't invoke your function.

## Gradual Migration Pattern

A common use case is migrating from ECS to Lambda (or vice versa). VPC Lattice makes this smooth with weighted routing.

```bash
# Start with 100% ECS, then gradually shift to Lambda
aws vpc-lattice update-listener \
  --service-identifier svc-0abc123def4567890 \
  --listener-identifier listener-0abc123def4567890 \
  --default-action '{
    "forward": {
      "targetGroups": [
        {"targetGroupIdentifier": "tg-0abc123def4567890", "weight": 80},
        {"targetGroupIdentifier": "tg-0fedcba9876543210", "weight": 20}
      ]
    }
  }'
```

Monitor error rates and latency at each weight adjustment before shifting more traffic. For monitoring strategies, see our post on [VPC Lattice service networks](https://oneuptime.com/blog/post/2026-02-12-vpc-lattice-service-networks/view).
