# How to Manage Windows Containers with Portainer - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Windows Containers, Docker, Windows Server

Description: Learn how to use Portainer to manage Windows-based containers running on Windows Server or Windows 10/11 with Docker in Windows container mode.

## Windows Containers vs Linux Containers

Windows containers run the Windows kernel and are suited for:

- Legacy .NET Framework applications
- IIS web servers
- Windows-specific services
- Applications requiring Windows API calls

| Feature | Linux Containers | Windows Containers |
|---------|-----------------|-------------------|
| Base OS | Linux | Windows |
| Image size | Small (50MB-500MB) | Large (1-6GB) |
| Startup time | Fast (<1s) | Slower (5-30s) |
| Portability | Runs anywhere | Windows hosts only |

## Prerequisites

- Windows Server 2019/2022 or Windows 10/11 Pro
- Containers feature installed
- Docker configured in Windows container mode

## Switching to Windows Container Mode

```powershell
# Docker Desktop (Windows 10/11)

& $Env:ProgramFiles\Docker\Docker\DockerCli.exe -SwitchWindowsEngine

# Verify mode
docker version | Select-String "OS/Arch"
# Should show: OS/Arch: windows/amd64
```

## Portainer with Windows Containers

Portainer supports Windows containers through the named pipe:

```powershell
docker run -d `
  -p 9000:9000 `
  -p 8000:8000 `
  --name portainer `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:latest
```

## Deploying a Windows IIS Container via Portainer

In Portainer: **Containers → Add Container**

```text
Name: my-iis
Image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
Port Mapping: 8080 → 80/tcp
```

Or via Portainer Stacks:

```yaml
version: "3.8"

services:
  iis:
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
    ports:
      - "8080:80"
    restart: unless-stopped
```

## Windows Container Base Images

| Image | Size | Use Case |
|-------|------|---------|
| `mcr.microsoft.com/windows/nanoserver` | ~100MB | Smallest, limited APIs |
| `mcr.microsoft.com/windows/servercore` | ~1.5GB | .NET Framework, IIS |
| `mcr.microsoft.com/windows/server` | ~6GB | Full Windows Server features |
| `mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022` | ~400MB | ASP.NET Core apps |

## Checking Running Windows Containers

In Portainer, Windows containers appear alongside Linux containers in the container list. The key differences:

- Logs are in Windows event log format (some differences in display)
- Console access uses `cmd.exe` or `powershell.exe`

Via Portainer Console:

```cmd
# When attaching to a Windows container console
C:\> dir
C:\> ipconfig
C:\> powershell Get-Service
```

## Limitations with Portainer and Windows Containers

- Resource stats (CPU/Memory) work differently for Windows containers
- Some Portainer features designed for Linux may not apply
- GPU access in Windows containers requires specific configuration

## Conclusion

Portainer provides workable management for Windows containers with the same web UI familiar to Linux container users. While Windows containers are heavier and slower to start than Linux equivalents, Portainer simplifies deployment, log viewing, and console access - making Windows container workflows more accessible to teams used to Portainer on Linux.
