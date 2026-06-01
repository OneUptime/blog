# Validation Summary: How to Use EMR on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EMR on EKS
- Amazon EKS
- Kubernetes
- Apache Spark
- AWS CLI
- eksctl
- IAM roles and policies
- Amazon S3
- Amazon CloudWatch Logs
- Amazon ECR
- Docker

## Sources Consulted
- Amazon EMR on EKS Development Guide: Enable cluster access for Amazon EMR on EKS - https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-cluster-access.html
- Amazon EMR on EKS Development Guide: Using job execution roles with Amazon EMR on EKS - https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/iam-execution-role.html
- Amazon EMR on EKS Development Guide: Using pod templates - https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/pod-templates.html
- Amazon EMR on EKS Development Guide: How to customize Docker images - https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/docker-custom-images-steps.html
- Amazon EMR on EKS Development Guide: emr-7.0.0-latest - https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/emr-eks-7.0.0-latest.html
- AWS CLI Command Reference: create-virtual-cluster - https://docs.aws.amazon.com/cli/latest/reference/emr-containers/create-virtual-cluster.html
- AWS CLI Command Reference: start-job-run - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/emr-containers/start-job-run.html
- Amazon EKS User Guide: Understand the Kubernetes version lifecycle on EKS - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl User Guide: Enabling Access for Amazon EMR - https://docs.aws.amazon.com/eks/latest/eksctl/emr-access.html

## Issues Found
- The EKS cluster creation example used Kubernetes `1.28`, which is no longer available in Amazon EKS standard or extended support as of the validation date. Changed it to `1.35`, which is in standard support.
- Sample AWS account IDs used `123456789`, which is not a valid 12-digit AWS account ID format. Updated IAM and ECR examples to use `123456789012`.
- The example execution role trust policy omitted the `aud` condition and used an overly broad `emr-containers-sa-*` subject pattern. Updated it to match the current Amazon EMR on EKS documented trust policy shape more closely.
- The execution role S3 permissions only covered `my-data-bucket`, but later examples load scripts and pod templates from `my-scripts` and write logs to `my-emr-logs`. Expanded the sample policy to cover the buckets used by the job examples.
- The pod template text said the example ensured GPU support, but the template did not request GPU resources. Reworded it to describe dedicated Spark compute nodes instead.

## Review Notes
- AWS CLI and eksctl were not installed locally in this workspace, so command verification used official AWS CLI, Amazon EMR on EKS, Amazon EKS, and eksctl documentation instead of local `--help` output.
- `emr-7.0.0-latest` remains documented by AWS and maps to container image tag `emr-7.0.0:latest`, but newer EMR on EKS releases are available and may be preferable for a future refresh.
