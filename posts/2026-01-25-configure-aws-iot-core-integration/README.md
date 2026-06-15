# How to Configure AWS IoT Core Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS IoT Core, IoT, Cloud, MQTT, Device Management, Security, Terraform

Description: A practical guide to configuring AWS IoT Core for IoT device management.

---

> AWS IoT Core is a managed cloud service that enables secure, bidirectional communication between IoT devices and AWS Cloud. It supports billions of devices and trillions of messages, routing them to AWS endpoints and other devices.

AWS IoT Core handles device connectivity, authentication, and message routing while integrating with the broader AWS ecosystem. This guide walks through setting up a production-ready IoT infrastructure on AWS.

---

## AWS IoT Core Architecture

Understanding the components helps with proper configuration:

```mermaid
graph TB
    subgraph "Devices"
        D1[Device 1]
        D2[Device 2]
        D3[Device 3]
    end

    subgraph "AWS IoT Core"
        EP[Device Gateway]
        RG[Registry]
        SH[Device Shadow]
        RE[Rules Engine]
        AUTH[Authentication]
    end

    subgraph "AWS Services"
        S3[S3 Bucket]
        DDB[DynamoDB]
        LAM[Lambda]
        KIN[Kinesis]
        SNS[SNS]
    end

    D1 & D2 & D3 -->|MQTT/HTTPS| EP
    EP --> AUTH
    AUTH --> RG
    EP --> SH
    EP --> RE
    RE --> S3
    RE --> DDB
    RE --> LAM
    RE --> KIN
    RE --> SNS
```

---

## Prerequisites

Before starting:
- AWS account with appropriate permissions
- AWS CLI configured with credentials
- Terraform (optional, for infrastructure as code)
- OpenSSL for certificate generation
- Python 3.8+ and the AWS IoT Device SDK for Python v2 (`python3 -m pip install awsiotsdk`) for the Python examples

---

## Creating IoT Things

Things represent physical devices in AWS IoT Core.

### Using AWS CLI

```bash
# Create a thing type for categorization

aws iot create-thing-type \
  --thing-type-name "TemperatureSensor" \
  --thing-type-properties "thingTypeDescription=Temperature monitoring sensors"

# Create a thing
aws iot create-thing \
  --thing-name "sensor-001" \
  --thing-type-name "TemperatureSensor" \
  --attribute-payload "attributes={location=warehouse-a,floor=1}"

# List things
aws iot list-things --max-results 10
```

### Using Terraform

```hcl
# main.tf
# AWS IoT Core infrastructure

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Thing Type for sensor categorization
resource "aws_iot_thing_type" "temperature_sensor" {
  name = "TemperatureSensor"

  properties {
    description         = "Temperature monitoring sensors"
    searchable_attributes = ["location", "floor"]
  }
}

# Individual thing (device)
resource "aws_iot_thing" "sensor_001" {
  name           = "sensor-001"
  thing_type_name = aws_iot_thing_type.temperature_sensor.name

  attributes = {
    location = "warehouse-a"
    floor    = "1"
  }
}

# Thing Group for fleet management
resource "aws_iot_thing_group" "warehouse_sensors" {
  name = "warehouse-sensors"

  properties {
    description = "All sensors in warehouse"
  }

  tags = {
    Environment = "production"
  }
}

# Add thing to group
resource "aws_iot_thing_group_membership" "sensor_001_membership" {
  thing_name       = aws_iot_thing.sensor_001.name
  thing_group_name = aws_iot_thing_group.warehouse_sensors.name
}
```

---

## Certificate Management

AWS IoT uses X.509 certificates for device authentication.

### Creating Certificates

```bash
# Create certificate and keys
aws iot create-keys-and-certificate \
  --set-as-active \
  --certificate-pem-outfile "device.cert.pem" \
  --public-key-outfile "device.public.key" \
  --private-key-outfile "device.private.key"

# Output includes certificateArn - save this
# arn:aws:iot:us-east-1:123456789012:cert/abc123...

# Download Amazon Root CA
wget https://www.amazontrust.com/repository/AmazonRootCA1.pem
```

