# How to Set Up Private Origin Authentication for S3-Compatible Backends with Google Cloud CDN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, S3, Origin Authentication, AWS, Content Delivery

Description: Learn how to configure private origin authentication in Google Cloud CDN to securely fetch content from S3-compatible storage backends.

---

When you use Cloud CDN with a backend that requires authentication - like an Amazon S3 bucket with private objects or any S3-compatible storage service - you need Cloud CDN to authenticate itself when fetching content from the origin. Without this, the origin will reject requests from Cloud CDN and your users will see errors.

Private origin authentication lets Cloud CDN sign requests to your S3-compatible backend using AWS Signature Version 4. This means the backend can verify that requests genuinely come from your Cloud CDN setup, and you can keep your bucket private while still serving content through the CDN.

## How It Works

When Cloud CDN has a cache miss and needs to fetch content from the origin, it adds an AWS Signature Version 4 authorization header to the request before sending it to the S3-compatible backend. The backend verifies the signature using the access key and secret you have configured, and if valid, returns the content.

```mermaid
sequenceDiagram
    participant User
    participant CDN as Cloud CDN
    participant S3 as S3-Compatible Backend
    User->>CDN: Request /images/photo.jpg
    CDN->>CDN: Cache miss
    CDN->>CDN: Sign request with AWS SigV4
    CDN->>S3: GET /images/photo.jpg (with Authorization header)
    S3->>S3: Verify signature
    S3->>CDN: 200 OK + content
    CDN->>CDN: Cache response
    CDN->>User: Return content
```

From the user's perspective, nothing changes. They request content from your CDN URL and get it. The authentication happens entirely between Cloud CDN and the backend.

## Prerequisites

- An S3-compatible storage backend (AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2, etc.)
- An IAM access key and secret key with read access to the bucket
- Cloud CDN enabled with an Internet NEG pointing to the S3 endpoint
- A GCP project with the Compute Engine API enabled

## Step 1: Create IAM Credentials for Cloud CDN

On the S3 side, create an IAM user (or service account) with minimal permissions. Cloud CDN only needs read access.

For AWS S3, create an IAM policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-content-bucket",
        "arn:aws:s3:::my-content-bucket/*"
      ]
    }
  ]
}
```

Create an IAM user, attach this policy, and generate an access key. Store the access key ID and secret access key securely.

## Step 2: Store Credentials in Secret Manager

Store the AWS credentials in Google Cloud Secret Manager so they are not exposed in your configuration.

```bash
# Store the AWS access key ID
echo -n "AKIAIOSFODNN7EXAMPLE" | gcloud secrets create aws-access-key-id \
    --data-file=- \
    --project=my-project

# Store the AWS secret access key
echo -n "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" | gcloud secrets create aws-secret-access-key \
    --data-file=- \
    --project=my-project
```

## Step 3: Set Up the Internet NEG

Create an Internet NEG pointing to your S3 endpoint.

```bash
# Create an Internet NEG for the S3 bucket
gcloud compute network-endpoint-groups create s3-origin-neg \
    --network-endpoint-type=INTERNET_FQDN_PORT \
    --global \
    --project=my-project

# Add the S3 endpoint
gcloud compute network-endpoint-groups update s3-origin-neg \
    --add-endpoint="fqdn=my-content-bucket.s3.us-east-1.amazonaws.com,port=443" \
    --global \
    --project=my-project
```

For other S3-compatible services, use the appropriate endpoint:

```bash
# DigitalOcean Spaces
# fqdn=my-space.nyc3.digitaloceanspaces.com,port=443

# MinIO
# fqdn=minio.example.com,port=443

# Backblaze B2
# fqdn=s3.us-west-004.backblazeb2.com,port=443
```

## Step 4: Create the Backend Service with Origin Authentication

Create a backend service and configure AWS Signature Version 4 authentication.

```bash
# Create the backend service
gcloud compute backend-services create s3-origin-backend \
    --protocol=HTTPS \
    --global \
    --project=my-project

# Add the Internet NEG
gcloud compute backend-services add-backend s3-origin-backend \
    --network-endpoint-group=s3-origin-neg \
    --global-network-endpoint-group \
    --global \
    --project=my-project

# Enable CDN
gcloud compute backend-services update s3-origin-backend \
    --enable-cdn \
    --cache-mode=CACHE_ALL_STATIC \
    --default-ttl=86400 \
    --max-ttl=604800 \
    --global \
    --project=my-project
```

Now configure the origin authentication. This requires using the REST API or Terraform, as gcloud CLI support for this is limited.

### Using the REST API

```bash
# Configure AWS SigV4 authentication on the backend service
curl -X PATCH \
    "https://compute.googleapis.com/compute/v1/projects/my-project/global/backendServices/s3-origin-backend" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "cdnPolicy": {
            "cacheMode": "CACHE_ALL_STATIC",
            "defaultTtl": "86400s",
            "maxTtl": "604800s"
        },
        "securitySettings": {
            "awsV4Authentication": {
                "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
                "accessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
                "originRegion": "us-east-1",
                "accessKeyVersion": "secret-version-1"
            }
        }
    }'
