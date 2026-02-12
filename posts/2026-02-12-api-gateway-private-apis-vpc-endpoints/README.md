# How to Use API Gateway Private APIs with VPC Endpoints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, VPC, Networking, Security

Description: Learn how to create private API Gateway APIs accessible only from within your VPC using interface VPC endpoints for secure internal services.

---

Not every API should be exposed to the internet. Internal microservices, admin APIs, and backend-to-backend communication should stay private. API Gateway private APIs are accessible only from within your VPC through interface VPC endpoints. Traffic never leaves the AWS network, and there's no public endpoint to attack.

## Private API vs Public API

A standard API Gateway REST API gets a public endpoint that anyone on the internet can reach (authentication aside). A private API has no public endpoint at all. The only way to reach it is through a VPC endpoint inside your VPC.

This makes private APIs perfect for:
- Internal microservice communication
- Admin/management APIs
- APIs consumed by EC2 instances, ECS tasks, or Lambda functions inside a VPC
- Backend services that should never be publicly accessible

## Step 1: Create the VPC Endpoint

You need an interface VPC endpoint for the `execute-api` service. This creates an elastic network interface (ENI) in your VPC that routes traffic to API Gateway.

Create the VPC endpoint:

```bash
# Create an interface VPC endpoint for API Gateway
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc123def456 \
  --service-name com.amazonaws.us-east-1.execute-api \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-0aaa111 subnet-0bbb222 subnet-0ccc333 \
  --security-group-ids sg-0abc123 \
  --private-dns-enabled

# Verify the endpoint was created
aws ec2 describe-vpc-endpoints \
  --filters Name=service-name,Values=com.amazonaws.us-east-1.execute-api \
  --query 'VpcEndpoints[*].{Id:VpcEndpointId,State:State,DNS:DnsEntries[0].DnsName}'
```

Key settings:
- **Subnet IDs** - Place the endpoint in multiple subnets across AZs for high availability
- **Security group** - Controls which resources can access the endpoint. Allow inbound HTTPS (port 443) from your application security groups
- **Private DNS** - When enabled, the default `execute-api` domain resolves to the VPC endpoint's private IP inside your VPC

## Step 2: Configure the Security Group

The VPC endpoint's security group controls who can call your private APIs.

Set up the security group for the VPC endpoint:

```bash
# Create a security group for the VPC endpoint
aws ec2 create-security-group \
  --group-name api-gateway-vpce \
  --description "Security group for API Gateway VPC endpoint" \
  --vpc-id vpc-0abc123def456

# Allow HTTPS from your application subnets
aws ec2 authorize-security-group-ingress \
  --group-id sg-vpce123 \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/16

# Or allow from specific security groups
aws ec2 authorize-security-group-ingress \
  --group-id sg-vpce123 \
  --protocol tcp \
  --port 443 \
  --source-group sg-app456
```

## Step 3: Create the Private API

Create a REST API with the PRIVATE endpoint type.

Create a private API:

```bash
# Create a private REST API
aws apigateway create-rest-api \
  --name "internal-service-api" \
  --endpoint-configuration types=PRIVATE,vpcEndpointIds=vpce-0abc123def456 \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Deny",
        "Principal": "*",
        "Action": "execute-api:Invoke",
        "Resource": "execute-api:/*",
        "Condition": {
          "StringNotEquals": {
            "aws:sourceVpce": "vpce-0abc123def456"
          }
        }
      },
      {
        "Effect": "Allow",
        "Principal": "*",
        "Action": "execute-api:Invoke",
        "Resource": "execute-api:/*"
      }
    ]
  }'
```

The resource policy is essential. Without it, the API is technically private but doesn't enforce which VPC endpoint can access it. The policy above restricts access to a specific VPC endpoint.

## Step 4: Add Resources and Deploy

Set up your API resources and methods, then deploy.

Add a resource and method to the private API:

```bash
# Get the root resource ID
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id privateapi123 \
  --query 'items[?path==`/`].id' \
  --output text)

# Create a resource
aws apigateway create-resource \
  --rest-api-id privateapi123 \
  --parent-id "$ROOT_ID" \
  --path-part "health"

# Add a GET method with Lambda integration
aws apigateway put-method \
  --rest-api-id privateapi123 \
  --resource-id res456 \
  --http-method GET \
  --authorization-type NONE

aws apigateway put-integration \
  --rest-api-id privateapi123 \
  --resource-id res456 \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:health-check/invocations"

# Deploy
aws apigateway create-deployment \
  --rest-api-id privateapi123 \
  --stage-name prod
```

## Complete CloudFormation Template

Here's a full CloudFormation setup for a private API with VPC endpoint:

