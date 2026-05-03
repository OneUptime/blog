# Validation Summary: How to Deploy AWX (Ansible Tower) with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWX (Ansible Tower upstream)
- AWX Operator (Helm chart)
- Amazon EKS (Kubernetes)
- Amazon RDS for PostgreSQL
- Helm provider for Terraform
- Kubernetes provider for Terraform (kubernetes_manifest, kubernetes_secret, kubernetes_ingress_v1)
- AWS Load Balancer Controller (ALB Ingress)

## Sources Consulted
- AWX Operator official documentation: https://ansible.readthedocs.io/projects/awx-operator/en/latest/
- AWX Operator external database configuration docs: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/database-configuration.html
- AWX Operator GitHub repo and CRD schema: https://github.com/ansible/awx-operator
- Terraform AWS modules (EKS): https://registry.terraform.io/modules/terraform-aws-modules/eks/aws
- Terraform Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes
- Terraform Helm provider docs: https://registry.terraform.io/providers/hashicorp/helm
- AWS Load Balancer Controller docs

## Issues Found
1. **Invalid AWX CRD fields `external_database` and `external_db_secret_name`** — these are not valid fields in the AWX Custom Resource (`awx.ansible.com/v1beta1`). The official AWX Operator documentation specifies that an external PostgreSQL database is configured by setting the single field `postgres_configuration_secret` to the name of the Kubernetes Secret containing the connection details. Replaced both fields with `postgres_configuration_secret`.
2. **Invalid use of `postgres_label_selector` for external DB** — this field is intended for selecting/labeling an in-cluster operator-managed PostgreSQL pod and is irrelevant when an external (RDS) database is used. Removed it from the AWX spec.
3. **Incorrect secret `type` value (`managed`)** — for external databases the AWX Operator docs explicitly state the secret's `type` field should be `unmanaged`. Changed `type = "managed"` to `type = "unmanaged"` in the `kubernetes_secret.awx_db` data block.

## Review Notes
- The deprecated `kubernetes.io/ingress.class: alb` annotation is still respected by the AWS Load Balancer Controller, but the modern approach is to use `spec.ingressClassName = "alb"` instead. Left as-is since it remains functional, but worth modernizing in future revisions.
- AWX Operator chart version 2.10.0 is a real release; newer versions exist (2.19+ at time of review). Pinning to 2.10.0 is acceptable but readers may want to use a more recent version.
- PostgreSQL 15.4 in RDS works for AWX (the operator supports PostgreSQL 13/14/15); a newer minor release would be preferable in production.
- EKS cluster version 1.29 is valid and supported.
- The `kubernetes_secret.awx_db.metadata[0].name` access pattern is correct for the Terraform Kubernetes provider's nested `metadata` block.
- The post does not configure persistent storage (`postgres_storage_*` is irrelevant since the DB is external) — this is correct.
- The `AWX.enabled = "false"` Helm value is valid for the awx-operator chart and prevents the chart from creating its own AWX CR (which the post creates explicitly).
