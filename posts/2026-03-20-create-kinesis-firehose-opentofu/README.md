# How to Create AWS Kinesis Firehose with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Kinesis Firehose, Data Delivery, Infrastructure as Code

Description: Learn how to create AWS Kinesis Data Firehose delivery streams with OpenTofu to continuously load streaming data into S3, Redshift, and OpenSearch.

Kinesis Firehose is a managed data delivery service that continuously loads streaming data into data lakes and analytics services. Managing delivery streams in OpenTofu ensures consistent configuration of buffering, transformation, and destination settings.

## Firehose to S3

```hcl
resource "aws_kinesis_firehose_delivery_stream" "s3_delivery" {
  name        = "events-to-s3"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.data_lake.arn
    prefix     = "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "errors/!{firehose:error-output-type}/!{timestamp:yyyy}/!{timestamp:MM}/"

    buffering_size     = 128   # MB (min 64, max 128)
    buffering_interval = 60    # Seconds (min 60, max 900)
    compression_format = "GZIP"

    # Enable dynamic partitioning
    dynamic_partitioning_configuration {
      enabled = true
    }
  }
}
```

## Firehose to S3 with Lambda Transformation

```hcl
resource "aws_kinesis_firehose_delivery_stream" "transform_and_deliver" {
  name        = "events-transform-s3"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.data_lake.arn
    prefix     = "transformed/"

    buffering_size     = 5
    buffering_interval = 300

    # Transform records before delivery
    processing_configuration {
      enabled = true

      processors {
        type = "Lambda"

        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = "${aws_lambda_function.transformer.arn}:$LATEST"
        }

        parameters {
          parameter_name  = "BufferSizeInMBs"
          parameter_value = "1"
        }

        parameters {
          parameter_name  = "BufferIntervalInSeconds"
          parameter_value = "60"
        }
      }
    }
  }
}
```

## Firehose to OpenSearch

```hcl
resource "aws_kinesis_firehose_delivery_stream" "opensearch_delivery" {
  name        = "logs-to-opensearch"
  destination = "opensearch"

  opensearch_configuration {
    domain_arn         = aws_opensearch_domain.logs.arn
    role_arn           = aws_iam_role.firehose.arn
    index_name         = "application-logs"
    index_rotation_period = "OneDay"  # Rotate index daily

    buffering_interval = 60
    buffering_size     = 5

    s3_backup_mode = "FailedDocumentsOnly"

    s3_configuration {
      role_arn   = aws_iam_role.firehose.arn
      bucket_arn = aws_s3_bucket.firehose_backup.arn
    }

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = "/aws/kinesisfirehose/opensearch"
      log_stream_name = "DeliveryErrors"
    }
  }
}
```

## Kinesis Stream to Firehose

```hcl
# Source: Kinesis Data Stream

resource "aws_kinesis_firehose_delivery_stream" "from_kinesis" {
  name        = "kinesis-stream-to-s3"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.events.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.data_lake.arn
    prefix     = "raw/"
    buffering_size     = 64
    buffering_interval = 300
    compression_format = "Snappy"
  }
}
```

## IAM Role for Firehose

```hcl
resource "aws_iam_role" "firehose" {
  name = "firehose-delivery-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "firehose.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "firehose" {
  role = aws_iam_role.firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.data_lake.arn,
          "${aws_s3_bucket.data_lake.arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kinesis:GetRecords", "kinesis:GetShardIterator", "kinesis:DescribeStream"]
        Resource = aws_kinesis_stream.events.arn
      }
    ]
  })
}
```

## Conclusion

Kinesis Firehose delivery streams in OpenTofu automate data delivery from streaming sources to storage and analytics destinations. Use buffering settings to balance latency and cost, enable Lambda transformation for record enrichment or format conversion, and always configure S3 backup for failed deliveries to prevent data loss.
