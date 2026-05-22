# Validation Summary: How to Use Terraform with Backstage for Developer Portal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS, Kubernetes, and Helm Terraform providers
- Backstage Software Templates and Scaffolder actions
- Backstage Software Catalog descriptors
- Backstage Helm chart
- Backstage frontend plugins with React and TypeScript
- GitHub Actions
- AWS RDS, S3 remote state, ECS, and ElastiCache concepts

## Sources Consulted
- Backstage Software Templates documentation: https://backstage.io/docs/features/software-templates/writing-templates/
- Backstage templating extensions documentation: https://backstage.io/docs/next/features/software-templates/templating-extensions/
- Backstage GitHub Actions dispatch action API reference: https://backstage.io/api/next/functions/_backstage_plugin-scaffolder-backend-module-github.createGithubActionsDispatchAction.html
- Backstage catalog descriptor format: https://github.com/backstage/backstage/blob/master/docs/features/software-catalog/descriptor-format.md
- Backstage Helm chart repository and chart README: https://github.com/backstage/charts and https://raw.githubusercontent.com/backstage/charts/main/charts/backstage/README.md
- Backstage PostgreSQL configuration tutorial: https://backstage.io/docs/tutorials/switching-sqlite-postgres/
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Helm provider `helm_release` resource documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The Backstage template used the catalog `owner` value as the GitHub repository owner. Backstage owner refs can be catalog entity refs and are not necessarily valid GitHub owners, so I added a `RepoUrlPicker` field and used `parameters.repoUrl` for `publish:github` and `github:actions:dispatch`.
- The generated catalog metadata referenced `values.description`, `values.environment`, and repository slug data without passing all of those values to the application skeleton. I passed the missing values and used Backstage's `projectSlug` filter for `github.com/project-slug`.
- The catalog descriptor declared dependencies on database and cache resources that the snippet did not define and that may not exist when those options are disabled. I changed the component dependency to the defined Terraform infrastructure resource.
- The Terraform plugin example read `terraform/workspace` from the current entity, but the component did not have that annotation. I added the annotation to the component and added a guard plus URL encoding before fetching workspace resources.
- The React state and table columns were untyped. I added a small `TerraformResource` type and typed `TableColumn` and `useState` accordingly.
- The GitHub Actions workflow only provided AWS credentials to the `terraform apply` step, but `terraform init` needs credentials for the S3 backend and `terraform plan` needs provider credentials. I moved the AWS credential environment variables to the job level.
- The Backstage Helm chart version was outdated relative to the current official chart, and the database connection omitted port and user settings. I updated the chart version to `2.7.0`, enabled namespace creation, and added explicit PostgreSQL connection port and user settings.

## Review Notes
- The Terraform examples still assume surrounding infrastructure such as VPC networking, security groups, subnet groups, reusable modules, and the central S3 state bucket already exist. That is acceptable for the article's template-focused scope, but a future revision could call out those assumptions more explicitly.
- For production GitHub Actions workflows, OIDC-based AWS authentication is preferable to long-lived access key secrets.
