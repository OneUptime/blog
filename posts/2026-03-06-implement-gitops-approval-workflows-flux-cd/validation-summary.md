# Validation Summary: How to Implement GitOps Approval Workflows with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitHub branch protection and CODEOWNERS
- GitHub Actions
- Kustomize
- Kubeconform
- Open Policy Agent (OPA) and Rego
- Slack notifications
- Flux webhook receivers

## Sources Consulted
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux `build kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux webhook receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CLI `gh api --help` output from the local environment
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- Kubeval repository maintenance notice: https://github.com/instrumenta/kubeval
- Kubeconform setup action documentation: https://github.com/marketplace/actions/setup-kubeconform
- OPA CI/CD documentation: https://www.openpolicyagent.org/docs/cicd
- OPA policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- OPA setup action documentation: https://github.com/open-policy-agent/setup-opa

## Issues Found
- The GitHub branch protection example used `gh api --field` with nested JSON objects. `gh api --field` does type conversion for simple values but does not parse arbitrary JSON object strings into nested request bodies. Replaced the fields with a JSON request body passed through `--input -`, matching GitHub's branch protection API payload.
- The Flux validation command used `flux build kustomization --path ... --dry-run` without the required Kustomization name and without `--kustomization-file`. Updated the example to extract the Flux Kustomization name and path and pass both required arguments.
- The workflow used `instrumenta/kubeval-action@master`. Kubeval is no longer maintained and recommends Kubeconform as a replacement. Replaced it with Kubeconform setup and a rendered-manifest validation step.
- The OPA GitHub Actions snippet referenced `open-policy-agent/opa-github-action@v2` with unsupported inputs. Replaced it with the official `open-policy-agent/setup-opa@v2` action and an `opa eval --fail-defined` loop.
- The Rego policy used legacy `deny[msg]` rule syntax. Updated it to current Rego v1-style `deny contains msg if` syntax.
- The Flux Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert/Provider examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions and added the Slack bot API address required by the documented Slack provider pattern.
- The ChatOps section implied Flux notifications themselves provide interactive approval. Adjusted the wording to clarify that Flux sends deployment notifications and must be paired with a ChatOps bot or pipeline to perform the approval action.
- The webhook receiver used `type: generic` while the curl command sent an HMAC signature. Changed the receiver to `generic-hmac`.
- The webhook receiver targeted a downstream Kustomization. Flux's webhook receiver guide recommends reconciling source kinds, so the example now targets the `GitRepository` source.
- The webhook curl example used a guessed `/hook/approval-webhook` path and generated an invalid OpenSSL signature string. Updated it to read `.status.webhookPath` from the Receiver and generate the signature in the documented `sha256=<hash>` format.

## Review Notes
- The CI examples remain illustrative and assume a simple repository layout with `apps/staging` and `apps/production` overlays.
- The OPA example evaluates individual YAML files. Repositories using multi-document YAML or generated manifests may prefer evaluating rendered output or using Conftest for richer file-format handling.
