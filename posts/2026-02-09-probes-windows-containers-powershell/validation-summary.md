# Validation Summary: How to Configure Kubernetes Probes for Windows Containers with PowerShell

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Kubernetes Windows containers
- Kubernetes Deployment and Pod manifests
- PowerShell exec probes
- HTTP and TCP probe mechanisms
- ASP.NET Web API / C#
- kubectl troubleshooting commands

## Sources Consulted
- Kubernetes probe concepts: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes liveness, readiness, and startup probe task guide: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- PowerShell Invoke-WebRequest documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest
- PowerShell New-Item documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-item
- ASP.NET Web API action results documentation: https://learn.microsoft.com/en-us/aspnet/web-api/overview/getting-started-with-aspnet-web-api/action-results
- .NET WebClient obsoletion notice: https://learn.microsoft.com/en-us/dotnet/core/compatibility/networking/6.0/webrequest-deprecated

## Issues Found
- The post metadata used the tag "Window" instead of "Windows". Updated the tag to match the technology name.
- The C# HTTP health-check example used `System.Net.WebClient`, which Microsoft marks obsolete for new .NET development. Replaced it with `System.Net.Http.HttpClient` and checked the response with `IsSuccessStatusCode`.
- The file-based health-check example wrote `C:\health\ready` without creating `C:\health` first. Added `New-Item -ItemType Directory -Path C:\health -Force | Out-Null` before writing the file.
- The `database-client` Deployment example was missing the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added `selector.matchLabels` and `template.metadata.labels`.
- The `optimized-probes` Deployment example was missing the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added `selector.matchLabels` and `template.metadata.labels`.

## Review Notes
- The core explanations of liveness, readiness, startup, HTTP, TCP, and exec probes match current Kubernetes documentation.
- Kubernetes current documentation says Windows pods support readiness, liveness, and startup probes. It also says `.spec.os.name` should be set to `windows`; the post uses the common `nodeSelector` pattern, which is still a practical scheduling constraint, but future updates could add `spec.os.name` to each example for stricter OS declaration.
- No local `kubectl`, Ruby, or YAML linter was available in the workspace, so validation was performed by direct review against official documentation rather than by running a local schema validator.
