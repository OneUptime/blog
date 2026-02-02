# How to Handle Secrets in Pulumi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Secrets, Infrastructure as Code, DevOps, Security

Description: Learn how to securely manage secrets in Pulumi using built-in encryption, external secret providers, and best practices for production deployments.

---

Managing secrets in infrastructure as code requires careful handling to prevent credentials from leaking into version control or logs. Pulumi provides first-class support for encrypted secrets, making it safer than storing plaintext values in configuration files.

## Understanding Pulumi's Secret Architecture

Pulumi encrypts secrets before storing them in state files. Each stack has its own encryption key, and secrets remain encrypted at rest and in transit.

The following diagram illustrates how secrets flow through Pulumi's encryption system:

```mermaid
flowchart TD
    A[Developer] -->|pulumi config set --secret| B[Pulumi CLI]
    B --> C{Encryption Provider}
    C -->|Default| D[Pulumi Service]
    C -->|Custom| E[AWS KMS / Azure KeyVault / GCP KMS]
    C -->|Passphrase| F[Local Passphrase]
    D --> G[Encrypted State]
    E --> G
    F --> G
    G --> H[Cloud Storage / Local File]

    subgraph "Runtime Decryption"
        I[pulumi up] --> J[Decrypt Secrets]
        J --> K[Pass to Provider]
        K --> L[Create Resources]
    end
```

## 1. Setting Secrets via the CLI

The most common way to add secrets is through the Pulumi CLI. Using the `--secret` flag ensures the value is encrypted before being stored in the stack configuration.

```bash
# Set a secret value - Pulumi encrypts it automatically
# The value is stored encrypted in Pulumi.<stack>.yaml
pulumi config set dbPassword superSecretPass123 --secret

# Set a secret from a file (useful for certificates or multi-line values)
pulumi config set tlsCert --secret < certificate.pem

# View config without revealing secret values
pulumi config

# Reveal a specific secret (requires appropriate permissions)
pulumi config get dbPassword
```

## 2. Creating Secrets in Code

Beyond CLI configuration, you can create secrets programmatically. Pulumi tracks secret values through your program and ensures they stay encrypted in the state.

The `pulumi.secret()` function wraps a value as a secret Output. Any Output derived from a secret is automatically marked as secret too.

```typescript
// index.ts - Creating and using secrets in TypeScript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Retrieve a secret from stack configuration
// The value comes pre-decrypted but remains marked as secret
const config = new pulumi.Config();
const dbPassword = config.requireSecret("dbPassword");

// Create a secret programmatically
// Use this when generating values dynamically
const apiKey = pulumi.secret(generateApiKey());

// Secrets propagate through operations
// connectionString is automatically a secret because dbPassword is a secret
const connectionString = pulumi.interpolate`postgres://admin:${dbPassword}@db.example.com:5432/app`;

// Pass secrets to resources - Pulumi handles encryption
const dbSecret = new aws.secretsmanager.Secret("db-credentials", {
    name: "production/db/credentials",
});

const dbSecretVersion = new aws.secretsmanager.SecretVersion("db-credentials-version", {
    secretId: dbSecret.id,
    // secretString accepts secret Outputs safely
    secretString: pulumi.jsonStringify({
        username: "admin",
        password: dbPassword,
    }),
});

// Export a secret - it stays encrypted in stack outputs
export const databasePassword = dbPassword;

// Helper function for demonstration
function generateApiKey(): string {
    return require("crypto").randomBytes(32).toString("hex");
}
```

## 3. Working with Secret Outputs

Pulumi's Output system ensures secrets remain protected throughout your infrastructure code. Understanding how to work with secret Outputs is essential for building secure infrastructure.

```typescript
// working-with-outputs.ts - Handling secret Outputs safely
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const masterPassword = config.requireSecret("masterPassword");

// Create an RDS instance with a secret password
const database = new aws.rds.Instance("app-db", {
    engine: "postgres",
    engineVersion: "15.4",
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    dbName: "appdb",
    username: "admin",
    // Password is a secret Output - stays encrypted in state
    password: masterPassword,
    skipFinalSnapshot: true,
});

