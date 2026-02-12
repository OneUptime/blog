# Use SAM Template Globals and Parameters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SAM, CloudFormation, Serverless

Description: Learn how to use AWS SAM template Globals and Parameters to reduce duplication, manage configuration, and deploy to multiple environments.

---

If you've ever written a SAM template with more than three Lambda functions, you know the pain. The same runtime, timeout, memory size, and environment variables repeated in every single function definition. SAM Globals solve this by letting you define shared configuration once. Parameters let you change behavior at deploy time without editing the template. Together, they make your templates clean, DRY, and flexible.

## The Problem with Repetition

Here's what a template looks like without Globals. Every function repeats the same settings:

```yaml
# Without Globals - lots of repetition
Resources:
  CreateFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs20.x
      Timeout: 30
      MemorySize: 256
      Tracing: Active
      Environment:
        Variables:
          TABLE_NAME: items
          LOG_LEVEL: info
      Handler: src/create.handler

  ReadFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs20.x     # Same
      Timeout: 30              # Same
      MemorySize: 256          # Same
      Tracing: Active          # Same
      Environment:             # Same
        Variables:
          TABLE_NAME: items
          LOG_LEVEL: info
      Handler: src/read.handler

  UpdateFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs20.x     # Same again
      Timeout: 30
      MemorySize: 256
      Tracing: Active
      Environment:
        Variables:
          TABLE_NAME: items
          LOG_LEVEL: info
      Handler: src/update.handler
```

That's a lot of copy-pasting, and it's a maintenance headache. Change the runtime and you have to update every function.

## Globals to the Rescue

The `Globals` section lets you define default values that apply to all resources of a given type.

This template uses Globals to eliminate the repetition:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 256
    Tracing: Active
    Environment:
      Variables:
        TABLE_NAME: items
        LOG_LEVEL: info

Resources:
  CreateFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/create.handler

  ReadFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/read.handler

  UpdateFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/update.handler
```

Much cleaner. Each function inherits runtime, timeout, memory, tracing, and environment variables from Globals. You only specify what's unique to each function.

## What Globals Support

Globals work with three resource types:

**Function** (AWS::Serverless::Function):

```yaml
Globals:
  Function:
    Runtime: nodejs20.x
    Handler: index.handler
    Timeout: 30
    MemorySize: 256
    Tracing: Active
    Layers:
      - !Ref SharedLayer
    Environment:
      Variables:
        REGION: !Ref AWS::Region
    VpcConfig:
      SecurityGroupIds:
        - sg-abc123
      SubnetIds:
        - subnet-abc123
    Tags:
      Team: backend
      Service: items-api
```

**Api** (AWS::Serverless::Api):

```yaml
Globals:
  Api:
    Auth:
      DefaultAuthorizer: CognitoAuth
    Cors:
      AllowMethods: "'GET,POST,PUT,DELETE'"
      AllowHeaders: "'Content-Type,Authorization'"
      AllowOrigin: "'*'"
    TracingEnabled: true
    EndpointConfiguration: REGIONAL
```

**HttpApi** (AWS::Serverless::HttpApi):

```yaml
Globals:
  HttpApi:
    Auth:
      DefaultAuthorizer: OAuth2
    CorsConfiguration:
      AllowMethods:
        - GET
        - POST
      AllowOrigins:
        - https://myapp.com
```

## Overriding Globals

Any property set in Globals can be overridden by an individual resource. The resource-level value always wins.

This shows a function that overrides the global timeout and adds extra environment variables:

```yaml
Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 10
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: items
        LOG_LEVEL: info

Resources:
  # Uses all defaults
  QuickFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/quick.handler

  # Overrides timeout and memory for a heavier workload
  HeavyProcessingFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/heavy.handler
      Timeout: 300           # Override: 5 minutes instead of 10 seconds
      MemorySize: 1024       # Override: 1GB instead of 256MB
      Environment:
        Variables:
          TABLE_NAME: items  # Still inherited
          LOG_LEVEL: debug   # Override: debug instead of info
          BATCH_SIZE: "100"  # Additional variable
```

Important: for environment variables, the merge behavior is at the variable level. Individual variables are overridden or added, not the entire environment block. So `TABLE_NAME` is inherited, `LOG_LEVEL` is overridden, and `BATCH_SIZE` is added.

## Parameters for Deploy-Time Configuration

Parameters let you pass values into your template at deployment time. This is essential for managing different environments (dev, staging, production) from a single template.

This template uses parameters for environment-specific configuration:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - prod
    Description: Deployment environment

  LogLevel:
    Type: String
    Default: info
    AllowedValues:
      - debug
      - info
      - warn
      - error

  MemorySize:
    Type: Number
    Default: 256
    AllowedValues:
      - 128
      - 256
      - 512
      - 1024
    Description: Lambda memory in MB

  AlertEmail:
    Type: String
    Default: ""
    Description: Email for CloudWatch alarms (leave empty to skip)

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: !Ref MemorySize
    Environment:
      Variables:
        ENVIRONMENT: !Ref Environment
        LOG_LEVEL: !Ref LogLevel
        TABLE_NAME: !Sub "${Environment}-items"

Resources:
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "${Environment}-items"
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST
      Tags:
        - Key: Environment
          Value: !Ref Environment
```

