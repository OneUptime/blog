# Validation Summary: How to Build a Chatbot with Azure Bot Service and Azure OpenAI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bot Service
- Azure OpenAI in Azure AI Foundry
- Bot Framework SDK for Python
- Bot Framework Emulator
- Python
- aiohttp
- Azure App Service
- Azure CLI
- Azure Cosmos DB storage for Bot Framework state
- OpenAI Python SDK

## Sources Consulted
- Microsoft Learn: Provision and publish a bot in Azure: https://learn.microsoft.com/en-us/azure/bot-service/provision-and-publish-a-bot?view=azure-bot-service-4.0
- Microsoft Learn: Work with chat completions models for Azure OpenAI in Microsoft Foundry: https://learn.microsoft.com/azure/ai-services/openai/how-to/chatgpt
- Microsoft Learn: Azure OpenAI v1 API lifecycle and code changes: https://learn.microsoft.com/en-us/azure/ai-services/openai/api-version-lifecycle
- Microsoft Learn: Configure Linux Python apps for Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-language-python
- Microsoft Learn: Azure CLI `az webapp` reference: https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest
- Microsoft Learn: Bot Framework storage with Cosmos DB and Blob storage: https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-howto-v4-storage?view=azure-bot-service-4.0
- Microsoft Bot Framework SDK GitHub repository: https://github.com/microsoft/botframework-sdk
- PyPI package metadata for `botbuilder-core` and `botbuilder-azure`: https://pypi.org/project/botbuilder-core/ and https://pypi.org/project/botbuilder-azure/

## Issues Found
- The post recommended creating a Multi Tenant Azure Bot resource. Microsoft documentation says new multi-tenant bot creation is deprecated after July 31, 2025, so the post now recommends Single Tenant and records the tenant ID.
- The post omitted the current Bot Framework SDK and Emulator archival status. I added a short prerequisite note that Microsoft recommends the Microsoft 365 Agents SDK for new greenfield bots, while this tutorial remains focused on Bot Framework SDK v4.
- The post referred to Azure OpenAI Studio. Current Microsoft documentation uses the Azure AI Foundry portal, so I updated that wording.
- The Azure OpenAI sample hardcoded endpoint, key, API version, and deployment name despite saying configuration came from environment variables. I changed the sample to read `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT`.
- The Azure OpenAI sample used the older Azure-specific client/API-version style. Current Azure OpenAI v1 guidance supports the standard OpenAI client with an Azure `/openai/v1/` base URL, so I updated the sample accordingly.
- The bot adapter sample hardcoded Microsoft App credentials and did not pass the tenant ID needed for single-tenant bots. I changed it to read `MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`, and `MICROSOFT_APP_TENANT_ID`, then pass `channel_auth_tenant`.
- The local Emulator instructions conflicted with the single-tenant bot guidance. I changed the local test to use blank bot credentials and noted that single-tenant authentication should be tested after deployment with Azure Bot Service Test in Web Chat.
- The App Service sample hardcoded port `3978`. I changed it to read the `PORT` environment variable with `3978` as the local fallback.
- The App Service deployment omitted a resource group creation step. I added `az group create` before the App Service commands.
- The App Service deployment did not configure a startup command for the aiohttp app. I added `az webapp config set --startup-file "python app.py"`.
- The app settings used `AZURE_OPENAI_KEY`, but the OpenAI SDK and Microsoft docs use `AZURE_OPENAI_API_KEY`. I corrected the setting name.
- The Cosmos DB state snippet imported `botbuilder.azure` without installing `botbuilder-azure`. I added `botbuilder-azure` to the install command and `requirements.txt`.

## Review Notes
The tutorial is technically valid after the fixes. The Bot Framework SDK path is now best treated as a maintenance or compatibility path because Microsoft has archived the SDK and Emulator; future greenfield tutorials should consider Microsoft 365 Agents SDK or Teams SDK depending on the target channel.
