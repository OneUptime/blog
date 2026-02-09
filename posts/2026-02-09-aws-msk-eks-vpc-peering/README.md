# How to Deploy AWS MSK on EKS Using VPC Peering for Kafka Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, AWS, Kubernetes

Description: Learn how to set up AWS MSK and EKS clusters with VPC peering for secure, high-performance Kafka integration in production environments.

---

Integrating AWS Managed Streaming for Apache Kafka (MSK) with Amazon Elastic Kubernetes Service (EKS) requires careful network configuration to enable secure, low-latency communication between your Kafka brokers and Kubernetes workloads. VPC peering provides a private network path between your MSK cluster and EKS cluster, avoiding public internet exposure and reducing data transfer costs.

This guide walks through deploying AWS MSK alongside EKS using VPC peering for production-ready Kafka integration.

## Understanding the Architecture

When you deploy MSK and EKS in separate VPCs, they cannot communicate by default. VPC peering creates a direct network connection between the two VPCs, allowing resources in each VPC to communicate as if they were in the same network.

This architecture offers several benefits:

- Private connectivity without internet gateways
- Lower latency compared to NAT gateway routing
- Reduced data transfer costs
- Better security posture with network isolation
- Simplified DNS resolution across VPCs

## Prerequisites

Before starting, ensure you have:

- AWS CLI configured with appropriate credentials
- kubectl and eksctl installed
- Terraform or CloudFormation templates (optional but recommended)
- IAM permissions for VPC, MSK, and EKS management

## Creating the VPC Infrastructure

Start by creating two VPCs with non-overlapping CIDR blocks. Overlapping IP ranges will prevent VPC peering from working.

```bash
# Create VPC for EKS cluster
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=eks-vpc}]' \
  --region us-east-1

# Create VPC for MSK cluster
aws ec2 create-vpc \
  --cidr-block 10.1.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=msk-vpc}]' \
  --region us-east-1
```

Create subnets in at least three availability zones for high availability:

```bash
# EKS VPC subnets
aws ec2 create-subnet --vpc-id vpc-eks123 \
  --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-eks123 \
  --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
aws ec2 create-subnet --vpc-id vpc-eks123 \
  --cidr-block 10.0.3.0/24 --availability-zone us-east-1c

# MSK VPC subnets
aws ec2 create-subnet --vpc-id vpc-msk456 \
  --cidr-block 10.1.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-msk456 \
  --cidr-block 10.1.2.0/24 --availability-zone us-east-1b
aws ec2 create-subnet --vpc-id vpc-msk456 \
  --cidr-block 10.1.3.0/24 --availability-zone us-east-1c
```

## Establishing VPC Peering

Create a peering connection between the two VPCs:

```bash
# Create peering connection
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-eks123 \
  --peer-vpc-id vpc-msk456 \
  --tag-specifications 'ResourceType=vpc-peering-connection,Tags=[{Key=Name,Value=eks-msk-peering}]'

# Accept the peering connection
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-12345678
```

Update route tables to enable traffic flow:

```bash
# Add route in EKS VPC pointing to MSK VPC
aws ec2 create-route \
  --route-table-id rtb-eks123 \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-12345678

# Add route in MSK VPC pointing to EKS VPC
aws ec2 create-route \
  --route-table-id rtb-msk456 \
  --destination-cidr-block 10.0.0.0/16 \
  --vpc-peering-connection-id pcx-12345678
```

## Deploying the EKS Cluster

Deploy your EKS cluster in the prepared VPC:

```bash
eksctl create cluster \
  --name production-eks \
  --region us-east-1 \
  --vpc-private-subnets subnet-eks1,subnet-eks2,subnet-eks3 \
  --without-nodegroup

# Create managed node group
eksctl create nodegroup \
  --cluster production-eks \
  --name kafka-consumers \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 6 \
  --ssh-access \
  --ssh-public-key my-key
```

## Creating the MSK Cluster

Create a security group for MSK that allows inbound traffic from the EKS VPC:

```bash
# Create security group for MSK
aws ec2 create-security-group \
  --group-name msk-cluster-sg \
  --description "Security group for MSK cluster" \
  --vpc-id vpc-msk456

# Allow Kafka traffic from EKS VPC
aws ec2 authorize-security-group-ingress \
  --group-id sg-msk789 \
  --protocol tcp \
  --port 9092 \
  --cidr 10.0.0.0/16

# Allow TLS traffic from EKS VPC
aws ec2 authorize-security-group-ingress \
  --group-id sg-msk789 \
  --protocol tcp \
  --port 9094 \
  --cidr 10.0.0.0/16

# Allow Zookeeper traffic (if needed)
aws ec2 authorize-security-group-ingress \
  --group-id sg-msk789 \
  --protocol tcp \
  --port 2181 \
  --cidr 10.0.0.0/16
```

Create the MSK cluster configuration:

