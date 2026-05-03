# Validation Summary: How to Deploy IIS on Windows Nodes in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft IIS (Internet Information Services)
- Windows Server Core containers (`mcr.microsoft.com/windows/servercore/iis`)
- ASP.NET 4.x / .NET Framework
- PowerShell WebAdministration module
- Docker / Dockerfile
- Kubernetes (Deployment, Ingress, livenessProbe, readinessProbe, nodeSelector, tolerations)
- Rancher
- cert-manager / Let's Encrypt
- NGINX Ingress Controller
- Kubernetes Secrets

## Sources Consulted
- Microsoft IIS image on MCR: https://mcr.microsoft.com/en-us/product/windows/servercore/iis
- WebAdministration PowerShell module reference: https://learn.microsoft.com/en-us/powershell/module/webadministration/
- `New-WebAppPool` / `New-WebSite` / `Set-WebConfiguration`: https://learn.microsoft.com/en-us/powershell/module/webadministration/new-webapppool
- Add-WindowsFeature / Install-WindowsFeature: https://learn.microsoft.com/en-us/powershell/module/servermanager/install-windowsfeature
- Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Scheduling Windows pods (taints/tolerations, nodeSelector): https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes Ingress v1 reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager ingress annotations: https://cert-manager.io/docs/usage/ingress/
- Rancher Windows worker node documentation: https://ranchermanager.docs.rancher.com/

## Issues Found
1. **Step 2 referenced an Application Pool that was never created.** The original Dockerfile in Step 2 invoked `Set-WebConfiguration ... applicationPools/add[@name="MyApp"]/processModel` and `Set-ItemProperty "IIS:\AppPools\MyApp" ...` against an app pool named `MyApp`, but `New-WebSite` in Step 1 does not create an app pool of the same name (it falls back to `DefaultAppPool` unless `-ApplicationPool` is supplied). The configuration commands would fail at build time because the app pool path does not exist. Fixed by adding `New-WebAppPool -Name "MyApp"` as the first command in the Step 2 RUN block.

2. **Replaced `Set-WebSite -Name "MyApp" -ApplicationPool "MyApp"` with `Set-ItemProperty "IIS:\Sites\MyApp" -Name applicationPool -Value "MyApp"`.** The `Set-ItemProperty` form against the `IIS:\Sites\<name>` provider path is the canonical, documented way to bind a site to an application pool in the WebAdministration module and is more portable across WebAdministration versions.

## Review Notes
- The `mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022` base image is valid and includes IIS but not ASP.NET features by default, so `Add-WindowsFeature Web-Asp-Net45` in Step 1 is appropriate. Authors who need a smaller surface area can consider `mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022`, which already includes ASP.NET 4.8.
- `Add-WindowsFeature` is an alias for `Install-WindowsFeature` on modern Windows Server; both work, though `Install-WindowsFeature` is the current canonical name.
- The `ASPNETCORE_ENVIRONMENT` variable in Step 5 is specific to ASP.NET Core; classic .NET Framework apps do not honor it natively. The example still works as a generic environment-variable pattern, but readers running pure .NET Framework should not expect framework-level behavior from that variable.
- The Web.config snippet in Step 5 (`%ConnectionStrings__DefaultConnection%`) is illustrative pseudocode rather than a working syntax. Real environment-variable substitution in Web.config for .NET Framework typically requires the `Microsoft.Configuration.ConfigurationBuilders.Environment` config builder (which uses `${VARIABLE}` syntax). Left as-is because it is presented as an inline comment, not a runnable configuration.
- The Windows toleration uses `key: os, value: windows`. Some clusters (notably AKS) use a capital `Windows` value or the `node.kubernetes.io/os` key — readers should align this with whatever taint Rancher applies to their Windows worker nodes.
- IIS startup is genuinely slow in containers; the `initialDelaySeconds: 60` for the liveness probe is a reasonable starting point but may need tuning per workload.
