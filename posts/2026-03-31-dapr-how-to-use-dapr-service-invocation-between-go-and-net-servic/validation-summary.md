# Validation Summary: How to Use Dapr Service Invocation Between Go and .NET Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation building block)
- Go (net/http standard library)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- .NET / C# (ASP.NET Core)
- Dapr .NET SDK (`Dapr.Client`)
- Docker Compose (sidecar pattern deployment)

## Sources Consulted
- Dapr service invocation documentation: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/
- Dapr Go SDK client reference: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr .NET SDK DaprClient reference: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Docker Compose deployment guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Go language specification (unused imports): https://go.dev/ref/spec
- C# CS0542 compiler error documentation: https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0542

## Issues Found
1. **Unused Go imports cause compilation failure**: The `pricing-service/main.go` code imported `"fmt"` and `"strconv"` but neither was used anywhere in the file. Go treats unused imports as compilation errors. Removed both unused imports.

2. **C# record name/property collision (CS0542)**: The record `public record UnitPrice(string ProductId, decimal UnitPrice)` had a positional parameter `UnitPrice` that generates a property with the same name as the enclosing type. This triggers compiler error CS0542 ("member names cannot be the same as their enclosing type"). Renamed the record from `UnitPrice` to `ProductPrice` and updated the `GetPriceAsync` return type accordingly. JSON serialization is unaffected since Dapr's default JSON serializer uses camelCase, so `ProductPrice.UnitPrice` still maps to `"unitPrice"` in the Go service's JSON response.

## Review Notes
- The `CalculatePriceAsync` method uses the hardcoded string `"pricing-service"` instead of the `PricingAppId` constant that is used elsewhere in the same class. This is a minor inconsistency but not a bug.
- The Docker Compose configuration does not include a placement service or Redis component, which would be needed for certain Dapr features but is not required for basic service invocation as demonstrated here.
- The `version: '3.8'` key in Docker Compose is deprecated in newer versions of Docker Compose (v2+), but is still functional and widely used in tutorials.
- The Dapr Go SDK's `InvokeMethodWithContent` API, `DataContent` struct, and the .NET SDK's `InvokeMethodAsync` generic overloads are all used correctly per their current documented signatures.
