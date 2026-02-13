# How to Migrate Data to S3 Using AWS Transfer Family (SFTP)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Transfer Family, SFTP, Migration

Description: Complete walkthrough for setting up AWS Transfer Family with SFTP to migrate files to S3, including server creation, user management, and custom identity providers.

---

AWS Transfer Family lets you set up a fully managed SFTP, FTPS, or FTP server that stores files directly in S3. It's perfect when you've got external partners or legacy systems that need to push files to you over SFTP - they don't need to know anything about AWS or S3. They just connect to your SFTP endpoint and drop files.

Let's set this up from scratch.

## When to Use Transfer Family

Transfer Family makes sense when:

- External partners send you files via SFTP/FTPS
- You're replacing a self-managed SFTP server
- Legacy applications can only use FTP/SFTP protocols
- You need compliance with standards that require SFTP

If you're doing a bulk one-time migration from on-premises storage, [AWS DataSync](https://oneuptime.com/blog/post/2026-02-12-migrate-data-s3-aws-datasync/view) is a better fit. Transfer Family is designed for ongoing file transfers.

## Step 1: Create the IAM Role

Transfer Family needs an IAM role that allows it to write to your S3 bucket. This role gets assumed by the service when users upload files.

Create a trust policy that allows the Transfer Family service to assume the role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "transfer.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

And the permissions policy for S3 access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion",
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sftp-landing-bucket",
        "arn:aws:s3:::sftp-landing-bucket/*"
      ]
    }
  ]
}
```

Create the role using the CLI.

```bash
# Create the role with the trust policy
aws iam create-role \
  --role-name TransferFamilySFTPRole \
  --assume-role-policy-document file://trust-policy.json

# Attach the S3 access policy
aws iam put-role-policy \
  --role-name TransferFamilySFTPRole \
  --policy-name S3AccessPolicy \
  --policy-document file://s3-policy.json
```

## Step 2: Create the SFTP Server

Now let's create the actual SFTP server.

```bash
# Create a public-facing SFTP server
aws transfer create-server \
  --protocols SFTP \
  --endpoint-type PUBLIC \
  --identity-provider-type SERVICE_MANAGED \
  --logging-role arn:aws:iam::123456789012:role/TransferFamilyLoggingRole \
  --tags Key=Name,Value=partner-sftp-server
```

For production environments, you'll likely want a VPC endpoint instead of a public one. This keeps SFTP traffic within your VPC.

```bash
# Create a VPC-hosted SFTP server
aws transfer create-server \
  --protocols SFTP \
  --endpoint-type VPC \
  --endpoint-details '{
    "VpcId": "vpc-abc123",
    "SubnetIds": ["subnet-111", "subnet-222"],
    "SecurityGroupIds": ["sg-sftp123"]
  }' \
  --identity-provider-type SERVICE_MANAGED
```

The server takes a few minutes to spin up. Check its status.

```bash
# Check server status - wait for ONLINE
aws transfer describe-server \
  --server-id s-abc123def456
```

## Step 3: Add SFTP Users

Each SFTP user maps to an IAM role and an S3 bucket prefix (their "home directory").

First, generate an SSH key pair for the user.

```bash
# Generate SSH key pair for the SFTP user
ssh-keygen -t rsa -b 4096 -f partner_sftp_key -N ""
```

Now create the user.

```bash
# Create an SFTP user with a home directory
aws transfer create-user \
  --server-id s-abc123def456 \
  --user-name partner-acme \
  --role arn:aws:iam::123456789012:role/TransferFamilySFTPRole \
  --home-directory-type LOGICAL \
  --home-directory-mappings '[
    {
      "Entry": "/",
      "Target": "/sftp-landing-bucket/partners/acme"
    }
  ]' \
  --ssh-public-key-body "$(cat partner_sftp_key.pub)"
```

Using logical home directories is important. It means the user sees `/` as their root but they're actually scoped to `/partners/acme` in your bucket. They can't navigate outside their designated prefix.

## Step 4: Configure the S3 Bucket

Set up the target bucket with appropriate structure.

```bash
# Create the landing bucket
aws s3 mb s3://sftp-landing-bucket

# Create prefix structure for partners
aws s3api put-object --bucket sftp-landing-bucket --key partners/acme/
aws s3api put-object --bucket sftp-landing-bucket --key partners/globex/
```

You'll probably want lifecycle rules to manage the data after it lands.

```bash
# Add a lifecycle rule to move files to Infrequent Access after 30 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket sftp-landing-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "MoveToIA",
        "Status": "Enabled",
        "Filter": { "Prefix": "partners/" },
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          }
        ]
      }
    ]
  }'
