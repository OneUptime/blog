# Validation Summary: How to Use Feature Branch Infrastructure with OpenTofu Workspaces

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu CLI workspaces
- OpenTofu S3 backend configuration
- HCL / OpenTofu configuration language
- GitHub Actions workflows
- AWS authentication in GitHub Actions with OIDC
- AWS ECS service configuration

## Sources Consulted
- [OpenTofu workspaces documentation](https://opentofu.org/docs/language/state/workspaces/)
- [OpenTofu managing workspaces documentation](https://opentofu.org/docs/cli/workspaces/)
- [OpenTofu `tofu init` documentation](https://opentofu.org/docs/cli/init/)
- [OpenTofu `tofu workspace select` documentation](https://opentofu.org/docs/cli/commands/workspace/select/)
- [OpenTofu `tofu workspace delete` documentation](https://opentofu.org/docs/cli/commands/workspace/delete/)
- [OpenTofu S3 backend documentation](https://opentofu.org/docs/language/settings/backends/s3/)
- [GitHub Actions workflow syntax documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions OIDC documentation](https://docs.github.com/en/actions/reference/security/oidc)
- [aws-actions/configure-aws-credentials README](https://github.com/aws-actions/configure-aws-credentials)
- [opentofu/setup-opentofu README](https://github.com/opentofu/setup-opentofu)

## Issues Found
1. **Workspace behavior was overstated**: The post said a separate workspace automatically creates resources completely separate from the main workspace. OpenTofu workspaces isolate state, but you still need workspace-specific names, tags, or other unique inputs to avoid collisions in the target platform. I corrected the explanation to reflect state isolation accurately.
2. **S3 backend path explanation was incorrect**: The post claimed the workspace name is appended automatically to the `key`. For the S3 backend, non-default workspaces use the path `<workspace_key_prefix>/<workspace_name>/<key>`. I fixed the backend example by using `key = "terraform.tfstate"` together with `workspace_key_prefix = "feature-env"` and updated the comment accordingly.
3. **CLI example omitted initialization**: The workspace commands were shown without `tofu init`, but OpenTofu requires an initialized working directory before normal operations. I added `tofu init` to the command example.
4. **Workspace naming and configuration logic did not match**: The configuration classified only `feature-*` workspaces as feature environments, but the CI example actually creates `pr-*` workspaces. That would have caused preview environments to fall back to the `default` sizing profile. I updated the workspace-type expression to recognize both `feature-*` and `pr-*` workspace names.
5. **GitHub Actions workflow was incomplete and would fail as written**: The workflow was missing the `id-token: write` permission required for OIDC-based AWS role assumption, did not run `tofu init`, used `opentofu/setup-opentofu@v1` instead of the current documented `@v2`, referenced an undefined `IMAGE_TAG`, and the destroy job omitted checkout, AWS credential setup, OpenTofu setup, and the `working-directory`. I corrected those issues and simplified workspace creation with `tofu workspace select -or-create`.

## Review Notes
- The post's overall approach is technically valid for ephemeral preview environments that share the same backend and access model.
- OpenTofu's documentation explicitly warns that workspaces are not the right tool for deployments that need separate credentials or stronger access isolation across environments.
- The `aws_ecs_service` snippet is acceptable as a partial example, but it relies on surrounding configuration not shown in the post.
- The local environment used for this review did not have the `tofu` CLI installed, so command validation was performed against the current official documentation and primary action READMEs.
