# Validation Summary: How to Consume S3 Buckets from Applications Using OBC in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Gateway (RGW)
- Kubernetes (Deployments, Pods, Jobs, ConfigMaps, Secrets)
- ObjectBucketClaim (OBC) via lib-bucket-provisioner
- AWS CLI (`amazon/aws-cli` image)
- MinIO Client (`minio/mc` image)
- Python boto3 S3 SDK
- kubectl

## Sources Consulted
- Rook OBC documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- lib-bucket-provisioner source code (`objectbucket_types.go` for Secret key constants `AwsKeyField`/`AwsSecretField`, `resourcehandlers.go` for ConfigMap keys)
- Kubernetes API reference for `envFrom`, `configMapRef`, `secretRef`, `configMapKeyRef`, `secretKeyRef`
- boto3 documentation for `boto3.client('s3', ...)` parameters
- MinIO Client (`mc`) documentation for `alias set`, `ls`, `pipe` subcommands

## Issues Found

1. **Incorrect ConfigMap key `BUCKET_SSL`**: The post listed `BUCKET_SSL` as one of the OBC-generated ConfigMap keys. This key does not exist in the lib-bucket-provisioner specification. The actual fifth key is `BUCKET_SUBREGION` (a provisioner-dependent sub-region field). Fixed by replacing `BUCKET_SSL` with `BUCKET_SUBREGION`.

2. **Missing boto3 installation in Python example**: The Python example used the `python:3.11-slim` image but called `import boto3` directly. The `boto3` package is not included in the base Python slim image, so the example would fail with `ModuleNotFoundError`. Fixed by changing the command to first run `pip install boto3 -q` and then execute the Python script via a heredoc.

## Review Notes
- The namespace-copy approach using `sed 's/namespace: default/namespace: my-app/'` is a common pattern but can be fragile if the string "namespace: default" appears elsewhere in the resource YAML (e.g., in annotations or labels). This is unlikely for simple ConfigMaps/Secrets but worth noting.
- The Deployment example uses `amazon/aws-cli:latest` with a one-shot `aws s3 ls` command. The container will exit immediately and Kubernetes will keep restarting it. This is fine for demonstration but readers should be aware it's not a production pattern.
- All Kubernetes YAML manifests are syntactically correct and use valid API versions.
- The Secret key names (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and ConfigMap key names (`BUCKET_NAME`, `BUCKET_HOST`, `BUCKET_PORT`, `BUCKET_REGION`) are confirmed correct per the lib-bucket-provisioner source code.
