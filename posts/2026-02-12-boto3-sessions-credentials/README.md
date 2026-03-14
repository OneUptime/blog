# How to Handle Boto3 Sessions and Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Boto3, Python, Credentials, SDK

Description: A comprehensive guide to managing Boto3 sessions, credential chains, and best practices for handling AWS authentication in Python applications.

---

Boto3 is the AWS SDK for Python, and virtually every Python application that talks to AWS uses it. But there's a surprising amount of nuance in how Boto3 handles sessions and credentials. Getting it right means your app works seamlessly across local development, CI/CD, containers, and Lambda. Getting it wrong means mysterious authentication errors, credential leaks, or applications that work on your laptop but break in production.

Let's go through sessions and credentials properly, from basic usage to production patterns.

## Sessions vs. Clients vs. Resources

Boto3 has three main concepts:

- **Session** - holds configuration state (credentials, region, profile). Think of it as the authentication context.
- **Client** - low-level service access. Returns raw dictionaries. Every API call maps to a method.
- **Resource** - high-level, object-oriented access. More Pythonic, but only available for some services.

Here's the basic usage.

```python
import boto3

# Default session (uses default credential chain)
session = boto3.Session()

# Create a client from the session
s3_client = session.client('s3')

# Create a resource from the session
s3_resource = session.resource('s3')

# Shorthand - creates a default session implicitly
s3_client = boto3.client('s3')
s3_resource = boto3.resource('s3')
```

The shorthand `boto3.client('s3')` creates a default session behind the scenes. This is fine for simple scripts, but for applications with multiple AWS accounts or regions, explicit sessions are better.

## The Credential Resolution Chain

When Boto3 needs credentials, it checks these sources in order:

1. **Explicitly passed credentials** (in code)
2. **Environment variables** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`)
3. **Shared credential file** (`~/.aws/credentials`)
4. **AWS config file** (`~/.aws/config`)
5. **Assume role provider** (if configured in profile)
6. **Boto2 config file** (`/etc/boto.cfg`, `~/.boto`)
7. **Instance metadata** (EC2 instance role, ECS task role, Lambda execution role)

For most production applications, you should rely on instance metadata (number 7). For local development, use named profiles (numbers 3-4).

```python
import boto3

# Method 1: Explicit credentials (avoid in production)
session = boto3.Session(
    aws_access_key_id='AKIA...',
    aws_secret_access_key='secret...',
    region_name='us-east-1'
)

# Method 2: Named profile (good for local development)
session = boto3.Session(profile_name='staging')

# Method 3: Environment variables (good for containers)
# Just set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
# Then use default session
session = boto3.Session()

# Method 4: Instance role (best for production)
# On EC2, ECS, Lambda - credentials are automatic
session = boto3.Session(region_name='us-east-1')
```

## Session Management Patterns

### Pattern 1: Single Account, Single Region

The simplest case. Just use the default session.

```python
import boto3

def get_s3_objects(bucket_name):
    s3 = boto3.client('s3')
    response = s3.list_objects_v2(Bucket=bucket_name)
    return response.get('Contents', [])
```

### Pattern 2: Multiple Regions

Create separate sessions for each region.

```python
import boto3

class MultiRegionClient:
    def __init__(self, service, regions):
        self.clients = {}
        for region in regions:
            session = boto3.Session(region_name=region)
            self.clients[region] = session.client(service)

    def call_all_regions(self, method, **kwargs):
        """Call a method in all regions and aggregate results."""
        results = {}
        for region, client in self.clients.items():
            try:
                func = getattr(client, method)
                results[region] = func(**kwargs)
            except Exception as e:
                results[region] = {'error': str(e)}
        return results

# Usage: list EC2 instances across regions
ec2_multi = MultiRegionClient('ec2', ['us-east-1', 'us-west-2', 'eu-west-1'])
all_instances = ec2_multi.call_all_regions('describe_instances')

for region, response in all_instances.items():
    if 'error' in response:
        print(f"{region}: Error - {response['error']}")
    else:
        count = sum(len(r['Instances']) for r in response['Reservations'])
        print(f"{region}: {count} instances")
```

### Pattern 3: Cross-Account Access with AssumeRole

For accessing resources in other AWS accounts.

```python
import boto3

def get_cross_account_session(role_arn, session_name='cross-account', duration=3600):
    """
    Assume a role in another account and return a session.
    """
    # Use the default session to call STS
    sts = boto3.client('sts')

    response = sts.assume_role(
        RoleArn=role_arn,
        RoleSessionName=session_name,
        DurationSeconds=duration
    )

    credentials = response['Credentials']

    # Create a new session with the temporary credentials
    return boto3.Session(
        aws_access_key_id=credentials['AccessKeyId'],
        aws_secret_access_key=credentials['SecretAccessKey'],
        aws_session_token=credentials['SessionToken']
    )

