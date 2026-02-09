# How to Configure Crossplane Provider for AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, AWS

Description: Learn how to configure the Crossplane AWS provider to manage AWS resources from Kubernetes, including authentication setup, provider configuration, and common resource provisioning patterns.

---

The Crossplane AWS provider brings AWS resource management into Kubernetes. Instead of using CloudFormation or Terraform, you define RDS databases, S3 buckets, and VPCs using kubectl. The provider translates Kubernetes manifests into AWS API calls, creating and managing resources directly.

Crossplane AWS provider supports hundreds of AWS resources through managed resources that mirror AWS APIs. Each resource type (RDSInstance, Bucket, VPC) has a corresponding CRD that wraps the AWS API with Kubernetes-native semantics.

## Installing the AWS Provider

Install the provider package:

```bash
# Install AWS provider
kubectl crossplane install provider \
  xpkg.upbound.io/crossplane-contrib/provider-aws:v0.40.0

# Verify provider installation
kubectl get providers

# Wait for provider to become healthy
kubectl wait --for=condition=Healthy \
  provider/provider-aws \
  --timeout=300s

# Check installed CRDs
kubectl get crds | grep aws.crossplane.io | wc -l
# Should show 200+ AWS resource CRDs
```

The provider installs controllers for each AWS service and creates CRDs representing AWS resources.

## Creating AWS Credentials Secret

Store AWS credentials as a Kubernetes secret:

```bash
# Create credentials file
cat > aws-credentials.txt <<EOF
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Create secret
kubectl create secret generic aws-creds \
  -n crossplane-system \
  --from-file=creds=./aws-credentials.txt

# Verify secret
kubectl describe secret aws-creds -n crossplane-system

# Clean up credentials file
rm aws-credentials.txt
```

For production, use IAM roles for service accounts (IRSA) instead of static credentials.

## Configuring IAM Roles for Service Accounts (IRSA)

Set up IRSA for secure credential management:

```bash
# Create IAM policy for Crossplane
cat > crossplane-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "rds:*",
        "ec2:*",
        "elasticache:*",
        "iam:GetRole",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create IAM policy
aws iam create-policy \
  --policy-name CrossplaneAWSPolicy \
  --policy-document file://crossplane-policy.json

# Create IAM role for service account
eksctl create iamserviceaccount \
  --name provider-aws \
  --namespace crossplane-system \
  --cluster your-cluster-name \
  --attach-policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/CrossplaneAWSPolicy \
  --approve \
  --override-existing-serviceaccounts
```

Configure the provider to use IRSA:

```yaml
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: InjectedIdentity
```

## Creating ProviderConfig

ProviderConfig tells the provider how to authenticate with AWS:

```yaml
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-creds
      key: creds
```

Apply the configuration:

```bash
kubectl apply -f providerconfig.yaml

# Verify ProviderConfig
kubectl get providerconfigs
```

## Provisioning an S3 Bucket

Create your first AWS resource with Crossplane:

```yaml
apiVersion: s3.aws.crossplane.io/v1beta1
kind: Bucket
metadata:
  name: my-crossplane-bucket
spec:
  forProvider:
    region: us-west-2
    acl: private
    publicAccessBlockConfiguration:
      blockPublicAcls: true
      blockPublicPolicy: true
      ignorePublicAcls: true
      restrictPublicBuckets: true
    versioning:
      status: Enabled
    serverSideEncryptionConfiguration:
      rules:
      - applyServerSideEncryptionByDefault:
          sseAlgorithm: AES256
    tagging:
      tagSet:
      - key: Environment
        value: Development
      - key: ManagedBy
        value: Crossplane
  providerConfigRef:
    name: default
```

Apply and monitor:

```bash
kubectl apply -f s3-bucket.yaml

# Watch resource creation
kubectl get bucket my-crossplane-bucket -w

# Check resource status
kubectl describe bucket my-crossplane-bucket

# Verify in AWS
aws s3 ls | grep my-crossplane-bucket
```

## Creating an RDS Database

Provision a PostgreSQL RDS instance:

```yaml
apiVersion: database.aws.crossplane.io/v1beta1
kind: RDSInstance
metadata:
  name: postgres-db
spec:
  forProvider:
    region: us-west-2
    engine: postgres
    engineVersion: "14.7"
    dbInstanceClass: db.t3.medium
    masterUsername: adminuser
    allocatedStorage: 20
    storageEncrypted: true
    publiclyAccessible: false
    skipFinalSnapshot: true
    dbSubnetGroupName: my-db-subnet-group
    vpcSecurityGroupIds:
    - sg-0123456789abcdef
    tags:
    - key: Environment
      value: Production
    - key: Team
      value: Platform
  writeConnectionSecretToRef:
    namespace: default
    name: postgres-connection
  providerConfigRef:
    name: default
```

The `writeConnectionSecretToRef` creates a Kubernetes secret with connection details:

```bash
kubectl get secret postgres-connection -o yaml

# Secret contains:
# - endpoint
# - username
# - password
# - port
```