Deploy with different parameter values:

```bash
# Development
sam deploy \
  --parameter-overrides "Environment=dev LogLevel=debug MemorySize=256" \
  --stack-name items-api-dev

# Production
sam deploy \
  --parameter-overrides "Environment=prod LogLevel=warn MemorySize=1024" \
  --stack-name items-api-prod
```

## Conditions with Parameters

Parameters become really powerful when combined with Conditions. You can conditionally create resources based on the environment.

This template creates alarms only in production:

```yaml
Parameters:
  Environment:
    Type: String
    Default: dev

Conditions:
  IsProduction: !Equals [!Ref Environment, prod]
  HasAlertEmail: !Not [!Equals [!Ref AlertEmail, ""]]
  CreateAlarms: !And
    - !Condition IsProduction
    - !Condition HasAlertEmail

Resources:
  # This alarm only exists in production
  ErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Condition: CreateAlarms
    Properties:
      AlarmName: !Sub "${Environment}-items-api-errors"
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref AlertTopic

  AlertTopic:
    Type: AWS::SNS::Topic
    Condition: CreateAlarms
    Properties:
      Subscription:
        - Protocol: email
          Endpoint: !Ref AlertEmail
```

## Mappings for Environment-Specific Values

When you have multiple values that vary together by environment, Mappings are cleaner than individual parameters.

This uses a mapping to set environment-specific configurations:

```yaml
Mappings:
  EnvironmentConfig:
    dev:
      MemorySize: 256
      Timeout: 10
      LogLevel: debug
      DeletionPolicy: Delete
    staging:
      MemorySize: 512
      Timeout: 30
      LogLevel: info
      DeletionPolicy: Delete
    prod:
      MemorySize: 1024
      Timeout: 30
      LogLevel: warn
      DeletionPolicy: Retain

Globals:
  Function:
    Runtime: nodejs20.x
    MemorySize: !FindInMap [EnvironmentConfig, !Ref Environment, MemorySize]
    Timeout: !FindInMap [EnvironmentConfig, !Ref Environment, Timeout]
    Environment:
      Variables:
        LOG_LEVEL: !FindInMap [EnvironmentConfig, !Ref Environment, LogLevel]
```

Now changing the environment parameter automatically adjusts memory, timeout, and log level together.

## Storing Parameters in samconfig.toml

Instead of passing parameters on every deploy, store them in samconfig.toml per environment.

This samconfig.toml manages multiple environments:

```toml
version = 0.1

[dev.deploy.parameters]
stack_name = "items-api-dev"
resolve_s3 = true
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=dev LogLevel=debug MemorySize=256"
confirm_changeset = false

[staging.deploy.parameters]
stack_name = "items-api-staging"
resolve_s3 = true
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=staging LogLevel=info MemorySize=512"
confirm_changeset = true

[prod.deploy.parameters]
stack_name = "items-api-prod"
resolve_s3 = true
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=prod LogLevel=warn MemorySize=1024 AlertEmail=ops@company.com"
confirm_changeset = true
```

Deploy to a specific environment using the config name:

```bash
# Deploy to dev
sam deploy --config-env dev

# Deploy to staging
sam deploy --config-env staging

# Deploy to production
sam deploy --config-env prod
```

## Template Validation

Always validate your template before deploying.

These commands catch errors before they hit CloudFormation:

```bash
# Validate SAM template syntax
sam validate

# Validate with lint rules
sam validate --lint

# Build to catch additional issues
sam build
```

## Best Practices

Put everything that's shared across most functions in Globals. Only override in individual resources when there's a real reason. Use parameters for anything that changes between environments. Use conditions to skip resources that aren't needed in every environment. Keep your samconfig.toml in version control so deployments are reproducible.

Don't put secrets in parameters - use AWS Secrets Manager or Parameter Store and reference them with `{{resolve:secretsmanager:secret-name}}` or `{{resolve:ssm:parameter-name}}`.

For more on building complete SAM applications, check out our post on [building a serverless application with AWS SAM](https://oneuptime.com/blog/post/serverless-application-aws-sam/view).

## Wrapping Up

Globals and Parameters are the two features that turn a messy SAM template into a clean, maintainable one. Globals eliminate repetition across resources. Parameters make the same template work for dev, staging, and production. Conditions add environment-specific behavior. And samconfig.toml ties it all together with reproducible, per-environment deployment configurations. Use them from the start, and your templates will stay manageable as your application grows.
