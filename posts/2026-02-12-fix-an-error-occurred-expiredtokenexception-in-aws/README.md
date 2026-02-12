# How to Fix 'An error occurred (ExpiredTokenException)' in AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, STS, Troubleshooting, Security

Description: Fix the ExpiredTokenException error in AWS by refreshing temporary credentials, updating session tokens, and implementing proper credential rotation in your applications.

---

The ExpiredTokenException means exactly what it says - the temporary security credentials you're using have expired. This only happens with temporary credentials from AWS STS (Security Token Service), not with long-lived IAM user access keys.

Here's what the error looks like:

```
An error occurred (ExpiredTokenException) when calling the ListBuckets operation:
The security token included in the request is expired
```

Let's fix it for each scenario where it occurs.

## Understanding Temporary Credentials

Temporary credentials come from several sources, and each has different default and maximum lifetimes:

| Source | Default Duration | Maximum Duration |
|--------|-----------------|-----------------|
| AssumeRole | 1 hour | 12 hours (role setting) |
| GetSessionToken | 12 hours | 36 hours |
| GetFederationToken | 12 hours | 36 hours |
| AWS SSO | 1 hour | 12 hours |
| EC2 Instance Role | 6 hours | auto-refreshed |

When the duration expires, any operation using those credentials fails with ExpiredTokenException.

## Fix for AWS CLI with Assumed Roles

If you're using `aws sts assume-role` and the session expired, just re-assume the role.

```bash
# Re-assume the role
aws sts assume-role \
  --role-arn arn:aws:iam::123456789:role/my-role \
  --role-session-name my-session \
  --duration-seconds 3600

# The output gives you new credentials
# Set them as environment variables
export AWS_ACCESS_KEY_ID="new-access-key"
export AWS_SECRET_ACCESS_KEY="new-secret-key"
export AWS_SESSION_TOKEN="new-session-token"
```

Or better yet, configure the CLI to automatically assume the role.

```ini
# ~/.aws/config
[profile my-role-profile]
role_arn = arn:aws:iam::123456789:role/my-role
source_profile = default
duration_seconds = 3600
```

```bash
# Now the CLI automatically refreshes credentials when they expire
aws s3 ls --profile my-role-profile
```

The CLI handles credential refresh automatically when you use profile-based role assumption. It's much better than manually managing temporary credentials.

## Fix for AWS SSO

SSO sessions expire based on your organization's configuration. Refresh them.

```bash
# Re-login to SSO
aws sso login --profile my-sso-profile

# Verify the new credentials work
aws sts get-caller-identity --profile my-sso-profile
```

If you're getting frequent SSO expirations, check with your admin about extending the session duration.

## Fix for MFA-Based Sessions

If you're using MFA to get temporary credentials, the session has expired and you need a new token.

```bash
# Get a new session with your current MFA code
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789:mfa/your-device \
  --token-code 123456 \
  --duration-seconds 43200  # 12 hours

# Update your credentials with the output
aws configure set aws_access_key_id NEW_ACCESS_KEY --profile mfa
aws configure set aws_secret_access_key NEW_SECRET_KEY --profile mfa
aws configure set aws_session_token NEW_SESSION_TOKEN --profile mfa
```

## Fix in Application Code (Python)

If your application is using temporary credentials, it needs to handle refresh. The AWS SDKs have built-in mechanisms for this.

