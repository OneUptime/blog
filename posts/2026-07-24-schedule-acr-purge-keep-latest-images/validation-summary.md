# Validation Summary: Keeping Only the Latest ACR Images with Scheduled acr purge Tasks

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Azure Container Registry (ACR)
- ACR Tasks and timer triggers
- `acr purge` from `acr-cli` 0.19
- Azure CLI
- Azure RBAC and ABAC repository permissions
- OCI image tags, manifests, digests, and referrers

## Sources Consulted

- [Automatically purge images from an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge)
- [Run an ACR Task on a defined schedule](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-scheduled)
- [Azure CLI reference for `az acr task`](https://learn.microsoft.com/en-us/cli/azure/acr/task?view=azure-cli-latest)
- [Azure CLI reference for `az acr run`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest#az-acr-run)
- [Azure ABAC repository permissions and their effect on ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Use an Azure-managed identity in ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-authentication-managed-identity)
- [ACR Tasks YAML reference and built-in command aliases](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-reference-yaml)
- [Delete container images in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-delete)
- [Lock a container image in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-lock)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Set a retention policy for untagged manifests](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy)
- [Recover deleted artifacts with the soft delete policy](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-soft-delete-policy)
- [`acr-cli` v0.19 release](https://github.com/Azure/acr-cli/releases/tag/v0.19)
- [`acr purge` v0.19 implementation](https://github.com/Azure/acr-cli/blob/v0.19/cmd/acr/purge.go)

## Issues Found

- The post told readers to run `acr purge --help` directly, even though the post uses the ACR Tasks command alias rather than a locally installed `acr` binary. Changed the instruction to execute the help command through `az acr run` with a source-less context.
- The statement that negative lookahead might not be supported was outdated for the currently documented `acr-cli` 0.19 release, which uses the `regexp2` engine. Replaced it with version-appropriate guidance to prefer auditable anchored patterns because the feature remains in preview.
- The wording that `--ago 0d --keep 20` retains exactly 20 matching tags was too absolute: `--keep` operates on otherwise deletable candidates, so locks, permissions, or fewer than 20 candidates can result in a different total. Clarified the candidate-based behavior.
- The `--untagged` example did not explain that the current implementation applies the same `--keep` value to eligible untagged manifests during combined tag and manifest cleanup. Added that behavior and advised separate tasks when the keep counts differ.
- The ABAC section listed the correct roles but omitted required source-registry identity selection. Added `--source-acr-auth-id '[caller]'` for `az acr run` and `--source-acr-auth-id '[system]'` or a user-assigned identity for persistent scheduled tasks, and clarified that an ABAC condition can scope the role assignment to the intended repositories.

## Review Notes

- `acr purge` remains a preview feature. Microsoft currently documents the `mcr.microsoft.com/acr/acr-cli:0.19` image, so operators should recheck `acr purge --help` and repeat dry runs when the image or policy changes.
- The documented defaults of 600 seconds for on-demand purge tasks and 3,600 seconds for scheduled tasks are accurate. The sample `--timeout 7200` value is valid for the scheduled task.
- The cron syntax, UTC interpretation, one-minute maximum frequency, base-image-trigger default, logging commands, tag-lock behavior, SKU rate-limit guidance, and ABAC purge permissions were verified without further changes.