```

## Step 5: Test the Connection

Your SFTP server gets a hostname like `s-abc123def456.server.transfer.us-east-1.amazonaws.com`. Give it to your partner or test it yourself.

```bash
# Test SFTP connection
sftp -i partner_sftp_key partner-acme@s-abc123def456.server.transfer.us-east-1.amazonaws.com

# Once connected, upload a test file
sftp> put testfile.csv
sftp> ls
sftp> quit
```

Verify the file made it to S3.

```bash
# Check S3 for the uploaded file
aws s3 ls s3://sftp-landing-bucket/partners/acme/
```

## Custom Domain Name

Nobody wants to give partners a hostname like `s-abc123def456.server.transfer.us-east-1.amazonaws.com`. Use Route 53 to add a custom domain.

```bash
# Add a CNAME record pointing to the Transfer Family endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123ABC456 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "sftp.yourcompany.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{
          "Value": "s-abc123def456.server.transfer.us-east-1.amazonaws.com"
        }]
      }
    }]
  }'
```

## Custom Identity Provider with Lambda

For more sophisticated auth - say you want to authenticate against an existing LDAP directory or database - you can use a Lambda-based identity provider.

Create a Lambda function that returns user configuration.

```python
import json

def lambda_handler(event, context):
    """
    Custom identity provider for AWS Transfer Family.
    Returns user config based on username and password.
    """
    username = event.get("username", "")
    password = event.get("password", "")
    server_id = event.get("serverId", "")

    # In production, validate against your actual auth system
    # This is a simplified example
    users_db = {
        "partner-acme": {
            "password": "hashed_password_here",
            "role": "arn:aws:iam::123456789012:role/TransferFamilySFTPRole",
            "home_directory": "/sftp-landing-bucket/partners/acme"
        }
    }

    if username in users_db and validate_password(password, users_db[username]["password"]):
        user = users_db[username]
        return {
            "Role": user["role"],
            "HomeDirectoryType": "LOGICAL",
            "HomeDirectoryDetails": json.dumps([
                {"Entry": "/", "Target": user["home_directory"]}
            ])
        }

    # Return empty response for failed auth
    return {}
```

## Event Notifications

Set up S3 event notifications to trigger processing when files arrive. You can send events to Lambda, SQS, or EventBridge.

```bash
# Configure S3 event notifications for new uploads
aws s3api put-bucket-notification-configuration \
  --bucket sftp-landing-bucket \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [
      {
        "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function/process-sftp-upload",
        "Events": ["s3:ObjectCreated:*"],
        "Filter": {
          "Key": {
            "FilterRules": [
              { "Name": "prefix", "Value": "partners/" },
              { "Name": "suffix", "Value": ".csv" }
            ]
          }
        }
      }
    ]
  }'
```

## Monitoring and Alerting

Transfer Family publishes metrics to CloudWatch. Keep an eye on these.

```bash
# Create a CloudWatch alarm for failed authentications
aws cloudwatch put-metric-alarm \
  --alarm-name sftp-failed-auth \
  --metric-name FilesIn \
  --namespace AWS/Transfer \
  --statistic Sum \
  --period 300 \
  --threshold 0 \
  --comparison-operator LessThanOrEqualToThreshold \
  --evaluation-periods 6 \
  --dimensions Name=ServerId,Value=s-abc123def456
```

For a more comprehensive monitoring setup, integrate with [OneUptime](https://oneuptime.com) to track SFTP server availability, transfer success rates, and alert on failures across your entire pipeline.

## Cost Breakdown

Transfer Family pricing has three components:

- **Server endpoint**: ~$0.30/hour (roughly $216/month) while the server is running
- **Data uploaded**: ~$0.04 per GB
- **Data downloaded**: ~$0.04 per GB

The endpoint cost is the big one. If you don't need 24/7 availability, you can stop the server during off-hours to save costs. But for most production use cases, you'll want it running continuously.

## Wrapping Up

AWS Transfer Family removes the headaches of managing SFTP servers while giving your files a landing zone in S3. The setup is straightforward - create a server, add users, and point them at your bucket. From there, you can build automated processing pipelines using S3 events and Lambda. For processing that landed data at scale, you might want to look into [integrating S3 with AWS Glue](https://oneuptime.com/blog/post/2026-02-12-integrate-s3-aws-glue-etl/view).
