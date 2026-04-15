# Validation Summary: How to Use Dapr .NET SDK Experimental Attributes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr .NET SDK
- C# `[Experimental]` attribute (`System.Diagnostics.CodeAnalysis`)
- .NET project configuration (`.csproj` `<NoWarn>`)
- Dapr Conversation (AI) building block
- ASP.NET Core dependency injection

## Sources Consulted
- Dapr .NET SDK source code (https://github.com/dapr/dotnet-sdk) — verified `[Experimental]` attribute usage across `src/` directory
- `src/Dapr.AI/Conversation/Extensions/DaprAiConversationBuilderExtensions.cs` — confirmed `AddDaprConversationClient()` exists with `[Experimental("DAPR_CONVERSATION")]`
- `src/Dapr.Workflow/DaprWorkflowClient.cs` — confirmed class exists but is NOT marked `[Experimental]` and has an internal constructor
- Microsoft .NET documentation for `System.Diagnostics.CodeAnalysis.ExperimentalAttribute`

## Issues Found

1. **Wrong diagnostic IDs throughout**: The post used `DAPR001` and `DAPR0001` as experimental diagnostic IDs. The Dapr .NET SDK actually uses descriptive string IDs: `DAPR_CONVERSATION`, `DAPR_CRYPTOGRAPHY`, `DAPR_DISTRIBUTEDLOCK`, `DAPR_JOBS`. Neither `DAPR001` nor `DAPR0001` exists anywhere in the SDK. Fixed all occurrences to use the correct IDs.

2. **`DaprWorkflowClient` is not experimental**: The post used `DaprWorkflowClient` as the primary example of an `[Experimental]`-decorated class. In reality, `DaprWorkflowClient` does NOT have the `[Experimental]` attribute — the Workflow package uses alpha version suffixes instead. Replaced the example with `DaprConversationClient`, which is genuinely marked `[Experimental("DAPR_CONVERSATION")]`.

3. **Incorrect `DaprWorkflowClient` constructor usage**: The post showed `new DaprWorkflowClient(daprClient)`, but `DaprWorkflowClient` has an internal constructor that takes a `WorkflowClient`, not a `DaprClient`. Users obtain it via dependency injection, not direct instantiation. Replaced with `builder.Services.AddDaprConversationClient()` which is the verified DI registration pattern.

4. **Updated tracking section**: Changed the example experimental feature registry to list `DAPR_CONVERSATION` and `DAPR_CRYPTOGRAPHY` (both real experimental diagnostic IDs) instead of the fabricated `DAPR001` and `DAPR0001`.

## Review Notes
- The general concepts in the post are sound: the Dapr .NET SDK does use the standard .NET `[Experimental]` mechanism, and the `#pragma warning disable` / `<NoWarn>` suppression approaches are correct.
- The `AddDaprConversationClient()` method and `Dapr.AI.Conversation.Extensions` namespace were verified to exist and are correctly described.
- The `dotnet list package` and GitHub API commands in the "Checking Stability" section are syntactically correct.
- The Dapr .NET SDK has additional experimental APIs beyond what the post covers (cryptography, distributed lock, jobs), but the post is not obligated to be exhaustive.
