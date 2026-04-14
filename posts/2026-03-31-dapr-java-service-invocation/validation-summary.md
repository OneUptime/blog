# Validation Summary: How to Use Dapr Service Invocation with Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK (`io.dapr` packages)
- Java
- Spring Boot / Spring MVC
- Dapr Service Invocation building block

## Sources Consulted
- Dapr Java SDK source code on GitHub (dapr/java-sdk) — DaprClient.java, DaprClientBuilder.java, HttpExtension.java, InvokeMethodRequest.java, DaprException.java, TypeRef.java
- Dapr Java SDK API: `DaprClient` interface method signatures and deprecation annotations
- Dapr Java SDK API: `InvokeMethodRequest` constructor and fluent setter signatures
- Dapr Java SDK API: `DaprException` method inventory

## Issues Found

### 1. Incorrect TypeRef import path
- **What was wrong:** The blog imported `io.dapr.client.domain.TypeRef`, but the class is located at `io.dapr.utils.TypeRef`.
- **What was changed:** Updated the import statement from `io.dapr.client.domain.TypeRef` to `io.dapr.utils.TypeRef`.
- **Why:** Using the wrong import path would cause a compilation error.

### 2. Incorrect metadata map type for InvokeMethodRequest
- **What was wrong:** The blog declared headers as `Map<String, String[]>` with array values (`new String[]{"corr-abc-123"}`), but `InvokeMethodRequest.setMetadata()` accepts `Map<String, String>`.
- **What was changed:** Changed the map type to `Map<String, String>` with simple string values (`"corr-abc-123"`).
- **Why:** Passing `Map<String, String[]>` would cause a compilation error since the method signature expects `Map<String, String>`.

### 3. Incorrect DaprException method names
- **What was wrong:** The blog used `ex.getStatusCode()` and `ex.getStatusMessage()`, but these methods do not exist on `DaprException`.
- **What was changed:** Replaced `getStatusCode()` with `getHttpStatusCode()` and `getStatusMessage()` with `getMessage()`.
- **Why:** The actual methods on `DaprException` are `getHttpStatusCode()` (returns int HTTP status code) and `getMessage()` (inherited from Throwable). The non-existent methods would cause a compilation error.

## Review Notes
- All `invokeMethod` overloads on `DaprClient` are marked `@Deprecated` in the current SDK. The deprecation note recommends using language-native HTTP clients or gRPC clients for service invocation instead. This is worth noting for readers using the latest SDK version, though the code still compiles and works.
- `DaprException` also provides `getErrorCode()` (returns a gRPC/Dapr error code string like "NOT_FOUND") and `getErrorDetails()` for more granular error inspection, which could be useful additions in a future revision.
- The Spring Boot controller section is straightforward Spring MVC and is technically correct — Dapr sidecars forward invocations as standard HTTP requests to the app.
