# How to Connect to MSK from Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, MSK, Lambda, Kafka, Serverless

Description: Learn how to connect AWS Lambda to Amazon MSK for both consuming and producing Kafka messages, including VPC configuration, IAM auth, and error handling.

---

Connecting Lambda to MSK bridges the serverless and streaming worlds. You can use Lambda as a Kafka consumer (triggered by MSK events) or as a producer (sending messages to MSK from other event sources). Both patterns are useful, but they work quite differently under the hood.

Let's cover both scenarios with working code and all the configuration you need.

## Lambda as an MSK Consumer

Lambda can poll MSK topics directly using an event source mapping. This is the easier pattern - Lambda handles the polling, offset management, and scaling.

### VPC Configuration

Since MSK runs in a VPC, your Lambda function needs VPC access. Create the Lambda function in the same VPC as your MSK cluster.

This configures a Lambda function with VPC access to reach the MSK brokers.

```bash
aws lambda create-function \
  --function-name msk-consumer \
  --runtime python3.12 \
  --handler lambda_function.handler \
  --role arn:aws:iam::123456789:role/LambdaMSKRole \
  --zip-file fileb://function.zip \
  --timeout 300 \
  --memory-size 512 \
  --vpc-config '{
    "SubnetIds": ["subnet-private-a", "subnet-private-b", "subnet-private-c"],
    "SecurityGroupIds": ["sg-lambda-msk"]
  }'
```

The Lambda security group needs outbound access to the MSK broker ports. The MSK security group needs to allow inbound from the Lambda security group.

```bash
# Allow Lambda to reach MSK brokers (IAM auth port)
aws ec2 authorize-security-group-egress \
  --group-id sg-lambda-msk \
  --protocol tcp \
  --port 9098 \
  --destination-group sg-kafka-brokers

# Allow MSK to accept connections from Lambda
aws ec2 authorize-security-group-ingress \
  --group-id sg-kafka-brokers \
  --protocol tcp \
  --port 9098 \
  --source-group sg-lambda-msk
```

### Creating the Event Source Mapping

This creates an event source mapping that triggers Lambda when new messages arrive on the MSK topic.

```bash
aws lambda create-event-source-mapping \
  --function-name msk-consumer \
  --event-source-arn arn:aws:kafka:us-east-1:123456789:cluster/production-kafka/abc-123 \
  --topics user-events \
  --starting-position LATEST \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 5 \
  --source-access-configurations '[
    {"Type": "SASL_SCRAM_512_AUTH", "URI": "arn:aws:secretsmanager:us-east-1:123456789:secret:AmazonMSK_consumer-user-xxxx"}
  ]'
```

For IAM authentication (recommended), use this instead:

```bash
aws lambda create-event-source-mapping \
  --function-name msk-consumer \
  --event-source-arn arn:aws:kafka:us-east-1:123456789:cluster/production-kafka/abc-123 \
  --topics user-events \
  --starting-position LATEST \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 5 \
  --source-access-configurations '[
    {"Type": "CLIENT_CERTIFICATE_TLS_AUTH", "URI": "arn:aws:secretsmanager:us-east-1:123456789:secret:msk-client-cert"}
  ]'
```

### The Lambda Handler

When MSK triggers Lambda, the event contains batches of Kafka records organized by topic and partition.

This Lambda function processes batches of Kafka records from MSK with individual record error handling.

```python
import json
import base64

def handler(event, context):
    batch_failures = []

    # Event contains records grouped by topic-partition
    for topic_partition, records in event['records'].items():
        topic = topic_partition.rsplit('-', 1)[0]
        partition = topic_partition.rsplit('-', 1)[1]

        print(f"Processing {len(records)} records from {topic}:{partition}")

        for record in records:
            try:
                # Decode the Kafka record value
                value = base64.b64decode(record['value']).decode('utf-8')
                data = json.loads(value)

                # Get record metadata
                offset = record['offset']
                timestamp = record['timestamp']
                key = base64.b64decode(record['key']).decode('utf-8') if record.get('key') else None
                headers = {
                    h['key']: base64.b64decode(h['value']).decode('utf-8')
                    for h in record.get('headers', [])
                }

                # Process the record
                process_event(data, key, headers)

            except Exception as e:
                print(f"Error processing record at offset {record['offset']}: {e}")
                batch_failures.append({
                    "itemIdentifier": record['offset']
                })

    # Report individual failures for retry
    if batch_failures:
        return {"batchItemFailures": batch_failures}

    return {"batchItemFailures": []}

def process_event(data, key, headers):
    """Your business logic here."""
    print(f"Event: user={data.get('userId')}, type={data.get('eventType')}")
    # Write to DynamoDB, send notification, trigger workflow, etc.
```

### Enabling Partial Batch Response

To use the partial batch failure reporting shown above, update the event source mapping.

```bash
aws lambda update-event-source-mapping \
  --uuid your-mapping-uuid \
  --function-response-types ReportBatchItemFailures
```

## Lambda as an MSK Producer

Sometimes you want Lambda to produce messages to MSK - for example, an API Gateway endpoint that writes events to Kafka. This requires the Lambda function to create a Kafka producer connection.