## Managing VPC Resources

Create a VPC with subnets:

```yaml
apiVersion: ec2.aws.crossplane.io/v1beta1
kind: VPC
metadata:
  name: crossplane-vpc
spec:
  forProvider:
    region: us-west-2
    cidrBlock: 10.0.0.0/16
    enableDnsSupport: true
    enableDnsHostnames: true
    tags:
    - key: Name
      value: crossplane-vpc
  providerConfigRef:
    name: default
---
apiVersion: ec2.aws.crossplane.io/v1beta1
kind: Subnet
metadata:
  name: crossplane-subnet-a
spec:
  forProvider:
    region: us-west-2
    vpcIdSelector:
      matchLabels:
        name: crossplane-vpc
    cidrBlock: 10.0.1.0/24
    availabilityZone: us-west-2a
    mapPublicIpOnLaunch: false
    tags:
    - key: Name
      value: crossplane-subnet-a
  providerConfigRef:
    name: default
```

Use `vpcIdSelector` to reference the VPC by label, creating dependencies between resources.

## Using Multiple ProviderConfigs

Configure different AWS accounts or regions:

```yaml
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: production
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-prod-creds
      key: creds
---
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: development
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-dev-creds
      key: creds
```

Reference specific ProviderConfigs in resources:

```yaml
apiVersion: s3.aws.crossplane.io/v1beta1
kind: Bucket
metadata:
  name: prod-bucket
spec:
  forProvider:
    region: us-east-1
  providerConfigRef:
    name: production
```

## Implementing Resource References

Link resources using selectors and references:

```yaml
apiVersion: database.aws.crossplane.io/v1beta1
kind: DBSubnetGroup
metadata:
  name: my-db-subnet-group
spec:
  forProvider:
    region: us-west-2
    description: Subnet group for RDS
    subnetIdSelector:
      matchLabels:
        type: database
    tags:
    - key: Name
      value: my-db-subnet-group
  providerConfigRef:
    name: default
---
apiVersion: ec2.aws.crossplane.io/v1beta1
kind: Subnet
metadata:
  name: db-subnet-1
  labels:
    type: database
spec:
  forProvider:
    region: us-west-2
    vpcIdSelector:
      matchLabels:
        name: main-vpc
    cidrBlock: 10.0.10.0/24
    availabilityZone: us-west-2a
  providerConfigRef:
    name: default
```

The DBSubnetGroup automatically finds and uses subnets labeled with `type: database`.

## Handling Deletion Policies

Control what happens when you delete Kubernetes resources:

```yaml
apiVersion: s3.aws.crossplane.io/v1beta1
kind: Bucket
metadata:
  name: important-bucket
spec:
  deletionPolicy: Orphan  # Options: Delete (default), Orphan
  forProvider:
    region: us-west-2
  providerConfigRef:
    name: default
```

`deletionPolicy: Orphan` keeps AWS resources when you delete the Kubernetes object. Use this for production databases where accidental deletion would be catastrophic.

## Monitoring AWS Provider Resources

Track resource status and conditions:

```bash
# List all AWS resources
kubectl get managed

# Check specific resource type
kubectl get rdsinstance

# Describe resource for detailed status
kubectl describe rdsinstance postgres-db

# Watch resource sync status
kubectl get bucket -o jsonpath='{.items[*].status.conditions[?(@.type=="Synced")].status}'
```

Create alerts for resource failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: crossplane-aws-alerts
spec:
  groups:
  - name: crossplane-aws
    rules:
    - alert: AWSResourceNotReady
      expr: |
        crossplane_managed_resource_exists{provider="aws"} == 1
        and
        crossplane_managed_resource_ready{provider="aws"} == 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "AWS resource {{ $labels.name }} not ready"
```

## Troubleshooting Common Issues

**Provider not healthy**:
```bash
kubectl logs -n crossplane-system deployment/provider-aws

# Check AWS credentials
kubectl get secret aws-creds -n crossplane-system -o yaml
```

**Resource stuck in creating**:
```bash
# Check resource events
kubectl describe bucket my-bucket

# Check provider logs
kubectl logs -n crossplane-system -l pkg.crossplane.io/provider=provider-aws --tail=100
```

**Authentication errors**:
```bash
# Verify ProviderConfig
kubectl describe providerconfig default

# Test AWS credentials manually
kubectl run aws-cli --rm -it --image amazon/aws-cli \
  --env="AWS_ACCESS_KEY_ID=XXX" \
  --env="AWS_SECRET_ACCESS_KEY=YYY" \
  -- s3 ls
```

## Conclusion

The Crossplane AWS provider enables managing AWS infrastructure through Kubernetes APIs. By configuring authentication with ProviderConfig, using resource selectors for dependencies, and implementing proper deletion policies, you create a robust infrastructure management system that integrates seamlessly with existing Kubernetes workflows. The provider's extensive AWS API coverage means you can manage virtually any AWS resource using familiar kubectl commands.
