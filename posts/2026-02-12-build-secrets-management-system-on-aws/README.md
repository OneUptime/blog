# How to Build a Secrets Management System on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Secrets Manager, Security, KMS, Lambda

Description: Build a secrets management system on AWS using Secrets Manager, KMS, and Parameter Store to securely store, rotate, and access credentials across your applications.

---

Hardcoded credentials in source code, environment variables in plaintext, shared passwords in spreadsheets - we've all seen it. It's the kind of thing that works until it doesn't, and when it doesn't, it's a security incident. A proper secrets management system stores credentials securely, controls who can access them, rotates them automatically, and gives you an audit trail.

AWS has two services for this: Secrets Manager and Systems Manager Parameter Store. Let's build a production-ready secrets management system using both.

## Secrets Manager vs Parameter Store

Both store sensitive values, but they serve different purposes.

**Secrets Manager** is purpose-built for credentials. It supports automatic rotation, cross-account access, and native integration with RDS, Redshift, and DocumentDB. It costs $0.40 per secret per month plus $0.05 per 10,000 API calls.

**Parameter Store** (SecureString type) is simpler and cheaper. Free for standard parameters, $0.05 per advanced parameter per month. No built-in rotation, but you can build it yourself.

Use Secrets Manager for database credentials and API keys that need rotation. Use Parameter Store for configuration values and less sensitive settings.

## Storing Secrets

Here's how to create and manage secrets with CDK.

```typescript
// CDK: Secrets management infrastructure
import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class SecretsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Custom KMS key for encrypting secrets
    const secretsKey = new kms.Key(this, 'SecretsEncryptionKey', {
      alias: 'secrets-encryption',
      enableKeyRotation: true,
      description: 'KMS key for encrypting application secrets',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Database credentials with automatic rotation
    const dbCredentials = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: 'app/production/database',
      description: 'Production database credentials',
      encryptionKey: secretsKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // API key for third-party service
    const apiKey = new secretsmanager.Secret(this, 'ThirdPartyApiKey', {
      secretName: 'app/production/stripe-api-key',
      description: 'Stripe API key for payment processing',
      encryptionKey: secretsKey,
    });

    // Configuration in Parameter Store
    new ssm.StringParameter(this, 'AppConfig', {
      parameterName: '/app/production/config',
      stringValue: JSON.stringify({
        maxRetries: 3,
        timeout: 30000,
        featureFlags: {
          newCheckout: true,
          darkMode: false,
        },
      }),
      tier: ssm.ParameterTier.STANDARD,
    });

    // Sensitive config in Parameter Store (SecureString)
    new ssm.StringParameter(this, 'EncryptionSalt', {
      parameterName: '/app/production/encryption-salt',
      stringValue: 'this-will-be-encrypted',
      type: ssm.ParameterType.SECURE_STRING,
    });
  }
}
```

## Accessing Secrets in Lambda

Never hardcode secrets. Pull them at runtime from Secrets Manager with caching to avoid hitting the API on every invocation.

```javascript
// lambda/with-secrets.js
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({});

// Cache secrets in memory between Lambda invocations
const secretCache = {};

async function getSecret(secretName) {
  // Check cache first
  if (secretCache[secretName] && secretCache[secretName].expiry > Date.now()) {
    return secretCache[secretName].value;
  }

  const { SecretString } = await client.send(new GetSecretValueCommand({
    SecretId: secretName,
  }));

  const parsed = JSON.parse(SecretString);

  // Cache for 5 minutes
  secretCache[secretName] = {
    value: parsed,
    expiry: Date.now() + 5 * 60 * 1000,
  };

  return parsed;
}

exports.handler = async (event) => {
  // Get database credentials
  const dbCreds = await getSecret('app/production/database');

  // Connect to database using the credentials
  const connection = await createConnection({
    host: dbCreds.host,
    port: dbCreds.port,
    username: dbCreds.username,
    password: dbCreds.password,
    database: dbCreds.dbname,
  });

  // Process the request
  const result = await connection.query('SELECT * FROM users WHERE id = $1', [event.userId]);

  return { statusCode: 200, body: JSON.stringify(result.rows) };
};
```

### Using the Lambda Extension for Caching

AWS provides a Lambda extension that caches secrets more efficiently than doing it yourself.

```typescript
// Lambda with Secrets Manager caching extension
const handler = new lambda.Function(this, 'Handler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  layers: [
    lambda.LayerVersion.fromLayerVersionArn(this, 'SecretsExtension',
      'arn:aws:lambda:us-east-1:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11'
    ),
  ],
  environment: {
    SECRETS_MANAGER_TTL: '300', // Cache for 5 minutes
    SSM_PARAMETER_STORE_TTL: '300',
  },
});

// Grant access to the secret
dbCredentials.grantRead(handler);
```

With the extension, you fetch secrets via a local HTTP endpoint, which is faster than making SDK calls.

