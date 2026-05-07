# Validation Summary: How to Use Rancher API with Python

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager previous `/v3` API
- Rancher Kubernetes API (RK-API) versioning context
- Python
- `requests`
- `urllib3`
- REST API automation

## Sources Consulted
- Rancher: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher: API Keys - https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher: Tokens - https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Rancher: Users - https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher: Projects - https://ranchermanager.docs.rancher.com/api/workflows/projects
- Requests: Authentication - https://docs.python-requests.org/en/latest/user/authentication/
- Requests: Advanced Usage - https://docs.python-requests.org/en/latest/user/advanced/

## Issues Found
- The post presented the examples as generic Rancher API usage, but the code is specifically for Rancher's previous `/v3` API. I updated the description, introduction, and summary to scope the post correctly and added the versioning note that RK-API was introduced in Rancher v2.8.0 while the previous `/v3` API remains available.
- The reusable client defaulted to `verify_ssl=False`, which disables TLS certificate verification for every request. I changed the default to `True` and tightened the SSL-warning comment so the post matches Requests' documented secure default and keeps disabled verification scoped to intentional test/self-signed scenarios.
- The `generate_kubeconfig` helper hardcoded a deeper `/v3/clusters/{id}?action=generateKubeconfig` URL. Rancher's v3 API guide recommends following action URLs from the resource's `actions` map instead of constructing deeper paths directly, so I updated the client to fetch the cluster resource and `POST` to `cluster["actions"]["generateKubeconfig"]`.

## Review Notes
- The post is now accurate as a guide for Rancher's previous `/v3` API, not the newer RK-API resource model.
- Current Rancher documentation also documents RK-API workflows under `management.cattle.io/v3` and `ext.cattle.io/v1`; for new automation, readers should expect those APIs to coexist with the previous `/v3` API.
- Rancher documents that legacy v3 API tokens (`tokens.management.cattle.io`) are being phased out starting in Rancher v2.14.0, although the previous `/v3` API itself is still available.
