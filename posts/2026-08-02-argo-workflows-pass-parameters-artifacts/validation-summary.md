# Validation Summary: How to Pass Parameters and Artifacts Between Argo Workflow Tasks

## Status
validated

## Post Type
Technical guide and tutorial

## Technologies Covered
- Argo Workflows 4.0
- Kubernetes Workflow custom resources
- YAML workflow manifests
- Argo CLI
- Workflow parameters and output parameters
- Workflow artifacts and artifact repositories
- S3-compatible object storage and other artifact drivers
- Kubernetes Secrets and persistent volumes
- Python 3.13
- Alpine Linux 3.23

## Sources Consulted
- [Argo Workflows v4.0.8 release](https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8)
- [Argo Workflows: Output parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/)
- [Argo Workflows: Artifacts](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/)
- [Argo Workflows: Workflow inputs and output wiring](https://argo-workflows.readthedocs.io/en/latest/workflow-inputs/)
- [Argo Workflows: Parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/parameters/)
- [Argo Workflows: Configure an artifact repository](https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/)
- [Argo Workflows: Artifact repository references](https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/)
- [Argo Workflows: Key-only artifacts](https://argo-workflows.readthedocs.io/en/latest/key-only-artifacts/)
- [Argo Workflows: Workflow variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Loops](https://argo-workflows.readthedocs.io/en/latest/walk-through/loops/)
- [Argo Workflows: Secrets](https://argo-workflows.readthedocs.io/en/latest/walk-through/secrets/)
- [Argo Workflows: Field reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo CLI: `argo lint`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_lint/)
- [Argo CLI: `argo submit`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_submit/)
- [Argo CLI: `argo get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/)
- [Docker Official Image: Python](https://hub.docker.com/_/python)
- [Docker Official Image: Alpine](https://hub.docker.com/_/alpine)

## Issues Found
- The artifact repository section incorrectly required the referenced ConfigMap to exist in the Workflow namespace. For an explicit `artifactRepositoryRef`, Argo checks the Workflow namespace first and then the workflow controller namespace; repository credential Secrets are retrieved from the Workflow namespace. The text now describes those lookup locations accurately so that controller-namespace repository configurations are not misdiagnosed as invalid.

## Review Notes
- The complete producer-to-consumer manifest passed offline strict linting with the Argo Workflows v4.0.8 CLI.
- The documented fallback behavior for outputs of skipped or omitted nodes requires Argo Workflows v3.7.16 or v4.0.7 and later. The post correctly describes current behavior, but users of earlier releases must not assume the same resolution rules.
- The `python:3.13-alpine` and `alpine:3.23` image tags were valid official-image tags on the validation date. They are moving minor-version tags rather than immutable digests or patch-version pins.