// Transform secrets safely using apply()
// The callback receives the decrypted value but output remains secret
const maskedPassword = masterPassword.apply(pwd => {
    return pwd.substring(0, 2) + "****" + pwd.substring(pwd.length - 2);
});

// Combine multiple values where some are secrets
// Result is automatically marked as secret
const jdbcUrl = pulumi.all([database.endpoint, database.dbName, masterPassword])
    .apply(([endpoint, dbName, password]) => {
        return `jdbc:postgresql://${endpoint}/${dbName}?user=admin&password=${password}`;
    });

// Check if an Output is secret
pulumi.all([masterPassword]).apply(([pwd]) => {
    // In preview/update output, this value is hidden
    console.log("Password length:", pwd.length);
});

// Explicitly mark non-secret as secret when needed
const sensitiveEndpoint = pulumi.secret(database.endpoint);
```

## 4. Encryption Providers

Pulumi supports multiple encryption providers for secrets. Choose based on your security requirements and infrastructure.

```mermaid
flowchart LR
    subgraph "Encryption Options"
        A[Pulumi Service<br/>Default, Managed]
        B[AWS KMS<br/>Customer Managed]
        C[Azure KeyVault<br/>Customer Managed]
        D[GCP KMS<br/>Customer Managed]
        E[Passphrase<br/>Self Managed]
        F[HashiCorp Vault<br/>Enterprise]
    end

    A --> G[Stack State]
    B --> G
    C --> G
    D --> G
    E --> G
    F --> G
```

Configure a custom encryption provider when initializing a stack:

```bash
# Use AWS KMS for encryption
# Requires AWS credentials with kms:Encrypt and kms:Decrypt permissions
pulumi stack init production --secrets-provider="awskms://alias/pulumi-secrets?region=us-east-1"

# Use Azure KeyVault
pulumi stack init production --secrets-provider="azurekeyvault://mykeyvault.vault.azure.net/keys/pulumi-key"

# Use GCP KMS
pulumi stack init production --secrets-provider="gcpkms://projects/myproject/locations/us/keyRings/pulumi/cryptoKeys/secrets"

# Use a passphrase (prompted interactively)
# Good for local development or air-gapped environments
pulumi stack init production --secrets-provider="passphrase"

# Change encryption provider for existing stack
pulumi stack change-secrets-provider "awskms://alias/pulumi-secrets?region=us-east-1"
```

## 5. Integrating External Secret Managers

For production environments, integrating with dedicated secret managers provides additional security features like rotation, auditing, and fine-grained access control.

```typescript
// external-secrets.ts - Fetching secrets from external providers
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Fetch an existing secret from AWS Secrets Manager
// The secret is retrieved at deployment time
const existingSecret = aws.secretsmanager.getSecretVersionOutput({
    secretId: "production/api/credentials",
});

// Parse the secret JSON and use individual values
const credentials = existingSecret.secretString.apply(str => {
    const parsed = JSON.parse(str);
    return {
        apiKey: parsed.apiKey,
        apiSecret: parsed.apiSecret,
    };
});

// Use the retrieved secrets in other resources
const lambdaFunction = new aws.lambda.Function("api-handler", {
    runtime: "nodejs18.x",
    handler: "index.handler",
    role: lambdaRole.arn,
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./lambda"),
    }),
    environment: {
        variables: {
            // Values from Secrets Manager flow through as secrets
            API_KEY: credentials.apiKey,
            API_SECRET: credentials.apiSecret,
        },
    },
});

// For HashiCorp Vault integration
import * as vault from "@pulumi/vault";

const vaultSecret = vault.generic.getSecretOutput({
    path: "secret/data/myapp/config",
});

const dbCredentials = vaultSecret.data.apply(data => ({
    username: data["username"],
    password: data["password"],
}));
```

## 6. Secret Rotation Patterns

Implementing secret rotation requires coordination between your secret manager and Pulumi deployments. Here is a pattern for rotating database credentials without downtime.

```typescript
// rotation-pattern.ts - Blue-green secret rotation
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";

