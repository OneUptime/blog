# Validation Summary: Configure EKS Access Entries for Kubernetes Authentication Without aws-auth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS access entries
- AWS CLI for EKS
- Kubernetes RBAC and aws-auth ConfigMap
- Terraform AWS provider
- eksctl
- CloudWatch Logs

## Sources Consulted
- Amazon EKS User Guide: Grant IAM users access to Kubernetes with EKS access entries - https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Amazon EKS User Guide: Change authentication mode to use access entries - https://docs.aws.amazon.com/eks/latest/userguide/setting-up-access-entries.html
- Amazon EKS User Guide: Create access entries - https://docs.aws.amazon.com/eks/latest/userguide/creating-access-entries.html
- Amazon EKS User Guide: Associate access policies with access entries - https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html
- Amazon EKS User Guide: Review access policy permissions - https://docs.aws.amazon.com/eks/latest/userguide/access-policy-permissions.html
- Amazon EKS User Guide: Migrating existing aws-auth ConfigMap entries to access entries - https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html
- AWS CLI Command Reference: create-access-entry - https://docs.aws.amazon.com/cli/latest/reference/eks/create-access-entry.html
- AWS CLI Command Reference: associate-access-policy - https://docs.aws.amazon.com/cli/latest/reference/eks/associate-access-policy.html
- AWS CLI Command Reference: update-access-entry - https://docs.aws.amazon.com/cli/latest/reference/eks/update-access-entry.html
- eksctl User Guide: EKS Access Entries - https://docs.aws.amazon.com/eks/latest/eksctl/access-entries.html
- Terraform AWS provider: aws_eks_access_entry - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_access_entry
- Terraform AWS provider: aws_eks_access_policy_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_access_policy_association

## Issues Found
- The post stated that access entries work with EKS clusters version 1.23 and later. AWS documents access-entry availability by EKS platform version, not a blanket Kubernetes 1.23 minimum, so this was updated to describe the supported platform-version requirement.
- The migration section recommended deleting the entire aws-auth ConfigMap after migration. AWS recommends removing only the migrated mappings and warns that removing EKS-created node or Fargate mappings without equivalent access entries can break the cluster, so the example was changed to delete a specific IAM identity mapping.
- The node group section said EKS automatically creates access entries for node groups without qualification. This was narrowed to managed node groups and Fargate profiles when access entries are enabled, with a note that self-managed node groups need node access entries.
- The eksctl example placed accessEntries at the top level. eksctl documents access entries under accessConfig.accessEntries, so the YAML was corrected.
- The update-access-entry example passed Kubernetes groups as a comma-separated value. AWS CLI list syntax for this option is space-separated strings, so the command was corrected to `--kubernetes-groups developers viewers`.

## Review Notes
The AWS CLI, Terraform, and eksctl binaries were not installed in the local workspace, so command and schema validation was performed against official documentation rather than local help output. The article uses `system:masters` in an example; this is technically valid but broad and should be treated carefully in production.
