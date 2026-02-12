# How to Create Secrets Manager Secrets with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Secrets Manager, Security

Description: Manage secrets securely in AWS Secrets Manager using CDK, including secret creation, rotation, cross-stack references, and integration with other services.

---

Hardcoding secrets in your application code or environment variables is a recipe for disaster. AWS Secrets Manager gives you a secure, centralized place to store secrets with automatic rotation, fine-grained access control, and audit logging. CDK makes it easy to provision secrets as part of your infrastructure and wire them into Lambda functions, ECS containers, and RDS databases.

Let's go through the common patterns for creating and using secrets with CDK.

## Creating a Basic Secret

The simplest case is creating a secret with an auto-generated value:

```typescript
// lib/secrets-stack.ts - Secrets Manager with CDK
import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class SecretsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Secret with auto-generated password
    const apiSecret = new secretsmanager.Secret(this, 'ApiSecret', {
      secretName: 'production/api/key',
      description: 'API key for the payment gateway',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'api-user' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });
  }
}
```

The `generateSecretString` option is powerful. It creates a JSON object with your template fields plus a randomly generated value for the key you specify. The resulting secret value looks like:

```json
{"username": "api-user", "password": "aB3dEf6gH9jKlMn0pQrStUvWxYz1234"}
```

## Database Credentials

For RDS databases, there's a specialized construct that generates properly formatted credentials:

```typescript
// Database credentials with automatic format
import * as rds from 'aws-cdk-lib/aws-rds';

const dbSecret = new secretsmanager.Secret(this, 'DBCredentials', {
  secretName: 'production/rds/main',
  description: 'RDS database credentials',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({
      username: 'dbadmin',
    }),
    generateStringKey: 'password',
    excludeCharacters: '"@/\\',
    passwordLength: 30,
  },
});

// Use with an RDS instance
const database = new rds.DatabaseInstance(this, 'Database', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15_4,
  }),
  instanceType: cdk.aws_ec2.InstanceType.of(
    cdk.aws_ec2.InstanceClass.T3,
    cdk.aws_ec2.InstanceSize.MEDIUM
  ),
  vpc: vpc,
  credentials: rds.Credentials.fromSecret(dbSecret),
  databaseName: 'myapp',
});
```

When you use `Credentials.fromSecret`, RDS automatically updates the secret with the host, port, and database name after the instance is created. Your application gets everything it needs from a single secret.

## Secret Rotation

Auto-rotation is one of Secrets Manager's best features. For RDS credentials, CDK provides built-in rotation:

```typescript
// Automatic secret rotation for RDS credentials
database.addRotationSingleUser({
  automaticallyAfter: cdk.Duration.days(30),
  excludeCharacters: '"@/\\',
});

// For multi-user rotation (admin + application user)
database.addRotationMultiUser('AppUserRotation', {
  secret: appUserSecret,
  automaticallyAfter: cdk.Duration.days(30),
});
```

For non-RDS secrets, you can set up custom rotation with a Lambda function:

```typescript
// Custom rotation Lambda for non-RDS secrets
import * as lambda from 'aws-cdk-lib/aws-lambda';

const rotationLambda = new lambda.Function(this, 'RotationFunction', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'rotation.handler',
  code: lambda.Code.fromAsset('lambda/rotation'),
  functionName: 'secret-rotation',
  timeout: cdk.Duration.seconds(60),
});

apiSecret.addRotationSchedule('RotationSchedule', {
  rotationLambda: rotationLambda,
  automaticallyAfter: cdk.Duration.days(30),
});
```

The rotation Lambda needs to implement four steps: createSecret, setSecret, testSecret, and finishSecret. AWS provides templates for common rotation patterns in their documentation.

## Using Secrets in Lambda Functions

Pass secrets to Lambda functions securely. Don't put the actual value in environment variables - pass the secret ARN and fetch it at runtime:

