# How to Handle Binary Data with API Gateway and Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Lambda, Binary

Description: Learn how to properly configure API Gateway to handle binary data like images, PDFs, and file uploads with Lambda backend integration.

---

API Gateway was designed primarily for JSON APIs, so handling binary data - images, PDFs, ZIP files, file uploads - takes some extra configuration. Without it, binary payloads get corrupted during transit because API Gateway tries to treat them as text. Here's how to set it up correctly for both REST and HTTP APIs.

## The Binary Data Problem

When a client sends a binary file to API Gateway, or when your Lambda returns binary data, the payload passes through several transformations. By default, API Gateway treats everything as UTF-8 text, which corrupts binary content. You need to tell API Gateway which content types are binary so it handles them with base64 encoding instead.

## Configuring Binary Media Types on REST API

First, register the binary content types your API needs to handle.

Add binary media types to your REST API:

```bash
# Add specific binary media types
aws apigateway update-rest-api \
  --rest-api-id abc123api \
  --patch-operations \
    op=add,path=/binaryMediaTypes/image~1png \
    op=add,path=/binaryMediaTypes/image~1jpeg \
    op=add,path=/binaryMediaTypes/application~1pdf \
    op=add,path=/binaryMediaTypes/application~1zip \
    op=add,path=/binaryMediaTypes/application~1octet-stream \
    op=add,path=/binaryMediaTypes/multipart~1form-data

# Or add a wildcard to handle ALL content types as binary when appropriate
aws apigateway update-rest-api \
  --rest-api-id abc123api \
  --patch-operations \
    op=add,path=/binaryMediaTypes/*~1*

# Deploy the changes
aws apigateway create-deployment \
  --rest-api-id abc123api \
  --stage-name prod
```

Note the `~1` encoding - that's how you represent `/` in JSON Pointer paths. So `image/png` becomes `image~1png`.

## Returning Binary Data from Lambda

When your Lambda function returns binary data through API Gateway with proxy integration, the response body needs to be base64-encoded.

Here's a Lambda function that returns an image:

```python
import base64
import boto3

s3 = boto3.client("s3")


def lambda_handler(event, context):
    # Fetch an image from S3
    response = s3.get_object(
        Bucket="my-images-bucket",
        Key="photos/landscape.jpg",
    )
    image_data = response["Body"].read()

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "image/jpeg",
            "Content-Disposition": "inline",
        },
        # Base64 encode the binary body
        "body": base64.b64encode(image_data).decode("utf-8"),
        # This flag tells API Gateway to decode the base64
        "isBase64Encoded": True,
    }
```

The `isBase64Encoded: True` flag is critical. It tells API Gateway to decode the base64 body back into raw bytes before sending it to the client.

## Generating and Returning a PDF

Same pattern works for any binary content type. Here's a PDF generation example:

```python
import base64
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def lambda_handler(event, context):
    # Generate a PDF in memory
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, "Generated Report")
    c.drawString(100, 700, f"Date: 2026-02-12")
    c.showPage()
    c.save()

    pdf_data = buffer.getvalue()

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=report.pdf",
        },
        "body": base64.b64encode(pdf_data).decode("utf-8"),
        "isBase64Encoded": True,
    }
```

## Accepting File Uploads

Handling file uploads is the reverse - the client sends binary data, and your Lambda receives it base64-encoded.

Lambda function that accepts image uploads:

```python
import base64
import boto3
import uuid

s3 = boto3.client("s3")


def lambda_handler(event, context):
    # Check if the body is base64 encoded
    if event.get("isBase64Encoded"):
        body = base64.b64decode(event["body"])
    else:
        body = event["body"].encode()

    # Get the content type from headers
    content_type = event["headers"].get("content-type", "application/octet-stream")

    # Determine file extension
    extensions = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
    }
    ext = extensions.get(content_type, ".bin")

    # Generate a unique filename
    file_key = f"uploads/{uuid.uuid4()}{ext}"

    # Upload to S3
    s3.put_object(
        Bucket="my-uploads-bucket",
        Key=file_key,
        Body=body,
        ContentType=content_type,
    )

    return {
        "statusCode": 201,
        "headers": {"Content-Type": "application/json"},
        "body": f'{{"file_key": "{file_key}", "size": {len(body)}}}',
    }
```

## Handling Multipart Form Data

Multipart form uploads are trickier because the body contains boundaries, headers, and multiple parts. You need a parser.

Parse multipart form data in Lambda:

