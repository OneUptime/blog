# Validation Summary: How to Manage Portainer with Pulumi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Pulumi
- TypeScript
- Node.js
- Axios
- Infrastructure as Code

## Sources Consulted
- Pulumi installation docs: https://www.pulumi.com/docs/install
- Pulumi TypeScript/Node.js docs: https://www.pulumi.com/docs/iac/languages-sdks/javascript/
- Pulumi configuration docs: https://www.pulumi.com/docs/iac/concepts/config/
- Pulumi dynamic providers docs: https://www.pulumi.com/docs/iac/concepts/providers/dynamic-providers/
- Pulumi `dynamic.Resource` API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/dynamic.Resource.html
- Pulumi `Config` API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/Config.html
- Pulumi `pulumi stack select` CLI docs: https://www.pulumi.com/docs/cli/commands/pulumi_stack_select/
- Pulumi `pulumi login` CLI docs: https://www.pulumi.com/docs/reference/cli/pulumi_login/
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml

## Issues Found
- The post said to use a Portainer API access token, but the sample client actually authenticated with username/password and a JWT. I changed the code to use an API key consistently via the `X-API-KEY` header, which matches Portainer's current access-token workflow.
- The Pulumi dynamic resource example passed `config.requireSecret(...)` values into places typed as plain `string`. In the Node.js SDK, `requireSecret` returns an `Output<string>`, so I moved `portainerUrl` and `portainerApiKey` into the resource inputs and updated the argument types to accept Pulumi inputs correctly.
- The Portainer stack deletion example called `DELETE /stacks/{id}` without the required `endpointId` query parameter. I fixed the helper to send `endpointId` for delete operations and added update support using Portainer's stack update endpoint.
- The deployment commands treated Pulumi config as if it were global, but stack config is stack-scoped by default. I changed the workflow to create/select each stack first, then set its config values before previewing and deploying.
- The deployment commands omitted `appSecret`, even though the main program required it. I added that missing config key.
- The article metadata and setup commands implied a Python path, but all implementation examples were TypeScript and used npm-based dependencies. I corrected the description, prerequisites, and initialization commands to match the actual code.

## Review Notes
- The code examples are now internally consistent and aligned with the verified Pulumi and Portainer APIs.
- The `rejectUnauthorized: false` HTTPS setting remains acceptable only for development or other controlled environments with self-signed certificates.
