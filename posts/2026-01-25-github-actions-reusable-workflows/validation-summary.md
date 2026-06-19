# Validation Summary: How to Create Reusable Workflows in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Reusable workflows
- Workflow templates
- GitHub Actions workflow YAML
- GitHub Actions contexts, inputs, outputs, secrets, permissions, and matrices
- Node.js CI examples
- Git tags for workflow versioning

## Sources Consulted
- GitHub Docs: Reuse workflows - https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Reusing workflow configurations - https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Creating workflow templates for your organization - https://docs.github.com/en/actions/how-tos/reuse-automations/create-workflow-templates
- GitHub Docs: Sharing actions and workflows with your organization - https://docs.github.com/en/actions/how-tos/reuse-automations/share-with-your-organization
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Marketplace / actions/setup-node documentation - https://github.com/marketplace/actions/setup-node-js-environment
- GitHub actions/setup-node advanced usage - https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md
- GitHub actions/checkout releases - https://github.com/actions/checkout/releases
- Node.js previous releases - https://nodejs.org/en/about/previous-releases

## Issues Found
- The examples used Node.js 20, which is EOL as of the review date. Updated the Node.js examples to use Node.js 24, which is current LTS.
- The examples used `actions/checkout@v4` and `actions/setup-node@v4`, while current official examples and releases use v6. Updated those action references to v6.
- The debugging section claimed to enable debug logging but only showed a workflow call with a placeholder comment. Reworded it to describe adding debug output and kept the example technically accurate.
- The debug example printed the full `github` context, which GitHub warns can include sensitive values such as `github.token`. Changed it to print specific fields instead.
- The limitations section said reusable workflows can nest only 4 levels deep. GitHub now documents up to 10 workflow levels including the top-level caller, so this was corrected.
- The limitations section said private reusable workflows are only accessible within the same organization. Reworded this as an access-control caveat because private workflow reuse depends on repository Actions access settings.
- The limitations section said workflow-level environment variables must be set at job or step level. GitHub supports workflow-level `env`, but workflow-level env values are not propagated between caller and called workflows. Corrected the claim.
- The limitations section said matrix strategies cannot be used directly with reusable workflow calls. GitHub now supports matrix jobs that call reusable workflows, so this was corrected and the workaround label was changed to a matrix example.
- The matrix example used Node.js 18 and 20. Updated it to supported Node.js versions 22 and 24.

## Review Notes
The workflow examples are illustrative and assume project-specific npm scripts, coverage output, Docker build context, and artifact URL generation exist. Those assumptions are acceptable for a reusable workflow tutorial, but production examples should also pin third-party actions by SHA where stronger supply-chain security is required.
