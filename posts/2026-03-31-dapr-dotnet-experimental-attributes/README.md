# How to Use Dapr .NET SDK Experimental Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, SDK, Experimental, API, Feature Flag

Description: Understand how Dapr .NET SDK experimental attributes work, how to opt in to preview APIs, and how to manage the associated upgrade risks in your projects.

---

## Overview

The Dapr .NET SDK marks certain APIs as experimental using the `[Experimental]` attribute from `System.Diagnostics.CodeAnalysis`. These APIs expose new Dapr building blocks that are functional but may change shape before they become stable. Understanding how to use and manage these attributes keeps your codebase intentional about preview feature adoption.

## Identifying Experimental APIs

Experimental APIs are decorated with the `[Experimental]` attribute and a diagnostic ID:

```csharp
// Example from Dapr SDK source
[Experimental("DAPR_CONVERSATION")]
public class DaprConversationClient
{
    // Conversation API - experimental until stabilized
}
```

When you use an experimental API without opting in, the compiler emits a warning:

```text
warning DAPR_CONVERSATION: 'DaprConversationClient' is for evaluation purposes only
and is subject to change or removal in future updates.
```

## Opting In to an Experimental API

Suppress the warning project-wide by adding the diagnostic ID to your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>DAPR_CONVERSATION</NoWarn>
</PropertyGroup>
```

Or suppress it at the call site to make the opt-in explicit and searchable:

```csharp
#pragma warning disable DAPR_CONVERSATION
builder.Services.AddDaprConversationClient();
#pragma warning restore DAPR_CONVERSATION
```

## Using the Dapr Conversation (AI) Experimental API

The conversation building block is currently experimental. Register it explicitly:

```csharp
using Dapr.AI.Conversation.Extensions;

var builder = WebApplication.CreateBuilder(args);

// This call produces DAPR_CONVERSATION until you suppress it
#pragma warning disable DAPR_CONVERSATION
builder.Services.AddDaprConversationClient();
#pragma warning restore DAPR_CONVERSATION
```

## Tracking Experimental Features in Your Team

Create a central file documenting each experimental opt-in to help your team manage upgrade risk:

```csharp
// ExperimentalFeatures.cs
// Opt-ins to Dapr experimental APIs
// Review before each Dapr SDK major upgrade

// DAPR_CONVERSATION - DaprConversationClient (added 2026-03-01)
// DAPR_CRYPTOGRAPHY - DaprClient cryptography APIs (added 2026-01-15)
```

## Checking Stability Before Upgrading

Before upgrading the Dapr .NET SDK, check the changelog for any experimental API graduation or breaking changes:

```bash
# Check the installed version
dotnet list package Dapr.Client

# Review the changelog
curl -s https://api.github.com/repos/dapr/dotnet-sdk/releases/latest \
  | jq '.body' | grep -i experimental
```

## Summary

Dapr .NET SDK experimental attributes use the standard .NET `[Experimental]` mechanism with Dapr-specific diagnostic IDs. By suppressing warnings explicitly at the call site and maintaining a central record of experimental opt-ins, teams can safely consume preview Dapr APIs while staying informed about the upgrade surface area before each SDK update.
