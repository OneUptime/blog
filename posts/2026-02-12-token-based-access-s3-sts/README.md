# How to Implement Token-Based Access for S3 with STS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, STS, Security, IAM

Description: Use AWS Security Token Service to generate temporary credentials for S3 access, implementing least-privilege and time-limited data sharing.

---

Handing out permanent IAM credentials for S3 access is asking for trouble. Long-lived access keys get leaked in git repos, shared in Slack channels, embedded in client applications, and forgotten about in config files. When they're eventually compromised - and they will be - you've got unrestricted S3 access floating around with no expiration.

AWS Security Token Service (STS) solves this with temporary credentials. Instead of permanent keys, you generate short-lived tokens that automatically expire. You can scope them to specific buckets, prefixes, and actions. And when the token expires, access stops - no manual revocation needed.

Let's implement several common patterns for token-based S3 access.

## Pattern 1: AssumeRole for Application Access

The most common pattern. Your application assumes an IAM role to get temporary credentials scoped to specific S3 operations.

### Create the IAM Role

This role allows specific S3 actions on a specific bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::user-uploads-bucket",
        "arn:aws:s3:::user-uploads-bucket/*"
      ]
    }
  ]
}
```

The trust policy allows your application's role or EC2 instance to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111111111111:role/ApplicationRole"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "unique-external-id"
        }
      }
    }
  ]
}
```

### Assume the Role and Get Credentials

This Python code assumes the role and gets temporary S3 credentials:

```python
import boto3

sts = boto3.client('sts')

# Assume the role
response = sts.assume_role(
    RoleArn='arn:aws:iam::111111111111:role/S3UploadsRole',
    RoleSessionName='upload-session',
    DurationSeconds=900,  # 15 minutes
    ExternalId='unique-external-id'
)

# Extract temporary credentials
credentials = response['Credentials']
print(f"Access Key: {credentials['AccessKeyId']}")
print(f"Expires: {credentials['Expiration']}")

# Create S3 client with temporary credentials
s3 = boto3.client(
    's3',
    aws_access_key_id=credentials['AccessKeyId'],
    aws_secret_access_key=credentials['SecretAccessKey'],
    aws_session_token=credentials['SessionToken']
)

# Now use S3 with scoped, temporary access
s3.put_object(
    Bucket='user-uploads-bucket',
    Key='uploads/file.txt',
    Body=b'file content'
)
```

## Pattern 2: Pre-Signed URLs for Direct Client Access

When a web or mobile client needs to upload or download directly from S3 without going through your server. Pre-signed URLs are generated server-side and contain temporary authorization embedded in the URL itself.

### Generate a Pre-Signed Upload URL

This generates a URL that allows a client to upload a file directly to S3:

```python
import boto3

s3 = boto3.client('s3')

# Generate pre-signed URL for upload
upload_url = s3.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': 'user-uploads-bucket',
        'Key': 'uploads/user123/photo.jpg',
        'ContentType': 'image/jpeg'
    },
    ExpiresIn=300  # 5 minutes
)

print(f"Upload URL: {upload_url}")
```

The client uses the URL with a simple HTTP PUT:

```bash
# Client-side upload using the pre-signed URL
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg \
  "$PRESIGNED_URL"
```

### Generate a Pre-Signed Download URL

```python
# Generate pre-signed URL for download
download_url = s3.generate_presigned_url(
    'get_object',
    Params={
        'Bucket': 'user-uploads-bucket',
        'Key': 'uploads/user123/photo.jpg'
    },
    ExpiresIn=3600  # 1 hour
)

print(f"Download URL: {download_url}")
```

### Pre-Signed POST for Browser Uploads

For HTML form-based uploads, use pre-signed POST:

```python
# Generate pre-signed POST fields
post = s3.generate_presigned_post(
    Bucket='user-uploads-bucket',
    Key='uploads/${filename}',
    Fields={
        'Content-Type': 'image/jpeg',
        'x-amz-meta-user': 'user123'
    },
    Conditions=[
        {'Content-Type': 'image/jpeg'},
        ['content-length-range', 1, 10485760],  # 1 byte to 10MB
        {'x-amz-meta-user': 'user123'}
    ],
    ExpiresIn=600  # 10 minutes
)

print(f"URL: {post['url']}")
print(f"Fields: {post['fields']}")
```

The HTML form:

```html
<form action="POST_URL" method="post" enctype="multipart/form-data">
  <!-- Include all fields from the POST response -->
  <input type="hidden" name="key" value="uploads/${filename}" />
  <input type="hidden" name="Content-Type" value="image/jpeg" />
  <!-- ... other fields ... -->
  <input type="file" name="file" />
  <button type="submit">Upload</button>
</form>
```

