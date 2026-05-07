# Validation Summary: How to Use Rancher API with Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher previous v3 API
- Rancher RK-API migration context
- Go
- HTTP/REST APIs
- Kubernetes
- kubeconfig

## Sources Consulted
- Rancher docs: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher docs: Tokens - https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Rancher docs: Users - https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher docs: API Keys - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/user-settings/api-keys
- Rancher source: `pkg/api/steve/clusters/clusters.go` - https://github.com/rancher/rancher/blob/main/pkg/api/steve/clusters/clusters.go
- Rancher source: `pkg/api/steve/clusters/kubeconfig.go` - https://github.com/rancher/rancher/blob/main/pkg/api/steve/clusters/kubeconfig.go
- Rancher source: `pkg/client/generated/management/v3/zz_generated_cluster.go` - https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_cluster.go
- Rancher source: `pkg/client/generated/management/v3/zz_generated_cluster_condition.go` - https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_cluster_condition.go
- Rancher source: `pkg/client/generated/management/v3/zz_generated_info.go` - https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_info.go
- Rancher source: `pkg/client/generated/management/v3/zz_generated_node.go` - https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_node.go
- Rancher source: `pkg/client/generated/management/v3/zz_generated_user.go` - https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_user.go

## Issues Found
- The post treated `/v3` as if it were Rancher's primary API. I updated the introduction and summary to state that the guide targets Rancher's previous v3 API, that RK-API was introduced in v2.8, and that legacy v3 API tokens are being phased out starting in v2.14.
- The pagination helper appended `?limit=100` blindly, which breaks endpoints that already contain query parameters and can hide HTTP errors by trying to unmarshal error bodies as data. I rewrote it to use `net/url`, preserve existing query strings, default to the documented `limit=1000` only when no limit is already set, follow `pagination.next` safely, and check HTTP status codes.
- The request helpers inserted raw cluster IDs into paths and query strings. I updated them to use `url.PathEscape` and `url.QueryEscape` so the examples build valid request URLs.
- The runnable health-check example hard-coded `skipTLS=true`, which disables certificate validation. I changed the example to verify TLS by default and replaced the token example with a generic Bearer token placeholder.

## Review Notes
- The post is now technically correct for Rancher's previous v3 API, but new automation on newer Rancher versions should prefer RK-API where possible.
- The `CreateUser` example is valid for the legacy v3 API shown in the post. Rancher's newer public `users.management.cattle.io` workflow uses a different two-step user creation flow.
- Go is not installed in this workspace, so I validated the code against Rancher documentation and current Rancher source rather than compiling it locally.
