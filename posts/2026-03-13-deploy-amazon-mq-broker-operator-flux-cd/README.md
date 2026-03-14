# How to Deploy Amazon MQ Broker Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Amazon MQ, AWS, Message Queue, ACK

Description: Deploy Amazon MQ broker configuration on AWS using Flux CD and the AWS Controllers for Kubernetes (ACK) for GitOps-managed cloud-native messaging.

---

## Introduction

Amazon MQ is a managed message broker service for Apache ActiveMQ and RabbitMQ on AWS. It handles provisioning, patching, and high availability automatically. For teams that want to use Amazon MQ with a GitOps workflow, the AWS Controllers for Kubernetes (ACK) provides a Kubernetes operator that manages AWS resources — including Amazon MQ brokers — through Kubernetes CRDs.

Using the ACK Amazon MQ controller with Flux CD means your broker configuration, user settings, and maintenance window are described in Git. Changes flow through pull requests and are applied by Flux, which calls the ACK controller, which calls the Amazon MQ API. This brings GitOps discipline to AWS managed services without requiring infrastructure-as-code tools like Terraform.

## Prerequisites

- EKS cluster with Flux CD bootstrapped
- IRSA (IAM Roles for Service Accounts) configured for the ACK controller
- IAM permissions for Amazon MQ: `mq:CreateBroker`, `mq:UpdateBroker`, `mq:DeleteBroker`, etc.
- `kubectl` and `flux` CLIs installed

## Step 1: Add the ACK HelmRepository

```yaml
# infrastructure/sources/ack-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ack
  namespace: flux-system
spec:
  interval: 12h
  url: oci://public.ecr.aws/aws-controllers-k8s
  type: oci
```

## Step 2: Create IAM Role for ACK MQ Controller

```bash
# Create IAM policy for Amazon MQ management
aws iam create-policy \
  --policy-name ACKMQControllerPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "mq:CreateBroker",
          "mq:UpdateBroker",
          "mq:DeleteBroker",
          "mq:DescribeBroker",
          "mq:ListBrokers",
          "mq:CreateConfiguration",
          "mq:UpdateConfiguration",
          "mq:DescribeConfiguration",
          "mq:CreateUser",
          "mq:UpdateUser",
          "mq:DeleteUser"
        ],
        "Resource": "*"
      }
    ]
  }'

# Create service account with IRSA
eksctl create iamserviceaccount \
  --name ack-mq-controller \
  --namespace ack-system \
  --cluster my-eks-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/ACKMQControllerPolicy \
  --approve
```

## Step 3: Deploy the ACK Amazon MQ Controller

```yaml
# infrastructure/messaging/amazon-mq/ack-mq-controller.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ack-mq-controller
  namespace: ack-system
spec:
  interval: 30m
  chart:
    spec:
      chart: mq-chart
      version: "1.0.10"
      sourceRef:
        kind: HelmRepository
        name: ack
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    aws:
      region: us-east-1
    serviceAccount:
      create: false
      name: ack-mq-controller
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "300m"
        memory: "256Mi"
```

## Step 4: Create an Amazon MQ Broker CRD

```yaml
# infrastructure/messaging/amazon-mq/broker.yaml
apiVersion: mq.services.k8s.aws/v1alpha1
kind: Broker
metadata:
  name: production-broker
  namespace: messaging
spec:
  brokerName: production-rabbitmq
  deploymentMode: CLUSTER_MULTI_AZ  # HA across AZs
  engineType: RabbitMQ
  engineVersion: "3.13"
  hostInstanceType: mq.m5.large     # instance size

  # Multi-AZ HA
  autoMinorVersionUpgrade: true
  maintenanceWindowStartTime:
    dayOfWeek: SUNDAY
    timeOfDay: "02:00"
    timeZone: UTC

  # Storage (not configurable for RabbitMQ — AWS manages it)
  storageType: efs   # for ActiveMQ

  # Network: place in private subnets
  subnetIDs:
    - subnet-abc123
    - subnet-def456
  securityGroups:
    - sg-xyz789

  # Logging
  logs:
    general: true

  # User credentials from Secret
  users:
    - username: app-user
      passwordSecretRef:
        namespace: messaging
        name: mq-user-password
        key: password
      consoleAccess: false
      groups:
        - admin
```

