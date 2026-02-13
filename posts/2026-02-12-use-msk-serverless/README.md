# How to Use MSK Serverless

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, MSK, Kafka, Serverless, Streaming

Description: Get started with Amazon MSK Serverless to run Apache Kafka without managing brokers or capacity, including setup, IAM authentication, and migration from provisioned MSK.

---

MSK Serverless strips away the operational complexity of running Kafka. No brokers to provision, no storage to manage, no capacity planning. You create a cluster, connect your clients, and MSK handles everything else - scaling up and down based on your actual traffic. It's Kafka without the babysitting.

If you've been burned by undersized Kafka clusters during traffic spikes or overpaying for idle capacity during off-hours, MSK Serverless might be the answer. Let's dig into how it works and whether it fits your use case.

## How MSK Serverless Differs from Provisioned MSK

With provisioned MSK, you choose instance types, broker counts, and storage sizes. You're responsible for capacity planning. With MSK Serverless:

- No broker instances to manage
- Storage scales automatically
- Throughput scales automatically (up to account limits)
- You pay per data in and out, not per broker-hour
- Only IAM authentication is supported (no SASL/SCRAM)
- Limited to 5 consumer groups per cluster initially (can be increased)

## Creating an MSK Serverless Cluster

This creates an MSK Serverless cluster with IAM authentication in your VPC.

```bash
aws kafka create-cluster-v2 \
  --cluster-name serverless-kafka \
  --serverless '{
    "VpcConfigs": [
      {
        "SubnetIds": ["subnet-az1-abc", "subnet-az2-def", "subnet-az3-ghi"],
        "SecurityGroupIds": ["sg-msk-serverless"]
      }
    ],
    "ClientAuthentication": {
      "Sasl": {
        "Iam": {
          "Enabled": true
        }
      }
    }
  }'
```

That's it. No instance types, no storage configuration, no broker count. The cluster is typically ready in about 2-3 minutes - much faster than provisioned MSK.

Get the cluster ARN from the response and check its state.

```bash
aws kafka describe-cluster-v2 \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/serverless-kafka/abc-123 \
  --query 'ClusterInfo.State'
```

## Getting the Bootstrap Servers

Once the cluster is ACTIVE, get the bootstrap broker endpoint.

```bash
aws kafka get-bootstrap-brokers \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/serverless-kafka/abc-123

# Output will show the IAM bootstrap endpoint
# boot-abc123.c1.kafka-serverless.us-east-1.amazonaws.com:9098
```

MSK Serverless only supports IAM authentication, so you'll always use port 9098.

## IAM Policy for Clients

Every client needs an IAM policy that grants Kafka-specific permissions. Here's a comprehensive policy for a producer and consumer application.

This IAM policy grants topic-level read/write access for MSK Serverless.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:Connect",
        "kafka-cluster:DescribeCluster",
        "kafka-cluster:AlterCluster"
      ],
      "Resource": "arn:aws:kafka:us-east-1:123456789:cluster/serverless-kafka/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:CreateTopic",
        "kafka-cluster:DescribeTopic",
        "kafka-cluster:WriteData",
        "kafka-cluster:ReadData",
        "kafka-cluster:AlterTopic",
        "kafka-cluster:DeleteTopic"
      ],
      "Resource": "arn:aws:kafka:us-east-1:123456789:topic/serverless-kafka/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:AlterGroup",
        "kafka-cluster:DescribeGroup",
        "kafka-cluster:DeleteGroup"
      ],
      "Resource": "arn:aws:kafka:us-east-1:123456789:group/serverless-kafka/*"
    }
  ]
}
```

For stricter security, specify exact topic names instead of wildcards.

```json
{
  "Effect": "Allow",
  "Action": ["kafka-cluster:WriteData"],
  "Resource": "arn:aws:kafka:us-east-1:123456789:topic/serverless-kafka/*/user-events"
}
```

## Connecting a Producer

Here's a Python producer connecting to MSK Serverless.

This Python producer uses IAM authentication to send messages to MSK Serverless.

```python
import json
import os
from kafka import KafkaProducer
from aws_msk_iam_sasl_signer import MSKAuthTokenProvider

class MSKTokenProvider:
    def token(self):
        token, _ = MSKAuthTokenProvider.generate_auth_token('us-east-1')
        return token

tp = MSKTokenProvider()

producer = KafkaProducer(
    bootstrap_servers=['boot-abc123.c1.kafka-serverless.us-east-1.amazonaws.com:9098'],
    security_protocol='SASL_SSL',
    sasl_mechanism='OAUTHBEARER',
    sasl_oauth_token_provider=tp,
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8') if k else None,
    acks='all',
    retries=3,
    batch_size=16384,
    linger_ms=5
)

# Produce messages
for i in range(100):
    event = {
        'userId': f'user-{i % 50}',
        'eventType': 'page_view',
        'page': f'/product/{i}',
        'timestamp': 1707753600000 + i
    }

    future = producer.send(
        'user-events',
        key=event['userId'],
        value=event
    )

    # Optionally wait for confirmation
    if i % 10 == 0:
        metadata = future.get(timeout=10)
        print(f"Sent to partition {metadata.partition}, offset {metadata.offset}")

