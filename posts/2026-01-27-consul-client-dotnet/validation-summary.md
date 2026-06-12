# Validation Summary: How to Build a Consul Client in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET / ASP.NET Core
- C#
- Consul.NET NuGet package
- HashiCorp Consul service registration and discovery
- Consul health checks
- Consul KV store and blocking queries
- ASP.NET Core configuration providers
- ASP.NET Core hosted services and HTTP client factory

## Sources Consulted
- Consul.NET package documentation: https://github.com/G-Research/consuldotnet
- Consul.NET API reference for `AgentServiceRegistration`, `AgentServiceCheck`, `Health.Service`, `KV.List`, and `Agent.ServiceRegister`: https://consuldot.net/api/Consul/
- HashiCorp Consul Agent service API documentation: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul health check reference: https://developer.hashicorp.com/consul/docs/reference/service/health-check
- HashiCorp Consul KV API documentation: https://developer.hashicorp.com/consul/api-docs/kv
- HashiCorp Consul blocking query documentation: https://developer.hashicorp.com/consul/api-docs/features/blocking
- Microsoft .NET configuration provider documentation: https://learn.microsoft.com/en-us/dotnet/core/extensions/configuration-providers
- Microsoft ASP.NET Core Generic Host documentation: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/generic-host

## Issues Found
- The service discovery example assumed `queryResult.Response` was always non-null. Consul.NET documents that health queries can return a null response when no service members match, so the code now treats null as an empty result set.
- The service discovery example used only `entry.Service.Address`. Consul service entries can have an empty service address and rely on the node address, so the code now falls back to `entry.Node.Address`.
- The round-robin counter could eventually overflow to a negative value and produce a negative array index. The index calculation now masks the sign bit before applying modulo.
- The Consul KV configuration provider snippet referenced Consul types, logging types, and `Encoding` without the required namespace imports. The missing `using` statements were added.
- The final `Program.cs` snippet defined a Consul KV configuration provider earlier but never added it to `builder.Configuration`. The example now adds the provider when a Consul service name is configured.
- The final `Program.cs` snippet called `app.MapControllers()` without registering controller services. `builder.Services.AddControllers()` was added.

## Review Notes
The Consul.NET and HashiCorp Consul APIs used in the post are current and not marked deprecated in the consulted documentation. The local environment did not have the `dotnet` CLI installed, so I could not run a compile check; validation was performed by cross-checking the code against official API documentation.
