# Validation Summary: How to Use Workspaces with CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and workspaces
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Docker-based CI runners
- AWS OIDC-based role assumption

## Sources Consulted
- HashiCorp Terraform CLI docs: workspace select: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform CLI docs: apply: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform automation tutorial: https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- GitHub Actions workflow dispatch documentation: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
- actions/github-script README: https://github.com/actions/github-script
- GitLab Docker executor image entrypoint documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- GitLab CI/CD YAML optimization and anchors documentation: https://docs.gitlab.com/ci/yaml/yaml_optimization/
- Jenkins Pipeline Docker documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- The GitHub Actions PR comment example used unescaped Markdown fence backticks inside a JavaScript template literal in the `actions/github-script` step. This would terminate the template literal and cause a JavaScript syntax error. Escaped the Markdown backticks and added `await` to the API call.
- The GitLab CI example used the official `hashicorp/terraform:1.7` Docker image without overriding its `/bin/terraform` entrypoint. GitLab Runner expects to run the job script through a shell unless the image entrypoint is compatible, so the script would not run as shown. Changed the image declarations to use `entrypoint: [""]`.
- The Jenkins example used the same Terraform Docker image without clearing its entrypoint. Added `args '--entrypoint='` so Jenkins can run `sh` steps inside the container.

## Review Notes
- `terraform apply -auto-approve tfplan` is accepted, but Terraform ignores `-auto-approve` when a saved plan file is supplied because passing the plan file is treated as approval.
- Terraform was not installed locally, so Terraform CLI behavior was checked against official documentation and the official `hashicorp/terraform:1.7` Docker image.
