# How to Use AWS Secrets Manager with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS Secrets Manager, Kubernetes, Secrets Management, AWS

Description: Step-by-step guide to integrating AWS Secrets Manager with a Talos Linux Kubernetes cluster for centralized secrets management.

---

AWS Secrets Manager is a fully managed service that makes it easy to store, rotate, and retrieve secrets like database credentials, API keys, and other sensitive configuration. When you run a Talos Linux Kubernetes cluster on AWS or in a hybrid setup, integrating with Secrets Manager gives you a single source of truth for sensitive data that is managed outside your cluster.

There are several ways to connect AWS Secrets Manager to a Kubernetes cluster running Talos Linux. In this guide, we will cover two primary approaches: using the External Secrets Operator and using the AWS Secrets Store CSI Driver. Both have their strengths, and the right choice depends on your specific needs.

## Prerequisites

Before you start, make sure you have:

- A Talos Linux cluster running (either on AWS or with network access to AWS APIs)
- kubectl and Helm installed locally
- An AWS account with Secrets Manager enabled
- AWS CLI configured with appropriate credentials
- At least one secret already stored in AWS Secrets Manager

## Creating a Test Secret in AWS

If you do not have a secret yet, create one for testing.

```bash
# Create a secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name production/my-app/database \
  --description "Database credentials for my-app" \
  --secret-string '{"username":"dbadmin","password":"P@ssw0rd123!","host":"mydb.cluster-abc123.us-east-1.rds.amazonaws.com","port":"5432"}'

# Verify it was created
aws secretsmanager describe-secret --secret-id production/my-app/database
```

## Approach 1: External Secrets Operator

The External Secrets Operator (ESO) is the most popular method for syncing cloud secrets into Kubernetes. It creates and manages Kubernetes Secret objects based on external sources.

### Installing ESO

```bash
# Add the Helm repo
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

### Setting Up AWS Authentication

There are multiple ways to authenticate ESO with AWS. The best approach depends on where your Talos cluster runs.

**Option A: IAM Roles for Service Accounts (IRSA) - recommended for EKS**

If your Talos cluster is on AWS, IRSA is the cleanest approach. However, Talos clusters are typically not running as managed EKS, so you might need to set up OIDC manually.

**Option B: Static credentials via Kubernetes Secret**

For non-EKS clusters, use static AWS credentials.

```bash
# Create a secret with AWS credentials
kubectl create secret generic aws-sm-credentials \
  --namespace external-secrets \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Create an IAM policy for the credentials that grants read access to Secrets Manager.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/*"
    }
  ]
}
```

### Creating a SecretStore

```yaml
# aws-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-sm-credentials
            namespace: external-secrets
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-sm-credentials
            namespace: external-secrets
            key: secret-access-key
```

```bash
# Apply and verify
kubectl apply -f aws-secret-store.yaml
kubectl get clustersecretstore aws-secrets-manager
```

### Creating ExternalSecrets

Now pull the database credentials into your cluster.

```yaml
# db-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-db-creds
  namespace: default
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-db-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_USERNAME
      remoteRef:
        key: production/my-app/database
        property: username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/my-app/database
        property: password
    - secretKey: DB_HOST
      remoteRef:
        key: production/my-app/database
        property: host
    - secretKey: DB_PORT
      remoteRef:
        key: production/my-app/database
        property: port
```

```bash
kubectl apply -f db-external-secret.yaml

# Check sync status
kubectl get externalsecret my-app-db-creds

# Verify the Kubernetes secret was created
kubectl get secret my-app-db-credentials -o jsonpath='{.data.DB_USERNAME}' | base64 -d
```

## Approach 2: AWS Secrets Store CSI Driver

The Secrets Store CSI Driver mounts secrets as files in your pod's filesystem. This approach avoids creating Kubernetes Secret objects entirely, which some security teams prefer.

### Installing the CSI Driver

```bash
# Install the Secrets Store CSI Driver
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo update

helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true

# Install the AWS provider
kubectl apply -f https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml
```

### Creating a SecretProviderClass

```yaml
# secret-provider-class.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-db-secrets
  namespace: default
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "production/my-app/database"
        objectType: "secretsmanager"
        jmesPath:
          - path: username
            objectAlias: db-username
          - path: password
            objectAlias: db-password
          - path: host
            objectAlias: db-host
  # Optionally sync to a Kubernetes Secret as well
  secretObjects:
    - secretName: my-app-db-synced
      type: Opaque
      data:
        - objectName: db-username
          key: DB_USERNAME
        - objectName: db-password
          key: DB_PASSWORD
        - objectName: db-host
          key: DB_HOST
```

### Using the CSI Volume in a Pod

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-sa
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: secrets
              mountPath: /mnt/secrets
              readOnly: true
          # Or use environment variables from the synced secret
          envFrom:
            - secretRef:
                name: my-app-db-synced
      volumes:
        - name: secrets
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: aws-db-secrets
```

```bash
kubectl apply -f app-deployment.yaml

# Verify secrets are mounted
kubectl exec deployment/my-app -- ls /mnt/secrets
kubectl exec deployment/my-app -- cat /mnt/secrets/db-username
```

## Automatic Secret Rotation

One of the biggest advantages of AWS Secrets Manager is built-in rotation. When you rotate a secret in AWS, you want the new value to propagate to your Kubernetes workloads.

With External Secrets Operator, the `refreshInterval` controls how often it checks for updates. Set this to a short interval for secrets that rotate frequently.

```yaml
# Short refresh for frequently rotated secrets
spec:
  refreshInterval: 5m
```

With the CSI Driver, enable rotation in the Helm values.

```bash
helm upgrade csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true \
  --set rotationPollInterval=120s
```

## Talos Linux Networking Considerations

When running Talos Linux on AWS, your nodes need network access to the Secrets Manager API endpoints. Here are the key networking requirements:

```bash
# If using VPC endpoints (recommended for security)
# Create a VPC endpoint for Secrets Manager
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.secretsmanager \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-123 subnet-456 \
  --security-group-ids sg-789
```

Make sure your security groups allow the Talos nodes to reach the Secrets Manager endpoint on port 443.

## Monitoring and Alerting

Set up monitoring for your secrets sync pipeline.

```bash
# Check ESO metrics
kubectl get --raw /metrics | grep externalsecret

# Check sync failures
kubectl get externalsecrets --all-namespaces -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[0].reason,LAST_SYNC:.status.conditions[0].lastTransitionTime
```

You should also set up CloudWatch alarms for Secrets Manager API errors and throttling.

## Wrapping Up

Integrating AWS Secrets Manager with a Talos Linux cluster gives you centralized, auditable secrets management backed by a fully managed AWS service. Whether you choose the External Secrets Operator for its flexibility or the CSI Driver for its file-based approach, both methods work well on Talos Linux. The key is to set up proper IAM policies with least-privilege access, configure appropriate refresh intervals for rotation, and monitor the sync pipeline to catch failures early. With this setup, your Talos Linux workloads can consume secrets from AWS without ever storing plaintext credentials in Kubernetes manifests or etcd.
