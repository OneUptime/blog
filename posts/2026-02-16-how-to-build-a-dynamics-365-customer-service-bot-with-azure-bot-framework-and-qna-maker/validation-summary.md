# Validation Summary: How to Build a Dynamics 365 Customer Service Bot with Azure Bot Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dynamics 365 Customer Service
- Dataverse Web API
- Azure Bot Framework SDK
- Azure Bot Service
- Azure AI Language custom question answering
- Azure AI Search
- Dynamics 365 Omnichannel
- Azure CLI
- C#

## Sources Consulted
- Microsoft Learn: QnA Maker resource setup and retirement notice: https://learn.microsoft.com/en-us/azure/ai-services/qnamaker/how-to/set-up-qnamaker-service-azure
- Microsoft Learn: Custom question answering quickstart for Azure AI Language: https://learn.microsoft.com/en-us/azure/ai-services/language-service/question-answering/quickstart/sdk
- Microsoft Learn: QuestionAnsweringClient.GetAnswersAsync API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.ai.language.questionanswering.questionansweringclient.getanswersasync
- Microsoft Learn: Custom question answering authoring import API: https://learn.microsoft.com/en-us/rest/api/language/question-answering-authoring/question-answering-projects/import
- Microsoft Learn: Azure CLI `az cognitiveservices account create`: https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/account
- Microsoft Learn: Azure CLI `az bot create` and channel commands: https://learn.microsoft.com/en-us/cli/azure/bot
- Microsoft Learn: Bot Framework handoff to human guidance: https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-pattern-handoff-human
- Microsoft Learn: Integrate an Azure agent with Dynamics 365 Customer Service Omnichannel: https://learn.microsoft.com/en-gb/dynamics365/customer-service/administer/configure-bot-azure
- Microsoft Learn: Manage context variables in Dynamics 365 Customer Service: https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/manage-context-variables
- Microsoft Learn: Dynamics 365 Case (Incident) table reference: https://learn.microsoft.com/en-us/dynamics365/developer/reference/entities/incident
- Microsoft Learn: Create a Dataverse table row with the Web API: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api

## Issues Found
- QnA Maker was used as the FAQ service for a new 2026 tutorial. Microsoft documentation says new QnA Maker resources can no longer be created and QnA Maker has been replaced by Azure AI Language custom question answering. I updated the title, tags, description, architecture, setup section, C# client usage, and wrap-up text to use Azure AI Language custom question answering.
- The QnA Maker resource creation command used `--kind QnAMaker`, which is not valid for new resources. I replaced it with a Language resource (`--kind TextAnalytics`) and included the custom question answering Azure AI Search API properties required by Microsoft documentation.
- The bot code used a `QnAMakerClient` pattern that does not match the current Azure AI Language client library. I changed the sample to use `QuestionAnsweringClient`, `QuestionAnsweringProject`, `GetAnswersAsync`, and answer confidence scores.
- The FAQ data used the older `qnaList` and name/value metadata array shape. I changed it to the current custom question answering import shape with `assets.qnas` and object metadata.
- The case-number validation assumed all Dynamics 365 case numbers start with `CAS-`. Dynamics 365 ticket-number prefixes are environment-specific, so I changed the prompt and validation to avoid hardcoding that prefix.
- The incident status-code mapping used inaccurate labels for current Dataverse incident status reasons. I updated the standard mappings, including Waiting for Details, Researching, Problem Solved, Cancelled, Information Provided, and Merged.
- The Dataverse sample interpolated user-controlled values directly into OData string literals. I added single-quote escaping for case numbers and email addresses.
- The case creation sample did not check the contact lookup response and could attempt to create an incident without the required customer binding. I added response validation and a clear failure when no contact is found.
- The sample described `caseorigincode = 3` as chat origin. The standard Dynamics 365 value is Web, so I corrected the comment and noted that chat should use a configured custom option if needed.
- The sample read the created case ID from `Location`; Dataverse documents the created-row URI in the `OData-EntityId` header. I updated the code to read `OData-EntityId`.
- The Omnichannel configuration steps referenced older admin center navigation. I updated them to the current Azure agent, Power Platform admin center, and Copilot Service admin center flow documented by Microsoft.
- The Azure Bot CLI command used obsolete or invalid arguments for current `az bot create`, including `--kind webapp` and `--password`, and omitted required `--app-type`. I updated it for a user-assigned managed identity bot resource, which aligns with current Omnichannel guidance.
- The post used `az bot webchat create`, which is not a current Azure CLI command. I removed it and kept the Teams channel CLI command.

## Review Notes
The post is now technically aligned with current Microsoft documentation. The code remains an illustrative blog snippet rather than a complete compilable project because supporting types such as `ConversationData`, `CaseInfo`, `DataverseResponse`, dependency injection setup, authentication handlers, and Azure resource provisioning for the App Service are outside the snippet.
