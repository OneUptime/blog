# How to Set Up AWS Transfer Family for FTPS Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Transfer Family, FTPS, S3, File Transfer

Description: Deploy AWS Transfer Family with FTPS protocol for secure file transfers to S3, including TLS certificate setup, passive mode configuration, and user management.

---

While SFTP gets most of the attention, many legacy systems and partners still use FTPS (FTP over TLS) for file transfers. Maybe you have an old ERP system that only speaks FTPS, or a trading partner whose integration was built a decade ago and isn't changing anytime soon. Whatever the reason, AWS Transfer Family supports FTPS alongside SFTP, so you can serve both protocols from a single managed service.

FTPS adds TLS encryption on top of the FTP protocol, which means you get encryption in transit without changing the fundamental FTP workflow. The main difference from SFTP is that FTPS uses certificates for server identity instead of SSH host keys.

## FTPS vs. SFTP - Quick Comparison

Before setting things up, here's why you might choose FTPS:

- Your clients or partners specifically require FTP over TLS
- You need certificate-based server authentication
- Legacy systems that only support FTP/FTPS
- Compliance requirements that specify FTPS

SFTP is generally simpler to manage (single port, no passive mode headaches), so use that if you have a choice. But when FTPS is what you need, Transfer Family has you covered.

## Step 1: Get a TLS Certificate

FTPS requires a TLS certificate for the server. You can use AWS Certificate Manager (ACM) to provision one:

```bash
# Request a public certificate from ACM

aws acm request-certificate \
  --domain-name "ftps.example.com" \
  --validation-method DNS \
  --region us-east-1

# You'll get a certificate ARN back like:
# arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456

# List pending certificates to get validation records
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456" \
  --query 'Certificate.DomainValidationOptions'
```

After requesting the certificate, you need to add the CNAME validation record to your DNS. If you're using Route 53:

```bash
# Add the validation CNAME record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_validation.ftps.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_validation-value.acm-validations.aws"}]
      }
    }]
  }'

# Wait for certificate validation
aws acm wait certificate-validated \
  --certificate-arn "arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456"
```

## Step 2: Create the FTPS Server

Now create the Transfer Family server with FTPS protocol:

```bash
# Create an FTPS server with a VPC endpoint
aws transfer create-server \
  --protocols FTPS \
  --certificate "arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456" \
  --identity-provider-type AWS_LAMBDA \
  --identity-provider-details '{
    "Function": "arn:aws:lambda:us-east-1:123456789012:function:TransferFamilyAuth"
  }' \
  --endpoint-type VPC \
  --endpoint-details '{
    "SubnetIds": ["subnet-0abc1234", "subnet-0def5678"],
    "VpcId": "vpc-0abc1234",
    "SecurityGroupIds": ["sg-0123456789abcdef0"]
  }' \
  --logging-role "arn:aws:iam::123456789012:role/TransferFamilyLoggingRole" \
  --security-policy-name "TransferSecurityPolicy-2024-01" \
  --tags Key=transfer:customHostname,Value=ftps.example.com Key=transfer:route53HostedZoneId,Value=Z1234567890
```

A few important notes:

- **FTPS requires a VPC endpoint** - public endpoints aren't supported for FTPS. This is actually fine because FTPS passive mode needs specific port ranges, which VPC security groups handle well.
- **Security policy**: The `TransferSecurityPolicy-2024-01` is the default Transfer Family security policy and uses modern TLS cipher suites. Review the current security policy list if you need the newest or a FIPS-specific policy.
- **Certificate**: Must be a valid certificate in ACM that matches your custom domain.
- **Identity provider**: Service-managed users are for SFTP only. FTPS requires AWS Managed Microsoft AD, an AWS Lambda identity provider, or an API Gateway identity provider.

## Step 3: Configure Security Groups

FTPS uses multiple ports - the control channel (port 21) and passive data channels. This is the trickiest part of FTPS setup:

```bash
# Allow FTPS control channel
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 21 \
  --cidr 0.0.0.0/0

# Allow FTPS passive data channels
# Transfer Family uses ports 8192-8200 for passive mode
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 8192-8200 \
  --cidr 0.0.0.0/0
```

In production, replace `0.0.0.0/0` with the specific IP ranges of your FTPS clients. The passive port range 8192-8200 is what Transfer Family uses by default.

## Step 4: Set Up DNS

Point your custom domain to the Transfer Family VPC endpoint:

```bash
# Get the VPC endpoint IPs
aws transfer describe-server \
  --server-id s-0123456789abcdef0 \
  --query 'Server.EndpointDetails'

# Create a DNS record pointing to the endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "ftps.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2IFOLAFXWLO4F",
          "DNSName": "vpce-0123456789abcdef0-ab12cd34.transfer.us-east-1.vpce.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

## Step 5: Create the S3 Bucket and IAM Role

Set up storage and permissions:

```bash
# Create the bucket
aws s3api create-bucket \
  --bucket ftps-transfer-bucket \
  --region us-east-1