This Lambda function produces messages to MSK using IAM authentication.

```python
import json
import os
from kafka import KafkaProducer
from aws_msk_iam_sasl_signer import MSKAuthTokenProvider

# Initialize the producer outside the handler for connection reuse
producer = None

class MSKTokenProvider:
    def token(self):
        token, _ = MSKAuthTokenProvider.generate_auth_token(
            os.environ['AWS_REGION'],
            aws_debug_creds=False
        )
        return token

def get_producer():
    global producer
    if producer is None:
        tp = MSKTokenProvider()
        producer = KafkaProducer(
            bootstrap_servers=os.environ['MSK_BOOTSTRAP_SERVERS'].split(','),
            security_protocol='SASL_SSL',
            sasl_mechanism='OAUTHBEARER',
            sasl_oauth_token_provider=tp,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            acks='all',
            retries=3,
            request_timeout_ms=10000
        )
    return producer

def handler(event, context):
    """API Gateway handler that writes events to MSK."""
    body = json.loads(event.get('body', '{}'))

    kafka_producer = get_producer()

    try:
        future = kafka_producer.send(
            topic='user-events',
            key=body.get('userId'),
            value={
                'userId': body['userId'],
                'eventType': body['eventType'],
                'timestamp': body.get('timestamp'),
                'source': 'api-gateway'
            }
        )

        # Wait for the send to complete
        metadata = future.get(timeout=5)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Event published',
                'partition': metadata.partition,
                'offset': metadata.offset
            })
        }

    except Exception as e:
        print(f"Failed to produce message: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

### Lambda Layer for Kafka Dependencies

The kafka-python and IAM signer libraries need to be packaged with your Lambda. Create a Lambda layer for reuse.

```bash
# Create a directory structure for the layer
mkdir -p kafka-layer/python

# Install dependencies into the layer
pip install kafka-python aws-msk-iam-sasl-signer -t kafka-layer/python/

# Package the layer
cd kafka-layer && zip -r ../kafka-layer.zip . && cd ..

# Create the Lambda layer
aws lambda publish-layer-version \
  --layer-name kafka-dependencies \
  --zip-file fileb://kafka-layer.zip \
  --compatible-runtimes python3.12

# Attach the layer to your function
aws lambda update-function-configuration \
  --function-name msk-producer \
  --layers arn:aws:lambda:us-east-1:123456789:layer:kafka-dependencies:1
```

## IAM Role Configuration

The Lambda execution role needs several permissions.

This IAM policy covers MSK consumer access, VPC networking, and logging.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kafka:DescribeCluster",
        "kafka:DescribeClusterV2",
        "kafka:GetBootstrapBrokers",
        "kafka-cluster:Connect",
        "kafka-cluster:DescribeCluster",
        "kafka-cluster:ReadData",
        "kafka-cluster:DescribeTopic",
        "kafka-cluster:WriteData",
        "kafka-cluster:AlterGroup",
        "kafka-cluster:DescribeGroup"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeVpcs",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups"
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
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:AmazonMSK_*"
    }
  ]
}
```

## Performance Considerations

### Cold Starts

Lambda cold starts with VPC access add 5-10 seconds of latency. For the producer pattern, this means the first request after a cold start will be slow. Mitigations:

- Use provisioned concurrency for consistent latency
- Keep the Kafka producer connection alive across invocations (initialize outside the handler)
- Use smaller deployment packages to reduce cold start time

```bash
# Set provisioned concurrency to avoid cold starts
aws lambda put-provisioned-concurrency-config \
  --function-name msk-producer \
  --qualifier $LATEST \
  --provisioned-concurrent-executions 5
```

### Consumer Scaling

For the consumer pattern (event source mapping), Lambda scales based on the number of partitions. With a parallelization factor of 1 (default), you get one Lambda invocation per partition. Increase the parallelization factor for higher throughput.

```bash
aws lambda update-event-source-mapping \
  --uuid your-mapping-uuid \
  --parallelization-factor 5
```

### Connection Limits

Each Lambda execution environment maintains its own Kafka connection. With high concurrency, you can hit MSK's connection limits. Monitor the `ConnectionCount` metric on your MSK cluster.

## Monitoring

Track these metrics for your Lambda-MSK integration:

- **IteratorAge** on Lambda - How far behind the consumer is
- **Duration** - Processing time per batch
- **Errors** - Failed invocations
- **ConnectionCount** on MSK - Total client connections

For more on MSK security configuration, check out our guide on [configuring MSK cluster security](https://oneuptime.com/blog/post/2026-02-12-configure-msk-cluster-security/view). For Kinesis-Lambda integration as an alternative, see [processing Kinesis streams with Lambda](https://oneuptime.com/blog/post/2026-02-12-process-kinesis-streams-with-lambda/view).

Lambda and MSK work well together, but it's not a zero-configuration setup. Get the VPC networking right, choose the right authentication mechanism, handle cold starts for the producer pattern, and monitor your connection counts. Once those pieces are in place, you get a solid serverless Kafka processing pipeline.