```

### Using Terraform

```hcl
# Internet NEG for S3 origin
resource "google_compute_global_network_endpoint_group" "s3_neg" {
  name                  = "s3-origin-neg"
  network_endpoint_type = "INTERNET_FQDN_PORT"
  default_port          = 443
}

resource "google_compute_global_network_endpoint" "s3_endpoint" {
  global_network_endpoint_group = google_compute_global_network_endpoint_group.s3_neg.id
  fqdn                         = "my-content-bucket.s3.us-east-1.amazonaws.com"
  port                         = 443
}

# Backend service with AWS SigV4 authentication
resource "google_compute_backend_service" "s3_backend" {
  name                  = "s3-origin-backend"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL"
  enable_cdn            = true

  cdn_policy {
    cache_mode  = "CACHE_ALL_STATIC"
    default_ttl = 86400
    max_ttl     = 604800
    client_ttl  = 3600
  }

  # Custom request headers for S3 compatibility
  custom_request_headers = [
    "Host: my-content-bucket.s3.us-east-1.amazonaws.com",
  ]

  security_settings {
    aws_v4_authentication {
      access_key_id      = data.google_secret_manager_secret_version.aws_key_id.secret_data
      access_key          = data.google_secret_manager_secret_version.aws_secret_key.secret_data
      origin_region       = "us-east-1"
      access_key_version  = "v1"
    }
  }

  backend {
    group = google_compute_global_network_endpoint_group.s3_neg.id
  }
}

# Fetch credentials from Secret Manager
data "google_secret_manager_secret_version" "aws_key_id" {
  secret = "aws-access-key-id"
}

data "google_secret_manager_secret_version" "aws_secret_key" {
  secret = "aws-secret-access-key"
}
```

## Step 5: Set Up the Load Balancer

Complete the setup with a URL map, SSL certificate, and forwarding rule.

```bash
# Create URL map
gcloud compute url-maps create s3-cdn-urlmap \
    --default-service=s3-origin-backend \
    --global \
    --project=my-project

# Create managed SSL certificate
gcloud compute ssl-certificates create s3-cdn-cert \
    --domains=assets.example.com \
    --global \
    --project=my-project

# Create HTTPS proxy
gcloud compute target-https-proxies create s3-cdn-proxy \
    --url-map=s3-cdn-urlmap \
    --ssl-certificates=s3-cdn-cert \
    --global \
    --project=my-project

# Reserve static IP
gcloud compute addresses create s3-cdn-ip \
    --ip-version=IPV4 \
    --global \
    --project=my-project

# Create forwarding rule
gcloud compute forwarding-rules create s3-cdn-rule \
    --address=s3-cdn-ip \
    --target-https-proxy=s3-cdn-proxy \
    --ports=443 \
    --global \
    --project=my-project
```

## Step 6: Test the Setup

Verify that Cloud CDN can fetch content from the S3 backend.

```bash
# Test fetching content through CDN
curl -I https://assets.example.com/images/photo.jpg

# Check for successful response
# HTTP/2 200
# cache-control: public, max-age=86400
# x-goog-hash: ...

# Verify caching is working - second request should be faster
curl -w "Total time: %{time_total}s\n" -o /dev/null -s https://assets.example.com/images/photo.jpg
curl -w "Total time: %{time_total}s\n" -o /dev/null -s https://assets.example.com/images/photo.jpg
```

## Credential Rotation

Regularly rotate your AWS credentials to maintain security.

```bash
# Create new AWS access key in AWS IAM
# Then update the credentials in GCP

# Update the secret in Secret Manager
echo -n "NEW_ACCESS_KEY_ID" | gcloud secrets versions add aws-access-key-id \
    --data-file=- \
    --project=my-project

echo -n "NEW_SECRET_ACCESS_KEY" | gcloud secrets versions add aws-secret-access-key \
    --data-file=- \
    --project=my-project

# Update the backend service with new credentials
# (using REST API or Terraform apply)
```

## Troubleshooting

**403 Forbidden from origin**: The AWS credentials are wrong or the IAM policy does not grant sufficient permissions. Verify the access key works by testing directly against S3 with the AWS CLI.

**SignatureDoesNotMatch error**: The region in the authentication configuration does not match the bucket's region. Double-check the `originRegion` parameter.

**Connection timeout**: The Internet NEG FQDN is incorrect or the port is wrong. Verify you can reach the S3 endpoint from a GCE VM.

**Partial content issues**: Some S3-compatible services handle range requests differently. Check that your backend supports the range requests that Cloud CDN sends for large files.

## Wrapping Up

Private origin authentication bridges Cloud CDN with private S3-compatible storage backends. The setup requires a bit more configuration than a standard Cloud CDN deployment, but it lets you keep your storage backend private while still serving content through Google's edge network. The key is making sure the AWS credentials have minimal permissions, storing them securely in Secret Manager, and testing thoroughly before going to production.