const config = new pulumi.Config();

// Generate a new password on each deployment when rotation is triggered
const rotationTrigger = config.get("rotateCredentials") || "v1";

const newPassword = new random.RandomPassword("db-password", {
    length: 32,
    special: true,
    overrideSpecial: "!#$%&*()-_=+[]{}:?",
}, {
    // Only regenerate when rotation is explicitly triggered
    additionalSecretOutputs: ["result"],
    replaceOnChanges: [rotationTrigger],
});

// Store both current and previous credentials during rotation
const dbCredentials = new aws.secretsmanager.Secret("db-creds", {
    name: "app/database/credentials",
});

const currentVersion = new aws.secretsmanager.SecretVersion("current", {
    secretId: dbCredentials.id,
    secretString: pulumi.jsonStringify({
        username: "app_user",
        password: newPassword.result,
        version: rotationTrigger,
    }),
});

// Lambda function to handle rotation lifecycle
const rotationLambda = new aws.lambda.Function("secret-rotation", {
    runtime: "python3.11",
    handler: "rotation.handler",
    role: rotationRole.arn,
    timeout: 30,
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./rotation-lambda"),
    }),
    environment: {
        variables: {
            SECRET_ARN: dbCredentials.arn,
        },
    },
});

// Enable automatic rotation every 30 days
const rotationSchedule = new aws.secretsmanager.SecretRotation("auto-rotation", {
    secretId: dbCredentials.id,
    rotationLambdaArn: rotationLambda.arn,
    rotationRules: {
        automaticallyAfterDays: 30,
    },
});
```

## 7. Preventing Secret Leaks

Several practices help prevent accidental exposure of secrets in logs, outputs, or version control.

```typescript
// security-practices.ts - Preventing secret exposure
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const apiKey = config.requireSecret("apiKey");

// WRONG: Logging a secret directly exposes it
// console.log("API Key:", apiKey);  // Never do this

// CORRECT: Log metadata about secrets, not values
apiKey.apply(key => {
    console.log(`API Key configured (length: ${key.length})`);
});

// Use pulumi.log for structured logging that respects secrets
pulumi.log.info("Configuring API integration", undefined);

// Prevent secrets from appearing in stack outputs accidentally
// Only export what downstream stacks actually need
export const outputs = {
    // Safe: endpoint is not a secret
    apiEndpoint: "https://api.example.com",

    // Intentional: explicitly exporting a secret
    // Consumers must use requireOutput with secret handling
    apiKeyId: pulumi.secret("key-12345"),

    // WRONG: This would leak the secret in plaintext
    // apiKey: apiKey.apply(k => k),  // Never do this
};
```

Add these entries to `.gitignore` to prevent accidental commits:

```gitignore
# Pulumi local state and credentials
.pulumi/
*.pem
*.key
secrets.yaml
secrets.json

# Environment files with secrets
.env
.env.*
!.env.example

# Stack configuration may contain encrypted secrets
# Consider storing in a separate secure location
# Pulumi.*.yaml  # Uncomment if not using Pulumi service
```

## 8. Multi-Environment Secret Management

Managing secrets across development, staging, and production requires a structured approach.

```mermaid
flowchart TB
    subgraph "Development"
        D1[Local Passphrase] --> D2[Dev Stack]
        D2 --> D3[Local/Mock Services]
    end

    subgraph "Staging"
        S1[AWS KMS - Staging Key] --> S2[Staging Stack]
        S2 --> S3[Staging Resources]
    end

    subgraph "Production"
        P1[AWS KMS - Prod Key] --> P2[Production Stack]
        P2 --> P3[Production Resources]
        P4[Secrets Manager] --> P2
        P5[IAM Roles] --> P2
    end

    D2 -.->|Promote| S2
    S2 -.->|Promote| P2
```

Structure your project to support multiple environments:

```typescript
// config.ts - Environment-aware secret configuration
import * as pulumi from "@pulumi/pulumi";

const env = pulumi.getStack();
const config = new pulumi.Config();

