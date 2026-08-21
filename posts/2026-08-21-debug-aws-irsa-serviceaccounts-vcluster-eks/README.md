# How to Debug AWS IRSA for ServiceAccounts Synced from vCluster to EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Amazon EKS, IRSA, IAM, ServiceAccount

Description: Debug the tenant-to-host ServiceAccount translation, EKS webhook mutation, OIDC trust, and AWS credential chain behind IRSA in vCluster.

---

IRSA succeeds only when four identities line up: the tenant ServiceAccount, its translated control plane cluster ServiceAccount, the host Pod that EKS mutates, and the IAM role's OIDC trust conditions. In a vCluster, the most common mistake is trusting the tenant-visible namespace and name even though AWS sees the translated ServiceAccount in the EKS cluster.

This guide targets vCluster **0.36** on Shared Nodes in an Amazon EKS control plane cluster. It covers IAM Roles for Service Accounts (IRSA), not EKS Pod Identity; AWS now documents both and recommends Pod Identity where it fits, but they use different credential-delivery components, configuration, and trust models.

## Understand Which Cluster Is the Identity Provider

Enable ServiceAccount synchronization:

```yaml
sync:
  toHost:
    serviceAccounts:
      enabled: true
```

With this configuration, vCluster creates a corresponding ServiceAccount in the EKS control plane cluster and uses a token issued by that host cluster for the synchronized workload. The EKS cluster's OIDC issuer is therefore the issuer IAM must trust. You do not configure the tenant vCluster as a second IAM OIDC provider for this path.

Apply the configuration:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --connect=false \
  --upgrade \
  --values vcluster.yaml
```

Confirm the EKS cluster has an IAM OIDC provider before debugging workload YAML:

```bash
aws eks describe-cluster \
  --name platform-eks \
  --query 'cluster.identity.oidc.issuer' \
  --output text

aws iam list-open-id-connect-providers
```

## Create the Tenant ServiceAccount

While connected to the vCluster, create the annotated identity:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: apps
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  namespace: apps
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/team-a-s3-reader
    eks.amazonaws.com/sts-regional-endpoints: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aws-check
  namespace: apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: aws-check
  template:
    metadata:
      labels:
        app: aws-check
    spec:
      serviceAccountName: s3-reader
      containers:
        - name: aws-cli
          image: public.ecr.aws/aws-cli/aws-cli:2.36.28
          command: ["sh", "-c", "sleep 86400"]
```

vCluster synchronizes ServiceAccount labels and annotations bidirectionally, so the role annotation should appear on the translated host ServiceAccount. Do not proceed on assumption-inspect it.

## Discover the Actual Host Identity

In single-namespace translation, the host name is commonly rewritten. Find the object using vCluster's origin annotations instead of predicting the generated name:

```bash
kubectl --context host -n team-a-vcluster get serviceaccounts -o json \
  | jq -r '.items[]
      | select(.metadata.annotations["vcluster.loft.sh/object-name"] == "s3-reader")
      | select(.metadata.annotations["vcluster.loft.sh/object-namespace"] == "apps")
      | [.metadata.namespace, .metadata.name,
         .metadata.annotations["eks.amazonaws.com/role-arn"]] | @tsv'
```

Record the returned host namespace and ServiceAccount name. Then find the translated Pod and verify it references that same host ServiceAccount:

```bash
kubectl --context host -n team-a-vcluster get pods -o custom-columns=\
'NAME:.metadata.name,SA:.spec.serviceAccountName,NODE:.spec.nodeName'
```

If the ServiceAccount is missing, check `sync.toHost.serviceAccounts.enabled`, vCluster events, syncer logs, and host RBAC. If the annotation is missing, inspect the tenant object, admission mutations on both clusters, and any configured ServiceAccount sync patches.

## Match the IAM Trust Policy to the Host `sub`

