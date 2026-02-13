# How to Handle Credentials in AWS SDK for JavaScript v3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, JavaScript, Node.js, Security

Description: Learn how to configure and manage AWS credentials in the JavaScript SDK v3, including environment variables, profiles, IAM roles, SSO, and security best practices.

---

Getting credentials right is the first hurdle with any AWS SDK. The v3 JavaScript SDK supports multiple credential sources, and understanding when to use each one saves a lot of debugging. Let's walk through every credential strategy you need to know, from local development to production deployments.

## The Default Credential Provider Chain

When you don't explicitly provide credentials to a client, the SDK automatically searches through a chain of credential sources. It checks them in this order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. SSO credentials from `~/.aws/config`
4. Web identity token (for EKS pods)
5. EC2 instance metadata / ECS task role / Lambda execution role

This means in most environments, you don't need to configure credentials at all.

```javascript
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

// The SDK automatically resolves credentials from the chain
const s3 = new S3Client({ region: 'us-east-1' });

// This works without any explicit credential configuration
const response = await s3.send(new ListBucketsCommand({}));
console.log(response.Buckets);
```

## Environment Variables

The most common approach for CI/CD pipelines and containers.

```bash
# Set these in your environment
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_SESSION_TOKEN=FwoGZXIvYXdzEBY...  # only for temporary credentials
export AWS_REGION=us-east-1
```

```javascript
import { S3Client } from '@aws-sdk/client-s3';

// SDK picks up credentials from environment automatically
const s3 = new S3Client({ region: process.env.AWS_REGION });
```

## Shared Credentials File

For local development, you typically use the AWS credentials file at `~/.aws/credentials`.

```ini
# ~/.aws/credentials
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[staging]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY

[production]
aws_access_key_id = AKIAIB3HRZEXAMPLEKEY
aws_secret_access_key = dGhpcyBpcyBub3QgYSByZWFsIHNlY3JldCBrZXk=
```

To use a non-default profile, set the `AWS_PROFILE` environment variable or specify it in code.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';

// Use a specific profile from ~/.aws/credentials
const s3 = new S3Client({
    region: 'us-east-1',
    credentials: fromIni({ profile: 'staging' })
});
```

## Explicit Credentials (Use with Caution)

You can pass credentials directly to the client. This is generally a bad practice for production, but sometimes necessary for testing or special cases.

```javascript
import { S3Client } from '@aws-sdk/client-s3';

// Explicit credentials - NOT recommended for production
const s3 = new S3Client({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.MY_AWS_KEY,
        secretAccessKey: process.env.MY_AWS_SECRET
    }
});
```

## Assuming IAM Roles

Role assumption is the recommended pattern for cross-account access and least-privilege architectures.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';

// Option 1: Using the credential provider (recommended)
const s3 = new S3Client({
    region: 'us-east-1',
    credentials: fromTemporaryCredentials({
        params: {
            RoleArn: 'arn:aws:iam::123456789012:role/CrossAccountRole',
            RoleSessionName: 'my-app-session',
            DurationSeconds: 3600  // 1 hour
        }
    })
});

// Option 2: Manual role assumption
async function getAssumedRoleCredentials(roleArn) {
    const sts = new STSClient({ region: 'us-east-1' });

    const response = await sts.send(new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: 'my-session',
        DurationSeconds: 3600
    }));

    return {
        accessKeyId: response.Credentials.AccessKeyId,
        secretAccessKey: response.Credentials.SecretAccessKey,
        sessionToken: response.Credentials.SessionToken,
        expiration: response.Credentials.Expiration
    };
}

const credentials = await getAssumedRoleCredentials(
    'arn:aws:iam::123456789012:role/CrossAccountRole'
);

const s3Manual = new S3Client({
    region: 'us-east-1',
    credentials
});
```

## AWS SSO Credentials

If your organization uses AWS SSO (now called IAM Identity Center), the SDK can use SSO credentials configured through the AWS CLI.

First, set up SSO in your config file.

