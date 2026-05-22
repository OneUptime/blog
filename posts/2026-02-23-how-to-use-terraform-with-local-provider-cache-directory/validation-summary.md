# Validation Summary: How to Use Terraform with Local Provider Cache Directory

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform provider plugin cache
- Terraform CLI configuration files
- Terraform provider installation mirrors
- Terraform dependency lock files
- Docker and Docker Compose
- Jenkins Pipeline

## Sources Consulted
- HashiCorp Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform providers mirror command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- HashiCorp Terraform plugin management documentation: https://developer.hashicorp.com/terraform/cli/plugins
- Jenkins Pipeline basic steps documentation: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- Jenkins Declarative Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- The post described plugin-cache installation as always creating a symbolic link from `.terraform/providers/` to the cached binary. HashiCorp documents that Terraform copies the provider from the cache and uses symbolic links only when possible. Updated the internal workflow and verification text to say Terraform may either copy or symlink.
- The post implied that a plugin cache enables offline operation. HashiCorp documents that Terraform still uses configured or implied installation methods to obtain provider metadata before checking the cache. Updated the tags and description to avoid presenting plugin cache as offline mode.
- The Jenkins example used `stash` in a `post` block to persist the cache between builds. Jenkins documents `stash` as a mechanism for files used later in the same Pipeline run, with stashes unavailable to other runs by default. Removed the misleading stash block and left the workspace cache setup.
- The shared team cache section did not mention Terraform's documented concurrency caveat. Added a note that plugin cache behavior is undefined with multiple concurrent `terraform init` calls, so shared writable caches should avoid concurrent writes or serialize initialization.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was checked against official documentation rather than local `terraform --help` output. Performance timing examples are plausible but environment-dependent.