```typescript
// Pass secret reference to Lambda (not the value itself)
const myFunction = new lambda.Function(this, 'ApiHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/api-handler'),
  environment: {
    SECRET_ARN: apiSecret.secretArn,
  },
});

// Grant the Lambda permission to read the secret
apiSecret.grantRead(myFunction);
```

Then in your Lambda code, fetch the secret value:

```typescript
// Lambda handler that retrieves the secret at runtime
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
let cachedSecret: string | null = null;

export const handler = async (event: any) => {
  // Cache the secret to avoid fetching on every invocation
  if (!cachedSecret) {
    const response = await client.send(new GetSecretValueCommand({
      SecretId: process.env.SECRET_ARN,
    }));
    cachedSecret = response.SecretString!;
  }

  const credentials = JSON.parse(cachedSecret);
  // Use credentials.username and credentials.password
};
```

Caching the secret outside the handler function means it persists across warm invocations, reducing Secrets Manager API calls and latency.

## Using Secrets in ECS Tasks

For ECS containers, you can inject secrets directly as environment variables or at the container level:

```typescript
// Inject secrets into ECS task definition
import * as ecs from 'aws-cdk-lib/aws-ecs';

const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef');

const container = taskDefinition.addContainer('AppContainer', {
  image: ecs.ContainerImage.fromRegistry('my-app:latest'),
  memoryLimitMiB: 512,
  secrets: {
    DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
    DB_USERNAME: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
    API_KEY: ecs.Secret.fromSecretsManager(apiSecret, 'password'),
  },
});
```

ECS handles fetching the secret values and injecting them as environment variables. The second parameter to `fromSecretsManager` is the JSON key within the secret, so you can pull individual fields from a JSON secret.

## Cross-Stack Secret Sharing

Share secrets between CDK stacks using cross-stack references:

```typescript
// Stack A - creates the secret and exports it
export class SecretsStack extends cdk.Stack {
  public readonly apiSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.apiSecret = new secretsmanager.Secret(this, 'SharedSecret', {
      secretName: 'shared/api-key',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ service: 'payment' }),
        generateStringKey: 'apiKey',
        passwordLength: 64,
      },
    });
  }
}

// Stack B - consumes the secret
interface AppStackProps extends cdk.StackProps {
  apiSecret: secretsmanager.ISecret;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        SECRET_ARN: props.apiSecret.secretArn,
      },
    });

    props.apiSecret.grantRead(fn);
  }
}
```

## Importing Existing Secrets

If a secret already exists (created manually or by another tool):

```typescript
// Import by name
const existingSecret = secretsmanager.Secret.fromSecretNameV2(
  this, 'ImportedSecret', 'production/api/key'
);

// Import by ARN (more reliable for cross-account)
const secretByArn = secretsmanager.Secret.fromSecretCompleteArn(
  this, 'SecretByArn',
  'arn:aws:secretsmanager:us-east-1:123456789012:secret:production/api/key-AbCdEf'
);
```

## KMS Encryption

By default, secrets are encrypted with the AWS managed key. For more control, use a customer managed KMS key:

```typescript
// Secret encrypted with a customer managed KMS key
import * as kms from 'aws-cdk-lib/aws-kms';

const secretsKey = new kms.Key(this, 'SecretsKey', {
  description: 'KMS key for Secrets Manager encryption',
  enableKeyRotation: true,
});

const encryptedSecret = new secretsmanager.Secret(this, 'EncryptedSecret', {
  secretName: 'production/encrypted-secret',
  encryptionKey: secretsKey,
  generateSecretString: {
    passwordLength: 32,
  },
});
```

For more on KMS key management, see our post on [creating KMS keys with CDK](https://oneuptime.com/blog/post/kms-keys-cdk/view).

## Wrapping Up

Secrets Manager with CDK gives you a secure, auditable, and automatable approach to credential management. The key patterns are: auto-generate credentials during provisioning, use `grantRead` for least-privilege access, cache secrets in Lambda for performance, and enable rotation for anything that touches production. Once you've got these patterns down, you'll never want to go back to environment variables or config files for sensitive data.
