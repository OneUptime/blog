# How to Use Amazon CodeWhisperer (Amazon Q Developer) for Code Suggestions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Q Developer, CodeWhisperer, AI Coding, Developer Tools, Productivity

Description: Get AI-powered code suggestions in your IDE with Amazon Q Developer (formerly CodeWhisperer) to write code faster with inline completions and chat assistance.

---

Writing code involves a lot of repetitive patterns. Boilerplate API calls, standard error handling, common algorithms, SDK usage patterns - things you have written dozens of times but still need to look up the exact syntax for. Amazon Q Developer (formerly known as Amazon CodeWhisperer) is an AI-powered coding assistant that generates code suggestions in real-time as you type, directly in your IDE.

It works similarly to other AI code completion tools, but with a specific strength in AWS SDK usage. Since it was trained on a large corpus of code including extensive AWS usage patterns, it is particularly good at suggesting correct AWS API calls, CloudFormation templates, and infrastructure-as-code patterns.

## Setting Up Amazon Q Developer

Amazon Q Developer is available as an extension for several IDEs:

- VS Code
- JetBrains IDEs (IntelliJ, PyCharm, WebStorm, etc.)
- Visual Studio
- AWS Cloud9 (built-in)
- Neovim

### VS Code Installation

```bash
# Install the Amazon Q extension from the VS Code marketplace
# Open VS Code, go to Extensions, search for "Amazon Q"
# Or install from command line:
code --install-extension amazonwebservices.amazon-q-vscode
```

After installing:

1. Open VS Code
2. Click the Amazon Q icon in the sidebar
3. Sign in with your AWS Builder ID (free) or IAM Identity Center credentials
4. The extension starts providing suggestions immediately

### JetBrains Installation

```bash
# In your JetBrains IDE:
# Go to Settings > Plugins > Marketplace
# Search for "Amazon Q"
# Install and restart the IDE
```

### Authentication Options

**AWS Builder ID** (free tier) - available to anyone, provides code completions and chat. No AWS account needed.

**IAM Identity Center** (professional tier) - for organizations, includes admin controls, reference tracking, and policy management.

```bash
# For organization setup, configure IAM Identity Center
# The admin enables Amazon Q in the AWS console
# Users authenticate through the SSO flow in their IDE
```

## How Code Suggestions Work

As you type, Amazon Q analyzes the context of your code - the current file, open files, imports, comments, and function signatures - and generates suggestions. You see them as ghost text that you can accept with Tab or dismiss by continuing to type.

### Example 1: AWS SDK Usage

When you start writing code that uses the AWS SDK, Q excels at completing the patterns:

```python
# Type a comment describing what you want, and Q suggests the implementation

# Create an S3 client and upload a file with server-side encryption
import boto3

s3_client = boto3.client('s3')

def upload_file(file_path, bucket, key):
    """Upload a file to S3 with KMS encryption."""
    # Q suggests the complete implementation:
    try:
        s3_client.upload_file(
            file_path,
            bucket,
            key,
            ExtraArgs={
                'ServerSideEncryption': 'aws:kms',
                'SSEKMSKeyId': 'alias/my-key'
            }
        )
        print(f"Successfully uploaded {file_path} to s3://{bucket}/{key}")
        return True
    except Exception as e:
        print(f"Error uploading file: {e}")
        return False
```

### Example 2: Infrastructure as Code

Q is especially helpful with CloudFormation and Terraform:

```yaml
# Type: Create an Aurora PostgreSQL cluster with encryption
# Q generates:
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  AuroraCluster:
    Type: AWS::RDS::DBCluster
    Properties:
      Engine: aurora-postgresql
      EngineVersion: '15.4'
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      StorageEncrypted: true
      KmsKeyId: !Ref KMSKey
      BackupRetentionPeriod: 7
      PreferredBackupWindow: '03:00-04:00'
      VpcSecurityGroupIds:
        - !Ref DBSecurityGroup
      DBSubnetGroupName: !Ref DBSubnetGroup
```

### Example 3: Lambda Function Patterns

