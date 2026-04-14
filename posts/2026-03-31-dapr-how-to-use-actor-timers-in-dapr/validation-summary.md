# Validation Summary: How to Use Actor Timers in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET Actor SDK (`Dapr.Actors.Runtime`)
- Dapr Python Actor SDK (`dapr.actor`)
- Dapr HTTP Actor API (`v1.0/actors`)
- C# / .NET
- Python

## Sources Consulted
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actors timers and reminders: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/
- Dapr .NET Actors How-to Guide: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/
- Dapr .NET Actors Usage Guide: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET SDK source - Actor.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/Actor.cs
- Dapr .NET SDK source - ActorStateManager.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/ActorStateManager.cs
- Dapr Python SDK source - actor.py: https://github.com/dapr/python-sdk/blob/main/dapr/actor/runtime/actor.py
- Dapr Python SDK - Demo actor example: https://github.com/dapr/python-sdk/blob/main/examples/demo_actor/demo_actor/demo_actor.py

## Issues Found
1. **`.NET RegisterTimerAsync` named parameter error (line 39)**: The third parameter of `RegisterTimerAsync` was written as `state: null`, but the actual SDK parameter name is `callbackParams`. Using `state:` as a named argument would cause a C# compile error. Fixed to `callbackParams: null`.

## Review Notes
- The HTTP API timer duration format used (`"0h0m5s0ms"`) is correct but verbose. Simpler Go duration formats like `"5s"` and `"1m"` are equally valid and more readable. Not changed since the current format is not incorrect.
- The .NET callback parameter is conventionally named `data` rather than `state` in official Dapr examples, but since it is a positional parameter in the callback method signature, this is cosmetic and does not affect functionality.
- The `callback` field in the HTTP API request body appears in official curl examples but is not listed in the formal parameters table in the docs. It works correctly.
- All timer vs. reminder behavioral claims are accurate per official Dapr documentation.
- The Python code correctly passes `self.refresh_callback` as a method reference (not a string), which matches the SDK's expected `TIMER_CALLBACK` callable type.