producer.flush()
print("All messages sent")
```

## Connecting a Consumer

```python
from kafka import KafkaConsumer
from aws_msk_iam_sasl_signer import MSKAuthTokenProvider
import json

class MSKTokenProvider:
    def token(self):
        token, _ = MSKAuthTokenProvider.generate_auth_token('us-east-1')
        return token

tp = MSKTokenProvider()

consumer = KafkaConsumer(
    'user-events',
    bootstrap_servers=['boot-abc123.c1.kafka-serverless.us-east-1.amazonaws.com:9098'],
    security_protocol='SASL_SSL',
    sasl_mechanism='OAUTHBEARER',
    sasl_oauth_token_provider=tp,
    group_id='event-processor',
    auto_offset_reset='latest',
    enable_auto_commit=True,
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

print("Waiting for messages...")
for message in consumer:
    event = message.value
    print(f"Partition {message.partition}, Offset {message.offset}: "
          f"user={event['userId']}, type={event['eventType']}")
```

## Java Client Configuration

For Java clients, use the aws-msk-iam-auth library.

This Java properties file configures a Kafka client for MSK Serverless with IAM auth.

```properties
# client.properties
bootstrap.servers=boot-abc123.c1.kafka-serverless.us-east-1.amazonaws.com:9098
security.protocol=SASL_SSL
sasl.mechanism=AWS_MSK_IAM
sasl.jaas.config=software.amazon.msk.auth.iam.IAMLoginModule required;
sasl.client.callback.handler.class=software.amazon.msk.auth.iam.IAMClientCallbackHandler
```

Maven dependency:

```xml
<dependency>
    <groupId>software.amazon.msk</groupId>
    <artifactId>aws-msk-iam-auth</artifactId>
    <version>2.0.3</version>
</dependency>
```

## Creating Topics

MSK Serverless supports auto topic creation, but for production you should create topics explicitly.

```bash
BOOTSTRAP="boot-abc123.c1.kafka-serverless.us-east-1.amazonaws.com:9098"

kafka-topics.sh \
  --bootstrap-server $BOOTSTRAP \
  --command-config client.properties \
  --create \
  --topic user-events \
  --partitions 6

# Note: replication factor is managed by MSK Serverless - you don't set it
```

MSK Serverless manages replication internally. You can't set the replication factor - it's always handled to ensure durability.

## Limits and Quotas

MSK Serverless has some important limits to know about:

| Limit | Default Value |
|-------|---------------|
| Partitions per cluster | 120 |
| Consumer groups per cluster | 5 (can request increase) |
| Max message size | 8 MB |
| Max throughput per partition | 5 MB/sec in, 10 MB/sec out |
| Max cluster throughput | 200 MB/sec in, 400 MB/sec out |
| Retention | Up to 24 hours |

The retention limit is significant. If you need retention longer than 24 hours, you'll need provisioned MSK.

## Cost Model

MSK Serverless pricing is based on:
- **Cluster hours** - Per-hour charge for the cluster existing
- **Partition hours** - Per partition-hour charge
- **Storage** - Per GB-hour for data stored
- **Data in/out** - Per GB transferred

For variable workloads, this can be much cheaper than provisioned MSK because you're not paying for idle brokers during low-traffic periods.

Here's a rough comparison for a moderate workload (5 MB/sec average, 12 partitions).

```
MSK Serverless:
- Cluster: $0.75/hr x 730 = $547.50
- Partitions: 12 x $0.0015/hr x 730 = $13.14
- Storage: ~1.5 TB-hrs x $0.10 = $150
- Data: ~13 TB in/out x $0.10 = $1,300
Total: ~$2,010/month

Provisioned MSK (3x kafka.m5.large):
- Brokers: 3 x $0.21/hr x 730 = $459.90
- Storage: 500 GB x 3 x $0.10 = $150
Total: ~$610/month
```

For this workload, provisioned MSK is cheaper. MSK Serverless wins when your traffic is highly variable and you'd otherwise be overprovisioning for peak capacity.

## Migrating from Provisioned MSK

If you're moving from provisioned MSK to serverless, the key changes are:

1. **Authentication** - Switch to IAM. SASL/SCRAM isn't supported.
2. **Topic configuration** - You can't set replication factor or most topic configs.
3. **Retention** - Max 24 hours. Archive older data to S3 using Kafka Connect or Firehose.
4. **Client libraries** - Add the IAM auth library and update connection properties.

For setting up a provisioned cluster, see our guide on [setting up Amazon MSK](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-msk/view). For connecting Lambda to your cluster, check out [connecting to MSK from Lambda](https://oneuptime.com/blog/post/2026-02-12-connect-to-msk-from-lambda/view).

## Monitoring

MSK Serverless publishes metrics to CloudWatch. The important ones:

```bash
# Check cluster throughput
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kafka \
  --metric-name BytesInPerSec \
  --dimensions Name=Cluster\ Name,Value=serverless-kafka \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

MSK Serverless is the fastest way to get Kafka running on AWS. The trade-off is less control and a 24-hour retention limit. If those constraints work for your use case, you get a Kafka cluster that genuinely runs itself.