```json
{
  "ClusterName": "production-msk",
  "KafkaVersion": "3.5.1",
  "NumberOfBrokerNodes": 3,
  "BrokerNodeGroupInfo": {
    "InstanceType": "kafka.m5.large",
    "ClientSubnets": [
      "subnet-msk1",
      "subnet-msk2",
      "subnet-msk3"
    ],
    "SecurityGroups": ["sg-msk789"],
    "StorageInfo": {
      "EbsStorageInfo": {
        "VolumeSize": 1000
      }
    }
  },
  "EncryptionInfo": {
    "EncryptionInTransit": {
      "ClientBroker": "TLS",
      "InCluster": true
    }
  }
}
```

Deploy the MSK cluster:

```bash
aws kafka create-cluster --cli-input-json file://msk-config.json
```

## Configuring DNS Resolution

Enable DNS resolution across the VPC peering connection:

```bash
# Modify VPC peering connection to enable DNS resolution
aws ec2 modify-vpc-peering-connection-options \
  --vpc-peering-connection-id pcx-12345678 \
  --requester-dns-resolution EnableDnsResolution=true \
  --accepter-dns-resolution EnableDnsResolution=true
```

This allows EKS pods to resolve MSK broker DNS names directly.

## Deploying Kafka Client Applications

Create a Kubernetes deployment that connects to MSK:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-consumer
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kafka-consumer
  template:
    metadata:
      labels:
        app: kafka-consumer
    spec:
      containers:
      - name: consumer
        image: myapp/kafka-consumer:latest
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "b-1.production-msk.abc123.kafka.us-east-1.amazonaws.com:9094,b-2.production-msk.abc123.kafka.us-east-1.amazonaws.com:9094,b-3.production-msk.abc123.kafka.us-east-1.amazonaws.com:9094"
        - name: KAFKA_SECURITY_PROTOCOL
          value: "SSL"
        - name: KAFKA_SSL_TRUSTSTORE_LOCATION
          value: "/etc/kafka/truststore/truststore.jks"
        volumeMounts:
        - name: kafka-truststore
          mountPath: /etc/kafka/truststore
          readOnly: true
      volumes:
      - name: kafka-truststore
        secret:
          secretName: kafka-ssl-truststore
```

Get the MSK broker endpoints:

```bash
aws kafka get-bootstrap-brokers --cluster-arn arn:aws:kafka:us-east-1:123456789012:cluster/production-msk/abc123-def456
```

## Testing Connectivity

Deploy a test pod to verify connectivity:

```bash
kubectl run kafka-test --image=confluentinc/cp-kafka:7.5.0 -it --rm -- bash

# Inside the pod, test connection
kafka-broker-api-versions --bootstrap-server b-1.production-msk.abc123.kafka.us-east-1.amazonaws.com:9094 \
  --command-config client.properties
```

Create a client.properties file:

```properties
security.protocol=SSL
ssl.truststore.location=/etc/kafka/ssl/truststore.jks
ssl.truststore.password=changeit
```

## Monitoring and Troubleshooting

Monitor VPC peering metrics:

```bash
# Check peering connection status
aws ec2 describe-vpc-peering-connections \
  --vpc-peering-connection-ids pcx-12345678

# Verify route propagation
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-eks123"
```

Common issues to check:

- Security group rules allowing traffic on ports 9092, 9094, 2181
- Route table entries for both VPCs
- DNS resolution enabled on the peering connection
- Non-overlapping CIDR blocks
- Network ACLs not blocking traffic

## Security Best Practices

Implement these security measures:

1. Use TLS encryption for all Kafka traffic
2. Enable MSK client authentication with SASL/SCRAM or IAM
3. Restrict security group rules to specific CIDR blocks
4. Enable VPC Flow Logs for network traffic monitoring
5. Use AWS Secrets Manager for storing Kafka credentials
6. Implement least privilege IAM policies for MSK access

Store Kafka credentials securely:

```bash
aws secretsmanager create-secret \
  --name msk-kafka-credentials \
  --secret-string '{"username":"admin","password":"secure-password"}'
```

## Performance Optimization

To optimize performance across VPC peering:

- Deploy MSK and EKS in the same region and availability zones
- Use placement groups for EKS nodes when possible
- Enable enhanced networking on EC2 instances
- Monitor network throughput with CloudWatch metrics
- Consider using larger instance types for high throughput workloads

## Conclusion

Deploying AWS MSK with EKS using VPC peering provides a secure, high-performance foundation for Kafka-based applications in Kubernetes. The VPC peering approach offers better performance and lower costs compared to public internet routing while maintaining strong network isolation.

Key takeaways include ensuring non-overlapping CIDR blocks, properly configuring security groups and route tables, enabling DNS resolution across the peering connection, and implementing TLS encryption for all Kafka traffic. With this setup, your Kubernetes applications can reliably consume and produce messages to MSK with minimal latency and maximum security.
