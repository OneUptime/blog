# Validation Summary: How to Set Up Continuous Delivery with Rancher Fleet - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Fleet
- Rancher Continuous Delivery
- Kubernetes
- Kustomize
- GitHub Actions
- External Secrets Operator
- AWS Secrets Manager

## Sources Consulted
- Rancher Continuous Delivery with Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet GitRepo targeting docs: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet webhook docs: https://fleet.rancher.io/0.14/how-tos-for-users/webhook
- GitHub Actions reusable workflows: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions expressions: https://docs.github.com/en/actions/learn-github-actions/expressions
- `actions/checkout` documentation: https://github.com/actions/checkout
- GitHub-hosted runner image contents for Ubuntu: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator `ExternalSecret` API: https://external-secrets.io/main/api/externalsecret/
- External Secrets Operator `ClusterSecretStore` API: https://external-secrets.io/v1.0.0/api/clustersecretstore/
- External Secrets Operator API spec: https://external-secrets.io/latest/api/spec/

## Issues Found
- The architecture diagram showed Fleet reacting via webhook and implied approval gates for both staging and production. Fleet uses polling by default unless webhooks are configured, and the workflow described in the post only adds a manual gate for production. I updated the diagram to `polling/webhook`, removed the staging approval label, and kept approval only on production.
- The repository tree labeled the top-level `fleet.yaml` as the active root config for this layout. Because the `GitRepo` resources in the post point directly at `overlays/dev`, `overlays/staging`, and `overlays/production`, that top-level `fleet.yaml` is only used if a `GitRepo` targets the repo root. I corrected that note.
- The Step 2 `fleet.yaml` snippets used a `targets` key. In Fleet, cluster selection belongs on `GitRepo.spec.targets`; `fleet.yaml` uses `targetCustomizations` or `overrideTargets` for per-target bundle behavior. I removed the invalid `targets` blocks and clarified that targeting is configured in the `GitRepo` resources.
- The reusable GitHub Actions workflow referenced `secrets.GITOPS_REPO_TOKEN` without declaring it under `on.workflow_call.secrets`, and it checked out the GitOps repo default branch even though the `dev` `GitRepo` tracks `develop`. I added the secret declaration and set checkout to use `develop` for `dev` and `main` otherwise.
- The External Secrets step implied installing the operator once "alongside Fleet" and used `external-secrets.io/v1beta1` in the example. An `ExternalSecret` must be reconciled in the cluster where it is applied, and current official examples use `external-secrets.io/v1`. I clarified that the operator must be present on the downstream clusters that reconcile `ExternalSecret` resources, noted the `ClusterSecretStore` prerequisite, and updated the manifest to `external-secrets.io/v1`.
- The Fleet monitoring command queried `.status.state`, but Fleet exposes bundle deployment state under `.status.display.state`. I corrected the JSONPath and changed the Rancher UI comment from "metrics" to "status".
- The conclusion stated that Fleet automatically corrects drift by default. Fleet surfaces drift and supports rollback through `correctDrift`, but automatic correction is not enabled by default. I reworded the conclusion to reflect that behavior accurately.

## Review Notes
- No live Rancher/Fleet cluster or GitHub Actions run was available in this workspace, so validation was documentation-based rather than execution-based.
- GitHub-hosted Ubuntu runners currently include `kustomize`, so the workflow's `kustomize edit set image` step is plausible without an extra install step.
- The production promotion model in the post is a pause/unpause gate on the production `GitRepo`, not a branch-based promotion workflow.
