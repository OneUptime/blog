# Validation Summary: How to Access Rook-Ceph Object Storage from an Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RADOS Gateway / RGW)
- Kubernetes (Deployments, Pods, Services, Secrets, ConfigMaps)
- Amazon S3 API (S3-compatible object storage)
- Python boto3 / botocore
- AWS CLI
- ObjectBucketClaim (OBC) via lib-bucket-provisioner

## Sources Consulted
- Rook-Ceph official documentation: Object Storage section (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- Rook-Ceph CephObjectStore CRD reference (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Rook-Ceph source code for RGW daemon pod label construction (pkg/operator/ceph/object/)
- boto3 S3 client documentation (https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html)
- Kubernetes API reference for Deployment, Pod, and Service specs (https://kubernetes.io/docs/reference/kubernetes-api/)
- AWS CLI S3 command reference (https://docs.aws.amazon.com/cli/latest/reference/s3/)

## Issues Found
1. **Incorrect LoadBalancer service selector label**: The "External Access via LoadBalancer" section used `rgw: my-store` as a pod selector label. This is not a label that Rook-Ceph applies to RGW pods. The correct label is `rook_object_store: my-store`. Using the incorrect label would result in the LoadBalancer service selecting no pods and routing no traffic. Fixed by replacing `rgw: my-store` with `rook_object_store: my-store`.

## Review Notes
- The Python boto3 code places a comment about disabling SSL verification inside the `Config()` constructor, but the actual SSL verification is controlled by the `verify=False` parameter on the client. This is mildly confusing but not technically incorrect since the comment is just a code comment and the `verify=False` does work correctly.
- The `ensure_bucket` function catches all `ClientError` exceptions and assumes they mean the bucket doesn't exist. A 403 (Access Denied) would also be caught and trigger a `create_bucket` call, which would also fail. For a tutorial this is acceptable, but production code should check the HTTP status code.
- The RGW service name pattern `rook-ceph-rgw-my-store-a` (with the `-a` daemon suffix) may vary across Rook versions. The post correctly instructs readers to discover their actual service name via kubectl in Step 1 before using it.
- The `amazon/aws-cli` Docker image uses an entrypoint that expects AWS CLI subcommands. The pod overrides this with `command: ["/bin/sh", "-c", "sleep 3600"]`, which works because `command` in Kubernetes overrides the Docker ENTRYPOINT.
