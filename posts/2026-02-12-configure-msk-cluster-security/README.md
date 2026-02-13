# How to Configure MSK Cluster Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, MSK, Kafka, Security, IAM

Description: Comprehensive guide to securing Amazon MSK clusters with TLS encryption, IAM authentication, SASL/SCRAM, ACLs, and network isolation best practices.

---

Running Kafka in production means taking security seriously. Amazon MSK gives you multiple layers of security - encryption, authentication, authorization, and network controls. The challenge is figuring out which mechanisms to use and how they fit together.

This post covers every security option MSK offers and when to use each one. By the end, you'll have a locked-down cluster that meets enterprise security requirements.

## Security Layers Overview

MSK security has four layers:

1. **Encryption** - Protect data in transit and at rest
2. **Authentication** - Verify who's connecting
3. **Authorization** - Control what authenticated users can do
4. **Network** - Restrict who can reach the cluster

Let's configure each one.

## Encryption in Transit

MSK supports TLS encryption between clients and brokers, and between brokers themselves (inter-broker).

When creating a cluster, set the encryption configuration.

```bash
aws kafka create-cluster \
  --cluster-name secure-kafka \
  --kafka-version 3.6.0 \
  --number-of-broker-nodes 3 \
  --broker-node-group-info '{
    "InstanceType": "kafka.m5.large",
    "ClientSubnets": ["subnet-a", "subnet-b", "subnet-c"],
    "SecurityGroups": ["sg-kafka-brokers"]
  }' \
  --encryption-info '{
    "EncryptionInTransit": {
      "ClientBroker": "TLS",
      "InCluster": true
    },
    "EncryptionAtRest": {
      "DataVolumeKMSKeyId": "arn:aws:kms:us-east-1:123456789:key/my-cmk"
    }
  }'
```

The `ClientBroker` setting has three options:
- **TLS** - All client connections must use TLS (port 9094)
- **TLS_PLAINTEXT** - Both TLS and plaintext connections are accepted (ports 9094 and 9092)
- **PLAINTEXT** - Only plaintext connections (port 9092). Don't use this in production.

## Encryption at Rest

MSK encrypts data at rest using KMS. You can use the AWS-managed key or a customer-managed CMK.

Using a customer-managed key gives you control over key rotation and the ability to audit key usage in CloudTrail.

```bash
# Create a KMS key for MSK
aws kms create-key \
  --description "MSK encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS

# Create an alias for easy reference
aws kms create-alias \
  --alias-name alias/msk-encryption \
  --target-key-id <key-id>
```

## IAM Authentication

IAM authentication is the recommended approach for MSK. It uses AWS IAM policies to control access, which means no passwords to manage and full integration with AWS's identity system.

Enable IAM auth when creating the cluster.

```bash
aws kafka create-cluster \
  --cluster-name iam-kafka \
  --kafka-version 3.6.0 \
  --number-of-broker-nodes 3 \
  --broker-node-group-info '{
    "InstanceType": "kafka.m5.large",
    "ClientSubnets": ["subnet-a", "subnet-b", "subnet-c"],
    "SecurityGroups": ["sg-kafka-brokers"],
    "ConnectivityInfo": {
      "PublicAccess": {"Type": "DISABLED"}
    }
  }' \
  --client-authentication '{
    "Sasl": {
      "Iam": {"Enabled": true}
    }
  }' \
  --encryption-info '{
    "EncryptionInTransit": {
      "ClientBroker": "TLS",
      "InCluster": true
    }
  }'
```

Create an IAM policy that grants specific Kafka permissions.

This IAM policy allows a producer to write to a specific topic and a consumer to read from it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:Connect",
        "kafka-cluster:DescribeCluster"
      ],
      "Resource": "arn:aws:kafka:us-east-1:123456789:cluster/iam-kafka/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:WriteData",
        "kafka-cluster:DescribeTopic"
      ],
      "Resource": "arn:aws:kafka:us-east-1:123456789:topic/iam-kafka/*/user-events"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:ReadData",
        "kafka-cluster:DescribeTopic"
      ],
      "Resource": "arn:aws:kafka:us-east-1:123456789:topic/iam-kafka/*/user-events"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:AlterGroup",
        "kafka-cluster:DescribeGroup"
      ],
      "Resource": "arn:aws:kafka:us-east-1:123456789:group/iam-kafka/*/event-processors"
    }
  ]
}
```

Connect from a Python client using IAM authentication.

This Python producer uses IAM authentication to connect to MSK.

```python
from kafka import KafkaProducer
from aws_msk_iam_sasl_signer import MSKAuthTokenProvider
import json

# IAM authentication callback
class MSKTokenProvider:
    def token(self):
        token, _ = MSKAuthTokenProvider.generate_auth_token(
            'us-east-1',
            aws_debug_creds=False
        )
        return token

tp = MSKTokenProvider()

