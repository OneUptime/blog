# Validation Summary: How to Set Up Unit Testing in .NET with xUnit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET 8 / .NET SDK
- C#
- xUnit (v2)
- Moq
- FluentAssertions
- coverlet (code coverage)
- Microsoft.NET.Test.Sdk / VSTest (`dotnet test`)

## Sources Consulted
- xUnit — Configuration with RunSettings (VSTest): https://xunit.net/docs/config-runsettings
- xUnit — Running Tests in Parallel: https://xunit.net/docs/running-tests-in-parallel
- xUnit — Configuration file (xunit.runner.json) reference: https://xunit.net/docs/configuration-files
- Microsoft Learn — Unit testing C# with xUnit and .NET / `dotnet test`: https://learn.microsoft.com/en-us/dotnet/core/testing/
- NuGet package pages for xunit (2.6.2), xunit.runner.visualstudio (2.5.4), Microsoft.NET.Test.Sdk (17.8.0), Moq (4.20.70), FluentAssertions (6.12.0), coverlet.collector (6.0.0)

## Issues Found
- **Incorrect casing on `dotnet test` RunSettings command-line overrides.** The "Running Tests" section used:
  ```bash
  dotnet test -- xunit.parallelizeAssembly=true
  dotnet test -- xunit.parallelizeTestCollections=false
  ```
  The xUnit RunSettings overrides are translated into XML element names behind the scenes and are **case-sensitive**. The official documentation requires the `xUnit.` prefix with PascalCase property names. Changed to:
  ```bash
  dotnet test -- xUnit.ParallelizeAssembly=true
  dotnet test -- xUnit.ParallelizeTestCollections=false
  ```
  The lowercase form would not be recognized by the runner. (Note: the separate `xunit.runner.json` config file legitimately uses lowercase camelCase keys such as `parallelizeAssembly` / `parallelizeTestCollections`; that block was already correct and was left unchanged.)

## Review Notes
- Package versions (xunit 2.6.2, xunit.runner.visualstudio 2.5.4, Microsoft.NET.Test.Sdk 17.8.0, Moq 4.20.70, FluentAssertions 6.12.0, coverlet.collector 6.0.0) are real and mutually consistent with the .NET 8 / late-2023–early-2024 `dotnet new xunit` template. They are valid as written; no changes needed.
- FluentAssertions 6.x is the last fully free/open-source major line — versions 8+ moved to a commercial license. The post pins 6.12.0, so the examples remain freely usable. Worth keeping in mind if the post is ever updated to newer versions.
- The `var act = async () => await ...;` pattern used with FluentAssertions' `ThrowAsync` relies on C# 10+ natural delegate typing for lambdas, which is available in net8.0 — correct as written.
- The xunit.runner.json schema URL (`https://xunit.net/schema/current/xunit.runner.schema.json`) and the keys/values used (`maxParallelThreads`, `methodDisplay: "classAndMethod"`, etc.) are valid.
- Conceptual claims (per-test class instantiation for isolation, parallelization of test collections by default, `[Fact]`/`[Theory]`/`[InlineData]`/`[MemberData]`, `IClassFixture`/`ICollectionFixture`/`[CollectionDefinition]`) are all accurate.
