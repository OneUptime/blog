# Validation Summary: How to Configure Fluent Bit Output to S3 with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Fluent Bit
- Fluent Bit Helm chart
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes
- Amazon EKS IRSA
- AWS IAM
- Amazon S3 lifecycle policies
- AWS CLI, eksctl, and kubectl

## Sources Consulted
- Fluent Bit S3 output official documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/s3
- Fluent Bit monitoring official documentation: https://docs.fluentbit.io/manual/4.1/administration/monitoring
- Fluent Bit Kubernetes filter official documentation: https://docs.fluentbit.io/manual/4.2/data-pipeline/filters/kubernetes
- Fluent Bit rewrite_tag filter official documentation: https://docs.fluentbit.io/manual/pipeline/filters/rewrite-tag
- Fluent Bit Helm chart values: https://github.com/fluent/helm-charts/blob/main/charts/fluent-bit/values.yaml
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- eksctl IAM service account documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CLI iam create-policy command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html
- AWS CLI s3api put-bucket-lifecycle-configuration command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction described Fluent Bit S3 output as supporting "Parquet via AWS Kinesis Firehose". Fluent Bit's S3 output writes newline-delimited JSON by default and supports compression formats, with Arrow/Parquet only when compiled with Apache Arrow support. Updated the wording to avoid implying Firehose is part of the S3 output plugin path.
- The IAM policy and S3 lifecycle examples were fenced as JSON but contained `//` comments, which are invalid JSON. Moved the filenames into prose before the code blocks.
- The sample IAM policy granted unnecessary `s3:GetObject` and `s3:ListBucket` permissions for the described write-only upload path. Reduced it to `s3:PutObject` on the bucket object ARN.
- The example IAM policy ARN used a 9-digit AWS account ID. Updated it to a valid 12-digit placeholder.
- The eksctl command comment said to replace an OIDC URL, but the command does not include an OIDC URL argument. Updated the comment to reference the cluster name and account ID.
- The S3 key formats started with `/`, while the lifecycle prefix and `aws s3 ls` command used `kubernetes/`. Removed the leading slash so uploaded keys, lifecycle matching, and verification commands use the same prefix.
- The S3 key formats did not include `$UUID`, which Fluent Bit recommends to avoid key suffix and extension surprises when the S3 output falls back to `PutObject`. Added `$UUID` to all S3 key formats.
- `upload_chunk_size` was set to `100000000`, above Fluent Bit's documented 50M maximum for multipart parts, and the comment described it as minimum object size. Replaced it with `total_file_size 100M` and `upload_chunk_size 30M`, with comments that match Fluent Bit's multipart behavior.
- The S3 buffer volume was described as persistent even though `emptyDir` is ephemeral. Changed the wording to local storage.
- The verification step described Fluent Bit HTTP metrics as "S3 output metrics", but Fluent Bit documents that the built-in HTTP output metrics are not meaningful for S3 output. Updated the wording to say the command checks that the HTTP metrics endpoint is available.

## Review Notes
- The tutorial remains focused on a practical EKS/IRSA deployment. For a production environment, a persistent volume for `store_dir` can improve restart recovery for multipart upload metadata; the current `emptyDir` example is valid local buffering but does not persist across pod replacement.