## Pattern 3: Federated Access with GetFederationToken

For external users or applications that need broader but time-limited access. GetFederationToken creates temporary credentials with an inline policy.

This generates federated credentials that allow read access to a user's specific S3 prefix:

```python
import boto3
import json

sts = boto3.client('sts')

# Generate federated token with scoped policy
response = sts.get_federation_token(
    Name='user-123',
    DurationSeconds=3600,  # 1 hour
    Policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::shared-data-bucket",
                    "arn:aws:s3:::shared-data-bucket/users/user-123/*"
                ],
                "Condition": {
                    "StringLike": {
                        "s3:prefix": ["users/user-123/*"]
                    }
                }
            }
        ]
    })
)

credentials = response['Credentials']
# Share these temporary credentials with the external user
```

## Pattern 4: Cross-Account S3 Access

When you need to give another AWS account temporary access to your S3 bucket.

### Set Up the Cross-Account Role

In the account that owns the S3 bucket, create a role with a trust policy for the other account:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "cross-account-access-key"
        }
      }
    }
  ]
}
```

From the other account, assume the role:

```python
import boto3

sts = boto3.client('sts')

# Assume cross-account role
response = sts.assume_role(
    RoleArn='arn:aws:iam::111111111111:role/CrossAccountS3Role',
    RoleSessionName='cross-account-session',
    ExternalId='cross-account-access-key',
    DurationSeconds=3600
)

# Use the credentials
s3 = boto3.client(
    's3',
    aws_access_key_id=response['Credentials']['AccessKeyId'],
    aws_secret_access_key=response['Credentials']['SecretAccessKey'],
    aws_session_token=response['Credentials']['SessionToken']
)

# Access the bucket in the other account
objects = s3.list_objects_v2(
    Bucket='shared-data-bucket',
    Prefix='shared/'
)
```

## Pattern 5: API Gateway with STS for Mobile/Web Apps

For client applications, use API Gateway + Lambda to vend temporary credentials.

This Lambda function issues scoped STS credentials for authenticated users:

```python
import boto3
import json

sts = boto3.client('sts')

def handler(event, context):
    # Get authenticated user from the API Gateway authorizer
    user_id = event['requestContext']['authorizer']['claims']['sub']

    # Assume a role with session tags for the user
    response = sts.assume_role(
        RoleArn='arn:aws:iam::111111111111:role/UserS3AccessRole',
        RoleSessionName=f'user-{user_id}',
        DurationSeconds=900,
        Tags=[
            {
                'Key': 'UserId',
                'Value': user_id
            }
        ]
    )

    creds = response['Credentials']

    return {
        'statusCode': 200,
        'body': json.dumps({
            'accessKeyId': creds['AccessKeyId'],
            'secretAccessKey': creds['SecretAccessKey'],
            'sessionToken': creds['SessionToken'],
            'expiration': creds['Expiration'].isoformat(),
            'bucket': 'user-data-bucket',
            'prefix': f'users/{user_id}/'
        })
    }
```

The role policy uses session tags to restrict each user to their own prefix:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::user-data-bucket/users/${aws:PrincipalTag/UserId}/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::user-data-bucket",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["users/${aws:PrincipalTag/UserId}/*"]
        }
      }
    }
  ]
}
```

## Security Best Practices

**Use the shortest duration possible.** 15 minutes for uploads, 1 hour for browsing sessions. Don't default to the maximum.

**Always scope to specific resources.** Never give `s3:*` on `*`. Specify buckets, prefixes, and actions.

**Use session tags for per-user isolation.** As shown in Pattern 5, session tags let you use a single role with dynamic resource scoping.

**Validate on the server side.** Pre-signed URLs are great for direct uploads, but always validate the uploaded content server-side afterward.

**Log everything.** Enable S3 access logging and CloudTrail to audit who accessed what. See our [VPC endpoint policies guide](https://oneuptime.com/blog/post/vpc-endpoint-policies-s3-dynamodb/view) for restricting S3 access to your VPC.

**Monitor credential usage.** Unusual patterns of STS calls or S3 access from temporary credentials could indicate compromise. Use [OneUptime](https://oneuptime.com) to monitor these patterns.

Token-based S3 access is more work up front than dropping access keys into a config file, but it eliminates an entire class of security risks. Temporary credentials that expire and are scoped to exactly what's needed - that's how access should work.
