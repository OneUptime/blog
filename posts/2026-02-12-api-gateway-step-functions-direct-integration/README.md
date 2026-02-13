# How to Use API Gateway with Step Functions Direct Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Step Functions, Serverless

Description: Learn how to trigger AWS Step Functions state machines directly from API Gateway without a Lambda function in between.

---

Most people put a Lambda function between API Gateway and Step Functions. The Lambda receives the request, starts the state machine, and returns a response. But you don't need that Lambda at all. API Gateway can invoke Step Functions directly, eliminating the middleman and saving you the cost of that Lambda invocation.

## Why Direct Integration

The Lambda-in-the-middle pattern works fine, but it adds:
- Extra latency (Lambda cold starts plus execution time)
- Extra cost (you pay for the Lambda invocation)
- Extra code to maintain (the glue Lambda)

Direct integration removes all three. API Gateway sends the request straight to Step Functions using a service integration. Less code, less cost, less to go wrong.

## Setting Up the Integration

You need an IAM role that lets API Gateway start Step Functions executions, then a REST API method with an AWS service integration.

### Step 1: Create the IAM Role

Create a role that API Gateway can assume to start executions:

```bash
# Create the trust policy
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name APIGatewayStepFunctionsRole \
  --assume-role-policy-document file://trust-policy.json

# Create and attach the policy
cat > step-functions-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "states:StartExecution",
        "states:StartSyncExecution"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name APIGatewayStepFunctionsRole \
  --policy-name StepFunctionsAccess \
  --policy-document file://step-functions-policy.json
```

### Step 2: Create the Asynchronous Integration

For standard (asynchronous) workflows, API Gateway starts the execution and returns immediately with the execution ARN.

Set up the integration to start a state machine:

```bash
# Create the integration
aws apigateway put-integration \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method POST \
  --type AWS \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:states:action/StartExecution" \
  --credentials "arn:aws:iam::123456789012:role/APIGatewayStepFunctionsRole" \
  --request-templates '{
    "application/json": "{\"input\": \"$util.escapeJavaScript($input.json('"'"'$'"'"'))\", \"stateMachineArn\": \"arn:aws:states:us-east-1:123456789012:stateMachine:my-workflow\"}"
  }'

# Configure the method response
aws apigateway put-method-response \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method POST \
  --status-code 200

# Configure the integration response
aws apigateway put-integration-response \
  --rest-api-id abc123api \
  --resource-id res456 \
  --http-method POST \
  --status-code 200 \
  --response-templates '{
    "application/json": "{\"executionArn\": \"$input.json('"'"'$.executionArn'"'"')\", \"startDate\": \"$input.json('"'"'$.startDate'"'"')\"}"
  }'
```

The request template maps the incoming JSON body to the `StartExecution` API's expected format. The response template extracts the execution ARN to return to the client.

### Step 3: Synchronous Execution (Express Workflows)

If you use Express workflows, you can start a synchronous execution that waits for the result and returns it directly.

Configure synchronous execution:

```bash
# Use StartSyncExecution for Express workflows
aws apigateway put-integration \
  --rest-api-id abc123api \
  --resource-id res789 \
  --http-method POST \
  --type AWS \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:states:action/StartSyncExecution" \
  --credentials "arn:aws:iam::123456789012:role/APIGatewayStepFunctionsRole" \
  --request-templates '{
    "application/json": "{\"input\": \"$util.escapeJavaScript($input.json('"'"'$'"'"'))\", \"stateMachineArn\": \"arn:aws:states:us-east-1:123456789012:stateMachine:my-express-workflow\"}"
  }'

# Map the sync execution response
aws apigateway put-integration-response \
  --rest-api-id abc123api \
  --resource-id res789 \
  --http-method POST \
  --status-code 200 \
  --response-templates '{
    "application/json": "$input.json('"'"'$.output'"'"')"
  }'
```

With synchronous execution, the client gets the actual workflow output in the API response. No polling needed.

## Complete CloudFormation Template

Here's a full stack with API Gateway, Step Functions, and the direct integration:

