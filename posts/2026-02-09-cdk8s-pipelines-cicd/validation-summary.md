# Validation Summary: How to Use CDK8s Pipelines That Generate and Apply Kubernetes Manifests in CI/CD

## Status
validated

## Post Type
Tutorial / CI/CD implementation guide

## Technologies Covered
- CDK8s
- Kubernetes and kubectl
- GitHub Actions
- GitLab CI/CD
- Jenkins Declarative Pipeline
- Open Policy Agent and Rego
- kubeconform
- AWS EKS kubeconfig setup
- Node.js

## Sources Consulted
- CDK8s synth documentation: https://cdk8s.io/docs/latest/cli/synth/
- CDK8s TypeScript getting started documentation: https://cdk8s.io/docs/latest/get-started/typescript/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub artifact action deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- Node.js release schedule: https://github.com/nodejs/release
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab CI/CD script syntax: https://docs.gitlab.com/ci/yaml/script/
- Jenkins Declarative Pipeline syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- AWS CLI EKS update-kubeconfig reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Open Policy Agent documentation: https://www.openpolicyagent.org/docs/
- Open Policy Agent Rego `if` keyword reference: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent Rego `contains` keyword reference: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- kubeval repository notice: https://github.com/instrumenta/kubeval
- kubeconform repository and usage documentation: https://github.com/yannh/kubeconform

## Issues Found
- The GitHub Actions examples used `actions/upload-artifact@v3` and `actions/download-artifact@v3`. These versions are deprecated and no longer usable on GitHub.com after January 30, 2025, so they were updated to `@v4`.
- The examples used Node.js 18, which reached end of life on April 30, 2025. The GitHub Actions, GitLab CI, and Jenkins examples now use Node.js 22.
- The GitHub Actions validation job installed and ran kubeval. The kubeval repository states that the project is no longer maintained and recommends kubeconform, so the duplicate kubeval validation steps were removed.
- Several `kubectl rollout status deployment` and `kubectl describe deployment` commands omitted a deployment name. The Kubernetes reference requires `TYPE NAME` or `TYPE/NAME`, so the examples now use `deployment/app`.
- The rollback example saved all deployments instead of the intended deployment and then waited on an unnamed rollout. It now backs up and waits on `deployment/app`.
- The OPA Rego examples used pre-OPA-v1 partial set rule syntax such as `deny[msg] { ... }`. Current Rego v1 syntax requires `if` and `contains` for these rules, so the policies now use `import rego.v1` and `deny contains msg if { ... }`.
- The OPA CI commands parsed `opa eval` JSON output with `grep`, which is brittle and did not directly express failure on policy violations. They now use `opa eval --fail-defined ... "data.kubernetes.admission.deny[_]"`, matching OPA's documented CI pattern.
- The GitLab and Jenkins OPA examples used the `openpolicyagent/opa` container image as a shell job image. To keep the shell-based CI snippets reliable, those examples now use `alpine:latest` and install the OPA binary with the documented download URL.
- The Jenkins pull request deployment condition used a PR branch glob. Jenkins Declarative Pipeline has a dedicated `changeRequest()` condition for change requests, so the staging condition was updated accordingly.

## Review Notes
- The post remains a generic template: `deployment/app`, cluster names, namespaces, and kubeconfig secrets are placeholders that readers must align with their generated CDK8s resources.
- GitHub Actions deployment from pull requests may require additional security handling for forked pull requests because repository secrets are not always available to untrusted PRs.
