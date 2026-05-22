# Validation Summary: How to Write Terratest Tests for Kubernetes Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terratest
- Kubernetes
- Go
- GitHub Actions
- kind

## Sources Consulted
- Terratest Kubernetes module API documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/k8s
- Terratest HTTP helper API documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/http-helper
- Terratest v1.0.0 go.mod: https://github.com/gruntwork-io/terratest/blob/v1.0.0/go.mod
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- GitHub Actions setup-go documentation: https://github.com/actions/setup-go
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- helm/kind-action documentation: https://github.com/helm/kind-action

## Issues Found
- The post installed `github.com/gruntwork-io/terratest/modules/helm` but did not use that module in the examples. Removed the extra `go get` command and adjusted the Helm section wording to say the test validates Kubernetes resources created by Terraform-managed Helm releases.
- Several examples used Terratest Kubernetes helpers that are deprecated in Terratest v1.0.0. Updated the examples to use context-aware helpers such as `WaitUntilDeploymentAvailableContext`, `GetDeploymentContext`, `ListPodsContext`, `GetServiceContext`, and `RunKubectlAndGetOutputContextE`.
- The Helm example called `k8s.ListConfigMaps`, which is not present in the current Terratest Kubernetes module. Replaced it with `RunKubectlAndGetOutputContextE` using `kubectl get configmaps -l ... -o name`.
- The pod configuration example listed pods immediately after `terraform.InitAndApply`, which could race before the Deployment was available. Added a deployment availability wait before listing pods.
- The NetworkPolicy example claimed Terratest has no dedicated NetworkPolicy helper, which is no longer accurate. Removed that claim and updated the kubectl call to the current context-aware API.
- The CI example used Go 1.21 while current Terratest v1.0.0 declares `go 1.26`. Updated the workflow's `go-version` to `1.26`.
- The description referenced ingress configurations, but the post does not include ingress testing. Updated it to reference NetworkPolicies instead.

## Review Notes
The examples are illustrative and still assume the referenced Terraform modules create matching namespaces, outputs, labels, Deployments, Services, and NetworkPolicies. I could not run the Go snippets locally because the `go` binary is not installed in this environment, so validation was based on official API documentation and source metadata.