```ini
# ~/.aws/config
[profile my-sso-profile]
sso_start_url = https://my-company.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = us-east-1
output = json
```

Then use it in your code.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { fromSSO } from '@aws-sdk/credential-providers';

const s3 = new S3Client({
    region: 'us-east-1',
    credentials: fromSSO({ profile: 'my-sso-profile' })
});
```

Make sure you've run `aws sso login --profile my-sso-profile` first.

## Web Identity Token (for EKS)

Kubernetes pods running on EKS can use web identity tokens for authentication.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { fromWebToken } from '@aws-sdk/credential-providers';
import { readFileSync } from 'fs';

// EKS sets these environment variables automatically
const s3 = new S3Client({
    region: 'us-east-1',
    credentials: fromWebToken({
        roleArn: process.env.AWS_ROLE_ARN,
        webIdentityToken: readFileSync(
            process.env.AWS_WEB_IDENTITY_TOKEN_FILE,
            'utf-8'
        )
    })
});
```

In practice, the default credential chain handles this automatically if the environment variables are set by EKS.

## Credential Caching and Refresh

Temporary credentials expire. The SDK's credential providers handle automatic refresh, but you can also build your own caching.

```javascript
import { S3Client } from '@aws-sdk/client-s3';

class CachedCredentialProvider {
    constructor(underlyingProvider, refreshBufferSeconds = 300) {
        this.provider = underlyingProvider;
        this.refreshBuffer = refreshBufferSeconds * 1000;
        this.cachedCredentials = null;
    }

    async resolve() {
        const now = Date.now();

        if (this.cachedCredentials &&
            this.cachedCredentials.expiration &&
            (this.cachedCredentials.expiration.getTime() - now) > this.refreshBuffer) {
            return this.cachedCredentials;
        }

        console.log('Refreshing credentials...');
        this.cachedCredentials = await this.provider();
        return this.cachedCredentials;
    }
}
```

## Environment-Based Configuration

A clean pattern for handling credentials across different deployment environments.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { fromIni, fromTemporaryCredentials } from '@aws-sdk/credential-providers';

function getCredentials() {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
        case 'development':
            // Use local profile
            return fromIni({ profile: process.env.AWS_PROFILE || 'dev' });

        case 'staging':
            // Assume a staging role
            return fromTemporaryCredentials({
                params: {
                    RoleArn: process.env.STAGING_ROLE_ARN,
                    RoleSessionName: 'staging-session'
                }
            });

        case 'production':
            // Let the SDK use the default chain (IAM role, etc.)
            return undefined;

        default:
            return undefined;
    }
}

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: getCredentials()
});
```

## Testing Credential Configuration

A quick utility to verify your credentials are working.

```javascript
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

async function checkCredentials() {
    try {
        const sts = new STSClient({ region: 'us-east-1' });
        const identity = await sts.send(new GetCallerIdentityCommand({}));

        console.log('Credentials valid!');
        console.log(`  Account: ${identity.Account}`);
        console.log(`  User ARN: ${identity.Arn}`);
        console.log(`  User ID: ${identity.UserId}`);
        return true;
    } catch (error) {
        console.error('Credential check failed:', error.message);
        return false;
    }
}

await checkCredentials();
```

## Best Practices

- **Never hardcode credentials.** Use environment variables, profiles, or IAM roles.
- **Use IAM roles in production.** EC2 instance roles, ECS task roles, and Lambda execution roles are the most secure option.
- **Rotate access keys regularly.** If you must use long-term credentials, set up a rotation schedule.
- **Use least-privilege IAM policies.** Only grant the permissions your application actually needs.
- **Enable MFA for sensitive operations** when using profiles that support it.
- **Test your credential chain** early in development. Don't wait until deployment to discover issues.

For more on setting up SDK clients with these credentials, see the guide on [setting up AWS SDK v3 clients](https://oneuptime.com/blog/post/2026-02-12-aws-sdk-v3-clients-nodejs/view). And if you're testing locally without real AWS credentials, [LocalStack](https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view) is an excellent option.
