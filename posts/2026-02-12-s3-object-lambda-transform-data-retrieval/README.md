# How to Use S3 Object Lambda to Transform Data on Retrieval

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Lambda, Data Transformation, Serverless

Description: Learn how to use S3 Object Lambda to automatically transform objects as they are retrieved, enabling data redaction, format conversion, and dynamic content without storing multiple copies.

---

Imagine you have a CSV file in S3 with customer data. Marketing needs all the columns. Customer support needs everything except credit card numbers. Analytics needs just the aggregate numbers. With traditional S3, you'd store three copies of the data with different redaction levels. S3 Object Lambda lets you store one copy and transform it on the fly when it's retrieved, applying different transformations based on who's requesting it.

## How S3 Object Lambda Works

S3 Object Lambda sits between the caller and S3. When someone requests an object through an Object Lambda Access Point, S3 invokes your Lambda function instead of returning the raw object. Your function receives the original object data, transforms it however you want, and returns the modified version to the caller.

The caller doesn't know any transformation is happening - they just make a normal GetObject call.

```mermaid
flowchart LR
    A[Client Application] -->|GetObject| B[Object Lambda\nAccess Point]
    B -->|Invokes| C[Lambda Function]
    C -->|Fetches original| D[S3 Access Point]
    D -->|Returns original| C
    C -->|Returns transformed| B
    B -->|Sends transformed| A
```

## Step 1: Create the Supporting Access Point

S3 Object Lambda requires a regular S3 Access Point as its data source. Create one first.

```bash
# Create a standard S3 Access Point
aws s3control create-access-point \
  --account-id 123456789012 \
  --name my-data-ap \
  --bucket my-data-bucket
```

## Step 2: Write the Lambda Function

Here's a Lambda function that redacts personally identifiable information from CSV files.

```python
import boto3
import csv
import io
import requests

def lambda_handler(event, context):
    """
    S3 Object Lambda handler that redacts PII from CSV files.
    Replaces email addresses and phone numbers with [REDACTED].
    """
    # Get the presigned URL to fetch the original object
    object_get_context = event['getObjectContext']
    request_route = object_get_context['outputRoute']
    request_token = object_get_context['outputToken']
    original_url = object_get_context['inputS3Url']

    # Fetch the original object from S3
    response = requests.get(original_url)
    original_data = response.text

    # Parse CSV and redact PII columns
    reader = csv.DictReader(io.StringIO(original_data))
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=reader.fieldnames)
    writer.writeheader()

    pii_columns = ['email', 'phone', 'ssn', 'credit_card']

    for row in reader:
        for col in pii_columns:
            if col in row:
                row[col] = '[REDACTED]'
        writer.writerow(row)

    transformed_data = output.getvalue()

    # Send the transformed object back to S3 Object Lambda
    s3 = boto3.client('s3')
    s3.write_get_object_response(
        Body=transformed_data.encode('utf-8'),
        RequestRoute=request_route,
        RequestToken=request_token,
        ContentType='text/csv'
    )

    return {'statusCode': 200}
```

Deploy this Lambda function.

```bash
# Package and deploy the Lambda function
zip function.zip lambda_function.py
aws lambda create-function \
  --function-name s3-pii-redactor \
  --runtime python3.12 \
  --handler lambda_function.lambda_handler \
  --role arn:aws:iam::123456789012:role/s3-object-lambda-role \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 256
```

The IAM role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3-object-lambda:WriteGetObjectResponse"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Step 3: Create the Object Lambda Access Point

Now create the Object Lambda Access Point that connects everything together.

```bash
aws s3control create-access-point-for-object-lambda \
  --account-id 123456789012 \
  --name pii-redacted-ap \
  --configuration '{
    "SupportingAccessPoint": "arn:aws:s3:us-east-1:123456789012:accesspoint/my-data-ap",
    "TransformationConfigurations": [
      {
        "Actions": ["GetObject"],
        "ContentTransformation": {
          "AwsLambda": {
            "FunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:s3-pii-redactor"
          }
        }
      }
    ]
  }'
```

## Step 4: Access Data Through the Object Lambda Access Point

Now when applications access data through the Object Lambda Access Point, they get the redacted version automatically.

```python
import boto3

s3 = boto3.client('s3')

# Access through the Object Lambda Access Point
# The application code looks exactly like a normal GetObject call
response = s3.get_object(
    Bucket='arn:aws:s3-object-lambda:us-east-1:123456789012:accesspoint/pii-redacted-ap',
    Key='customer-data/records.csv'
)

# This data has PII automatically redacted
data = response['Body'].read().decode('utf-8')
print(data)
# Output: name,email,phone,city
#         John Doe,[REDACTED],[REDACTED],New York
```

