# Validation Summary: How to Use kubectl patch for In-Place Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Strategic merge patch
- JSON Patch (RFC 6902)
- JSON Merge Patch (RFC 7386)
- Kubernetes custom resources

## Sources Consulted
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes task guide, "Update API Objects in Place Using kubectl patch": https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- RFC 6902, JavaScript Object Notation (JSON) Patch: https://datatracker.ietf.org/doc/html/rfc6902
- RFC 7386, JSON Merge Patch: https://datatracker.ietf.org/doc/html/rfc7386

## Issues Found
- The post described strategic merge patch as understanding resource schemas generally. Changed this to built-in resource schemas and added a CRD caveat because official Kubernetes documentation states strategic merge patch is not supported for custom resources.
- The post implied strategic merge patch always handles arrays intelligently. Added a note that list behavior depends on the field patch strategy; some lists merge, while others are replaced.
- The JSON Patch example comment said it added an item at a specific index while using the `/-` path, which appends to an array. Updated the comment to say it appends.
- The merge patch section incorrectly said JSON merge patch replaces labels wholesale and removes unspecified labels. Updated it to explain that JSON merge patch recursively merges objects, replaces arrays/scalars, and removes object members by setting them to `null`.
- The environment variable JSON Patch example would fail if the target container did not already have an `env` array. Updated the comment to state that the array must already exist.
- The CRD examples omitted `--type`, which would default to strategic merge patch and fail for custom resources. Added explicit `--type='merge'` flags and updated the surrounding explanation.

## Review Notes
- `kubectl` was not installed in the local environment, so command validation was performed against the current official Kubernetes command reference rather than local `kubectl --help` output.
- The post's `kubectl patch` flags and patch types are current in the official Kubernetes documentation. The `--subresource=scale`, `--patch-file`, `--dry-run=client`, `--dry-run=server`, and JSONPath output examples match the documented command surface.
