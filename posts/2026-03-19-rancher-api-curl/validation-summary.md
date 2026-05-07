# Validation Summary: How to Use Rancher API with curl

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager previous `/v3` API
- Rancher Kubernetes API proxy / Steve API paths under `/k8s/clusters/<cluster-id>/v1`
- Kubernetes namespaces and project association
- `curl`
- `jq`
- Bash shell scripting

## Sources Consulted
- Rancher docs, Previous v3 Rancher API Guide: https://ranchermanager.docs.rancher.com/api/v3-rancher-api-guide
- Rancher docs, API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher docs, Projects workflow: https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher docs, Users workflow: https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher docs, Kubeconfigs workflow: https://ranchermanager.docs.rancher.com/api/workflows/kubeconfigs
- Rancher docs, Certificate Rotation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/rotate-certificates
- Rancher docs, Cluster Configuration: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration
- curl man page: https://curl.se/docs/manpage.html
- Rancher source, cluster actions and `/v3` cluster fields: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/cluster_types.go
- Rancher source, generated `/v3` client structs for clusters, nodes, projects, and users: https://github.com/rancher/rancher/tree/main/pkg/client/generated/management/v3
- Rancher source, token parsing and supported `Authorization` header formats: https://github.com/rancher/rancher/blob/main/pkg/auth/requests/authenticate.go
- Rancher source, bearer/basic token extraction: https://github.com/rancher/rancher/blob/main/pkg/auth/tokens/token_util.go

## Issues Found
- The post described the content as if it covered Rancher’s generic current API, but the commands are specifically for Rancher’s previous `/v3` API. I updated the description, introduction, and summary to make that scope explicit and to note that RK-API was introduced in Rancher v2.8.0.
- The namespace creation example created a namespace without showing the Rancher project association annotation. I updated the example to include `field.cattle.io/projectId`, which is the documented way to place a namespace under a Rancher project.
- The certificate rotation example was presented as a generic action endpoint. I added a support caveat because certificate rotation is only available when the cluster exposes that action.

## Review Notes
- Rancher’s previous `/v3` API is still available, but current Rancher documentation positions the Rancher Kubernetes API (RK-API) as the newer public API.
- The `/v3/users` example is still valid for the previous `/v3` API, but Rancher’s newer user workflow documentation uses the Kubernetes-style `users.management.cattle.io` resource plus a password `Secret`.
- Rancher’s documentation emphasizes API keys and HTTP basic authentication for `/v3`, while Rancher source and tests also show support for bearer-token authentication in the `Authorization` header used throughout this post.
