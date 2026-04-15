# Validation Summary: How to Use Dapr AI Integration with .NET SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Conversation building block / Conversation API)
- .NET / ASP.NET Core
- Dapr .NET SDK (`Dapr.AI`, `Dapr.Client` NuGet packages)
- OpenAI (via Dapr conversation component)
- Azure OpenAI (via Dapr conversation component)
- Dapr CLI

## Sources Consulted
- Dapr official documentation (https://docs.dapr.io) — Conversation API / building block reference
- Dapr .NET SDK GitHub repository (https://github.com/dapr/dotnet-sdk) — source code for `DaprConversationClient`, `ConversationInput`, `ConversationOptions`, `ConversationResponse`, and related types
- NuGet package registry — verified `Dapr.AI` package existence (version 1.17.8)
- Dapr component reference for `conversation.openai` and `conversation.anthropic`

## Issues Found

1. **Incorrect building block name**: The post referred to the "AI building block" throughout. The official Dapr name is the "Conversation building block" (or "Conversation API"). Fixed all references.

2. **Wrong `ConverseAsync` method signature**: The post called `client.ConverseAsync("openai-llm", new[] { new ConversationInput(...) })` with the component name as the first string parameter. The actual signature is `ConverseAsync(IReadOnlyList<ConversationInput> inputs, ConversationOptions options, CancellationToken cancellationToken)` where the component name is passed via `ConversationOptions`. Fixed the code to use the correct signature.

3. **Wrong `ConversationInput` constructor**: The post used `new ConversationInput(req.Prompt, ConversationRole.User)`. `ConversationInput` actually takes `IReadOnlyList<IConversationMessage>`, and `ConversationRole` does not exist as a type. Messages are constructed using typed classes like `UserMessage`, `SystemMessage`, etc. Fixed to use `new ConversationInput(new IConversationMessage[] { new UserMessage(req.Prompt) })`.

4. **Wrong response property chain**: The post used `response.Outputs.First().Result`. `ConversationResponseResult` does not have a `Result` property. The correct path is `response.Outputs.First().Choices.First().Message.Content` (through `Choices` → `ConversationResultChoice` → `Message` → `Content`). Fixed.

5. **Fabricated `ConverseStreamAsync` method**: The entire "Streaming Responses" section used a `ConverseStreamAsync` method with `chunk.Delta` that does not exist in the Dapr .NET SDK. The Conversation API does not currently support streaming. Replaced the section with a note that streaming is not currently supported.

6. **Wrong Azure OpenAI component type**: The post used `type: conversation.azure.openai` which does not exist. Azure OpenAI is configured using the same `conversation.openai` component type with additional metadata: `apiType: "azure"`, `endpoint`, and `apiVersion`. Fixed the YAML to use the correct configuration.

7. **Summary referenced streaming**: The summary mentioned "streaming and synchronous conversation APIs." Since streaming is not supported, updated to reference only the synchronous API.

## Review Notes
- The `AddDaprConversationClient()` extension method is marked with the `[Experimental]` attribute in the Dapr .NET SDK, indicating the Conversation API is still in preview. Readers should be aware that API surfaces may change in future releases.
- The `conversation.anthropic` component type referenced in the text (swapping to Anthropic) is valid and confirmed in Dapr documentation.
- The `secretKeyRef` syntax used in the OpenAI component YAML is a valid Kubernetes/Dapr pattern for referencing secrets, though the official Dapr docs typically show the `value` field directly with a recommendation to use a separate secret store.
