# Validation Summary: How to Use Dapr .NET SDK Roslyn Analyzers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (`Dapr.Actors`, `Dapr.Actors.Analyzers`)
- Roslyn Analyzers (.NET Compiler Platform)
- C# / .NET
- MSBuild / dotnet CLI

## Sources Consulted
- Dapr .NET SDK GitHub repository (https://github.com/dapr/dotnet-sdk), specifically `src/Dapr.Actors.Analyzers/` directory and `AnalyzerReleases.Shipped.md`
- NuGet package listing for Dapr.Actors (https://www.nuget.org/packages/Dapr.Actors/)
- NuGet package listing for Dapr.Actors.Analyzers (https://www.nuget.org/packages/Dapr.Actors.Analyzers/)
- Dapr Actors .NET SDK documentation (https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/)
- Microsoft Learn: dotnet build command reference (https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build)
- Microsoft Learn: C# Compiler Options for Errors and Warnings (https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings)

## Issues Found

### 1. Wrong package for analyzers (Critical)
**What was wrong:** The post stated that analyzers are "included automatically when you install the Dapr Actor package" (`Dapr.Actors`). In reality, the analyzers are a separate NuGet package called `Dapr.Actors.Analyzers` that must be installed independently.
**What was changed:** Updated the installation section to show both `Dapr.Actors` and `Dapr.Actors.Analyzers` as separate install commands, and clarified that the analyzer package is separate.

### 2. Fabricated diagnostic IDs and analyzer behaviors (Critical)
**What was wrong:** The post described `DAPR0001` ("Actor interface must extend IActor") and `DAPR0002` ("Actor methods must return Task or Task<T>"). These diagnostic IDs are either obsolete (from an earlier iteration of the analyzers) or the descriptions are entirely fabricated. No current Dapr analyzer checks interface inheritance or method return types. The actual current diagnostics (as of v1.16.0) are:
- `DAPR1401`: Actor timer callback method must exist on type (Warning)
- `DAPR1402`: Actor type not registered with dependency injection (Warning)
- `DAPR1403`: Use `options.UseJsonSerialization` for non-.NET interop (Info)
- `DAPR1404`: Call `app.MapActorsHandlers` to map actor endpoints (Warning)

**What was changed:** Completely rewrote the analyzer rule sections to describe the four actual analyzers (`DAPR1401`–`DAPR1404`) with accurate descriptions and correct code examples for each.

### 3. Invalid CLI syntax (Moderate)
**What was wrong:** The post used `dotnet build --warnaserror:DAPR0001,DAPR0002`. The `dotnet build` command does not support a `--warnaserror` flag. The `warnaserror` option is a C# compiler option, not a `dotnet build` CLI option.
**What was changed:** Replaced with the correct MSBuild property syntax: `dotnet build -p:WarningsAsErrors=DAPR1401,DAPR1402,DAPR1404`.

### 4. Suppression examples used wrong diagnostic IDs (Moderate)
**What was wrong:** The `#pragma` and `.csproj` suppression examples referenced `DAPR0001`, which is not a current diagnostic ID.
**What was changed:** Updated suppression examples to use `DAPR1402` (a real current diagnostic) with a matching actor class example instead of an interface example.

### 5. Overview section inaccurate (Minor)
**What was wrong:** The overview claimed analyzers flag "incorrect actor interface definitions, missing base class implementations, and invalid method signatures." None of these are actually checked by the current analyzers.
**What was changed:** Updated the overview to accurately describe what the analyzers check: missing actor registrations, unmapped actor endpoints, invalid timer callbacks, and serialization configuration issues.

## Review Notes
- The old `DAPR0001`/`DAPR0002`/`DAPR0003` IDs do appear in the source repository's history under an older `AnalyzerReleases.Shipped.md` file, but they were replaced by the `DAPR14xx` numbering scheme in the current shipped version. The old IDs had different descriptions than what the blog post claimed.
- The `dotnet build -p:TreatWarningsAsErrors=true` command in the CI section was already correct and was kept as-is.
- Actor interfaces must still extend `IActor` and actor methods must still return `Task`/`Task<T>` as runtime requirements, but no Roslyn analyzer currently enforces these rules at compile time.
