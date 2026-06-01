# Validation Summary: How to Build a GraphQL API with NestJS and Deploy to Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NestJS
- GraphQL
- Apollo Server
- TypeScript
- Node.js
- class-validator and class-transformer
- Docker
- Azure CLI
- Azure Container Registry
- Azure Container Apps

## Sources Consulted
- NestJS GraphQL quick start: https://docs.nestjs.com/graphql/quick-start
- NestJS validation documentation: https://docs.nestjs.com/techniques/validation
- Azure CLI `az group` documentation: https://learn.microsoft.com/en-us/cli/azure/group?view=azure-cli-latest
- Azure CLI `az acr` documentation: https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest
- Azure CLI `az containerapp` documentation: https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest
- Azure Container Apps scaling documentation: https://learn.microsoft.com/en-gb/azure/container-apps/scale-app?pivots=azure-cli
- Azure Container Apps scaling tutorial: https://learn.microsoft.com/en-us/azure/container-apps/tutorial-scaling
- Azure Container Apps managed identity and private registry documentation: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity

## Issues Found
- The GraphQL dependency installation command was missing `@as-integrations/express5`, which is listed in the current NestJS Apollo installation command. Added it to the install command.
- The service used `uuid` but the setup commands did not install it. Added `uuid` to the utility dependency installation command.
- The DTOs used `class-validator` decorators, but the application did not enable NestJS `ValidationPipe`, so those decorators would not run automatically. Added a minimal `src/main.ts` snippet enabling `app.useGlobalPipes(new ValidationPipe())`.
- The GraphQL module enabled `playground: true`, but NestJS documentation now warns that the default Apollo playground is deprecated and recommends `graphiql: true`. Replaced the option and updated the testing text from GraphQL Playground to GraphiQL.
- The pagination section described the implementation as cursor-based, but the code used `offset` and `limit`. Changed the wording to offset-based pagination.
- The Azure deployment commands assumed an existing resource group and Azure Container Registry. Added `az group create` and `az acr create` commands so the sequence is complete.
- The Container Apps deployment referenced a private ACR image without registry authentication settings. Added `--registry-server`, `--registry-username`, and `--registry-password` using `az acr credential show` so the container app can pull the image.

## Review Notes
The post still uses an in-memory store, which is acceptable for a tutorial but is not production-persistent. The article already notes that this should be replaced with a real database in production.
