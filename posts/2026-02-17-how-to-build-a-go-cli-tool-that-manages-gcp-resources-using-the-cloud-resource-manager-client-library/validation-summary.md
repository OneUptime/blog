# Validation Summary: How to Build a Go CLI Tool That Manages GCP Resources Using the Cloud Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Cobra CLI framework
- Google Cloud Resource Manager API
- Google Cloud Resource Manager Go client library
- Google Cloud IAM policies

## Sources Consulted
- Go package documentation for `cloud.google.com/go/resourcemanager/apiv3`: https://pkg.go.dev/cloud.google.com/go/resourcemanager/apiv3
- Go package documentation for `cloud.google.com/go/resourcemanager/apiv3/resourcemanagerpb`: https://pkg.go.dev/cloud.google.com/go/resourcemanager/apiv3/resourcemanagerpb
- Go package documentation for `cloud.google.com/go/iam/apiv1/iampb`: https://pkg.go.dev/cloud.google.com/go/iam/apiv1/iampb
- Google Cloud IAM documentation for managing access to projects, folders, and organizations: https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
- Google Cloud IAM Policy REST reference: https://docs.cloud.google.com/iam/docs/reference/rest/v1/Policy
- Cobra command documentation: https://cobra.dev/docs/how-to-guides/working-with-commands/

## Issues Found
- The setup commands included `google.golang.org/api/cloudresourcemanager/v3`, but the tutorial uses the Cloud Resource Manager client library from `cloud.google.com/go/resourcemanager/apiv3`. Removed the unused dependency command to keep setup aligned with the code.
- The tutorial claimed to manage folders and referenced `folders.go`, `FoldersClient`, and `foldersCmd`, but no folder commands were implemented. Removed those references so the snippets match the actual implemented CLI and avoid an undefined `foldersCmd` compile error.
- The IAM command file imported `google.golang.org/genproto/googleapis/iam/v1` as `iampb`, but that import was unused in `cmd/iam.go` and did not match the Resource Manager client's IAM request types. Removed the unused command import and added the correct `cloud.google.com/go/iam/apiv1/iampb` import instruction to the internal client methods.
- The IAM policy retrieval did not request policy version 3. Added `GetPolicyOptions{RequestedPolicyVersion: 3}` and set `policy.Version = 3` before `SetIamPolicy` so IAM Conditions are preserved according to Google Cloud IAM policy guidance.
- The project list command allowed an empty `--parent`, but `ListProjectsRequest.Parent` is the parent resource being listed. Added a simple required-value check and `cobra.NoArgs` validation for the list command.
- The Mermaid command diagram listed commands that were not implemented (`projects get`, `iam remove-binding`, and folder commands). Updated the diagram to show only implemented commands.

## Review Notes
The code was checked against current official package documentation, but local compilation could not be run because the `go` toolchain is not installed in this environment.
