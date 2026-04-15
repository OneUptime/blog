# How to Configure Dapr Components with AWS Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Credential, IAM, Security, Configuration

Description: Learn the patterns for supplying AWS credentials to Dapr components, from explicit access keys and Kubernetes secrets to IRSA and instance profiles.

---

Every Dapr component that integrates with AWS - DynamoDB, S3, SQS, SNS, Secrets Manager - needs AWS credentials. Dapr supports multiple credential patterns, each suited to different deployment environments.

## Pattern 1: Explicit Access Keys via Kubernetes Secrets

Store credentials in a Kubernetes Secret and reference them in component metadata:

```bash
kubectl create secret generic aws-creds \
  --from-literal=accessKeyId=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretAccessKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --namespace default
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: table
    value: dapr-state
  - name: accessKey
    secretKeyRef:
      name: aws-creds
      key: accessKeyId
  - name: secretKey
    secretKeyRef:
      name: aws-creds
      key: secretAccessKey
```

## Pattern 2: EC2 Instance Profile or ECS Task Role

When running on EC2, ECS, or EKS node-level roles, omit credentials entirely:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: table
    value: dapr-state
  # Credentials resolved from instance metadata service
```

Attach the required IAM policy to the instance/task role:

```bash
aws iam attach-role-policy \
  --role-name my-ecs-task-role \
  --policy-arn arn:aws:iam::123456789012:policy/DaprDynamoDBPolicy
```

## Pattern 3: IRSA on EKS

Annotate the service account to assume an IAM role:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/DaprAppRole
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-app"
    spec:
      serviceAccountName: my-app
      containers:
      - name: my-app
        image: myrepo/my-app:latest
```

## Pattern 4: Assume Role with Session Token

Use STS to assume a cross-account or time-limited role:

```bash
# Generate temporary credentials via STS
CREDS=$(aws sts assume-role \
  --role-arn arn:aws:iam::999999999999:role/CrossAccountDaprRole \
  --role-session-name dapr-session)

# Store as Kubernetes secret
kubectl create secret generic aws-temp-creds \
  --from-literal=accessKey=$(echo $CREDS | jq -r '.Credentials.AccessKeyId') \
  --from-literal=secretKey=$(echo $CREDS | jq -r '.Credentials.SecretAccessKey') \
  --from-literal=sessionToken=$(echo $CREDS | jq -r '.Credentials.SessionToken')
```

```yaml
spec:
  metadata:
  - name: accessKey
    secretKeyRef:
      name: aws-temp-creds
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-temp-creds
      key: secretKey
  - name: sessionToken
    secretKeyRef:
      name: aws-temp-creds
      key: sessionToken
```

## Choosing the Right Pattern

```bash
# Decision guide:
# - EKS production: IRSA (preferred, no long-lived credentials)
# - ECS with task role: Instance profile (automatic, no config needed)
# - EC2 with instance profile: Instance profile
# - Local development: Explicit keys via Kubernetes secret or .env
# - Cross-account access: Assume role with session token
```

## Summary

Dapr AWS component credentials follow a clear hierarchy: IRSA for EKS, instance/task roles for ECS and EC2, and explicit keys only for local development or special cases. The best pattern avoids long-lived credentials by using IAM roles that are automatically rotated by the AWS infrastructure. Regardless of pattern, credentials are always stored in Kubernetes Secrets rather than in component YAML files.
