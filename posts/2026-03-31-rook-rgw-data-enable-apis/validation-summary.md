# Validation Summary: How to Set rgw_data and rgw_enable_apis in Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph Kubernetes Operator)
- Kubernetes (ConfigMap, Deployments)
- S3 / Swift API protocols

## Sources Consulted
- Ceph official documentation: RGW configuration reference (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- Ceph official documentation: RGW admin API (https://docs.ceph.com/en/latest/radosgw/adminops/)
- Rook documentation: CephObjectStore CRD and configuration overrides (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)

## Issues Found

1. **Misleading default annotation on `s3` API**: The post marked `s3` as "(default)" in the API list, implying only S3 is enabled by default. In reality, all APIs (`s3, s3website, swift, swift_auth, admin, sts, iam, notifications`) are enabled by default. Fixed by removing the "(default)" annotation from `s3` and adding a clarifying note that all APIs are enabled by default.

2. **Missing `s3website` API from available options**: The `s3website` API (S3 static website hosting endpoint) was omitted from the list of available API protocols. Added it to the list.

3. **Outdated `pubsub` API name**: The post used `pubsub` as the API name for bucket notifications. In Ceph Reef and later, this was renamed to `notifications`. Updated the list entry and command example to use `notifications`, with a note about the old name for older Ceph versions.

4. **Incorrect Swift response code**: The expected response for an unauthenticated Swift request was listed as `412 Precondition Failed`. An unauthenticated Swift request to RGW returns `401 Unauthorized`. Fixed the expected response code.

## Review Notes
- The `ceph config` commands and ConfigMap override approach are correct and follow current best practices.
- The Kubernetes rollout restart command for applying changes is correct for Rook-managed RGW deployments.
- The admin API test endpoint `/admin/info` will require authentication credentials to return useful data; without credentials it returns an access denied error, which still confirms the API is active.