## Step 5: Create Broker User Secret

```yaml
# infrastructure/messaging/amazon-mq/mq-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: mq-user-password
  namespace: messaging
type: Opaque
stringData:
  password: "BrokerPassword123!"
```

## Step 6: Create an ActiveMQ Configuration (Optional)

For ActiveMQ brokers, manage the broker configuration XML through a CRD:

```yaml
# infrastructure/messaging/amazon-mq/activemq-config.yaml
apiVersion: mq.services.k8s.aws/v1alpha1
kind: BrokerConfiguration
metadata:
  name: production-activemq-config
  namespace: messaging
spec:
  name: production-activemq-config
  engineType: ACTIVEMQ
  engineVersion: "5.18.4"
  # ActiveMQ XML configuration (base64-encoded)
  data: |
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <broker schedulePeriodForDestinationPurge="10000"
            xmlns="http://activemq.apache.org/schema/core">
      <destinationPolicy>
        <policyMap>
          <policyEntries>
            <policyEntry topic=">" producerFlowControl="true">
              <pendingMessageLimitStrategy>
                <constantPendingMessageLimitStrategy limit="1000"/>
              </pendingMessageLimitStrategy>
            </policyEntry>
            <policyEntry queue=">" producerFlowControl="true"
                         memoryLimit="1mb">
              <deadLetterStrategy>
                <individualDeadLetterStrategy queuePrefix="DLQ."
                                              useQueueForQueueMessages="true"/>
              </deadLetterStrategy>
            </policyEntry>
          </policyEntries>
        </policyMap>
      </destinationPolicy>
      <systemUsage>
        <systemUsage>
          <memoryUsage>
            <memoryUsage percentOfJvmHeap="70"/>
          </memoryUsage>
          <storeUsage>
            <storeUsage limit="100 gb"/>
          </storeUsage>
          <tempUsage>
            <tempUsage limit="50 gb"/>
          </tempUsage>
        </systemUsage>
      </systemUsage>
    </broker>
```

## Step 7: Flux Kustomization

```yaml
# clusters/production/amazon-mq-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: amazon-mq
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/amazon-mq
  prune: true
  dependsOn:
    - name: ack-mq-controller
```

## Step 8: Verify the Broker

```bash
# Check ACK Broker status
kubectl get broker production-broker -n messaging
kubectl describe broker production-broker -n messaging

# Get the broker endpoints from the status
kubectl get broker production-broker -n messaging \
  -o jsonpath='{.status.brokerInstances}' | jq .

# Connect to RabbitMQ Management UI (port-forward to the broker endpoint)
# The broker endpoint is accessible within the VPC
```

## Best Practices

- Use `CLUSTER_MULTI_AZ` deployment mode for production brokers to survive AZ failures without data loss.
- Set maintenance windows during low-traffic periods for auto minor version upgrades.
- Use VPC endpoints and private subnets — never expose Amazon MQ brokers to the public internet.
- Enable CloudWatch logging (`logs.general: true`) for broker activity monitoring.
- Use IRSA for the ACK controller rather than static AWS credentials stored in Kubernetes Secrets.

## Conclusion

Using the AWS ACK Amazon MQ controller with Flux CD brings GitOps discipline to managed message broker provisioning on AWS. Your broker configuration — deployment mode, maintenance windows, user management — is declared in Git and applied through the same pull request workflow as your application deployments. This eliminates the need for separate Terraform or CloudFormation stacks for broker provisioning, reducing operational complexity for teams already invested in Kubernetes GitOps.
