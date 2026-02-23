# How to Create IoT Core Things and Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IoT Core, IoT, Security, Infrastructure as Code

Description: Step-by-step guide to provisioning AWS IoT Core things, certificates, policies, and topic rules using Terraform for secure device management at scale.

---

AWS IoT Core lets you connect devices to the cloud, manage them at scale, and route their messages to other AWS services. The core components - things, certificates, and policies - work together to identify devices, secure their connections, and control what they can do.

Terraform is well suited to managing IoT Core infrastructure because device provisioning often follows repeatable patterns. Whether you are setting up a fleet of sensors or a handful of gateways, the same configuration templates apply. This guide covers how to create and connect all the essential IoT Core resources.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with IoT Core permissions
- OpenSSL (for generating certificates locally, if needed)

## Provider Configuration

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating IoT Things

A "thing" in IoT Core represents a physical device or logical entity. Each thing has a name and optional attributes:

```hcl
# Create a single IoT thing
resource "aws_iot_thing" "temperature_sensor" {
  name = "temperature-sensor-001"

  # Attributes help you organize and search for things
  attributes = {
    location    = "warehouse-a"
    device_type = "temperature"
    firmware    = "v2.1.0"
  }
}

# Create a thing type for categorization
resource "aws_iot_thing_type" "sensor" {
  name = "environmental-sensor"

  properties {
    description           = "Environmental monitoring sensors"
    searchable_attributes = ["location", "device_type", "firmware"]
  }
}

# Create a thing using the thing type
resource "aws_iot_thing" "sensor_with_type" {
  name            = "env-sensor-001"
  thing_type_name = aws_iot_thing_type.sensor.name

  attributes = {
    location    = "building-b"
    device_type = "multi-sensor"
    firmware    = "v3.0.0"
  }
}
```

## Creating Thing Groups

Thing groups let you manage devices collectively. You can apply policies to groups instead of individual things:

```hcl
# Parent group for all devices
resource "aws_iot_thing_group" "all_devices" {
  name = "all-devices"

  properties {
    description = "Top-level group for all IoT devices"

    attribute_payload {
      attributes = {
        organization = "acme-corp"
      }
    }
  }
}

# Child group for a specific location
resource "aws_iot_thing_group" "warehouse_a" {
  name = "warehouse-a-devices"

  # Nest under the parent group
  parent_group_name = aws_iot_thing_group.all_devices.name

  properties {
    description = "Devices in Warehouse A"

    attribute_payload {
      attributes = {
        location = "warehouse-a"
      }
    }
  }
}

# Add a thing to a group
resource "aws_iot_thing_group_membership" "sensor_membership" {
  thing_name      = aws_iot_thing.temperature_sensor.name
  thing_group_name = aws_iot_thing_group.warehouse_a.name

  # Override dynamic group membership if needed
  override_dynamic_group = false
}
```

## Generating and Registering Certificates

Devices authenticate to IoT Core using X.509 certificates. You can generate them with Terraform's TLS provider:

```hcl
# Generate a private key for the device
resource "tls_private_key" "device" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Generate a certificate signing request
resource "tls_cert_request" "device" {
  private_key_pem = tls_private_key.device.private_key_pem

  subject {
    common_name  = "temperature-sensor-001"
    organization = "Acme Corp"
  }
}

# Create an IoT certificate from CSR
resource "aws_iot_certificate" "device" {
  csr    = tls_cert_request.device.cert_request_pem
  active = true
}

# Alternatively, let AWS generate the certificate and key pair
resource "aws_iot_certificate" "aws_generated" {
  active = true
}

# Attach the certificate to the thing
resource "aws_iot_thing_principal_attachment" "sensor_cert" {
  principal = aws_iot_certificate.device.arn
  thing     = aws_iot_thing.temperature_sensor.name
}
```

## Creating IoT Policies

Policies define what a device can do once connected. They control MQTT publish/subscribe permissions and HTTP access:

