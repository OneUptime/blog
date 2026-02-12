# How to Use CodePipeline with Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodePipeline, Lambda, Serverless, CI/CD

Description: Build a CI/CD pipeline for AWS Lambda functions using CodePipeline, including automated testing, SAM deployments, and traffic-shifting strategies.

---

Deploying Lambda functions through the console or CLI works when you're prototyping, but it falls apart when you have a team shipping code regularly. You need automated tests, staged rollouts, and a way to roll back when things break. CodePipeline gives you all of that for Lambda deployments.

There are actually several ways to deploy Lambda through CodePipeline - direct Lambda actions, CloudFormation/SAM, or CodeDeploy for traffic shifting. I'll cover all three approaches so you can pick the one that fits your workflow.

## Approach 1: SAM Pipeline (Recommended)

AWS SAM (Serverless Application Model) is the cleanest way to manage Lambda deployments through CodePipeline. SAM handles packaging, uploading, and deploying your functions.

### Project Structure

```
my-lambda-app/
  src/
    handler.js        # Lambda function code
    package.json
  tests/
    handler.test.js   # Unit tests
  template.yml        # SAM template
  buildspec.yml       # CodeBuild spec
```

### SAM Template

```yaml
# template.yml - SAM template with deployment preferences
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs18.x
    Tracing: Active

Resources:
  ProcessOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handler.processOrder
      Description: Processes incoming orders
      AutoPublishAlias: live
      DeploymentPreference:
        Type: Canary10Percent5Minutes
        Alarms:
          - !Ref ProcessOrderErrorAlarm
        Hooks:
          PreTraffic: !Ref PreTrafficTestFunction
          PostTraffic: !Ref PostTrafficTestFunction
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /orders
            Method: post
      Environment:
        Variables:
          TABLE_NAME: !Ref OrdersTable

  PreTrafficTestFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handler.preTrafficTest
      FunctionName: !Sub "CodeDeployHook_${ProcessOrderFunction}_PreTraffic"
      Policies:
        - Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Action:
                - codedeploy:PutLifecycleEventHookExecutionStatus
              Resource: "*"
            - Effect: Allow
              Action:
                - lambda:InvokeFunction
              Resource: !GetAtt ProcessOrderFunction.Arn

  PostTrafficTestFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handler.postTrafficTest
      FunctionName: !Sub "CodeDeployHook_${ProcessOrderFunction}_PostTraffic"
      Policies:
        - Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Action:
                - codedeploy:PutLifecycleEventHookExecutionStatus
              Resource: "*"

  ProcessOrderErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${ProcessOrderFunction}-errors"
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref ProcessOrderFunction

  OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: orders
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: orderId
          AttributeType: S
      KeySchema:
        - AttributeName: orderId
          KeyType: HASH
```

### BuildSpec

```yaml
# buildspec.yml - Build and package SAM application
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm install -g aws-sam-cli
  pre_build:
    commands:
      - cd src && npm ci
      - cd ../tests && npm ci
      - echo "Running unit tests..."
      - npm test
  build:
    commands:
      - echo "Packaging SAM application..."
      - sam build
      - sam package \
          --output-template-file packaged.yml \
          --s3-bucket my-sam-artifacts

artifacts:
  files:
    - packaged.yml
  discard-paths: yes
```

### Pipeline Definition

```json
{
  "pipeline": {
    "name": "lambda-sam-pipeline",
    "roleArn": "arn:aws:iam::123456789012:role/CodePipelineServiceRole",
    "artifactStore": {
      "type": "S3",
      "location": "my-pipeline-artifacts"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [{
          "name": "GitHub",
          "actionTypeId": {
            "category": "Source",
            "owner": "AWS",
            "provider": "CodeStarSourceConnection",
            "version": "1"
          },
          "configuration": {
            "ConnectionArn": "arn:aws:codestar-connections:us-east-1:123456789:connection/abc-123",
            "FullRepositoryId": "my-org/my-lambda-app",
            "BranchName": "main"
          },
          "outputArtifacts": [{"name": "SourceOutput"}]
        }]
      },
      {
        "name": "Build",
        "actions": [{
          "name": "SAMBuild",
          "actionTypeId": {
            "category": "Build",
            "owner": "AWS",
            "provider": "CodeBuild",
            "version": "1"
          },
          "configuration": {"ProjectName": "lambda-build"},
          "inputArtifacts": [{"name": "SourceOutput"}],
          "outputArtifacts": [{"name": "BuildOutput"}]
        }]
      },
      {
        "name": "Deploy-Staging",
        "actions": [{
          "name": "SAMDeploy",
          "actionTypeId": {
            "category": "Deploy",
            "owner": "AWS",
            "provider": "CloudFormation",
            "version": "1"
          },
          "configuration": {
            "ActionMode": "CREATE_UPDATE",
            "StackName": "my-lambda-app-staging",
            "TemplatePath": "BuildOutput::packaged.yml",
            "Capabilities": "CAPABILITY_IAM,CAPABILITY_AUTO_EXPAND",
            "RoleArn": "arn:aws:iam::123456789012:role/CloudFormationExecutionRole",
            "ParameterOverrides": "{\"Stage\": \"staging\"}"
          },
          "inputArtifacts": [{"name": "BuildOutput"}]
        }]
      },
      {
        "name": "Approval",
        "actions": [{
          "name": "ApproveProduction",
          "actionTypeId": {
            "category": "Approval",
            "owner": "AWS",
            "provider": "Manual",
            "version": "1"
          },
          "configuration": {
            "CustomData": "Staging tests passed. Approve production deployment."
          }
        }]
      },
      {
        "name": "Deploy-Production",
        "actions": [{
          "name": "SAMDeploy",
          "actionTypeId": {
            "category": "Deploy",
            "owner": "AWS",
            "provider": "CloudFormation",
            "version": "1"
          },
          "configuration": {
            "ActionMode": "CREATE_UPDATE",
            "StackName": "my-lambda-app-production",
            "TemplatePath": "BuildOutput::packaged.yml",
            "Capabilities": "CAPABILITY_IAM,CAPABILITY_AUTO_EXPAND",
            "RoleArn": "arn:aws:iam::123456789012:role/CloudFormationExecutionRole",
            "ParameterOverrides": "{\"Stage\": \"production\"}"
          },
          "inputArtifacts": [{"name": "BuildOutput"}]
        }]
      }
    ]
  }
}
```

