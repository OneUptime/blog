# Validation Summary: How to Filter Resources in the Rancher API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher v3 API
- Rancher v1 (Steve) API
- Kubernetes field selectors
- Kubernetes label selectors
- Bash
- `curl`
- `jq`

## Sources Consulted
- Rancher: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher: API Keys - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/user-settings/api-keys
- Kubernetes: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Rancher Steve README - https://github.com/rancher/steve
- Rancher API Extensions wiki - https://github.com/rancher/rancher/wiki/Rancher-API-Extensions
- Rancher Steve integration tests - https://github.com/rancher/rancher/blob/main/tests/v2/integration/steveapi/README.md

## Issues Found
- The v3 section said any top-level field could be filtered. Rancher documents filtering only for fields exposed by the collection's filter metadata, so this was corrected to supported fields.
- The `curl` examples used `Authorization: Bearer` headers throughout. I changed them to `curl -u "${RANCHER_TOKEN}"` to match Rancher's documented API-key usage for the v3 API and Rancher's own Steve examples.
- The Steve sorting example claimed the pod list was sorted by creation time but did not include a sort parameter. I corrected it to use Steve's `sort=metadata.creationTimestamp` and `pagesize=50`.
- The URL-encoding notes were misleading: one comment referred to a space in a label value even though Kubernetes label values cannot contain spaces, and another comment incorrectly said `jq` was handling URL encoding. Both comments were corrected.

## Review Notes
- Rancher documents `/v3` as the previous v3 API and introduced the Rancher Kubernetes API in Rancher v2.8. The post remains useful, but readers should treat `/v3` as a legacy interface and rely on the API browser/schema to confirm which fields are actually filterable on their Rancher version.
