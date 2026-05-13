# Validation Summary: How to Deploy a Blazor Application with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Blazor WebAssembly
- .NET 8 and .NET 9
- WebAssembly
- Nginx
- Docker
- Kubernetes Deployments, Services, Ingresses, ConfigMaps, and probes
- Flux CD GitRepository and Kustomization resources
- Flux CD image automation resources

## Sources Consulted
- Microsoft Learn: Host and deploy ASP.NET Core Blazor WebAssembly with Nginx: https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/nginx
- Microsoft Learn: Host and deploy ASP.NET Core Blazor WebAssembly: https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/
- Microsoft Learn: ASP.NET Core Blazor configuration: https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/configuration
- Microsoft Learn: ASP.NET Core Blazor environments: https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/environments
- NGINX documentation: Compression and Decompression: https://docs.nginx.com/nginx/admin-guide/web-server/compression/
- NGINX documentation: Brotli module: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/brotli/
- Flux documentation: GitRepository: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux documentation: Kustomization: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux documentation: ImagePolicy: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux documentation: ImageUpdateAutomation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Kubernetes documentation: ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- ingress-nginx documentation: ConfigMap options: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/

## Issues Found
- The prerequisite said "Blazor WebAssembly 8.x application (.NET 8 or 9)", which mixed an 8.x app description with a .NET 9 target. Changed it to "targeting .NET 8 or 9."
- The Dockerfile comment implied any .NET SDK image was sufficient while the example used `mcr.microsoft.com/dotnet/sdk:8.0`. Updated the comment to make clear that the SDK image should match the app target framework.
- The Nginx `types` block only declared `application/wasm`, which would override inherited MIME mappings in that context and risk serving CSS, JavaScript, JSON, images, fonts, and Blazor asset files with incorrect content types. Expanded the block to include the relevant MIME types.
- The Nginx example claimed to enable Brotli pre-compressed files but only configured `gzip_static`, which serves `.gz` files. Updated the comments and best-practice guidance to describe gzip accurately and note that Brotli requires Nginx Brotli support or another host that performs Brotli content negotiation.
- The ingress manifest used `nginx.ingress.kubernetes.io/enable-brotli` as an Ingress annotation, but ingress-nginx documents Brotli as a controller ConfigMap option. Removed the invalid annotation.
- The runtime ConfigMap mounted `appsettings.Production.json`, but a deployed Blazor WebAssembly app must resolve the client-side environment to `Production` for that environment-specific file to be loaded. Added the `Blazor-Environment: Production` response header in the Nginx example and noted the requirement in best practices.
- The original caching guidance treated all `.wasm`, `.js`, and `.css` files as safe for immutable caching. Microsoft documents that .NET 8/9 Blazor WASM boot/runtime files are not all fingerprinted. Added a cache-control map that avoids immutable caching for `index.html`, `service-worker.js`, `appsettings.Production.json`, `blazor.boot.json`, `blazor.webassembly.js`, and `dotnet.js`.

## Review Notes
The Flux `GitRepository`, `Kustomization`, `ImageRepository`, `ImagePolicy`, and `ImageUpdateAutomation` snippets use current v1 API versions and valid field names. The Kubernetes manifests are structurally valid for the resources shown. The ConfigMap is mounted with `subPath`, which is valid for replacing a single file, but Kubernetes does not update subPath-mounted ConfigMap files in place; a pod restart is needed for changed runtime config to be picked up.
