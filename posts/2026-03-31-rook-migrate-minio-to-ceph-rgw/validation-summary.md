# Validation Summary: How to Migrate from MinIO to Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook
- Ceph RGW (RADOS Gateway)
- MinIO
- MinIO Client (mc)
- rclone
- AWS CLI (for S3 bucket creation)
- Kubernetes (kubectl)
- radosgw-admin

## Sources Consulted
- MinIO Client (`mc`) official documentation: https://min.io/docs/minio/linux/reference/minio-mc.html
- `mc anonymous` command reference (replacement for deprecated `mc policy`): https://min.io/docs/minio/linux/reference/minio-mc/mc-anonymous.html
- MinIO PR #15779 deprecating `mc policy` in favor of `mc anonymous`: https://github.com/minio/minio/pull/15779
- rclone S3 backend documentation: https://rclone.org/s3/
- rclone connection string syntax: https://rclone.org/docs/#connection-strings
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

### Issue 1: Incorrect `mc policy` commands in Step 4
- **What was wrong:** The post used `mc policy export` and `mc policy set-json` to export and import bucket policies. `mc policy export` is not a valid mc subcommand, and `mc policy` itself was deprecated and renamed to `mc anonymous` (since October 2022).
- **What was changed:** Replaced `mc policy export minio-src/my-bucket` with `mc anonymous get-json minio-src/my-bucket`, and `mc policy set-json /tmp/bucket-policy.json ceph-dst/my-bucket` with `mc anonymous set-json /tmp/bucket-policy.json ceph-dst/my-bucket`.
- **Why:** `mc anonymous get-json` and `mc anonymous set-json` are the current, correct commands for exporting and importing bucket access policies as JSON.

### Issue 2: Unquoted endpoint URLs in rclone connection strings in Step 5
- **What was wrong:** The rclone on-the-fly backend connection strings contained endpoint URLs with colons (e.g., `http://minio.minio.svc:9000`) that were not quoted. Colons are used as delimiters in rclone's connection-string syntax, so the port separator in the URL would be misinterpreted by rclone's parser.
- **What was changed:** Added single quotes around endpoint values and double quotes around the entire connection string expressions (e.g., `":s3,...,endpoint='http://minio.minio.svc:9000':my-bucket"`).
- **Why:** rclone's connection-string parser requires values containing special characters (`:`, `,`) to be quoted to avoid ambiguous parsing.

## Review Notes
- The `mc anonymous` commands manage anonymous/public access policies on buckets. If users need to migrate IAM-style user/group policies, they would need `mc admin policy` commands instead. The post's scope (bucket-level access policies) is appropriate for the `mc anonymous` commands.
- The `aws s3 mb` command in Step 1 assumes AWS credentials are configured in the environment for the Ceph RGW endpoint. This is standard practice and not an error, but readers may need to set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables first.
- The parallel bucket migration loop in Step 3 uses `awk '{print $NF}'` to parse `mc ls` output. This works for standard bucket names but could break if bucket names contain spaces (extremely rare in practice).
