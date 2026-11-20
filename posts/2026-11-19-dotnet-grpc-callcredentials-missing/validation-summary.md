# Validation Summary: How to Diagnose Missing CallCredentials on a .NET gRPC Channel

## Status
validated

## Post Type
Technical troubleshooting guide with a contextual C# example.

## Technologies Covered
- C# and .NET
- gRPC and ASP.NET Core authentication and authorization
- Grpc.Net.Client and Grpc.Core API types
- Grpc.Net.ClientFactory and dependency injection
- TLS, HTTP authorization metadata, and bearer tokens

## Sources Consulted
- [Microsoft: Authentication and authorization in ASP.NET Core gRPC](https://learn.microsoft.com/en-us/aspnet/core/grpc/authn-and-authz) — credential composition, callback cancellation, TLS restrictions, and AddCallCredentials.
- [Microsoft: gRPC .NET configuration](https://learn.microsoft.com/en-us/aspnet/core/grpc/configuration) — channel credentials, HTTP handlers, and UnsafeUseInsecureChannelCallCredentials.
- [Microsoft: gRPC client factory integration](https://learn.microsoft.com/en-us/aspnet/core/grpc/clientfactory?view=aspnetcore-10.0) — typed client registration and independent named configurations.
- [Microsoft: Call gRPC services with the .NET client](https://learn.microsoft.com/en-us/aspnet/core/grpc/client?view=aspnetcore-10.0) — generated clients, HTTPS transport, channel reuse, and call initiation.
- [gRPC .NET source: DefaultChannelCredentialsConfigurator](https://github.com/grpc/grpc-dotnet/blob/master/src/Grpc.Net.Client/Internal/DefaultChannelCredentialsConfigurator.cs) — secure credential composition and HTTP-layer certificate configuration.
- [Microsoft: Configure JWT bearer authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication?view=aspnetcore-10.0) — bearer header format and token validation.
- [gRPC: Status codes](https://grpc.io/docs/guides/status-codes/) — authentication failures versus permission failures.
- [RFC 6750: OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750) — bearer credential transport and disclosure protection.

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. Its channel credential composition matches the documented pattern, and the callback returns the required Task after adding bearer metadata. No deprecated API usage was identified.
- The snippet is intentionally contextual: it requires a project referencing Grpc.Net.Client, a real service address, a generated client, and an RPC invocation. Its top-level statements require C# 9 or later. Merely constructing the channel does not invoke the callback.
- AddCallCredentials requires Grpc.Net.ClientFactory 2.46.0 or later. The post makes no incompatible package-version claim.
- TLS restrictions and the insecure-channel override are accurately described. Depending on the credential configuration, an invalid insecure setup can fail during channel construction rather than silently omit metadata. The post does not promise silent omission.
- Private-CA trust belongs in the supported HTTP/TLS configuration. The gRPC .NET implementation rejects SslCredentials containing custom certificate arguments; the example correctly uses the parameterless constructor.
- Channel reuse, selecting the correct factory registration, honoring cancellation during asynchronous token retrieval, and separating server authentication from authorization are supported by the consulted sources.
- The three technical documentation links identify the intended resources; the client-factory page was successfully checked with an explicit documentation-version query. The example.com address is an illustrative endpoint.
- There are no terminal commands or standalone configuration snippets to validate. The suggested test matrix and proxy checks are diagnostic recommendations, not claims of tests already performed.
- Review consisted of static code inspection and comparison with official documentation and upstream source. The dotnet CLI is unavailable in this environment, so the example was not compiled or executed, and no live server or proxy integration tests were run.
