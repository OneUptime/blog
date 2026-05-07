# Validation Summary: How to Paginate Results in the Rancher API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher previous v3 API
- Rancher Steve `/v1` API
- Kubernetes API list pagination
- Bash
- `curl`
- `jq`

## Sources Consulted
- Rancher Previous v3 API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher API Reference: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Rancher Steve README: https://github.com/rancher/steve
- Rancher generic API specification: https://github.com/rancher/api-spec/blob/master/specification.md
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The v3 pagination example omitted the `partial` field and treated `total` and `last` as always-present fields. I updated the example and the field descriptions to match Rancher's API specification, where `partial` indicates truncation and `total` and `last` are optional.
- The v1 (Steve) section described the continuation token as `pagination.continue`. Steve list responses expose `continue` as a top-level field and also provide `pagination.next` for partial results. I corrected the JSON example and the surrounding explanation.
- The v1 pagination loop read `.pagination.continue`, which does not match Steve's response format. I changed the loop to follow `.pagination.next`, which is the safest way to continue through results.
- The sorting section used hard-coded `/v3` sort examples that were not guaranteed by the generic API spec. I changed that section to inspect and follow `sortLinks`, which is the documented discovery mechanism.
- The parallel page fetch example used `offset` with `/v3`, but Rancher's previous v3 API documents marker-based pagination instead of offset-based pagination. I replaced that example with the correct note that marker-based pagination is generally sequential.

## Review Notes
Rancher documents `/v3` as the previous v3 API and notes that the Rancher Kubernetes API (RK-API) was introduced in Rancher v2.8. The post is still technically relevant because it explicitly covers `/v3` and Steve `/v1`, but readers building new automation may also want to evaluate RK-API for newer Rancher deployments.