### Terraform Certificate Management

```hcl
# certificates.tf
# Certificate management for IoT devices

# Create certificate
resource "aws_iot_certificate" "sensor_001_cert" {
  active = true
}

# Attach certificate to thing
resource "aws_iot_thing_principal_attachment" "sensor_001_attachment" {
  thing     = aws_iot_thing.sensor_001.name
  principal = aws_iot_certificate.sensor_001_cert.arn
}

# Output certificate details for device provisioning
output "certificate_pem" {
  value     = aws_iot_certificate.sensor_001_cert.certificate_pem
  sensitive = true
}

output "private_key" {
  value     = aws_iot_certificate.sensor_001_cert.private_key
  sensitive = true
}
```

---

## IoT Policies

Policies define what actions devices can perform.

### Creating a Policy

```bash
# Create policy JSON file
cat > sensor-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:us-east-1:123456789012:client/${iot:Connection.Thing.ThingName}",
      "Condition": {
        "Bool": {
          "iot:Connection.Thing.IsAttached": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": [
        "arn:aws:iot:us-east-1:123456789012:topic/sensors/${iot:Connection.Thing.ThingName}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": [
        "arn:aws:iot:us-east-1:123456789012:topicfilter/commands/${iot:Connection.Thing.ThingName}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": [
        "arn:aws:iot:us-east-1:123456789012:topic/commands/${iot:Connection.Thing.ThingName}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish"
      ],
      "Resource": [
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/get",
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": [
        "arn:aws:iot:us-east-1:123456789012:topicfilter/$aws/things/${iot:Connection.Thing.ThingName}/shadow/get/accepted",
        "arn:aws:iot:us-east-1:123456789012:topicfilter/$aws/things/${iot:Connection.Thing.ThingName}/shadow/get/rejected",
        "arn:aws:iot:us-east-1:123456789012:topicfilter/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/accepted",
        "arn:aws:iot:us-east-1:123456789012:topicfilter/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/rejected",
        "arn:aws:iot:us-east-1:123456789012:topicfilter/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/delta",
        "arn:aws:iot:us-east-1:123456789012:topicfilter/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/documents"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": [
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/get/accepted",
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/get/rejected",
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/accepted",
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/rejected",
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/delta",
        "arn:aws:iot:us-east-1:123456789012:topic/$aws/things/${iot:Connection.Thing.ThingName}/shadow/update/documents"
      ]
    }
  ]
}
EOF

# Create the policy
aws iot create-policy \
  --policy-name "SensorDevicePolicy" \
  --policy-document file://sensor-policy.json

# Attach policy to certificate
aws iot attach-policy \
  --policy-name "SensorDevicePolicy" \
  --target "arn:aws:iot:us-east-1:123456789012:cert/abc123..."
```

### Terraform Policy Configuration

```hcl
# policies.tf
# IoT policies for device permissions

resource "aws_iot_policy" "sensor_policy" {
  name = "SensorDevicePolicy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "iot:Connect"
        Resource = "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:client/$${iot:Connection.Thing.ThingName}"
        Condition = {
          Bool = {
            "iot:Connection.Thing.IsAttached" = "true"
          }
        }
      },
      {
        Effect = "Allow"
        Action = "iot:Publish"
        Resource = [
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/sensors/$${iot:Connection.Thing.ThingName}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = "iot:Subscribe"
        Resource = [
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topicfilter/commands/$${iot:Connection.Thing.ThingName}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = "iot:Receive"
        Resource = [
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/commands/$${iot:Connection.Thing.ThingName}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "iot:Publish"
        ]
        Resource = [
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update"
        ]
      },
      {
        Effect = "Allow"
        Action = "iot:Subscribe"
        Resource = [
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/accepted",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/rejected",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/accepted",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/rejected",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/delta",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topicfilter/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/documents"
        ]
      },
      {
        Effect = "Allow"
        Action = "iot:Receive"
        Resource = [
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/accepted",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/get/rejected",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/accepted",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/rejected",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/delta",
          "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:topic/$aws/things/$${iot:Connection.Thing.ThingName}/shadow/update/documents"
        ]
      }
    ]
  })
}

# Attach policy to certificate
resource "aws_iot_policy_attachment" "sensor_001_policy" {
  policy = aws_iot_policy.sensor_policy.name
  target = aws_iot_certificate.sensor_001_cert.arn
}

# Data sources for ARN construction
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
```