# Access resources in another account
prod_session = get_cross_account_session(
    'arn:aws:iam::333333333333:role/ReadOnlyAccess'
)
prod_ec2 = prod_session.client('ec2', region_name='us-east-1')
instances = prod_ec2.describe_instances()
```

### Pattern 4: Credential Refresh for Long-Running Applications

Temporary credentials (from roles, SSO, etc.) expire. For long-running applications, you need to handle refresh.

```python
import boto3
from botocore.credentials import RefreshableCredentials
from botocore.session import get_session
import datetime

def get_refreshable_session(role_arn, session_name='refreshable'):
    """
    Create a session that automatically refreshes credentials
    when they expire. Perfect for long-running services.
    """
    def refresh():
        sts = boto3.client('sts')
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName=session_name,
            DurationSeconds=3600
        )
        creds = response['Credentials']
        return {
            'access_key': creds['AccessKeyId'],
            'secret_key': creds['SecretAccessKey'],
            'token': creds['SessionToken'],
            'expiry_time': creds['Expiration'].isoformat()
        }

    # Create refreshable credentials
    session_credentials = RefreshableCredentials.create_from_metadata(
        metadata=refresh(),
        refresh_using=refresh,
        method='sts-assume-role'
    )

    # Build a botocore session with the refreshable creds
    botocore_session = get_session()
    botocore_session._credentials = session_credentials

    # Return a boto3 session wrapping it
    return boto3.Session(botocore_session=botocore_session)

# This session automatically refreshes credentials when they expire
session = get_refreshable_session('arn:aws:iam::333333333333:role/ServiceRole')
s3 = session.client('s3')
# Even if this runs for days, credentials stay fresh
```

## Session Configuration

### Custom Retry Configuration

```python
import boto3
from botocore.config import Config

# Custom retry configuration
config = Config(
    retries={
        'max_attempts': 10,        # More retries for flaky calls
        'mode': 'adaptive'          # Adaptive retry mode
    },
    connect_timeout=5,              # Connection timeout in seconds
    read_timeout=10,                # Read timeout in seconds
    max_pool_connections=25         # Connection pool size
)

s3 = boto3.client('s3', config=config)
```

### Regional Endpoints

```python
import boto3

# Use a specific endpoint (useful for VPC endpoints, LocalStack, etc.)
s3 = boto3.client(
    's3',
    endpoint_url='https://vpce-abc123.s3.us-east-1.vpce.amazonaws.com',
    region_name='us-east-1'
)

# LocalStack for testing
dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://localhost:4566',
    region_name='us-east-1',
    aws_access_key_id='test',
    aws_secret_access_key='test'
)
```

## Best Practices

### Don't Hardcode Credentials

```python
# BAD - credentials in code
session = boto3.Session(
    aws_access_key_id='AKIA...',
    aws_secret_access_key='secret...'
)

# GOOD - let the credential chain handle it
session = boto3.Session()

# GOOD - use a profile for local dev
session = boto3.Session(profile_name='dev')
```

### Reuse Sessions and Clients

Creating sessions and clients has overhead. Reuse them.

```python
# BAD - creates a new client for each call
def get_item(table_name, key):
    dynamodb = boto3.resource('dynamodb')  # new resource each time
    table = dynamodb.Table(table_name)
    return table.get_item(Key=key)

# GOOD - reuse the client
dynamodb = boto3.resource('dynamodb')

def get_item(table_name, key):
    table = dynamodb.Table(table_name)
    return table.get_item(Key=key)
```

### Handle Credential Errors Gracefully

```python
from botocore.exceptions import (
    NoCredentialsError,
    PartialCredentialsError,
    ClientError
)

def safe_aws_call():
    try:
        s3 = boto3.client('s3')
        return s3.list_buckets()
    except NoCredentialsError:
        print("No AWS credentials found. Configure credentials or run on an EC2 instance with a role.")
        return None
    except PartialCredentialsError:
        print("Incomplete credentials. Check your configuration.")
        return None
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ExpiredToken':
            print("Credentials have expired. Refresh your session.")
        elif error_code == 'AccessDenied':
            print("Access denied. Check your IAM permissions.")
        else:
            print(f"AWS error: {e}")
        return None
```

### Testing with Mocked Credentials

For unit tests, use moto or mock the boto3 calls.

```python
import boto3
from unittest.mock import patch, MagicMock

# Using environment variables for test credentials
import os
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

# Or mock the client entirely
@patch('boto3.client')
def test_my_function(mock_client):
    mock_s3 = MagicMock()
    mock_client.return_value = mock_s3
    mock_s3.list_buckets.return_value = {
        'Buckets': [{'Name': 'test-bucket'}]
    }

    # Your function that uses boto3
    result = my_function()
    assert result is not None
```

## Monitoring

When your Python applications interact with AWS, monitoring API call latency and error rates is important. For visibility into how your boto3-powered applications are performing, [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can track metrics across your services.

## Wrapping Up

The credential chain is your friend - learn it, trust it, and let it do its job. Use explicit sessions when you need multiple accounts or regions. Reuse clients to avoid unnecessary overhead. And never, ever put access keys in your code. These patterns work from local development through to production, and they'll save you from the authentication headaches that trip up so many Python-on-AWS projects.
