# How to Build a Video Streaming Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Video Streaming, CloudFront, MediaConvert, AWS

Description: Learn how to build a scalable video streaming infrastructure with Terraform including transcoding, CDN delivery, adaptive bitrate streaming, and viewer analytics.

---

Video streaming is one of the most demanding workloads you can run in the cloud. Between ingestion, transcoding, storage, and delivery, there are a lot of pieces that need to work together. Getting it wrong means buffering, poor quality, or a bill that makes your eyes water. Terraform lets you define this entire pipeline as code, making it repeatable and tunable across environments.

## Why Terraform for Video Infrastructure?

Video pipelines involve multiple AWS services that need to be connected precisely. S3 for storage, MediaConvert for transcoding, CloudFront for delivery, Lambda for orchestration. Configuring these by hand through the console is slow and error-prone. Terraform captures all the connections and configurations in code that you can review, version, and deploy repeatedly.

## Architecture Overview

Our video streaming setup includes:

- S3 buckets for source and output video
- AWS MediaConvert for transcoding to HLS/DASH
- CloudFront for global CDN delivery
- Lambda for workflow orchestration
- DynamoDB for video metadata
- CloudWatch for monitoring

## S3 Storage Setup

Two buckets: one for uploaded source files and one for transcoded output.

```hcl
# Source video bucket - where uploads land
resource "aws_s3_bucket" "source_video" {
  bucket = "company-video-source-${var.environment}"

  tags = {
    Purpose     = "video-source"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "source" {
  bucket = aws_s3_bucket.source_video.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle rule to clean up source files after transcoding
resource "aws_s3_bucket_lifecycle_configuration" "source" {
  bucket = aws_s3_bucket.source_video.id

  rule {
    id     = "cleanup-processed"
    status = "Enabled"

    filter {
      tag {
        key   = "Processed"
        value = "true"
      }
    }

    transition {
      days          = 7
      storage_class = "GLACIER"
    }

    expiration {
      days = 90
    }
  }
}

# Output bucket - transcoded video segments
resource "aws_s3_bucket" "output_video" {
  bucket = "company-video-output-${var.environment}"

  tags = {
    Purpose     = "video-output"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_cors_configuration" "output" {
  bucket = aws_s3_bucket.output_video.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://app.company.com"]
    max_age_seconds = 3600
  }
}

# Block public access - CloudFront will use OAI
resource "aws_s3_bucket_public_access_block" "output" {
  bucket = aws_s3_bucket.output_video.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## AWS MediaConvert for Transcoding

MediaConvert turns your source videos into adaptive bitrate streams.

```hcl
# MediaConvert IAM role
resource "aws_iam_role" "mediaconvert" {
  name = "mediaconvert-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "mediaconvert.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "mediaconvert" {
  name = "mediaconvert-s3-access"
  role = aws_iam_role.mediaconvert.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.source_video.arn,
          "${aws_s3_bucket.source_video.arn}/*",
        ]
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = [
          "${aws_s3_bucket.output_video.arn}/*",
        ]
      }
    ]
  })
}

# MediaConvert job template for HLS output
# Note: MediaConvert job templates are typically created via
# a Lambda function since Terraform does not have a native resource.
# Here we set up the Lambda that creates transcoding jobs.

resource "aws_lambda_function" "transcoder" {
  filename         = "transcoder.zip"
  function_name    = "video-transcoder"
  role             = aws_iam_role.transcoder_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      MEDIACONVERT_ROLE    = aws_iam_role.mediaconvert.arn
      OUTPUT_BUCKET        = aws_s3_bucket.output_video.id
      MEDIACONVERT_ENDPOINT = var.mediaconvert_endpoint
      METADATA_TABLE       = aws_dynamodb_table.video_metadata.name
    }
  }
}

# Trigger transcoding when a new video is uploaded
resource "aws_s3_bucket_notification" "source_video" {
  bucket = aws_s3_bucket.source_video.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.transcoder.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".mp4"
  }
}

resource "aws_lambda_permission" "s3_trigger" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transcoder.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.source_video.arn
}
```

## CloudFront CDN for Delivery

Deliver video content globally with low latency through CloudFront.

```hcl
# Origin Access Identity for CloudFront
resource "aws_cloudfront_origin_access_identity" "video" {
  comment = "OAI for video output bucket"
}

# Bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "output_video" {
  bucket = aws_s3_bucket.output_video.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = aws_cloudfront_origin_access_identity.video.iam_arn
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.output_video.arn}/*"
    }]
  })
}

# CloudFront distribution for video delivery
resource "aws_cloudfront_distribution" "video" {
  origin {
    domain_name = aws_s3_bucket.output_video.bucket_regional_domain_name
    origin_id   = "S3-video-output"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.video.cloudfront_access_identity_path
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "Video streaming CDN"
  price_class     = "PriceClass_200"

  aliases = ["video.company.com"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-video-output"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400     # 1 day
    max_ttl                = 31536000  # 1 year
    compress               = true
  }

  # Cache behavior for HLS segments - long cache
  ordered_cache_behavior {
    path_pattern     = "*.ts"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-video-output"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 604800
    max_ttl                = 31536000
    compress               = false  # Video segments are already compressed
  }

  # Cache behavior for manifests - short cache for live updates
  ordered_cache_behavior {
    path_pattern     = "*.m3u8"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-video-output"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 5     # Short TTL for manifests
    max_ttl                = 30
    compress               = true
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.video.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = var.environment
  }
}
```

## Video Metadata Store

Track video status, metadata, and playback URLs.

```hcl
# DynamoDB table for video metadata
resource "aws_dynamodb_table" "video_metadata" {
  name         = "video-metadata"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "videoId"

  attribute {
    name = "videoId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-index"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}
```

## Monitoring and Alerts

Track transcoding failures, CDN performance, and viewer metrics.

```hcl
# CloudWatch alarms for video infrastructure
resource "aws_cloudwatch_metric_alarm" "transcode_errors" {
  alarm_name          = "video-transcode-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.video_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.transcoder.function_name
  }
}

# CloudFront error rate alarm
resource "aws_cloudwatch_metric_alarm" "cdn_error_rate" {
  alarm_name          = "video-cdn-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  alarm_actions       = [aws_sns_topic.video_alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.video.id
    Region         = "Global"
  }
}

resource "aws_sns_topic" "video_alerts" {
  name = "video-infrastructure-alerts"
}
```

## Wrapping Up

Video streaming infrastructure has a lot of moving parts, but the pattern is well-established: upload to S3, transcode with MediaConvert, deliver through CloudFront. Each piece is independently scalable. Terraform ties them all together in code that you can version, review, and deploy consistently.

The key optimization is in the CloudFront cache behaviors. Video segments get long cache times because they never change. Manifests get short cache times so players always get the latest playlist. Getting this right is the difference between a smooth viewing experience and constant buffering.

For monitoring your video streaming infrastructure end-to-end, from transcoding job health to CDN performance and viewer experience, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-video-streaming-infrastructure-with-terraform/view) for unified media infrastructure observability.