```python
# Write a Lambda function that processes SQS messages and writes to DynamoDB
import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ProcessedMessages')

def lambda_handler(event, context):
    """Process SQS messages and store results in DynamoDB."""
    # Q suggests the complete SQS batch processing pattern:
    processed = 0
    failed = []

    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            message_id = record['messageId']

            # Process the message
            result = process_message(body)

            # Write to DynamoDB
            table.put_item(
                Item={
                    'message_id': message_id,
                    'processed_at': datetime.utcnow().isoformat(),
                    'status': 'success',
                    'result': result
                }
            )
            processed += 1

        except Exception as e:
            failed.append({
                'itemIdentifier': record['messageId']
            })
            print(f"Error processing message {record['messageId']}: {e}")

    # Return failed messages for retry (partial batch response)
    return {
        'batchItemFailures': failed
    }
```

## Using Amazon Q Chat

Beyond inline completions, Amazon Q has a chat interface for more complex questions:

### Explain Code

Select a block of code and ask Q to explain it. This is great for understanding unfamiliar codebases or complex regex patterns.

### Generate Tests

Ask Q to generate unit tests for your functions:

```
You: Write pytest tests for the upload_file function

Q generates:
```

```python
# test_upload.py - unit tests for the file upload function
import pytest
from unittest.mock import patch, MagicMock
from upload import upload_file

@patch('upload.s3_client')
def test_upload_file_success(mock_s3):
    """Test successful file upload."""
    mock_s3.upload_file.return_value = None
    result = upload_file('/tmp/test.txt', 'my-bucket', 'test.txt')
    assert result is True
    mock_s3.upload_file.assert_called_once_with(
        '/tmp/test.txt',
        'my-bucket',
        'test.txt',
        ExtraArgs={
            'ServerSideEncryption': 'aws:kms',
            'SSEKMSKeyId': 'alias/my-key'
        }
    )

@patch('upload.s3_client')
def test_upload_file_failure(mock_s3):
    """Test file upload failure handling."""
    mock_s3.upload_file.side_effect = Exception("Access denied")
    result = upload_file('/tmp/test.txt', 'my-bucket', 'test.txt')
    assert result is False
```

### Transform Code

Ask Q to refactor or transform your code:

```
You: Convert this function to use async/await with aiobotocore

Q provides the transformed async version
```

## Security Scanning

Amazon Q includes a security scanning feature that analyzes your code for vulnerabilities:

```bash
# In VS Code, run the security scan:
# Command Palette > Amazon Q: Run Security Scan

# Or trigger it via the Amazon Q sidebar panel
```

The scanner checks for:
- Hardcoded credentials
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Insecure cryptographic practices
- Open S3 bucket configurations
- Overly permissive IAM policies

## Reference Tracking

An important feature for enterprise use is reference tracking. When Q generates code that is similar to code in its training data, it tells you the source repository and license:

```
Suggestion reference:
- Repository: aws/aws-sdk-go-v2
- License: Apache-2.0
- Similarity: High
```

Your organization can configure a policy to filter suggestions that match open source code with specific licenses. This helps avoid accidentally incorporating code with incompatible licenses.

```bash
# Organization admins can configure reference settings
# In the Amazon Q console:
# - Allow all suggestions
# - Allow only suggestions without code references
# - Allow suggestions but show references
```

## Customization

For professional tier users, you can customize Q with your organization's code:

```bash
# Create a customization that trains Q on your private repositories
# This teaches Q your internal APIs, coding patterns, and conventions

# Supported sources:
# - CodeCommit repositories
# - S3 buckets with code
# - GitHub Enterprise (via CodeStar connections)
```

After customization, Q's suggestions align more closely with your organization's coding style, internal APIs, and patterns.

## Tips for Better Suggestions

**Write descriptive comments.** A comment like "Create a DynamoDB table with GSI for querying by email" produces much better suggestions than just starting to type code.

**Use meaningful variable names.** Q uses variable names as context. `user_email` gives better suggestions than `x`.

**Keep related files open.** Q uses open files as context. If you are writing a Lambda handler that uses a utility module, have both files open.

**Accept and iterate.** Accept a suggestion, then modify it rather than trying to get the perfect suggestion on the first try.

**Use the chat for complex patterns.** Inline completions are great for short snippets. For multi-function implementations or architectural questions, use the chat interface.

## Wrapping Up

Amazon Q Developer makes you faster at writing code, especially AWS-related code. The inline suggestions handle the repetitive patterns while you focus on the interesting logic. The security scanning catches vulnerabilities before they make it to production. For teams building on AWS, it is one of the highest-ROI developer tools you can adopt - the free tier is generous enough for individual developers, and the professional tier adds the controls that organizations need.
