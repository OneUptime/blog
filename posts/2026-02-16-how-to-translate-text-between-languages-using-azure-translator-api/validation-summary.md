# Validation Summary: How to Translate Text Between Languages Using Azure Translator API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Translator
- Translator Text REST API v3.0
- Python
- Python requests library
- Language detection
- Transliteration

## Sources Consulted
- Microsoft Learn: Quickstart: translate text programmatically - https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/quickstart/rest-api
- Microsoft Learn: Translator - Translate REST API v3.0 - https://learn.microsoft.com/en-us/rest/api/translator/translator/translate?view=rest-translator-v3.0
- Microsoft Learn: Azure Translator service limits - https://learn.microsoft.com/en-us/azure/ai-services/translator/service-limits
- Microsoft Learn: Translator - Detect REST API v3.0 - https://learn.microsoft.com/en-us/rest/api/translator/translator/detect?view=rest-translator-v3.0
- Microsoft Learn: Translator - Transliterate REST API v3.0 - https://learn.microsoft.com/en-us/rest/api/translator/translator/transliterate?view=rest-translator-v3.0
- Microsoft Learn: Translator - Languages REST API v3.0 - https://learn.microsoft.com/en-us/rest/api/translator/translator/languages?view=rest-translator-v3.0
- Microsoft Azure: Azure Translator pricing - https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator
- Microsoft Learn: Azure Translator FAQ - https://learn.microsoft.com/en-us/azure/ai-services/translator/faq

## Issues Found
- The authentication explanation said the Translator API always requires a region header. Microsoft documents the region header as required for regional Translator resources and Azure AI multi-service resources, but optional for a single-service global Translator resource. Updated the wording to distinguish these cases.
- The batch translation section stated a limit of 100 elements and 10,000 characters for translate requests. Current Microsoft service limits document up to 1,000 elements and 50,000 characters per translate request, with the request size counted across all target languages. Updated the prose and docstring.
- The helper class enforced a 9,500-character and 100-element batching threshold based on the outdated limits. Updated it to use a conservative 49,000-character threshold and 1,000-element maximum.
- The pricing section said characters are counted in the source text but did not mention that multi-target requests are counted once per target language. Updated the wording to match Microsoft billing documentation.

## Review Notes
The code examples use current Translator REST API v3.0 endpoints and request shapes. The examples use subscription key authentication; production applications should store the key outside source code, such as in Azure Key Vault or environment-based secret management.
