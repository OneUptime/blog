# How to Use IoT Core Rules Engine to Route Messages to DynamoDB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IoT Core, Rules Engine, DynamoDB, Database, IoT

Description: Route IoT device messages to DynamoDB using the IoT Core Rules Engine for real-time device state tracking and fast key-value lookups

---

While S3 is great for long-term data storage, many IoT applications need real-time access to the latest device data. DynamoDB is ideal for this - it gives you single-digit millisecond reads for the latest sensor reading, device status, or configuration state. The IoT Core Rules Engine can write directly to DynamoDB, creating a serverless pipeline from device to database.

This guide covers how to set up rules to route IoT messages to DynamoDB, including table design patterns optimized for IoT workloads.

## When to Use DynamoDB for IoT Data

DynamoDB is the right choice when you need:

- **Fast lookups**: "What is the latest temperature from sensor-042?"
- **Device state tracking**: "Which devices are online right now?"
- **Time-series queries within a device**: "Show me the last 24 hours of readings from sensor-042"
- **Real-time dashboards**: Sub-second access to current device data

It is not the right choice for:

- Long-term archival storage (use S3 instead)
- Complex cross-device analytical queries (use Athena or Timestream)
- Storing large payloads over 400KB per item

## Step 1: Design the DynamoDB Table

Table design for IoT data depends on your access patterns. Here are two common designs.

### Design 1: Latest State Table

Stores only the most recent reading per device. Each new message overwrites the previous one.

```bash
# Create a simple table for latest device state
aws dynamodb create-table \
  --table-name DeviceLatestState \
  --attribute-definitions \
    AttributeName=device_id,AttributeType=S \
  --key-schema \
    AttributeName=device_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Design 2: Time-Series Table

Stores all readings, partitioned by device and sorted by time.

```bash
# Create a time-series table with device_id as partition key
# and timestamp as sort key
aws dynamodb create-table \
  --table-name DeviceTelemetry \
  --attribute-definitions \
    AttributeName=device_id,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=device_id,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Add a TTL to automatically expire old data (e.g., after 30 days)
aws dynamodb update-time-to-live \
  --table-name DeviceTelemetry \
  --time-to-live-specification "Enabled=true,AttributeName=expiry_time"
```

## Step 2: Create the IAM Role

```bash
# Create the trust policy for IoT rules
cat > iot-dynamodb-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "iot.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name IoTRuleDynamoDBRole \
  --assume-role-policy-document file://iot-dynamodb-trust.json

# Create the DynamoDB write policy
cat > iot-dynamodb-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789:table/DeviceLatestState",
        "arn:aws:dynamodb:us-east-1:123456789:table/DeviceTelemetry"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name IoTRuleDynamoDBRole \
  --policy-name DynamoDBWriteAccess \
  --policy-document file://iot-dynamodb-policy.json
```

## Step 3: Create IoT Rules

### Rule 1: Update Latest Device State

This rule uses the DynamoDBv2 action to write the full message as a DynamoDB item.

```bash
# Route telemetry to the latest state table (overwrites on each message)
aws iot create-topic-rule \
  --rule-name UpdateDeviceState \
  --topic-rule-payload '{
    "sql": "SELECT topic(2) as device_id, temperature, humidity, battery_level, timestamp() as last_seen FROM '\''devices/+/telemetry'\''",
    "description": "Update the latest device state in DynamoDB",
    "ruleDisabled": false,
    "actions": [
      {
        "dynamoDBv2": {
          "roleArn": "arn:aws:iam::123456789:role/IoTRuleDynamoDBRole",
          "putItem": {
            "tableName": "DeviceLatestState"
          }
        }
      }
    ],
    "errorAction": {
      "cloudwatchLogs": {
        "roleArn": "arn:aws:iam::123456789:role/IoTRuleDynamoDBRole",
        "logGroupName": "/iot/rules/errors"
      }
    }
  }'
```

The `dynamoDBv2` action takes the entire SQL SELECT result and writes it as a DynamoDB item. The `device_id` field must match the table's partition key.

### Rule 2: Append to Time-Series Table

For the time-series table, include a timestamp sort key and a TTL value.

```bash
# Route telemetry to the time-series table with TTL
aws iot create-topic-rule \
  --rule-name AppendTelemetryTimeSeries \
  --topic-rule-payload '{
    "sql": "SELECT topic(2) as device_id, timestamp() as timestamp, temperature, humidity, battery_level, (timestamp() / 1000) + 2592000 as expiry_time FROM '\''devices/+/telemetry'\''",
    "description": "Append telemetry readings to time-series table",
    "ruleDisabled": false,
    "actions": [
      {
        "dynamoDBv2": {
          "roleArn": "arn:aws:iam::123456789:role/IoTRuleDynamoDBRole",
          "putItem": {
            "tableName": "DeviceTelemetry"
          }
        }
      }
    ]
  }'
