# How to Create AWS IoT Core Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IoT Core, IoT Security, Device Policies, Infrastructure as Code

Description: Learn how to create AWS IoT Core policies to control device permissions for publishing, subscribing, and connecting using OpenTofu.

## Introduction

AWS IoT Core policies control what actions a device (certificate) is authorized to perform - connecting, publishing to topics, and subscribing to topics. Well-scoped policies follow the principle of least privilege. OpenTofu manages IoT policies as code.

## Basic Device Policy

```hcl
resource "aws_iot_policy" "device_basic" {
  name = "${var.app_name}-device-basic-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "iot:Connect"
        Resource = "arn:aws:iot:${var.region}:${var.account_id}:client/$${iot:ClientId}"
      },
      {
        Effect = "Allow"
        Action = ["iot:Publish", "iot:Receive"]
        Resource = [
          "arn:aws:iot:${var.region}:${var.account_id}:topic/devices/$${iot:ClientId}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = "iot:Subscribe"
        Resource = "arn:aws:iot:${var.region}:${var.account_id}:topicfilter/devices/$${iot:ClientId}/*"
      }
    ]
  })
}
```

## Sensor-Specific Policy

Restrict a sensor to publishing its own telemetry, receiving device-specific commands, and interacting with its device shadow.

```hcl
resource "aws_iot_policy" "sensor" {
  name = "${var.app_name}-sensor-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Only allow connection from attached things using the thing name as ClientId
        Effect   = "Allow"
        Action   = "iot:Connect"
        Resource = "arn:aws:iot:${var.region}:${var.account_id}:client/$${iot:Connection.Thing.ThingName}"
        Condition = {
          Bool = {
            "iot:Connection.Thing.IsAttached" = "true"  # principal must be attached to a thing
          }
        }
      },
      {
        # Publish only to the device's own telemetry topic
        Effect   = "Allow"
        Action   = "iot:Publish"
        Resource = "arn:aws:iot:${var.region}:${var.account_id}:topic/sensors/$${iot:Connection.Thing.ThingName}/telemetry"
      },
      {
        # Subscribe to device-specific commands topic
        Effect   = "Allow"
        Action   = ["iot:Subscribe", "iot:Receive"]
        Resource = [
          "arn:aws:iot:${var.region}:${var.account_id}:topicfilter/sensors/$${iot:Connection.Thing.ThingName}/commands",
          "arn:aws:iot:${var.region}:${var.account_id}:topic/sensors/$${iot:Connection.Thing.ThingName}/commands"
        ]
      },
      {
        # Allow reading and updating device shadow over reserved MQTT topics
        Effect   = "Allow"
        Action   = "iot:Publish"
        Resource = [
          "arn:aws:iot:${var.region}:${var.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get",
          "arn:aws:iot:${var.region}:${var.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update"
        ]
      },
      {
        Effect = "Allow"
        Action = "iot:Subscribe"
        Resource = [
          "arn:aws:iot:${var.region}:${var.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/accepted",
          "arn:aws:iot:${var.region}:${var.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/rejected",
          "arn:aws:iot:${var.region}:${var.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/accepted",
          "arn:aws:iot:${var.region}:${var.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/rejected"
        ]
      },
      {
        Effect = "Allow"
        Action = "iot:Receive"
        Resource = [
          "arn:aws:iot:${var.region}:${var.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/accepted",
          "arn:aws:iot:${var.region}:${var.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/rejected",
          "arn:aws:iot:${var.region}:${var.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/accepted",
          "arn:aws:iot:${var.region}:${var.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/rejected"
        ]
      }
    ]
  })
}
```

## Fleet Policy for All Devices

A broader policy suitable for all devices in a fleet.

```hcl
resource "aws_iot_policy" "fleet" {
  name = "${var.app_name}-fleet-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "iot:Connect"
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["iot:Publish", "iot:Subscribe", "iot:Receive"]
        Resource = "*"
      }
    ]
  })
}
```

## Attaching Policy to a Certificate

```hcl
resource "aws_iot_policy_attachment" "sensor_cert" {
  policy = aws_iot_policy.sensor.name
  target = var.device_certificate_arn
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS IoT Core policies provide granular authorization for device connections, topic publishing, and subscriptions. OpenTofu manages policy documents with AWS IoT policy variables such as `$${iot:ClientId}` and certificate attachments - enabling secure, least-privilege IoT fleet management.