---

## Device Shadow

Device Shadow maintains state for offline devices.

### Python Shadow Client

```python
# shadow_client.py
# AWS IoT Device Shadow client

from awsiot import iotshadow, mqtt5_client_builder
from awscrt import mqtt5, mqtt_request_response
from concurrent.futures import Future
import awsiot
import time

# Configuration
IOT_ENDPOINT = "xxxx-ats.iot.us-east-1.amazonaws.com"
THING_NAME = "sensor-001"
ROOT_CA = "./AmazonRootCA1.pem"
CERT_FILE = "./device.cert.pem"
KEY_FILE = "./device.private.key"
TIMEOUT = 30

# Shadow callback functions
def shadow_updated_callback(event):
    """Called when a shadow update document is received"""
    print(f"Shadow updated: {event}")

def shadow_delta_callback(event):
    """Called when there is a delta between desired and reported state"""
    print(f"Shadow delta received: {event}")

    # Extract desired state changes
    state = event.state or {}

    # Apply changes to device
    if "sample_interval" in state:
        new_interval = state["sample_interval"]
        print(f"Updating sample interval to: {new_interval}")
        apply_configuration(sample_interval=new_interval)

    # Report updated state
    report_state(shadow_client, state)

def apply_configuration(**kwargs):
    """Apply configuration changes to device"""
    # Implementation depends on your device
    print(f"Applying configuration: {kwargs}")

def report_state(client, state):
    """Report current state to shadow"""
    request = iotshadow.UpdateShadowRequest(
        thing_name=THING_NAME,
        state=iotshadow.ShadowState(reported=state)
    )
    response = client.update_shadow(request).result(TIMEOUT)
    print(f"Shadow update accepted: {response}")

def main():
    global shadow_client

    connected = Future()
    stopped = Future()

    def on_connection_success(event):
        connected.set_result(True)

    def on_connection_failure(event):
        connected.set_exception(Exception(f"Failed to connect: {event.exception}"))

    def on_stopped(event):
        stopped.set_result(True)

    # Create MQTT5 client using mutual TLS
    mqtt5_client = mqtt5_client_builder.mtls_from_path(
        endpoint=IOT_ENDPOINT,
        port=8883,
        cert_filepath=CERT_FILE,
        pri_key_filepath=KEY_FILE,
        ca_filepath=ROOT_CA,
        client_id=THING_NAME,
        on_lifecycle_connection_success=on_connection_success,
        on_lifecycle_connection_failure=on_connection_failure,
        on_lifecycle_stopped=on_stopped
    )

    rr_options = mqtt_request_response.ClientOptions(
        max_request_response_subscriptions=2,
        max_streaming_subscriptions=2,
        operation_timeout_in_seconds=TIMEOUT
    )
    shadow_client = iotshadow.IotShadowClientV2(mqtt5_client, rr_options)

    # Connect
    print(f"Connecting to {IOT_ENDPOINT}...")
    mqtt5_client.start()
    connected.result(TIMEOUT)
    print("Connected")

    # Register shadow callbacks
    updated_stream = shadow_client.create_shadow_updated_stream(
        iotshadow.ShadowUpdatedSubscriptionRequest(thing_name=THING_NAME),
        awsiot.ServiceStreamOptions(shadow_updated_callback)
    )
    updated_stream.open()

    delta_stream = shadow_client.create_shadow_delta_updated_stream(
        iotshadow.ShadowDeltaUpdatedSubscriptionRequest(thing_name=THING_NAME),
        awsiot.ServiceStreamOptions(shadow_delta_callback)
    )
    delta_stream.open()

    # Get current shadow state
    response = shadow_client.get_shadow(
        iotshadow.GetShadowRequest(thing_name=THING_NAME)
    ).result(TIMEOUT)
    print(f"Current shadow state: {response}")

    # Main loop - report state periodically
    try:
        while True:
            # Read current sensor state
            current_state = {
                "temperature": read_temperature(),
                "humidity": read_humidity(),
                "timestamp": int(time.time())
            }

            # Update shadow with reported state
            report_state(shadow_client, current_state)

            time.sleep(60)

    except KeyboardInterrupt:
        print("Disconnecting...")
        mqtt5_client.stop()
        stopped.result(TIMEOUT)

def read_temperature():
    """Read temperature from sensor"""
    import random
    return round(20 + random.uniform(-5, 5), 2)

def read_humidity():
    """Read humidity from sensor"""
    import random
    return round(50 + random.uniform(-10, 10), 1)

if __name__ == "__main__":
    main()
```