An IRSA role trust policy needs the EKS issuer without `https://` as its condition-key prefix. Its subject must use the **actual host** namespace and ServiceAccount name:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::111122223333:oidc-provider/oidc.eks.eu-west-1.amazonaws.com/id/EXAMPLE"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.eu-west-1.amazonaws.com/id/EXAMPLE:aud": "sts.amazonaws.com",
          "oidc.eks.eu-west-1.amazonaws.com/id/EXAMPLE:sub": "system:serviceaccount:team-a-vcluster:ACTUAL_HOST_SERVICEACCOUNT"
        }
      }
    }
  ]
}
```

Replace every placeholder from live output. A trust statement for `system:serviceaccount:apps:s3-reader` describes the tenant-visible identity, not necessarily the host identity that signed the IRSA token.

The role's permission policy is separate from its trust policy. `AccessDenied` from `AssumeRoleWithWebIdentity` points toward issuer, audience, subject, or trust. A successful STS identity followed by `AccessDenied` from S3 points toward the role's attached permissions, resource policy, KMS policy, SCP, or permissions boundary.

## Verify EKS Webhook Mutation

The EKS Pod Identity webhook sees the translated host Pod. For IRSA it normally injects environment variables and a projected web-identity token volume. Inspect the live host Pod:

```bash
kubectl --context host -n team-a-vcluster get pod HOST_POD -o yaml
```

Look for:

- `AWS_ROLE_ARN` with the expected role;
- `AWS_WEB_IDENTITY_TOKEN_FILE` pointing into a projected volume;
- a projected `serviceAccountToken` with audience `sts.amazonaws.com`;
- the translated Pod's `spec.serviceAccountName` matching the annotated host ServiceAccount.

If these are absent, recreating the Deployment's Pods after fixing the ServiceAccount annotation is important: admission mutation happens when the Pod is created. Also confirm the EKS webhook is healthy and that no host admission policy removes its mutation.

Now test the default credential chain inside the tenant-visible Pod:

```bash
kubectl --context tenant -n apps exec deploy/aws-check -- \
  aws sts get-caller-identity
```

Use an AWS SDK version that supports web identity credentials. Do not explicitly configure another credential provider while testing. Static environment credentials or configuration files earlier in the default chain can mask IRSA and return a different identity.

## Diagnose Common Failure Modes

- **Wrong OIDC provider:** IAM trusts a tenant issuer or another EKS cluster rather than the host EKS issuer.
- **Wrong subject:** the trust policy uses the tenant name instead of the translated host ServiceAccount name.
- **Wrong audience:** the trust condition or projected token audience is not `sts.amazonaws.com`.
- **Mutation never ran:** the Pod predates the annotation, references another ServiceAccount, or the EKS webhook is unhealthy.
- **Old or bypassed SDK:** the container's SDK lacks web-identity support, or application code chooses credentials explicitly.
- **IMDS fallback:** without IRSA credentials, a Pod may obtain the node role if IMDS is reachable. Restrict IMDS. AWS notes that `hostNetwork: true` Pods always have IMDS access, although supported SDKs prefer configured IRSA credentials.
- **Feature confusion:** `sync.toHost.pods.useSecretsForSATokens` changes how vCluster stores tenant Kubernetes API tokens; it is not the switch that enables the EKS IRSA projected token.

Never print the token in shared logs. Inspect claims locally only when necessary. If a token is exposed, recreate the affected Pod to replace its mounted token, but treat the leaked JWT and any STS credentials obtained from it as usable until they expire; block new role assumptions and revoke active role sessions for immediate containment.

## Official Documentation

- [vCluster: Sync ServiceAccounts to the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/service-accounts)
- [Amazon EKS: IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [Amazon EKS: Assign IAM roles to Kubernetes service accounts](https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html)
- [Amazon EKS: Use IRSA with the AWS SDK](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-minimum-sdk.html)
- [Kubernetes: Service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)

## Conclusion

Debug IRSA from the host outward: find the translated ServiceAccount, use its exact namespace and name in the IAM `sub`, confirm EKS mutated the translated Pod, and test with the default AWS credential chain. The tenant annotation starts the workflow, but the EKS OIDC issuer and host-side identity are what AWS ultimately verifies.