```hcl
# Basic policy allowing a device to connect and publish data
resource "aws_iot_policy" "sensor_policy" {
  name = "sensor-device-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow the device to connect with its thing name as client ID
        Sid    = "AllowConnect"
        Effect = "Allow"
        Action = "iot:Connect"
        Resource = "arn:aws:iot:*:*:client/$${iot:Connection.Thing.ThingName}"
      },
      {
        # Allow publishing to device-specific topics
        Sid    = "AllowPublish"
        Effect = "Allow"
        Action = "iot:Publish"
        Resource = [
          "arn:aws:iot:*:*:topic/devices/$${iot:Connection.Thing.ThingName}/telemetry",
          "arn:aws:iot:*:*:topic/devices/$${iot:Connection.Thing.ThingName}/status"
        ]
      },
      {
        # Allow subscribing to command topics
        Sid    = "AllowSubscribe"
        Effect = "Allow"
        Action = "iot:Subscribe"
        Resource = [
          "arn:aws:iot:*:*:topicfilter/devices/$${iot:Connection.Thing.ThingName}/commands/*"
        ]
      },
      {
        # Allow receiving messages on subscribed topics
        Sid    = "AllowReceive"
        Effect = "Allow"
        Action = "iot:Receive"
        Resource = [
          "arn:aws:iot:*:*:topic/devices/$${iot:Connection.Thing.ThingName}/commands/*"
        ]
      }
    ]
  })
}

# Attach the policy to the certificate
resource "aws_iot_policy_attachment" "sensor_policy_attach" {
  policy = aws_iot_policy.sensor_policy.name
  target = aws_iot_certificate.device.arn
}
```

Notice the `$$` before `{iot:Connection.Thing.ThingName}`. This is Terraform's escape syntax to prevent it from interpreting the IoT policy variable as a Terraform interpolation.

## Creating Topic Rules

Topic rules route MQTT messages from devices to other AWS services:

```hcl
# IAM role for IoT topic rules
resource "aws_iam_role" "iot_rule" {
  name = "iot-topic-rule-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "iot.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Policy for writing to DynamoDB
resource "aws_iam_role_policy" "iot_dynamodb" {
  name = "iot-dynamodb-access"
  role = aws_iam_role.iot_rule.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.sensor_data.arn
      }
    ]
  })
}

# DynamoDB table for sensor data
resource "aws_dynamodb_table" "sensor_data" {
  name         = "sensor-telemetry"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "device_id"
  range_key    = "timestamp"

  attribute {
    name = "device_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  tags = {
    Service = "iot"
  }
}

# Topic rule to route telemetry data to DynamoDB
resource "aws_iot_topic_rule" "telemetry_to_dynamodb" {
  name        = "telemetry_to_dynamodb"
  description = "Route device telemetry to DynamoDB"
  enabled     = true

  # SQL query to select data from MQTT messages
  sql         = "SELECT topic(2) as device_id, timestamp() as timestamp, temperature, humidity FROM 'devices/+/telemetry'"
  sql_version = "2016-03-23"

  # Send matching messages to DynamoDB
  dynamodbv2 {
    role_arn  = aws_iam_role.iot_rule.arn
    put_item {
      table_name = aws_dynamodb_table.sensor_data.name
    }
  }

  # Error action - send failed messages to an error topic
  error_action {
    republish {
      role_arn = aws_iam_role.iot_rule.arn
      topic    = "errors/telemetry"
    }
  }
}
```

## Creating Multiple Things from a List

When provisioning a fleet of devices, use `for_each`:

```hcl
# Define your device fleet
variable "devices" {
  description = "Map of device names to their attributes"
  type = map(object({
    location    = string
    device_type = string
  }))
  default = {
    "sensor-wh-001" = { location = "warehouse-a", device_type = "temperature" }
    "sensor-wh-002" = { location = "warehouse-a", device_type = "humidity" }
    "sensor-wh-003" = { location = "warehouse-b", device_type = "temperature" }
    "gateway-001"   = { location = "warehouse-a", device_type = "gateway" }
  }
}

# Create things for each device
resource "aws_iot_thing" "fleet" {
  for_each = var.devices

  name = each.key
  attributes = {
    location    = each.value.location
    device_type = each.value.device_type
  }
}
```

## Outputs

```hcl
# IoT endpoint for device connections
data "aws_iot_endpoint" "main" {
  endpoint_type = "iot:Data-ATS"
}

output "iot_endpoint" {
  description = "IoT Core endpoint for device MQTT connections"
  value       = data.aws_iot_endpoint.main.endpoint_address
}

output "device_certificate_pem" {
  description = "Device certificate PEM"
  value       = aws_iot_certificate.device.certificate_pem
  sensitive   = true
}

output "device_private_key" {
  description = "Device private key"
  value       = tls_private_key.device.private_key_pem
  sensitive   = true
}
```

## Monitoring IoT Devices

Device connectivity problems can be hard to debug without proper monitoring. Use OneUptime to track connection counts, message throughput, and rule execution errors across your IoT fleet. Early detection of connectivity drops or message processing failures prevents data loss from your sensors.

## Summary

AWS IoT Core's thing-certificate-policy model provides a flexible foundation for device management. Terraform makes it practical to provision these resources consistently, whether you are setting up a single prototype device or rolling out thousands of sensors. The key is getting your policies right - use thing name variables to scope permissions per device, and always include error actions on your topic rules so failed messages do not disappear silently.