## Example: Image Resizing

Here's a Lambda function that resizes images on retrieval, perfect for serving thumbnails without storing multiple sizes.

```python
import boto3
import requests
from PIL import Image
import io

def lambda_handler(event, context):
    """
    Resize images on the fly based on query parameters.
    """
    object_context = event['getObjectContext']
    request_route = object_context['outputRoute']
    request_token = object_context['outputToken']
    original_url = object_context['inputS3Url']

    # Get desired size from the user request URL
    user_request = event.get('userRequest', {})
    url = user_request.get('url', '')

    # Parse width from URL query params (default 200)
    width = 200
    if 'width=' in url:
        try:
            width = int(url.split('width=')[1].split('&')[0])
        except (ValueError, IndexError):
            width = 200

    # Fetch original image
    response = requests.get(original_url)
    original_image = Image.open(io.BytesIO(response.content))

    # Resize maintaining aspect ratio
    ratio = width / original_image.width
    height = int(original_image.height * ratio)
    resized = original_image.resize((width, height), Image.LANCZOS)

    # Convert to bytes
    buffer = io.BytesIO()
    resized.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)

    # Return transformed image
    s3 = boto3.client('s3')
    s3.write_get_object_response(
        Body=buffer.read(),
        RequestRoute=request_route,
        RequestToken=request_token,
        ContentType='image/jpeg'
    )

    return {'statusCode': 200}
```

## Example: JSON Filtering

Filter JSON data to return only specific fields based on the caller's role.

```python
import boto3
import json
import requests

def lambda_handler(event, context):
    """
    Filter JSON objects to return only allowed fields.
    The allowed fields are passed as Lambda configuration.
    """
    object_context = event['getObjectContext']
    request_route = object_context['outputRoute']
    request_token = object_context['outputToken']
    original_url = object_context['inputS3Url']

    # Configuration passed through the Object Lambda Access Point
    config = event.get('configuration', {})
    payload = json.loads(config.get('payload', '{}'))
    allowed_fields = payload.get('allowed_fields', [])

    # Fetch original JSON
    response = requests.get(original_url)
    original_data = response.json()

    # Filter: keep only allowed fields
    if isinstance(original_data, list):
        filtered = [
            {k: v for k, v in item.items() if k in allowed_fields}
            for item in original_data
        ]
    elif isinstance(original_data, dict):
        filtered = {k: v for k, v in original_data.items() if k in allowed_fields}
    else:
        filtered = original_data

    # Return filtered data
    s3 = boto3.client('s3')
    s3.write_get_object_response(
        Body=json.dumps(filtered, indent=2).encode('utf-8'),
        RequestRoute=request_route,
        RequestToken=request_token,
        ContentType='application/json'
    )

    return {'statusCode': 200}
```

## Performance Considerations

S3 Object Lambda adds latency since every GetObject call invokes a Lambda function. Here's what to keep in mind:

- **Cold starts**: First invocation takes longer. Use provisioned concurrency for latency-sensitive workloads.
- **Lambda timeout**: The maximum is 60 seconds for Object Lambda. Keep transformations efficient.
- **Memory**: Allocate enough memory for your transformation. Image processing needs more than text redaction.
- **Caching**: Object Lambda doesn't cache results. Every request triggers a new Lambda invocation. If you need caching, put CloudFront in front.

## Cost Breakdown

S3 Object Lambda charges include:

- **Lambda invocation costs**: Standard Lambda pricing (per request + duration)
- **S3 requests**: Standard GetObject pricing for fetching the original
- **Data transfer**: Standard rates for returning the transformed object
- **No additional Object Lambda service fee**

For high-volume workloads, the Lambda costs can add up. Compare against the cost of storing multiple transformed copies.

## When to Use (and Not Use) Object Lambda

**Good use cases:**
- PII redaction for different access levels
- Format conversion (CSV to JSON, image resizing)
- Adding watermarks to images
- Decompressing files on the fly
- Injecting metadata or headers

**Better handled differently:**
- Heavy transformations on large files (precompute instead)
- Sub-millisecond latency requirements (use pre-transformed copies)
- Transformations needed on every single read of a hot object (costs add up fast)

## Wrapping Up

S3 Object Lambda is a powerful pattern for maintaining a single source of truth while serving different views of your data to different consumers. Instead of maintaining multiple transformed copies, you store once and transform on read. It's particularly valuable for compliance scenarios where PII access needs to be controlled at the data level, not just the access level. Just be mindful of the added latency and Lambda costs for high-volume workloads.