```python
import base64
import cgi
from io import BytesIO
import boto3
import uuid

s3 = boto3.client("s3")


def parse_multipart(event):
    """Parse multipart form data from API Gateway event."""
    content_type = event["headers"].get("content-type", "")

    # Decode the body
    if event.get("isBase64Encoded"):
        body = base64.b64decode(event["body"])
    else:
        body = event["body"].encode()

    # Parse the multipart data
    environ = {
        "REQUEST_METHOD": "POST",
        "CONTENT_TYPE": content_type,
        "CONTENT_LENGTH": len(body),
    }

    fp = BytesIO(body)
    form = cgi.FieldStorage(fp=fp, environ=environ, keep_blank_values=True)

    return form


def lambda_handler(event, context):
    form = parse_multipart(event)

    uploaded_files = []

    for field_name in form:
        field = form[field_name]
        if field.filename:
            # It's a file upload
            file_key = f"uploads/{uuid.uuid4()}-{field.filename}"
            s3.put_object(
                Bucket="my-uploads-bucket",
                Key=file_key,
                Body=field.file.read(),
                ContentType=field.type,
            )
            uploaded_files.append({
                "field": field_name,
                "filename": field.filename,
                "s3_key": file_key,
            })

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"uploaded": uploaded_files}),
    }
```

## HTTP API Binary Handling

HTTP API handles binary data more gracefully than REST API. It automatically base64-encodes request bodies when the content type matches a binary pattern.

The key difference: HTTP API doesn't need binary media type configuration for most cases. If the `Content-Type` header indicates binary content and the payload is binary, it just works.

But your Lambda still needs to handle the base64 encoding:

```python
import base64


def lambda_handler(event, context):
    # HTTP API v2 payload format
    is_binary = event.get("isBase64Encoded", False)

    if is_binary:
        body = base64.b64decode(event["body"])
    else:
        body = event["body"]

    # Process the binary data
    result = process_file(body)

    # Return binary response
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/pdf"},
        "body": base64.b64encode(result).decode("utf-8"),
        "isBase64Encoded": True,
    }
```

## CloudFormation Configuration

Set up binary media types in CloudFormation:

```yaml
Resources:
  MyApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: binary-api
      BinaryMediaTypes:
        - "image/png"
        - "image/jpeg"
        - "application/pdf"
        - "application/zip"
        - "application/octet-stream"
        - "multipart/form-data"
```

## SAM Template with Binary Support

```yaml
Resources:
  MyApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      BinaryMediaTypes:
        - "image/*"
        - "application/pdf"
        - "application/octet-stream"

  UploadFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: upload.handler
      Runtime: python3.12
      Events:
        Upload:
          Type: Api
          Properties:
            RestApiId: !Ref MyApi
            Path: /upload
            Method: POST
```

## Size Limits

Keep these limits in mind when working with binary data:

- **API Gateway REST API** - 10MB maximum payload size
- **API Gateway HTTP API** - 10MB maximum payload size
- **Lambda request payload** - 6MB synchronous, 256KB asynchronous
- **Base64 overhead** - Encoding increases size by about 33%, so a 6MB Lambda limit means roughly 4.5MB of actual binary data

For larger files, use S3 presigned URLs instead of passing data through API Gateway:

```python
import boto3
import json

s3 = boto3.client("s3")


def lambda_handler(event, context):
    """Generate a presigned URL for direct S3 upload."""
    file_key = f"uploads/{event['queryStringParameters']['filename']}"

    presigned_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": "my-uploads-bucket",
            "Key": file_key,
            "ContentType": event["queryStringParameters"].get(
                "content_type", "application/octet-stream"
            ),
        },
        ExpiresIn=300,  # URL valid for 5 minutes
    )

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps({
            "upload_url": presigned_url,
            "file_key": file_key,
        }),
    }
```

## Testing Binary Endpoints

Test your binary endpoints with curl:

```bash
# Upload a file
curl -X POST \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/upload

# Download a binary file
curl -o downloaded.pdf \
  -H "Accept: application/pdf" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/reports/123

# Upload via multipart form
curl -X POST \
  -F "file=@document.pdf" \
  -F "description=Monthly report" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/upload
```

For monitoring upload/download performance and tracking binary payload sizes, check our guide on [API monitoring best practices](https://oneuptime.com/blog/post/2026-01-26-restful-api-best-practices/view).

## Wrapping Up

Binary data handling on API Gateway comes down to three things: register your binary media types, use base64 encoding in Lambda responses with the `isBase64Encoded` flag, and decode base64 request bodies in your handler. For files larger than a few megabytes, skip API Gateway entirely and use S3 presigned URLs for direct upload/download. HTTP API simplifies things compared to REST API, so prefer it for new projects that need binary support.
