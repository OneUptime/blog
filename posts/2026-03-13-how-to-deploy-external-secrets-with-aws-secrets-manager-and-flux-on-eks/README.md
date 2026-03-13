# How to Deploy External Secrets with AWS Secrets Manager and Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, External Secrets, Secrets Manager, Security, Helm

Description: Learn how to deploy the External Secrets Operator on EKS with Flux to synchronize AWS Secrets Manager secrets into Kubernetes.

---

Managing secrets in Kubernetes is a critical challenge, especially in GitOps workflows where you cannot store sensitive values in Git. The External Secrets Operator solves this by synchronizing secrets from external providers like AWS Secrets Manager into Kubernetes Secret objects. By deploying it with Flux on EKS, you get a fully automated, Git-driven secrets management pipeline. This guide covers the complete setup.

## Prerequisites

- An existing EKS cluster (version 1.25 or later)
- Flux CLI installed and bootstrapped on your cluster
- AWS CLI configured with appropriate permissions
- kubectl configured to access your EKS cluster
- Secrets stored in AWS Secrets Manager

## Architecture Overview

The flow works as follows:

1. You store secrets in AWS Secrets Manager
2. The External Secrets Operator runs in your EKS cluster (deployed by Flux)
3. You define `ExternalSecret` resources in Git that reference your AWS secrets
4. The operator fetches the secrets and creates native Kubernetes Secrets
5. Your applications consume the Kubernetes Secrets as usual

This approach keeps sensitive values out of Git while maintaining a declarative workflow.

## Step 1: Create an IAM Policy for External Secrets

Create a policy that grants read access to your secrets in AWS Secrets Manager.

```bash
cat <<EOF > external-secrets-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds",
        "secretsmanager:ListSecrets"
      ],
      "Resource": "arn:aws:secretsmanager:us-west-2:*:secret:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-west-2:*:parameter/*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ExternalSecretsPolicy \
  --policy-document file://external-secrets-policy.json
```

## Step 2: Create an IAM Service Account

Associate the policy with a Kubernetes service account using IRSA.

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=external-secrets \
  --name=external-secrets \
  --attach-policy-arn="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/ExternalSecretsPolicy" \
  --override-existing-serviceaccounts \
  --approve
```

## Step 3: Create the Namespace

Define the namespace for the External Secrets Operator.

```yaml
# clusters/my-cluster/external-secrets/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: external-secrets
```

## Step 4: Add the Helm Repository Source

Create a Flux `HelmRepository` for the External Secrets chart.

```yaml
# clusters/my-cluster/external-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.external-secrets.io
```

## Step 5: Create the HelmRelease

Define the `HelmRelease` that installs the External Secrets Operator.

```yaml
# clusters/my-cluster/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 1h
  chart:
    spec:
      chart: external-secrets
      version: "0.9.*"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
      interval: 24h
  values:
    serviceAccount:
      create: false
      name: external-secrets
    webhook:
      create: true
    certController:
      create: true
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

## Step 6: Create a ClusterSecretStore

The `ClusterSecretStore` tells the operator how to connect to AWS Secrets Manager. It is cluster-scoped, so any namespace can reference it.

```yaml
# clusters/my-cluster/external-secrets/cluster-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

For AWS SSM Parameter Store, create an additional store:

```yaml
# clusters/my-cluster/external-secrets/cluster-secret-store-ssm.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-parameter-store
spec:
  provider:
    aws:
      service: ParameterStore
      region: us-west-2
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 7: Create Secrets in AWS Secrets Manager

Store your application secrets in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name my-app/database \
  --secret-string '{"username":"admin","password":"supersecret","host":"db.example.com","port":"5432"}'

aws secretsmanager create-secret \
  --name my-app/api-keys \
  --secret-string '{"stripe-key":"sk_live_xxx","sendgrid-key":"SG.xxx"}'
```

## Step 8: Create ExternalSecret Resources

Define `ExternalSecret` resources in Git that tell the operator which secrets to fetch and how to map them to Kubernetes Secrets.

```yaml
# apps/my-app/external-secret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/mydb"
  data:
    - secretKey: username
      remoteRef:
        key: my-app/database
        property: username
    - secretKey: password
      remoteRef:
        key: my-app/database
        property: password
    - secretKey: host
      remoteRef:
        key: my-app/database
        property: host
    - secretKey: port
      remoteRef:
        key: my-app/database
        property: port
```

For fetching all keys from a secret at once:

```yaml
# apps/my-app/external-secret-api.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: api-keys
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: my-app/api-keys
```

## Step 9: Commit and Push to Git

Push all manifests to your repository:

```bash
git add -A
git commit -m "Deploy External Secrets Operator with Flux"
git push origin main
```

## Step 10: Verify the Deployment

Check that everything is running correctly:

```bash
# Verify the operator is running
flux get helmreleases -n external-secrets
kubectl get pods -n external-secrets

# Check the ClusterSecretStore status
kubectl get clustersecretstores

# Check ExternalSecret sync status
kubectl get externalsecrets -n my-app

# Verify the Kubernetes Secret was created
kubectl get secret database-credentials -n my-app -o jsonpath='{.data}' | jq
```

The ExternalSecret status should show `SecretSynced` with a recent sync time.

## Rotating Secrets

When you update a secret in AWS Secrets Manager, the External Secrets Operator will automatically fetch the new value based on the `refreshInterval` setting:

```bash
aws secretsmanager update-secret \
  --secret-id my-app/database \
  --secret-string '{"username":"admin","password":"newsecret","host":"db.example.com","port":"5432"}'
```

The operator will update the Kubernetes Secret within the refresh interval. To trigger an immediate refresh:

```bash
kubectl annotate externalsecret database-credentials -n my-app force-sync=$(date +%s) --overwrite
```

## Troubleshooting

If secrets are not syncing, check the operator logs and ExternalSecret status:

```bash
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets --tail=50

kubectl describe externalsecret database-credentials -n my-app

kubectl get events -n my-app --field-selector involvedObject.kind=ExternalSecret
```

Common issues include incorrect IAM permissions, wrong secret paths, or the IRSA trust relationship not being configured correctly.

## Conclusion

Deploying the External Secrets Operator with Flux on EKS provides a secure, GitOps-compatible approach to secrets management. Your secret references live in Git (safe to commit since they contain no sensitive data), while the actual secret values stay in AWS Secrets Manager. Flux manages the operator lifecycle, and the operator handles the synchronization between AWS and Kubernetes. This setup gives you automated secret rotation, audit trails through both Git and AWS CloudTrail, and a clean separation of concerns.