```yaml
Resources:
  # The State Machine
  OrderWorkflow:
    Type: AWS::StepFunctions::StateMachine
    Properties:
      StateMachineName: order-processing
      StateMachineType: EXPRESS  # Use EXPRESS for sync execution
      RoleArn: !GetAtt StepFunctionsRole.Arn
      DefinitionString: !Sub |
        {
          "StartAt": "ValidateOrder",
          "States": {
            "ValidateOrder": {
              "Type": "Task",
              "Resource": "${ValidateFunction.Arn}",
              "Next": "ProcessPayment"
            },
            "ProcessPayment": {
              "Type": "Task",
              "Resource": "${PaymentFunction.Arn}",
              "Next": "SendConfirmation"
            },
            "SendConfirmation": {
              "Type": "Task",
              "Resource": "${NotifyFunction.Arn}",
              "End": true
            }
          }
        }

  # API Gateway
  OrderApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: order-api

  OrdersResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref OrderApi
      ParentId: !GetAtt OrderApi.RootResourceId
      PathPart: orders

  # Integration Role
  ApiGatewayStepFunctionsRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: apigateway.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: StepFunctionsAccess
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - states:StartExecution
                  - states:StartSyncExecution
                Resource: !Ref OrderWorkflow

  # POST method with direct Step Functions integration
  PostOrderMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref OrderApi
      ResourceId: !Ref OrdersResource
      HttpMethod: POST
      AuthorizationType: NONE
      Integration:
        Type: AWS
        IntegrationHttpMethod: POST
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:states:action/StartSyncExecution"
        Credentials: !GetAtt ApiGatewayStepFunctionsRole.Arn
        RequestTemplates:
          application/json: !Sub |
            {
              "input": "$util.escapeJavaScript($input.json('$'))",
              "stateMachineArn": "${OrderWorkflow}"
            }
        IntegrationResponses:
          - StatusCode: "200"
            ResponseTemplates:
              application/json: |
                #set($output = $util.parseJson($input.json('$.output')))
                {
                  "orderId": "$output.orderId",
                  "status": "$output.status"
                }
          - StatusCode: "500"
            SelectionPattern: ".*FAILED.*"
            ResponseTemplates:
              application/json: |
                {
                  "error": "Workflow execution failed",
                  "cause": "$input.json('$.cause')"
                }
      MethodResponses:
        - StatusCode: "200"
        - StatusCode: "500"
```

## Passing Path and Query Parameters

You can pass URL parameters to the state machine through the request template.

Map path parameters and query strings to the Step Functions input:

```json
{
  "application/json": {
    "input": "{\"orderId\": \"$input.params('orderId')\", \"status\": \"$input.params('status')\", \"body\": $input.json('$')}",
    "stateMachineArn": "arn:aws:states:us-east-1:123456789012:stateMachine:my-workflow"
  }
}
```

## Error Handling

When a synchronous execution fails, the response includes the error and cause. Map these to appropriate HTTP status codes.

Handle different execution outcomes:

```yaml
IntegrationResponses:
  # Successful execution
  - StatusCode: "200"
    SelectionPattern: ""
    ResponseTemplates:
      application/json: "$input.json('$.output')"

  # Execution failed
  - StatusCode: "500"
    SelectionPattern: ".*FAILED.*"
    ResponseTemplates:
      application/json: |
        {
          "error": "Execution failed",
          "details": "$input.json('$.error')"
        }

  # Execution timed out
  - StatusCode: "504"
    SelectionPattern: ".*TIMED_OUT.*"
    ResponseTemplates:
      application/json: |
        {"error": "Execution timed out"}
```

## Async Pattern with Polling

For standard workflows that run longer, use the async pattern. Start the execution and give the client a URL to check the status.

Return the execution ID for polling:

```yaml
# Start execution endpoint
PostStartMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    HttpMethod: POST
    Integration:
      Uri: !Sub "arn:aws:apigateway:${AWS::Region}:states:action/StartExecution"
      RequestTemplates:
        application/json: !Sub |
          {
            "input": "$util.escapeJavaScript($input.json('$'))",
            "stateMachineArn": "${MyStateMachine}"
          }
      IntegrationResponses:
        - StatusCode: "202"
          ResponseTemplates:
            application/json: |
              #set($arn = $input.json('$.executionArn'))
              {
                "executionArn": $arn,
                "statusUrl": "/executions?arn=$util.urlEncode($arn)"
              }

# Check status endpoint
GetStatusMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    HttpMethod: GET
    Integration:
      Uri: !Sub "arn:aws:apigateway:${AWS::Region}:states:action/DescribeExecution"
      RequestTemplates:
        application/json: |
          {
            "executionArn": "$input.params('arn')"
          }
```

The client calls the start endpoint, gets back a status URL, and polls it until the execution completes.

For monitoring your Step Functions executions triggered through API Gateway, check out our guide on [workflow monitoring](https://oneuptime.com/blog/post/2025-12-18-fix-json-parsing-errors-aws-step-functions/view).

## Wrapping Up

Direct integration between API Gateway and Step Functions removes unnecessary Lambda functions from your architecture. For Express workflows with synchronous execution, the client gets the result in the API response. For Standard workflows, use the async pattern with a status polling endpoint. The request/response templates handle the data mapping, so there's no code to write or maintain between the two services.
