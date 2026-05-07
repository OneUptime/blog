# Validation Summary: How to Install Rancher Using Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS EC2
- AWS Elastic IP
- AWS Security Groups
- Rancher
- K3s
- Helm
- cert-manager
- Kubernetes CLI (`kubectl`)

## Sources Consulted
- HashiCorp Terraform provider requirements: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Terraform provisioners: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform `terraform_data`: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp Terraform `pathexpand`: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Terraform AWS Provider `aws_ami`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS Provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- Helm installation docs: https://helm.sh/docs/v3/intro/install/
- Helm `repo add`: https://helm.sh/docs/helm/helm_repo_add
- Helm `upgrade`: https://helm.sh/docs/v3/helm/helm_upgrade
- Kubernetes `kubectl wait`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options

## Issues Found
- The post declared the `loafoe/ssh` provider even though Terraform `remote-exec` uses built-in provisioner and `connection` blocks, not that provider. I removed the incorrect provider declaration and updated the provisioning example to use Terraform’s current built-in `terraform_data` resource for arbitrary provisioner work.
- The SSH private key example used `file(var.ssh_private_key_path)` with a default value of `~/.ssh/id_rsa`. Terraform does not expand `~` in `file()` paths, so the example would fail as written. I changed it to `file(pathexpand(var.ssh_private_key_path))`.
- The provisioning flow used fixed `sleep 30` delays after installing K3s and cert-manager. Those sleeps are not reliable and can fail on slower instances. I replaced them with readiness checks and Helm wait semantics: `kubectl wait`, `helm repo add --force-update`, and `helm upgrade --install ... --wait --timeout 10m`.
- The prerequisite said a domain name was optional, but the Rancher install in the post requires a `hostname`, and Rancher documents that value as the server FQDN. I corrected the prerequisite to require a DNS-resolvable hostname.

## Review Notes
- The post still opens TCP `6443` to `0.0.0.0/0`. That can be useful for external Kubernetes API access, but it is broader than necessary for basic Rancher UI access and should be restricted in production.
- Rancher’s Helm chart defaults `ingress.tls.source` to `rancher`, so this walkthrough will use Rancher-managed/self-signed ingress TLS unless the reader adds a different certificate source such as Let’s Encrypt or a pre-created secret.
- cert-manager’s documentation now recommends OCI Helm charts for the latest releases. The legacy `https://charts.jetstack.io` repository used here remains supported and is also reflected in Rancher’s installation documentation.
