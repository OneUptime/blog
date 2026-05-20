# Validation Summary: How to Use ArgoCD with AWS EKS Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Amazon EKS
- Kubernetes
- Helm
- AWS IAM Roles for Service Accounts (IRSA)
- Amazon ECR
- AWS Load Balancer Controller / ALB Ingress
- External Secrets Operator
- AWS Secrets Manager
- Prometheus Operator
- Amazon S3

## Sources Consulted
- Argo CD installation and high availability docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD declarative setup and EKS cluster secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD OCI and private Helm repository docs: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/ and https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo CD releases: https://github.com/argoproj/argo-cd/releases
- eksctl IRSA docs: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon ECR private registry authentication docs: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS Load Balancer Controller ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.8/guide/ingress/annotations/
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- External Secrets Operator AWS provider and ClusterSecretStore docs: https://external-secrets.io/latest/provider/aws-secrets-manager/ and https://external-secrets.io/latest/api/clustersecretstore/
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator API docs: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm values pinned Argo CD to `v2.10.0`, which is outdated for a 2026 best-practices guide. Updated it to `v3.4.1`, the latest GitHub release available during review.
- The argo-helm ingress example used the older `hosts`/list-style `tls` shape. Updated it to the current chart's `server.ingress.hostname` and `tls: false` fields for ALB certificate termination.
- The IRSA example used `--override-existing-serviceaccounts` for a Helm-managed service account. Changed it to `--role-only` and added the Helm service account annotation pattern, matching eksctl guidance for Helm-managed service accounts.
- The NetworkPolicy allowed ingress from the ALB controller namespace, but ALB traffic does not originate from the controller pod namespace. Changed it to an `ipBlock` placeholder for the VPC or ALB subnet CIDRs.
- The EKS cluster secret omitted `tlsClientConfig.caData`. Added the TLS client configuration used by Argo CD's documented EKS cluster secret examples.
- The ECR repository secret used an `oci://` prefix for a Helm repository credential. Removed the prefix because Argo CD's Helm OCI credential docs require omitting it for repository credentials.
- The ECR authentication section incorrectly showed `helm.valuesFileSchemes`, which controls Helm values file schemes and does not authenticate to ECR. Replaced it with a repository Secret using the `AWS` username and `aws ecr get-login-password` output.
- The External Secrets examples used `external-secrets.io/v1beta1`. Updated them to the current `external-secrets.io/v1` API version from the official docs.
- The monitoring example labeled a `PrometheusRule` as a CloudWatch alarm. Corrected the comment to identify it as Prometheus alerts.
- The backup commands exported repository secrets but did not upload them to S3. Added the missing upload.
- The CronJob used `bitnami/kubectl:latest` while running `aws s3 cp`, but that image is not guaranteed to include the AWS CLI. Replaced it with a clearly named image placeholder that must include both `kubectl` and AWS CLI, and added repository secret backup to the CronJob.

## Review Notes
The guide remains accurate as a high-level production checklist, but several examples still use placeholders that must be customized for a real environment, including AWS account IDs, ACM certificate ARNs, IAM role names, VPC CIDRs, cluster CA data, S3 bucket names, and the backup container image.
