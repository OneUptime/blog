# Validation Summary: How to Build a Product Recommendation Engine with Azure Personalizer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Personalizer
- Azure AI services / Cognitive Services resources
- Azure CLI
- Python
- Azure SDK for Python
- Flask
- Contextual bandits and reinforcement learning

## Sources Consulted
- Microsoft Learn: Configure Personalizer, including service retirement and loop settings: https://learn.microsoft.com/en-us/azure/ai-services/personalizer/how-to-settings
- Microsoft Learn: Create a Personalizer resource with Azure CLI: https://learn.microsoft.com/en-us/azure/ai-services/personalizer/how-to-create-resource
- Microsoft Learn: Azure AI Personalizer Python `PersonalizerClient`: https://learn.microsoft.com/en-us/python/api/azure-ai-personalizer/azure.ai.personalizer.personalizerclient
- Microsoft Learn: Azure Personalizer Python quickstart: https://learn.microsoft.com/en-us/azure/ai-services/personalizer/quickstart-personalizer-sdk
- Microsoft Learn: Add Personalizer to a web app, including `rewardActionId` and Rank response semantics: https://learn.microsoft.com/en-us/azure/ai-services/personalizer/tutorial-use-personalizer-web-app
- Microsoft Learn: Personalizer action and context features: https://learn.microsoft.com/en-us/azure/ai-services/personalizer/concepts-features
- Microsoft Learn: Azure CLI `az cognitiveservices account` reference: https://learn.microsoft.com/cli/azure/cognitiveservices/account

## Issues Found
- The post instructed readers to create a new Azure Personalizer resource. Microsoft documentation says new Personalizer resources cannot be created after September 20, 2023, and the service retires on October 1, 2026. I changed the setup step to use an existing resource and added the retirement caveat.
- The post treated the single-slot Rank API response as a top-5 ordered recommendation list. Microsoft guidance says the `rewardActionId` is the action to display, while the returned ranking is for analysis. I updated the explanation, diagram, and Flask endpoint to return one selected recommendation.
- The Python sample used the older `azure.cognitiveservices.personalizer` client and passed a `RewardRequest` object where the current `azure.ai.personalizer` client expects JSON-style request bodies. I updated the imports, client initialization, Rank request, response access, and Reward call to the current Azure SDK shape.
- The Step 4 code used `os.environ` without importing `os`. I added the missing import.
- The Flask snippet used `datetime.utcnow()` without importing `datetime`. I added the missing import.
- The reward comment said clicks were worth `0.1`, while the reward scheme and endpoint used `0.2`. I made the comment consistent.
- The context feature examples mentioned user location broadly. Microsoft guidance warns against individually specific features, so I changed this to coarse region.
- The original model update frequency recommendation used 5 minutes, but official configuration guidance lists 15 minutes as the high-frequency setting for live changing behavior. I changed the recommendation to 15 minutes.

## Review Notes
The Azure CLI is not installed in the local environment, so CLI validation was performed against Microsoft Learn rather than local `az --help` output. The corrected post is still useful only for teams with an existing Personalizer resource before the October 1, 2026 retirement date.