```yaml
Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
  AppSecurityGroupId:
    Type: AWS::EC2::SecurityGroup::Id

Resources:
  # VPC Endpoint for API Gateway
  ApiGatewayEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VpcId
      ServiceName: !Sub "com.amazonaws.${AWS::Region}.execute-api"
      VpcEndpointType: Interface
      SubnetIds: !Ref SubnetIds
      SecurityGroupIds:
        - !Ref EndpointSecurityGroup
      PrivateDnsEnabled: true

  EndpointSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: API Gateway VPC Endpoint
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          SourceSecurityGroupId: !Ref AppSecurityGroupId

  # Private API
  PrivateApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: internal-service
      EndpointConfiguration:
        Types:
          - PRIVATE
        VpcEndpointIds:
          - !Ref ApiGatewayEndpoint
      Policy:
        Version: "2012-10-17"
        Statement:
          - Effect: Deny
            Principal: "*"
            Action: execute-api:Invoke
            Resource: "execute-api:/*"
            Condition:
              StringNotEquals:
                aws:sourceVpce: !Ref ApiGatewayEndpoint
          - Effect: Allow
            Principal: "*"
            Action: execute-api:Invoke
            Resource: "execute-api:/*"

  HealthResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref PrivateApi
      ParentId: !GetAtt PrivateApi.RootResourceId
      PathPart: health

  HealthMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref PrivateApi
      ResourceId: !Ref HealthResource
      HttpMethod: GET
      AuthorizationType: NONE
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${HealthFunction.Arn}/invocations"

  ApiDeployment:
    Type: AWS::ApiGateway::Deployment
    DependsOn: HealthMethod
    Properties:
      RestApiId: !Ref PrivateApi

  ProdStage:
    Type: AWS::ApiGateway::Stage
    Properties:
      RestApiId: !Ref PrivateApi
      DeploymentId: !Ref ApiDeployment
      StageName: prod

Outputs:
  PrivateApiUrl:
    Value: !Sub "https://${PrivateApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
```

## Calling the Private API

From inside the VPC, you call the private API using its standard URL. If private DNS is enabled on the VPC endpoint, the hostname resolves to the endpoint's private IP automatically.

Call the private API from an EC2 instance or Lambda function in the VPC:

```python
import requests


def call_private_api():
    """Call the private API from within the VPC."""
    # Standard API Gateway URL - resolves to VPC endpoint's private IP
    url = "https://privateapi123.execute-api.us-east-1.amazonaws.com/prod/health"

    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.json()}")
    return response.json()
```

If private DNS is not enabled, use the VPC endpoint URL with a Host header:

```python
import requests


def call_private_api_without_private_dns():
    """Call using VPC endpoint DNS when private DNS is disabled."""
    # Use the VPC endpoint URL
    vpce_url = "https://vpce-0abc123-xyz.execute-api.us-east-1.vpce.amazonaws.com/prod/health"

    # Set the Host header to the API's hostname
    headers = {
        "Host": "privateapi123.execute-api.us-east-1.amazonaws.com"
    }

    response = requests.get(vpce_url, headers=headers)
    return response.json()
```

## Calling from Lambda Inside VPC

If your Lambda function is VPC-connected, it can call the private API directly:

```python
import json
import urllib.request


def lambda_handler(event, context):
    # This Lambda must be in the same VPC as the VPC endpoint
    url = "https://privateapi123.execute-api.us-east-1.amazonaws.com/prod/health"

    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())

    return {
        "statusCode": 200,
        "body": json.dumps(data),
    }
```

Make sure the Lambda function's security group allows outbound HTTPS, and the VPC endpoint's security group allows inbound from the Lambda's security group.

## Multi-VPC Access

You can allow multiple VPCs to access the same private API by listing multiple VPC endpoints in the resource policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "execute-api:/*",
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpce": [
            "vpce-0aaa111",
            "vpce-0bbb222",
            "vpce-0ccc333"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "execute-api:/*"
    }
  ]
}
```

Each VPC needs its own VPC endpoint for the `execute-api` service, and the private API's resource policy must list all of them.

## Troubleshooting

Common issues with private APIs:

1. **DNS not resolving** - Make sure `PrivateDnsEnabled` is true on the VPC endpoint, or use the VPC endpoint URL with a Host header.
2. **403 Forbidden** - The resource policy doesn't allow your VPC endpoint. Check the `aws:sourceVpce` condition.
3. **Connection timeout** - The VPC endpoint's security group doesn't allow inbound HTTPS from your resource. Check port 443 rules.
4. **Can't reach from outside VPC** - That's by design. Private APIs are VPC-only.

For monitoring private API health and latency from within your VPC, check out our post on [internal service monitoring](https://oneuptime.com/blog/post/api-monitoring-best-practices/view).

## Wrapping Up

Private APIs keep your internal services truly internal. No public endpoint means no public attack surface. The setup involves a VPC endpoint, a private API with a resource policy, and the right security group rules. It's more configuration than a public API, but the security benefit is worth it for any service that has no business being exposed to the internet. Use private APIs for microservice communication, admin tools, and any backend-to-backend integration.