```

The `expiry_time` calculation adds 2,592,000 seconds (30 days) to the current timestamp. DynamoDB TTL will automatically delete items after this time.

### Rule 3: Using the Classic DynamoDB Action

The original `dynamoDB` action (v1) gives you more control over how data maps to DynamoDB attributes. It is useful when you need to set specific hash and range key values.

```bash
# Classic DynamoDB action with explicit key mapping
aws iot create-topic-rule \
  --rule-name ClassicDynamoDBRule \
  --topic-rule-payload '{
    "sql": "SELECT * FROM '\''devices/+/telemetry'\''",
    "ruleDisabled": false,
    "actions": [
      {
        "dynamoDB": {
          "roleArn": "arn:aws:iam::123456789:role/IoTRuleDynamoDBRole",
          "tableName": "DeviceTelemetry",
          "hashKeyField": "device_id",
          "hashKeyValue": "${topic(2)}",
          "hashKeyType": "STRING",
          "rangeKeyField": "timestamp",
          "rangeKeyValue": "${timestamp()}",
          "rangeKeyType": "NUMBER",
          "payloadField": "payload"
        }
      }
    ]
  }'
```

This stores the entire message payload in a `payload` attribute, with the hash and range keys set from topic and timestamp.

## Step 4: CloudFormation Configuration

```yaml
AWSTemplateFormatVersion: '2010-09-09'

Resources:
  DeviceStateTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: DeviceLatestState
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: device_id
          AttributeType: S
      KeySchema:
        - AttributeName: device_id
          KeyType: HASH

  TelemetryTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: DeviceTelemetry
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: device_id
          AttributeType: S
        - AttributeName: timestamp
          AttributeType: N
      KeySchema:
        - AttributeName: device_id
          KeyType: HASH
        - AttributeName: timestamp
          KeyType: RANGE
      TimeToLiveSpecification:
        AttributeName: expiry_time
        Enabled: true

  IoTRuleRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: iot.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: DynamoDBAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                Resource:
                  - !GetAtt DeviceStateTable.Arn
                  - !GetAtt TelemetryTable.Arn

  UpdateStateRule:
    Type: AWS::IoT::TopicRule
    Properties:
      RuleName: UpdateDeviceState
      TopicRulePayload:
        Sql: >-
          SELECT topic(2) as device_id, temperature, humidity,
          timestamp() as last_seen FROM 'devices/+/telemetry'
        Actions:
          - DynamoDBv2:
              RoleArn: !GetAtt IoTRuleRole.Arn
              PutItem:
                TableName: !Ref DeviceStateTable
        RuleDisabled: false
```

## Step 5: Query the Data

### Get Latest Device State

```bash
# Get the latest state for a specific device
aws dynamodb get-item \
  --table-name DeviceLatestState \
  --key '{"device_id": {"S": "sensor-042"}}' \
  --query 'Item'
```

### Query Time-Series Data

```bash
# Get the last hour of readings for a device
HOUR_AGO=$(($(date +%s) * 1000 - 3600000))

aws dynamodb query \
  --table-name DeviceTelemetry \
  --key-condition-expression "device_id = :did AND #ts > :start" \
  --expression-attribute-names '{"#ts": "timestamp"}' \
  --expression-attribute-values "{
    \":did\": {\"S\": \"sensor-042\"},
    \":start\": {\"N\": \"$HOUR_AGO\"}
  }" \
  --scan-index-forward false \
  --limit 100
```

## Managing Data Volume

IoT data can grow quickly. Here are strategies to manage it:

**Use TTL aggressively**: Set TTL to automatically expire old time-series data. 30 days is a common choice for detailed telemetry, 90 days for alerts.

**Use the latest-state pattern**: For devices where you only need the current value, overwrite instead of append. This keeps the table size constant regardless of message frequency.

**Archive to S3**: Use DynamoDB Streams with a Lambda function or direct S3 export to archive data before TTL deletes it. Or better yet, route to both DynamoDB and S3 simultaneously using multiple rule actions.

```bash
# Rule with two actions: DynamoDB for real-time + S3 for archival
aws iot create-topic-rule \
  --rule-name DualRouteRule \
  --topic-rule-payload '{
    "sql": "SELECT topic(2) as device_id, *, timestamp() as ts FROM '\''devices/+/telemetry'\''",
    "actions": [
      {
        "dynamoDBv2": {
          "roleArn": "arn:aws:iam::123456789:role/IoTRuleDynamoDBRole",
          "putItem": {"tableName": "DeviceLatestState"}
        }
      },
      {
        "s3": {
          "roleArn": "arn:aws:iam::123456789:role/IoTRuleS3Role",
          "bucketName": "my-iot-data-lake",
          "key": "archive/${topic(2)}/${parse_time(\"yyyy/MM/dd\", timestamp())}/${timestamp()}.json"
        }
      }
    ]
  }'
```

## Wrapping Up

DynamoDB is the go-to choice for real-time IoT data access. The IoT Core Rules Engine makes the integration seamless - no Lambda functions, no servers, just a SQL filter and a DynamoDB action. Design your table schema around your access patterns, use TTL to manage data lifecycle, and consider dual-routing to both DynamoDB and S3 for the best of both worlds.

For routing to other destinations, see our guides on [routing messages to S3](https://oneuptime.com/blog/post/iot-core-rules-engine-route-messages-s3/view) and [routing messages to Lambda](https://oneuptime.com/blog/post/iot-core-rules-engine-route-messages-lambda/view).