// Different secret handling per environment
interface SecretConfig {
    databasePassword: pulumi.Output<string>;
    apiKey: pulumi.Output<string>;
    encryptionKey: pulumi.Output<string>;
}

function getSecrets(): SecretConfig {
    switch (env) {
        case "dev":
            // Development uses simple configuration secrets
            return {
                databasePassword: config.requireSecret("dbPassword"),
                apiKey: config.requireSecret("apiKey"),
                encryptionKey: config.requireSecret("encryptionKey"),
            };

        case "staging":
        case "production":
            // Production fetches from Secrets Manager
            const dbSecret = aws.secretsmanager.getSecretVersionOutput({
                secretId: `${env}/database/credentials`,
            });
            const apiSecret = aws.secretsmanager.getSecretVersionOutput({
                secretId: `${env}/api/credentials`,
            });

            return {
                databasePassword: dbSecret.secretString.apply(s => JSON.parse(s).password),
                apiKey: apiSecret.secretString.apply(s => JSON.parse(s).key),
                encryptionKey: config.requireSecret("encryptionKey"),
            };

        default:
            throw new Error(`Unknown environment: ${env}`);
    }
}

export const secrets = getSecrets();
```

## 9. CI/CD Integration

Secrets in CI/CD pipelines require special handling to prevent exposure in logs while enabling automated deployments.

```yaml
# .github/workflows/pulumi.yml - GitHub Actions with secrets
name: Pulumi Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          # Use OIDC for production - no long-lived credentials
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Pulumi preview
        uses: pulumi/actions@v5
        with:
          command: preview
          stack-name: production
        env:
          # Pulumi access token for state management
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}

      - name: Pulumi deploy
        if: github.ref == 'refs/heads/main'
        uses: pulumi/actions@v5
        with:
          command: up
          stack-name: production
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          # Additional secrets passed as config
          PULUMI_CONFIG_PASSPHRASE: ${{ secrets.PULUMI_PASSPHRASE }}
```

## 10. Auditing and Compliance

For compliance requirements, implement logging and monitoring around secret access.

```typescript
// audit-setup.ts - Secret access auditing
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Enable CloudTrail for Secrets Manager API calls
const auditTrail = new aws.cloudtrail.Trail("secrets-audit", {
    name: "secrets-access-audit",
    s3BucketName: auditBucket.id,
    includeGlobalServiceEvents: true,
    isMultiRegionTrail: true,
    enableLogFileValidation: true,

    eventSelectors: [{
        readWriteType: "All",
        includeManagementEvents: true,
        dataResources: [{
            type: "AWS::SecretsManager::Secret",
            values: ["arn:aws:secretsmanager:*:*:secret:*"],
        }],
    }],
});

// CloudWatch alarm for unusual secret access patterns
const secretAccessAlarm = new aws.cloudwatch.MetricAlarm("unusual-secret-access", {
    alarmName: "UnusualSecretAccess",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 1,
    metricName: "GetSecretValue",
    namespace: "AWS/SecretsManager",
    period: 300,
    statistic: "Sum",
    threshold: 100,
    alarmDescription: "Alert on unusual secret access volume",
    alarmActions: [alertTopic.arn],
});

// Resource policy restricting secret access to specific roles
const secretPolicy = new aws.secretsmanager.SecretPolicy("restricted-access", {
    secretArn: productionSecret.arn,
    policy: pulumi.jsonStringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Deny",
            Principal: "*",
            Action: "secretsmanager:GetSecretValue",
            Resource: "*",
            Condition: {
                StringNotEquals: {
                    "aws:PrincipalArn": [
                        applicationRole.arn,
                        deploymentRole.arn,
                    ],
                },
            },
        }],
    }),
});
```

---

Secrets management in Pulumi combines encryption by default with flexibility in choosing your encryption provider. Start with the built-in Pulumi service encryption for simplicity, then graduate to customer-managed KMS keys as your compliance requirements grow. Always treat secret Outputs carefully in your code, and integrate with external secret managers for features like automatic rotation and centralized auditing.