---

## Rules Engine

Route messages to AWS services based on SQL queries.

### Creating Rules with Terraform

```hcl
# rules.tf
# IoT Rules Engine configuration

# IAM role for rules engine
resource "aws_iam_role" "iot_rules_role" {
  name = "iot-rules-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "iot.amazonaws.com"
        }
      }
    ]
  })
}

# DynamoDB table for sensor data
resource "aws_dynamodb_table" "sensor_data" {
  name         = "sensor-data"
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

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

# Policy for DynamoDB access
resource "aws_iam_role_policy" "iot_dynamodb_policy" {
  name = "iot-dynamodb-policy"
  role = aws_iam_role.iot_rules_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem"
        ]
        Resource = aws_dynamodb_table.sensor_data.arn
      }
    ]
  })
}

# Rule to store sensor readings in DynamoDB
resource "aws_iot_topic_rule" "store_sensor_data" {
  name        = "StoreSensorData"
  description = "Store sensor readings in DynamoDB"
  enabled     = true
  sql         = "SELECT * FROM 'sensors/+/temperature'"
  sql_version = "2016-03-23"

  dynamodbv2 {
    role_arn = aws_iam_role.iot_rules_role.arn

    put_item {
      table_name = aws_dynamodb_table.sensor_data.name
    }
  }

  # Error action
  error_action {
    cloudwatch_logs {
      log_group_name = aws_cloudwatch_log_group.iot_errors.name
      role_arn       = aws_iam_role.iot_rules_role.arn
    }
  }
}

# CloudWatch log group for errors
resource "aws_cloudwatch_log_group" "iot_errors" {
  name              = "/aws/iot/rules/errors"
  retention_in_days = 14
}

# Policy for CloudWatch logging
resource "aws_iam_role_policy" "iot_cloudwatch_policy" {
  name = "iot-cloudwatch-policy"
  role = aws_iam_role.iot_rules_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.iot_errors.arn}:*"
      }
    ]
  })
}

variable "anomaly_handler_lambda_arn" {
  description = "ARN of the Lambda function that handles anomaly events"
  type        = string
}

# Rule to trigger Lambda for anomaly detection
resource "aws_iot_topic_rule" "anomaly_detection" {
  name        = "AnomalyDetection"
  description = "Detect temperature anomalies"
  enabled     = true
  sql         = "SELECT * FROM 'sensors/+/temperature' WHERE value > 40 OR value < 0"
  sql_version = "2016-03-23"

  lambda {
    function_arn = var.anomaly_handler_lambda_arn
  }
}
```

---

## Python Device SDK