# Create the user role
aws iam create-role \
  --role-name FTPSUserRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "transfer.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy \
  --role-name FTPSUserRole \
  --policy-name S3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
        "Resource": "arn:aws:s3:::ftps-transfer-bucket"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ],
        "Resource": "arn:aws:s3:::ftps-transfer-bucket/*"
      }
    ]
  }'
```

Use this IAM role with a session policy from your custom identity provider if you want to scope each user to their own S3 prefix without needing a separate role per user.

## Step 6: Create Users

For FTPS, user credentials come from AWS Managed Microsoft AD or your custom identity provider. With a Lambda identity provider, return the user's role, home directory, and an optional session policy after validating the username and password:

```json
{
  "Role": "arn:aws:iam::123456789012:role/FTPSUserRole",
  "HomeDirectoryType": "LOGICAL",
  "HomeDirectoryDetails": "[{\"Entry\":\"/\",\"Target\":\"/ftps-transfer-bucket/partner-globex\"}]",
  "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:ListBucket\"],\"Resource\":\"arn:aws:s3:::ftps-transfer-bucket\",\"Condition\":{\"StringLike\":{\"s3:prefix\":[\"partner-globex/*\",\"partner-globex\"]}}},{\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\"],\"Resource\":\"arn:aws:s3:::ftps-transfer-bucket/partner-globex/*\"}]}"
}
```

You can test the identity provider before connecting an FTPS client:

```bash
aws transfer test-identity-provider \
  --server-id s-0123456789abcdef0 \
  --user-name partner-globex \
  --user-password 'correct-horse-battery-staple' \
  --server-protocol FTPS \
  --source-ip 203.0.113.10
```

See our guide on [Transfer Family custom identity providers](https://oneuptime.com/blog/post/2026-02-12-configure-transfer-family-custom-identity-providers/view) for a full Lambda/API Gateway setup.

## Step 7: Test the FTPS Connection

Test the connection using a command-line FTPS client:

```bash
# Using lftp (supports FTPS)
lftp -u partner-globex,correct-horse-battery-staple ftps://ftps.example.com

# Or using curl for a quick test
curl --ssl-reqd --user partner-globex:correct-horse-battery-staple \
  -T test-file.txt \
  "ftp://ftps.example.com/test-file.txt"
```

For Windows clients, tools like WinSCP and FileZilla support FTPS natively.

## Step 8: Set Up Managed Workflows

Transfer Family supports managed workflows that trigger automatically on file upload. This is great for post-processing:

```bash
# Create a workflow that copies and tags uploaded files
aws transfer create-workflow \
  --description "Process FTPS uploads" \
  --steps '[
    {
      "Type": "TAG",
      "TagStepDetails": {
        "Name": "TagUpload",
        "Tags": [
          {"Key": "Source", "Value": "FTPS"},
          {"Key": "Status", "Value": "Pending"}
        ]
      }
    },
    {
      "Type": "COPY",
      "CopyStepDetails": {
        "Name": "CopyToProcessing",
        "DestinationFileLocation": {
          "S3FileLocation": {
            "Bucket": "processing-bucket",
            "Key": "incoming/${Transfer:UserName}/"
          }
        },
        "OverwriteExisting": "TRUE"
      }
    }
  ]' \
  --on-exception-steps '[
    {
      "Type": "TAG",
      "TagStepDetails": {
        "Name": "TagError",
        "Tags": [
          {"Key": "Status", "Value": "Error"}
        ]
      }
    }
  ]'

# Attach the workflow to the server
aws transfer update-server \
  --server-id s-0123456789abcdef0 \
  --workflow-details '{
    "OnUpload": [{
      "WorkflowId": "w-0123456789abcdef0",
      "ExecutionRole": "arn:aws:iam::123456789012:role/TransferWorkflowRole"
    }]
  }'
```

## Monitoring FTPS Activity

Keep track of transfers and user activity:

```bash
# Check CloudWatch logs for FTPS activity
aws logs filter-log-events \
  --log-group-name "/aws/transfer/s-0123456789abcdef0" \
  --filter-pattern "OPEN" \
  --start-time $(date -d '1 hour ago' +%s000)

# Create a metric from failed authentication log entries
aws logs put-metric-filter \
  --log-group-name "/aws/transfer/s-0123456789abcdef0" \
  --filter-name "FTPSAuthFailures" \
  --filter-pattern '{ $.activity-type = "AUTH_FAILURE" }' \
  --metric-transformations \
    metricName=AuthFailures,metricNamespace=TransferFamily/FTPS,metricValue=1

# Set up CloudWatch alarm for failed authentications
aws cloudwatch put-metric-alarm \
  --alarm-name "FTPS-FailedAuth" \
  --namespace "TransferFamily/FTPS" \
  --metric-name "AuthFailures" \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
```

FTPS on Transfer Family gives you the best of both worlds - the familiarity and compatibility of FTP with TLS encryption and the operational simplicity of a fully managed service. No more patching vsftpd on EC2 instances at 2 AM.