```python
import boto3
from botocore.exceptions import ClientError

# Option 1: Use a role profile (automatic refresh)
session = boto3.Session(profile_name='my-role-profile')
s3 = session.client('s3')

# Option 2: Manually handle credential refresh
class CredentialManager:
    def __init__(self, role_arn, session_name='app-session'):
        self.role_arn = role_arn
        self.session_name = session_name
        self.sts_client = boto3.client('sts')
        self.credentials = None
        self.refresh_credentials()

    def refresh_credentials(self):
        """Get fresh temporary credentials."""
        response = self.sts_client.assume_role(
            RoleArn=self.role_arn,
            RoleSessionName=self.session_name,
            DurationSeconds=3600
        )
        self.credentials = response['Credentials']
        print(f"Credentials refreshed, expire at {self.credentials['Expiration']}")

    def get_client(self, service_name, region_name='us-east-1'):
        """Get a boto3 client with current credentials."""
        return boto3.client(
            service_name,
            region_name=region_name,
            aws_access_key_id=self.credentials['AccessKeyId'],
            aws_secret_access_key=self.credentials['SecretAccessKey'],
            aws_session_token=self.credentials['SessionToken']
        )

    def execute_with_refresh(self, func, *args, **kwargs):
        """Execute a function, refreshing credentials if expired."""
        try:
            return func(*args, **kwargs)
        except ClientError as e:
            if e.response['Error']['Code'] == 'ExpiredTokenException':
                print("Token expired, refreshing...")
                self.refresh_credentials()
                # Retry - the caller needs to recreate the client
                return func(*args, **kwargs)
            raise

# Usage
cred_manager = CredentialManager('arn:aws:iam::123456789:role/my-role')
s3 = cred_manager.get_client('s3')

try:
    buckets = s3.list_buckets()
except ClientError as e:
    if e.response['Error']['Code'] == 'ExpiredTokenException':
        cred_manager.refresh_credentials()
        s3 = cred_manager.get_client('s3')
        buckets = s3.list_buckets()
```

## Fix in Application Code (Node.js)

```javascript
// credential-manager.js
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

class CredentialManager {
  constructor(roleArn) {
    this.roleArn = roleArn;
    this.stsClient = new STSClient({ region: 'us-east-1' });
    this.credentials = null;
    this.expiresAt = null;
  }

  async refreshCredentials() {
    const command = new AssumeRoleCommand({
      RoleArn: this.roleArn,
      RoleSessionName: `session-${Date.now()}`,
      DurationSeconds: 3600
    });

    const response = await this.stsClient.send(command);
    this.credentials = response.Credentials;
    this.expiresAt = this.credentials.Expiration;
    console.log(`Credentials refreshed, expire at ${this.expiresAt}`);
  }

  isExpired() {
    if (!this.expiresAt) return true;
    // Refresh 5 minutes before actual expiration
    const buffer = 5 * 60 * 1000;
    return Date.now() > (this.expiresAt.getTime() - buffer);
  }

  async getCredentials() {
    if (this.isExpired()) {
      await this.refreshCredentials();
    }
    return {
      accessKeyId: this.credentials.AccessKeyId,
      secretAccessKey: this.credentials.SecretAccessKey,
      sessionToken: this.credentials.SessionToken
    };
  }

  async getClient(ClientClass, config = {}) {
    const creds = await this.getCredentials();
    return new ClientClass({
      ...config,
      credentials: creds
    });
  }
}

// Usage
const manager = new CredentialManager('arn:aws:iam::123456789:role/my-role');

async function listBuckets() {
  const s3 = await manager.getClient(S3Client, { region: 'us-east-1' });
  const response = await s3.send(new ListBucketsCommand({}));
  return response.Buckets;
}
```

## Fix for EC2 Instances

EC2 instances with IAM roles should never get this error because the instance metadata service automatically refreshes credentials. If you are seeing it, something is overriding the automatic refresh.

```bash
# Check if environment variables are overriding instance credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SESSION_TOKEN

# Clear them to fall back to instance role
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN

# Verify instance metadata is working
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

## Increasing Token Duration

If tokens are expiring too quickly, increase the duration.

```bash
# Set the maximum session duration on the role (up to 12 hours)
aws iam update-role \
  --role-name my-role \
  --max-session-duration 43200

# Now you can request longer sessions
aws sts assume-role \
  --role-arn arn:aws:iam::123456789:role/my-role \
  --role-session-name my-session \
  --duration-seconds 43200
```

Note: The requested duration can't exceed the role's maximum session duration.

## Preventing the Error

The best approach is to never let tokens expire in the first place:

1. **Use SDK profile-based role assumption** - the SDKs handle refresh automatically
2. **Add a refresh buffer** - refresh credentials 5-10 minutes before they expire
3. **Don't cache credentials in environment variables** for long-running processes
4. **Use IAM roles on EC2/ECS/Lambda** instead of temporary credentials

## Summary

ExpiredTokenException happens when temporary credentials run out. The fix depends on how you got those credentials - re-assume the role, re-login to SSO, or get a new MFA session. For applications, implement automatic credential refresh with a buffer before expiration. And whenever possible, use SDK features that handle credential lifecycle automatically rather than managing tokens manually.