```python
# device_client.py
# Complete AWS IoT device client

from awsiot import mqtt5_client_builder
from awscrt import mqtt5
from concurrent.futures import Future
import json
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
IOT_ENDPOINT = "xxxx-ats.iot.us-east-1.amazonaws.com"
THING_NAME = "sensor-001"
ROOT_CA = "./AmazonRootCA1.pem"
CERT_FILE = "./device.cert.pem"
KEY_FILE = "./device.private.key"
TIMEOUT = 30

# Topics
TELEMETRY_TOPIC = f"sensors/{THING_NAME}/temperature"
COMMAND_TOPIC = f"commands/{THING_NAME}/#"

def command_callback(publish_received_data):
    """Handle incoming commands"""
    publish_packet = publish_received_data.publish_packet
    logger.info(f"Received command on {publish_packet.topic}")
    try:
        command = json.loads(publish_packet.payload.decode())
        logger.info(f"Command payload: {command}")

        # Process command
        if command.get("action") == "reboot":
            handle_reboot()
        elif command.get("action") == "update_config":
            handle_config_update(command.get("config", {}))

    except json.JSONDecodeError:
        logger.error("Invalid JSON in command")

def handle_reboot():
    """Handle reboot command"""
    logger.info("Reboot command received")
    # Implement device reboot logic

def handle_config_update(config):
    """Handle configuration update"""
    logger.info(f"Updating config: {config}")
    # Implement config update logic

def main():
    connected = Future()
    stopped = Future()

    def on_connection_success(event):
        connected.set_result(True)

    def on_connection_failure(event):
        connected.set_exception(Exception(f"Failed to connect: {event.exception}"))

    def on_stopped(event):
        stopped.set_result(True)

    # Create MQTT5 client using mutual TLS
    mqtt_client = mqtt5_client_builder.mtls_from_path(
        endpoint=IOT_ENDPOINT,
        port=8883,
        cert_filepath=CERT_FILE,
        pri_key_filepath=KEY_FILE,
        ca_filepath=ROOT_CA,
        client_id=THING_NAME,
        on_publish_received=command_callback,
        on_lifecycle_connection_success=on_connection_success,
        on_lifecycle_connection_failure=on_connection_failure,
        on_lifecycle_stopped=on_stopped
    )

    # Connect
    logger.info(f"Connecting to {IOT_ENDPOINT}...")
    mqtt_client.start()
    connected.result(TIMEOUT)
    logger.info("Connected")

    # Subscribe to command topic
    subscribe_future = mqtt_client.subscribe(mqtt5.SubscribePacket(
        subscriptions=[mqtt5.Subscription(
            topic_filter=COMMAND_TOPIC,
            qos=mqtt5.QoS.AT_LEAST_ONCE
        )]
    ))
    subscribe_future.result(TIMEOUT)
    logger.info(f"Subscribed to {COMMAND_TOPIC}")

    # Main telemetry loop
    try:
        while True:
            # Read sensor data
            payload = {
                "device_id": THING_NAME,
                "temperature": read_temperature(),
                "humidity": read_humidity(),
                "timestamp": int(time.time() * 1000)
            }

            # Publish telemetry
            publish_future = mqtt_client.publish(mqtt5.PublishPacket(
                topic=TELEMETRY_TOPIC,
                payload=json.dumps(payload),
                qos=mqtt5.QoS.AT_LEAST_ONCE
            ))
            publish_future.result(TIMEOUT)
            logger.info(f"Published: {payload}")

            time.sleep(30)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        mqtt_client.stop()
        stopped.result(TIMEOUT)

def read_temperature():
    import random
    return round(22 + random.uniform(-3, 3), 2)

def read_humidity():
    import random
    return round(55 + random.uniform(-5, 5), 1)

if __name__ == "__main__":
    main()
```

---

## Conclusion

AWS IoT Core provides enterprise-grade IoT infrastructure with built-in security, scalability, and AWS service integration. The combination of Things, Certificates, Policies, Shadows, and Rules Engine creates a flexible platform for any IoT use case.

Key takeaways:
- Use X.509 certificates with least-privilege policies
- Device Shadows maintain state for offline devices
- Rules Engine routes data to AWS services
- Use Terraform for repeatable infrastructure
- Monitor with CloudWatch for operational visibility

Start with the basics and expand as your IoT deployment grows.

---

*Managing AWS IoT deployments? [OneUptime](https://oneuptime.com) integrates with AWS to provide unified monitoring across your IoT infrastructure. Track device connectivity, message throughput, and rule execution with real-time dashboards.*
