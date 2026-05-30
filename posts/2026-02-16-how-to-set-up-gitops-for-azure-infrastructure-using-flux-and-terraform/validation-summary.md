# Validation Summary: How to Set Up GitOps for Azure Infrastructure Using Flux and Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitOps
- Flux CD
- Tofu Controller / Terraform Controller for Flux
- Terraform
- AzureRM Terraform provider
- Azure Kubernetes Service (AKS)
- Kubernetes custom resources and Secrets
- Flux notification Alerts

## Sources Consulted
- Flux CLI `flux bootstrap github` documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Tofu Controller overview and support matrix: https://flux-iac.github.io/tofu-controller/
- Tofu Controller getting started and installation documentation: https://flux-iac.github.io/tofu-controller/getting_started/
- Tofu Controller Terraform API reference: https://flux-iac.github.io/tofu-controller/References/terraform/
- Tofu Controller custom backend documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/with-a-custom-backend/
- Tofu Controller outputs documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-obtain-outputs/
- Tofu Controller dependency management documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/with-gitops-dependency-management/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/

## Issues Found
- The Helm installation example used the old `tf-controller` chart name and v0.15 runner image while the Terraform example required Terraform `>= 1.5.0`. Updated the chart/repository names to `tofu-controller`, set the chart and image tags to v0.16.3, and added the chart polling interval so the example matches the current release documentation and support matrix.
- The Terraform example explicitly configured a Kubernetes backend while the article said the controller manages the backend. Removed the backend block from the Terraform code so Tofu Controller's default Kubernetes backend can manage state as described.
- The text said the example created a storage account, but the Terraform code created a resource group, virtual network, and subnet. Corrected the description.
- The manual approval workflow used a Kubernetes annotation that is not the documented approval mechanism. Updated the workflow to describe committing the generated plan name into `spec.approvePlan`.
- The dependency example read from the controller's state secret as if it were an output secret. Added `writeOutputsToSecret` to the networking `Terraform` object, added a `subnet_id` output, and updated the compute example to read from the output secret.
- The drift detection example described `retryInterval` as forcing drift checks. Corrected the text so drift detection is tied to `interval`, while `retryInterval` is used for failed reconciliations.
- The log command referenced `deployment/tf-controller`; updated it to `deployment/tofu-controller` to match the corrected Helm release.

## Review Notes
The Azure credential environment variables and Flux bootstrap command are technically valid. For a production implementation, a future revision could mention Azure workload identity as an alternative to static service principal secrets, but the current sealed secret or external secrets guidance is acceptable.
