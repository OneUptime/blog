# Validation Summary: How to Build a gRPC Service in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core gRPC
- Protocol Buffers
- C#
- Docker
- Azure Container Registry
- Azure Kubernetes Service
- Kubernetes Deployments, Services, probes, and HPA
- ingress-nginx
- Helm

## Sources Consulted
- Microsoft Learn: gRPC services with C# - https://learn.microsoft.com/en-us/aspnet/core/grpc/basics
- Microsoft Learn: Manage Protobuf references with dotnet-grpc - https://learn.microsoft.com/en-us/aspnet/core/grpc/dotnet-grpc
- Microsoft Learn: gRPC health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/health-checks
- Microsoft Learn: gRPC services with ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/aspnetcore
- Microsoft Learn: Azure CLI `az acr` reference - https://learn.microsoft.com/en-us/cli/azure/acr
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: AKS with Helm quickstart, including `--attach-acr` - https://learn.microsoft.com/en-us/azure/aks/quickstart-helm
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- ingress-nginx documentation: gRPC example - https://kubernetes.github.io/ingress-nginx/examples/grpc/
- ingress-nginx documentation: project status and retirement notice - https://kubernetes.github.io/ingress-nginx/
- gRPC documentation: Health Checking - https://grpc.io/docs/guides/health-checking/

## Issues Found
- The post created `Protos/product.proto` but did not add it to `ProductService.csproj`. ASP.NET Core gRPC projects generate C# service base classes and message types from `<Protobuf>` project items, so the service implementation would not compile from the shown steps. Added a `ProductService.csproj` snippet with `<Protobuf Include="Protos\product.proto" GrpcServices="Server" />`.
- The host configuration used `AddGrpcHealthChecks()` and `MapGrpcHealthChecksService()` but did not add the required `Grpc.AspNetCore.HealthChecks` package. Added the `dotnet add package Grpc.AspNetCore.HealthChecks` command before the `Program.cs` snippet.
- The in-memory product store used `Dictionary<int, ProductData>` and `_nextId++` in a request-serving gRPC service. Concurrent requests could corrupt access or throw during enumeration. Changed the example to use `ConcurrentDictionary<int, ProductData>` and `Interlocked.Increment`.
- The best-practices section said Kubernetes native gRPC probes are available since v1.24. The feature was beta in v1.24 and is stable since v1.27. Updated the wording to say stable since v1.27.

## Review Notes
- Local verification with `dotnet`, `az`, and `kubectl` was not possible because those CLIs are not installed in this environment, so commands and APIs were checked against official documentation instead.
- The ingress-nginx gRPC manifest and annotations are technically consistent with ingress-nginx documentation. However, the ingress-nginx project documentation now states best-effort maintenance continued only until March 2026 and no further releases or security fixes follow after that. For new production AKS deployments, a supported gRPC-capable ingress or Gateway API implementation should be evaluated.