## Approach 2: Direct Lambda Deploy Action

For simpler setups where you don't need SAM, you can use CodePipeline's Lambda deploy action:

```json
{
  "name": "Deploy",
  "actions": [{
    "name": "UpdateLambda",
    "actionTypeId": {
      "category": "Invoke",
      "owner": "AWS",
      "provider": "Lambda",
      "version": "1"
    },
    "configuration": {
      "FunctionName": "deploy-lambda-function",
      "UserParameters": "{\"targetFunction\": \"my-app-function\", \"s3Bucket\": \"my-artifacts\", \"s3Key\": \"function.zip\"}"
    },
    "inputArtifacts": [{"name": "BuildOutput"}]
  }]
}
```

This invokes a Lambda function that handles the deployment. The deployer function looks like this:

```python
# deploy_function.py - Custom deployer Lambda
import json
import boto3
import zipfile
import io

lambda_client = boto3.client('lambda')
codepipeline = boto3.client('codepipeline')
s3 = boto3.client('s3')

def handler(event, context):
    job_id = event['CodePipeline.job']['id']

    try:
        params = json.loads(
            event['CodePipeline.job']['data']['actionConfiguration']['configuration']['UserParameters']
        )

        # Get the artifact from S3
        artifact = event['CodePipeline.job']['data']['inputArtifacts'][0]
        bucket = artifact['location']['s3Location']['bucketName']
        key = artifact['location']['s3Location']['objectKey']

        # Download and extract the function code
        response = s3.get_object(Bucket=bucket, Key=key)
        artifact_zip = response['Body'].read()

        # Update the Lambda function code
        lambda_client.update_function_code(
            FunctionName=params['targetFunction'],
            ZipFile=artifact_zip
        )

        # Report success
        codepipeline.put_job_success_result(jobId=job_id)

    except Exception as e:
        codepipeline.put_job_failure_result(
            jobId=job_id,
            failureDetails={
                'type': 'JobFailed',
                'message': str(e)
            }
        )
```

## Approach 3: CodeDeploy for Traffic Shifting

If you want canary or linear traffic shifting without SAM, use CodeDeploy directly. See our dedicated guide on [setting up CodeDeploy for Lambda deployments](https://oneuptime.com/blog/post/codedeploy-lambda-deployments/view) for the full setup.

## Running Integration Tests

Add a test stage that invokes your deployed function:

```yaml
# test-buildspec.yml - Run integration tests against deployed Lambda
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci
  build:
    commands:
      - echo "Running integration tests against staging..."
      - npm run test:integration
```

```javascript
// tests/integration.test.js - Integration test for deployed Lambda
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: 'us-east-1' });

test('Lambda function responds correctly', async () => {
  const response = await lambda.send(new InvokeCommand({
    FunctionName: 'my-app-function',
    Qualifier: 'live',
    Payload: JSON.stringify({
      httpMethod: 'POST',
      path: '/orders',
      body: JSON.stringify({ item: 'test', quantity: 1 })
    })
  }));

  const payload = JSON.parse(Buffer.from(response.Payload));
  expect(payload.statusCode).toBe(200);
});
```

## Monitoring

After deploying your Lambda functions, keep tabs on them with CloudWatch metrics and alarms. For a unified view of all your serverless functions, [OneUptime](https://oneuptime.com) can aggregate Lambda metrics alongside your other services.

For setting up pipeline notifications, check our guide on [CodePipeline notifications](https://oneuptime.com/blog/post/codepipeline-notifications/view). And if things go wrong, see our [CodePipeline troubleshooting guide](https://oneuptime.com/blog/post/troubleshoot-codepipeline-failures/view).