```javascript
// Using the Lambda extension's local HTTP cache
const http = require('http');

async function getSecretFromExtension(secretName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 2773,
      path: `/secretsmanager/get?secretId=${encodeURIComponent(secretName)}`,
      headers: {
        'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN,
      },
    };

    http.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const secret = JSON.parse(data);
        resolve(JSON.parse(secret.SecretString));
      });
    }).on('error', reject);
  });
}
```

## Automatic Secret Rotation

Secrets Manager can automatically rotate database credentials. It uses a Lambda function to update the credential in both Secrets Manager and the database.

```typescript
// RDS database with automatic credential rotation
const database = new rds.DatabaseInstance(this, 'Database', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15,
  }),
  vpc,
  credentials: rds.Credentials.fromSecret(dbCredentials),
});

// Enable automatic rotation every 30 days
dbCredentials.addRotationSchedule('Rotation', {
  automaticallyAfter: cdk.Duration.days(30),
  hostedRotation: secretsmanager.HostedRotation.postgreSqlSingleUser({
    vpc,
    excludeCharacters: '/@" ',
  }),
});
```

For custom secrets (API keys, tokens), write your own rotation Lambda.

```javascript
// lambda/rotate-api-key.js
const { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({});

exports.handler = async (event) => {
  const { SecretId, ClientRequestToken, Step } = event;

  switch (Step) {
    case 'createSecret':
      // Generate a new API key
      const newKey = await generateNewApiKey();
      await client.send(new PutSecretValueCommand({
        SecretId,
        ClientRequestToken,
        SecretString: JSON.stringify({ apiKey: newKey }),
        VersionStages: ['AWSPENDING'],
      }));
      break;

    case 'setSecret':
      // Register the new key with the third-party service
      const pendingSecret = await getSecretVersion(SecretId, 'AWSPENDING');
      await registerKeyWithService(pendingSecret.apiKey);
      break;

    case 'testSecret':
      // Verify the new key works
      const testSecret = await getSecretVersion(SecretId, 'AWSPENDING');
      const isValid = await testApiKey(testSecret.apiKey);
      if (!isValid) throw new Error('New API key verification failed');
      break;

    case 'finishSecret':
      // Mark the new version as current
      // Secrets Manager handles the version stage promotion
      break;
  }
};

async function getSecretVersion(secretId, versionStage) {
  const { SecretString } = await client.send(new GetSecretValueCommand({
    SecretId: secretId,
    VersionStage: versionStage,
  }));
  return JSON.parse(SecretString);
}
```

## Cross-Account Secret Sharing

When you have multiple AWS accounts (dev, staging, prod), you might need to share certain secrets across accounts.

```typescript
// Resource policy to allow cross-account access
const secret = new secretsmanager.Secret(this, 'SharedSecret', {
  secretName: 'shared/api-key',
});

secret.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [new iam.AccountPrincipal('222222222222')],
  actions: ['secretsmanager:GetSecretValue'],
  resources: ['*'],
}));
```

## Auditing Secret Access

CloudTrail automatically logs every Secrets Manager API call. You can also set up CloudWatch alarms for suspicious access patterns.

```typescript
// Alert on unusual secret access
const unusualAccessMetric = new logs.MetricFilter(this, 'SecretAccessMetric', {
  logGroup: cloudTrailLogGroup,
  filterPattern: logs.FilterPattern.literal(
    '{ $.eventSource = "secretsmanager.amazonaws.com" && $.eventName = "GetSecretValue" }'
  ),
  metricNamespace: 'Security',
  metricName: 'SecretAccess',
  metricValue: '1',
});

new cloudwatch.Alarm(this, 'UnusualSecretAccess', {
  metric: unusualAccessMetric.metric({
    period: cdk.Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 100, // Alert if secrets are accessed more than 100 times in 5 minutes
  evaluationPeriods: 1,
  alarmDescription: 'Unusual spike in secret access - possible credential scraping',
});
```

## Best Practices

Some rules that'll save you headaches:

- **Never log secret values** - Log the secret name, never the value
- **Use least privilege** - Only grant access to the specific secrets each service needs
- **Rotate regularly** - 30-90 days for most secrets, more frequently for high-risk ones
- **Use separate secrets per environment** - Don't share production secrets with dev
- **Tag everything** - Tags help with auditing and cost allocation
- **Encrypt with customer-managed KMS keys** - More control over key policies

```typescript
// Least-privilege IAM policy for a service
const orderServiceRole = new iam.Role(this, 'OrderServiceRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
});

// Only grant access to the specific secrets this service needs
dbCredentials.grantRead(orderServiceRole);
stripeKey.grantRead(orderServiceRole);
// Don't grant access to secrets it doesn't need
```

For monitoring your secrets management system alongside the rest of your infrastructure, check out our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view).

## Summary

A proper secrets management system on AWS uses Secrets Manager for credentials that need rotation, Parameter Store for configuration, KMS for encryption, and CloudTrail for auditing. The Lambda caching extension keeps performance snappy, automatic rotation eliminates stale credentials, and least-privilege IAM policies limit the blast radius if something goes wrong. It takes a bit of setup, but it's infinitely better than the alternative of passwords in environment variables or config files.
