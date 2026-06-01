# Validation Summary: How to Build a GraphQL API with Strawberry in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Strawberry GraphQL
- FastAPI
- Uvicorn
- Docker
- Azure Container Registry
- Azure App Service
- Azure CLI

## Sources Consulted
- Strawberry FastAPI integration documentation: https://beta.strawberry.rocks/docs/integrations/fastapi
- Strawberry schema documentation: https://beta.strawberry.rocks/docs/types/schema
- Strawberry input types documentation: https://beta.strawberry.rocks/docs/types/input-types
- Strawberry union types documentation: https://beta.strawberry.rocks/docs/types/union
- Strawberry DataLoaders documentation: https://beta.strawberry.rocks/docs/guides/dataloaders
- Strawberry error handling guide: https://beta.strawberry.rocks/docs/guides/errors
- Microsoft Learn, Azure CLI `az acr build`: https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest#az-acr-build
- Microsoft Learn, Azure CLI `az appservice plan create`: https://learn.microsoft.com/en-us/cli/azure/appservice/plan?view=azure-cli-latest#az-appservice-plan-create
- Microsoft Learn, Azure CLI `az webapp create`: https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest#az-webapp-create
- Microsoft Learn, Azure App Service custom container port configuration: https://learn.microsoft.com/en-us/azure/app-service/tutorial-custom-container
- Microsoft Learn, Azure App Service Health check: https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check

## Issues Found
- The `update_book` mutation used `strawberry.types.copy_with`, which is not available in the current Strawberry package. Replaced it with Python's `dataclasses.replace`, which works with Strawberry's dataclass-style types.
- The error-handling example used the old `strawberry.union("BookResult", types=[...])` API shape. Updated it to the current documented `Annotated[..., strawberry.union("BookResult")]` pattern.
- The DataLoader example referenced `Author` in the function annotation without importing it. Added the import and updated the return type to `list[Author | None]` because `authors_db.get()` can return `None`.
- The local testing section called the browser UI the GraphQL playground. Strawberry's FastAPI router defaults to GraphiQL, so the wording was corrected.
- The Azure App Service deployment command used the deprecated `--deployment-container-image-name` option. Replaced it with `--container-image-name`.
- The Docker container listens on port 8000, but the App Service deployment steps did not configure App Service to route traffic to that custom container port. Added `az webapp config appsettings set --settings WEBSITES_PORT=8000`.

## Review Notes
The corrected Strawberry snippets were executed against the current `strawberry-graphql[fastapi]` package. Schema creation, the sample query, create mutation, update mutation, DataLoader import, and the typed union error example all passed.