producer = KafkaProducer(
    bootstrap_servers=[
        'b-1.iam-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9098'
    ],
    security_protocol='SASL_SSL',
    sasl_mechanism='OAUTHBEARER',
    sasl_oauth_token_provider=tp,
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all'
)

producer.send('user-events', value={'userId': 'user-123', 'event': 'login'})
producer.flush()
```

Note: IAM auth uses port 9098, not 9094.

## SASL/SCRAM Authentication

If you can't use IAM (for example, with non-AWS clients), SASL/SCRAM provides username/password authentication.

First, store credentials in AWS Secrets Manager.

```bash
# Create a secret for the Kafka user
aws secretsmanager create-secret \
  --name AmazonMSK_producer-user \
  --secret-string '{
    "username": "producer-app",
    "password": "SecurePassword123!"
  }'
```

Enable SASL/SCRAM on the cluster.

```bash
aws kafka update-security \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/secure-kafka/abc-123 \
  --client-authentication '{
    "Sasl": {
      "Scram": {"Enabled": true}
    }
  }'
```

Associate the secret with the cluster.

```bash
aws kafka batch-associate-scram-secret \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/secure-kafka/abc-123 \
  --secret-arn-list arn:aws:secretsmanager:us-east-1:123456789:secret:AmazonMSK_producer-user-xxxx
```

Connect using SCRAM.

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['b-1.secure-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9096'],
    security_protocol='SASL_SSL',
    sasl_mechanism='SCRAM-SHA-512',
    sasl_plain_username='producer-app',
    sasl_plain_password='SecurePassword123!',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)
```

SCRAM uses port 9096.

## Kafka ACLs

When using SASL/SCRAM, you need Kafka ACLs for fine-grained authorization. ACLs control which users can read, write, create, or delete specific topics.

This script sets up Kafka ACLs for producer and consumer access.

```bash
BROKERS="b-1.secure-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9096"

# Allow producer to write to user-events topic
kafka-acls.sh \
  --bootstrap-server $BROKERS \
  --command-config scram-client.properties \
  --add \
  --allow-principal "User:producer-app" \
  --operation Write \
  --operation Describe \
  --topic user-events

# Allow consumer to read from user-events topic
kafka-acls.sh \
  --bootstrap-server $BROKERS \
  --command-config scram-client.properties \
  --add \
  --allow-principal "User:consumer-app" \
  --operation Read \
  --operation Describe \
  --topic user-events

# Allow consumer group management
kafka-acls.sh \
  --bootstrap-server $BROKERS \
  --command-config scram-client.properties \
  --add \
  --allow-principal "User:consumer-app" \
  --operation Read \
  --group event-processor-group

# List all ACLs
kafka-acls.sh \
  --bootstrap-server $BROKERS \
  --command-config scram-client.properties \
  --list
```

## Network Security

### Security Groups

Configure your security groups to restrict access to the MSK brokers.

This security group configuration allows only specific application security groups to access MSK.

```bash
# Allow inbound from application security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-kafka-brokers \
  --protocol tcp \
  --port 9094 \
  --source-group sg-application-servers

# Allow IAM auth port
aws ec2 authorize-security-group-ingress \
  --group-id sg-kafka-brokers \
  --protocol tcp \
  --port 9098 \
  --source-group sg-application-servers

# Allow SCRAM auth port
aws ec2 authorize-security-group-ingress \
  --group-id sg-kafka-brokers \
  --protocol tcp \
  --port 9096 \
  --source-group sg-application-servers

# Allow inter-broker communication
aws ec2 authorize-security-group-ingress \
  --group-id sg-kafka-brokers \
  --protocol tcp \
  --port 9094 \
  --source-group sg-kafka-brokers
```

### Private Connectivity

Keep your MSK cluster in private subnets with no public access. If clients need to connect from other VPCs or on-premises, use VPC peering, Transit Gateway, or PrivateLink.

```bash
# Disable public access (do this when creating the cluster)
--broker-node-group-info '{
  "ConnectivityInfo": {
    "PublicAccess": {"Type": "DISABLED"}
  }
}'
```

## Security Audit Checklist

Run through this list for every production MSK cluster:

1. TLS encryption enabled for client-broker and inter-broker traffic
2. Encryption at rest with customer-managed KMS key
3. IAM or SASL/SCRAM authentication enabled
4. Plaintext listeners disabled
5. ACLs configured for all topics (if using SCRAM)
6. Security groups restrict access to known clients only
7. Public access disabled
8. CloudTrail logging enabled for API calls
9. Broker logs shipped to CloudWatch
10. Secrets Manager used for SCRAM credentials (not hardcoded)

For the basics of setting up your MSK cluster before hardening security, see our guide on [setting up Amazon MSK](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-msk/view).

Security isn't something you bolt on later - get it right from the start. IAM authentication is the simplest path if all your clients are AWS-native. SASL/SCRAM with ACLs gives you more flexibility for mixed environments. Either way, always encrypt everything and restrict network access to the minimum necessary.
