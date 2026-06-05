# Validation Summary: How to Run IIS Web Applications in Windows Containers on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Services, StatefulSets, ConfigMaps, Secrets, probes, and HorizontalPodAutoscaler
- Windows containers on Kubernetes
- Microsoft IIS and IIS application pools
- ASP.NET Framework on Windows Server Core containers
- Dockerfiles for Windows container images
- Fluent Bit log parsing
- PowerShell WebAdministration and certificate import commands

## Sources Consulted
- Kubernetes Windows containers overview: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes Windows container user guide and Windows build node labels: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes Windows storage limitations: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes HPA v2 API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes TLS Secret command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Microsoft IIS container image documentation: https://github.com/microsoft/iis-docker
- Microsoft Import-PfxCertificate documentation: https://learn.microsoft.com/en-us/powershell/module/pki/import-pfxcertificate
- Microsoft IIS application pool processModel documentation: https://learn.microsoft.com/en-us/iis/configuration/system.applicationHost/applicationPools/add/processModel
- Fluent Bit parser documentation: https://docs.fluentbit.io/manual/1.2/parser

## Issues Found
- The Windows pod examples selected only `kubernetes.io/os: windows` while using Windows Server 2022 images. Added `node.kubernetes.io/windows-build: '10.0.20348'` to align the examples with Kubernetes Windows version compatibility guidance.
- The custom IIS Dockerfile configured the default app pool as `LocalSystem`, which is unnecessarily privileged and not aligned with IIS defaults. Changed it to `ApplicationPoolIdentity`.
- The ASP.NET Dockerfile included Dockerfile comments inside a continued `RUN powershell -Command` instruction, which can break the command. Moved the optional 32-bit application pool setting outside the multi-line `RUN`.
- The ConfigMap example used `subPath` to mount `web.config` as a single file. Kubernetes Windows storage documentation notes subPath limitations for Windows containers, so the example now mounts the ConfigMap as a directory and copies `web.config` before starting `ServiceMonitor.exe`.
- The health-check Deployment used the stock IIS image but pointed readiness at `/health`, an endpoint not provided by that image or by the shown `health.aspx` example. Changed the image to the custom ASP.NET app image and the readiness path to `/health.aspx`.
- The StatefulSet example declared `serviceName: iis-stateful-service` without defining the required headless Service, and included an unused standalone PVC. Replaced the unused PVC with the required headless Service.
- The HTTPS example used a Kubernetes TLS Secret with separate PEM certificate and key files, imported only the certificate into Windows, and then kept the container alive with an infinite sleep. Changed it to use a PFX Secret with a password, import the certificate including its private key, configure the IIS binding, and then run `C:\ServiceMonitor.exe w3svc`.
- The Fluent Bit IIS parser captured only the IIS log date as the time field while `Time_Format` expected both date and time, shifting all parsed fields. Updated the regex to capture the date and time together.

## Review Notes
- Could not run `kubectl` validation because `kubectl` is not installed in the workspace. Markdown fence balance was checked locally.
- The examples assume a Kubernetes cluster with Windows Server 2022 worker nodes, a compatible Windows container runtime, and storage classes named `managed-premium` and `managed-standard`.
