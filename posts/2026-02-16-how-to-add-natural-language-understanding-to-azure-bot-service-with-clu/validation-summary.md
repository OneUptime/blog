# Validation Summary: How to Add Natural Language Understanding to Azure Bot Service with CLU

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bot Service
- Bot Framework SDK for Python
- Azure AI Language
- Conversational Language Understanding (CLU)
- Azure AI Language Conversations client library for Python
- Python

## Sources Consulted
- Microsoft Learn: Language understanding in Bot Service, https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-luis?view=azure-bot-service-4.0
- Microsoft Learn: Event-driven conversations using an activity handler, https://learn.microsoft.com/en-us/azure/bot-service/bot-activity-handler-concept?view=azure-bot-service-4.0
- Microsoft Learn: Train a conversational language understanding model, https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/how-to/train-model
- Microsoft Learn: Conversational language understanding limits, https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/service-limits
- Microsoft Learn: None intent, https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/concepts/none-intent
- Microsoft Learn: Entity components in conversational language understanding, https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/concepts/entity-components
- Microsoft Learn: ConversationAnalysisClient class for Python, https://learn.microsoft.com/en-us/python/api/azure-ai-language-conversations/azure.ai.language.conversations.conversationanalysisclient?view=azure-python
- Microsoft Learn: Analyze Conversations REST API, https://learn.microsoft.com/en-us/rest/api/language/analyze-conversations/analyze-conversations/analyze-conversations?view=rest-language-analyze-conversations-2024-11-01

## Issues Found
- The post said the free tier allows 5,000 text records per month. Microsoft Learn's CLU limits document describes the free quota as 5,000 prediction calls per month, so the wording was corrected.
- The post listed `None` alongside custom intents in a way that implied the reader should create it. CLU projects include a required default `None` intent, so the wording was changed to identify it as the default fallback and to say to add each custom intent.
- The post used the older shorthand "learned entity." Microsoft Learn describes CLU entities as having components, including learned and list components, so the wording was adjusted to "entity with a learned component."
- The post claimed Standard training provides better accuracy than Advanced for most scenarios. Microsoft Learn states Standard training is faster and free for English projects, while Advanced training generally provides better model quality and multilingual support, so that guidance was corrected.

## Review Notes
The Python SDK request and response handling matches the documented `ConversationAnalysisClient.analyze_conversation` payload shape and CLU prediction response fields. The Bot Framework `on_message_activity` override is consistent with the Python SDK docs. The Bot Framework SDK is archived and no longer maintained, with Microsoft recommending newer agent SDKs for new development, but the post remains technically valid for existing Azure Bot Service/Bot Framework bots.
