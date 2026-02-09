# How to Run .NET Framework Applications in Windows Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, .NET Framework, windows containers, ASP.NET, WCF, containerization, legacy modernization

Description: Containerize .NET Framework applications in Windows Docker containers to modernize legacy workloads without rewriting application code.

---

Millions of .NET Framework applications run in production today. These applications were built for Windows, depend on the full .NET Framework runtime, and often rely on Windows-specific features like IIS, WCF, MSMQ, and the Windows Registry. Rewriting them in .NET 8 is not always practical. Windows containers offer a middle ground: you containerize the existing application as-is, gaining deployment consistency, isolation, and modern DevOps workflows without changing a single line of code.

This guide walks through containerizing different types of .NET Framework applications, handling common dependencies, and building efficient images.

## Why Containerize .NET Framework Apps?

The .NET Framework (versions 3.5 through 4.8.1) runs only on Windows. Microsoft has declared it feature-complete, meaning it will receive security patches but no new features. The modern path forward is .NET 8+, but migration takes time and budget that many teams lack.

Containerizing .NET Framework applications delivers immediate benefits:

- Consistent deployments across dev, staging, and production
- Isolation between applications that share a server today
- Simplified dependency management (no more "install this DLL on the server")
- Integration with modern CI/CD pipelines
- Easier horizontal scaling behind a load balancer

## Available Base Images

Microsoft provides specialized base images for .NET Framework containers.

```powershell
# ASP.NET 4.8 on Server Core (includes IIS and ASP.NET)
docker pull mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# .NET Framework 4.8 Runtime (for console apps and services)
docker pull mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022

# .NET Framework 4.8 SDK (for building applications)
docker pull mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022

# WCF service hosting
docker pull mcr.microsoft.com/dotnet/framework/wcf:4.8-windowsservercore-ltsc2022
```

## Containerizing an ASP.NET MVC Application

The most common scenario is an ASP.NET MVC application running on IIS.

### Step 1: Build the Application

```powershell
# Restore NuGet packages and build the solution
nuget restore MyWebApp.sln
msbuild MyWebApp.sln /p:Configuration=Release /p:DeployOnBuild=true /p:PublishUrl=.\publish
```

### Step 2: Create the Dockerfile

```dockerfile
# Dockerfile - ASP.NET MVC application
# Use the ASP.NET base image which includes IIS with ASP.NET pre-configured
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Copy the published application to the IIS web root
COPY ./publish/ /inetpub/wwwroot/

# The base image automatically configures IIS to serve from this directory
```

### Step 3: Build with Multi-Stage Dockerfile

For CI/CD pipelines, build the application inside Docker.

```dockerfile
# Multi-stage Dockerfile - build and run ASP.NET MVC app
# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build

WORKDIR /src

# Copy solution and project files first for layer caching
COPY *.sln .
COPY MyWebApp/*.csproj MyWebApp/
COPY MyWebApp.Tests/*.csproj MyWebApp.Tests/

# Restore NuGet packages (cached unless project files change)
RUN nuget restore

# Copy the rest of the source code
COPY . .

# Build the application
RUN msbuild MyWebApp\MyWebApp.csproj /p:Configuration=Release /p:DeployOnBuild=true /p:PublishUrl=C:\publish

# Stage 2: Create the runtime image
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Copy only the published output from the build stage
COPY --from=build C:\publish /inetpub/wwwroot/
```

Build and run the multi-stage image.

```powershell
# Build the image (SDK not needed on the host)
docker build -t mywebapp .

# Run the application
docker run -d -p 80:80 --name mywebapp mywebapp
```

## Containerizing a Windows Service

Windows services are background processes that run without a UI. They need special handling in containers.

```dockerfile
# Dockerfile - Windows Service
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022

WORKDIR /app

# Copy the service binaries
COPY ./bin/Release/ .

# Install the Windows service
RUN powershell -Command \
    "New-Service -Name 'MyBackgroundService' -BinaryPathName 'C:\app\MyService.exe' -StartupType Automatic"

# Start the service and monitor it
ENTRYPOINT ["powershell", "-Command", \
    "Start-Service MyBackgroundService; \
     Write-Host 'Service started'; \
     while ((Get-Service MyBackgroundService).Status -eq 'Running') { Start-Sleep -Seconds 5 }; \
     Write-Host 'Service stopped'"]
```

Alternatively, convert the service to a console application for better container compatibility.

```csharp
// Program.cs - Adapted Windows Service for container environments
using System;
using System.Threading;

class Program
{
    static void Main(string[] args)
    {
        // Check if running as a service or in a container
        if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true")
        {
            // Run as a foreground console app in containers
            var service = new MyWorkerService();
            service.Start();

            // Wait for termination signal
            var exitEvent = new ManualResetEvent(false);
            Console.CancelKeyPress += (sender, e) =>
            {
                e.Cancel = true;
                exitEvent.Set();
            };
            exitEvent.WaitOne();

            service.Stop();
        }
        else
        {
            // Run as a Windows service in traditional deployments
            ServiceBase.Run(new MyWindowsService());
        }
    }
}
```

## Containerizing a WCF Service

WCF (Windows Communication Foundation) services are common in enterprise .NET Framework applications.

```dockerfile
# Dockerfile - WCF Service
FROM mcr.microsoft.com/dotnet/framework/wcf:4.8-windowsservercore-ltsc2022

WORKDIR /app

# Copy the WCF service binaries
COPY ./publish/ .

# Expose the WCF service endpoint
EXPOSE 8080

# Start the WCF service host
ENTRYPOINT ["MyWcfService.exe"]
```

For IIS-hosted WCF services, use the ASP.NET base image instead.

```dockerfile
# Dockerfile - WCF Service hosted in IIS
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Enable WCF features in IIS
RUN powershell -Command \
    "Install-WindowsFeature NET-WCF-HTTP-Activation45; \
     Install-WindowsFeature NET-WCF-TCP-Activation45"

COPY ./publish/ /inetpub/wwwroot/
```

## Handling Common Dependencies

### COM Components

```dockerfile
# Register COM components needed by the application
COPY ./com-dlls/ /app/com/
RUN powershell -Command \
    "Get-ChildItem C:\app\com\*.dll | ForEach-Object { regsvr32.exe /s $_.FullName }"
```

### ODBC Drivers

```dockerfile
# Install SQL Server ODBC driver
RUN powershell -Command \
    "Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/?linkid=2249006' -OutFile msodbcsql.msi; \
     Start-Process msiexec.exe -ArgumentList '/i', 'msodbcsql.msi', '/quiet', 'IACCEPTMSODBCSQLLICENSETERMS=YES' -Wait; \
     Remove-Item msodbcsql.msi"
```

### Certificates

```dockerfile
# Import certificates into the Windows certificate store
COPY ./certs/my-cert.pfx /certs/
RUN powershell -Command \
    "$password = ConvertTo-SecureString 'cert-password' -AsPlainText -Force; \
     Import-PfxCertificate -FilePath C:\certs\my-cert.pfx -CertStoreLocation Cert:\LocalMachine\My -Password $password"
```

### Registry Settings

```dockerfile
# Set registry keys your application depends on
RUN powershell -Command \
    "New-Item -Path 'HKLM:\SOFTWARE\MyApp' -Force; \
     Set-ItemProperty -Path 'HKLM:\SOFTWARE\MyApp' -Name 'LicenseKey' -Value 'YOUR-LICENSE-KEY'; \
     Set-ItemProperty -Path 'HKLM:\SOFTWARE\MyApp' -Name 'DataPath' -Value 'C:\app\data'"
```

## Configuration Management

Externalize configuration using environment variables instead of hardcoded config files.

```powershell
# transform-config.ps1 - Replace config values from environment variables at startup
$configPath = "C:\inetpub\wwwroot\web.config"
$xml = [xml](Get-Content $configPath)

# Replace connection strings
foreach ($conn in $xml.configuration.connectionStrings.add) {
    $envVar = "CONNSTR_" + $conn.name.ToUpper().Replace(".", "_")
    $envValue = [Environment]::GetEnvironmentVariable($envVar)
    if ($envValue) {
        $conn.connectionString = $envValue
        Write-Host "Updated connection string: $($conn.name)"
    }
}

# Replace app settings
foreach ($setting in $xml.configuration.appSettings.add) {
    $envVar = "APPSETTING_" + $setting.key.ToUpper().Replace(".", "_").Replace(":", "_")
    $envValue = [Environment]::GetEnvironmentVariable($envVar)
    if ($envValue) {
        $setting.value = $envValue
        Write-Host "Updated app setting: $($setting.key)"
    }
}

$xml.Save($configPath)
```

```dockerfile
# Dockerfile addition for config transformation
COPY transform-config.ps1 /scripts/
ENTRYPOINT ["powershell", "-File", "C:\\scripts\\transform-config.ps1; C:\\ServiceMonitor.exe w3svc"]
```

## Image Size Optimization

Windows container images are large. Here are strategies to reduce their size.

```dockerfile
# Use multi-stage builds to exclude SDK and build artifacts
# Remove temporary files after installations
RUN powershell -Command \
    "Remove-Item -Recurse -Force C:\Windows\Temp\*; \
     Remove-Item -Recurse -Force C:\Users\ContainerAdministrator\AppData\Local\Temp\*"

# Minimize the number of layers by combining RUN commands
RUN powershell -Command \
    "Install-WindowsFeature Web-Asp-Net45; \
     Install-WindowsFeature Web-Http-Redirect; \
     Remove-Item -Recurse C:\Windows\Temp\*"
```

## Docker Compose for Full Application Stack

```yaml
# docker-compose.yml - .NET Framework app with dependencies
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - CONNSTR_DEFAULTCONNECTION=Server=db;Database=AppDB;User Id=sa;Password=YourStrong!Passw0rd
      - APPSETTING_ENVIRONMENT=production
    depends_on:
      - db
      - redis

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    volumes:
      - sql_data:/var/opt/mssql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  sql_data:
```

## Conclusion

Containerizing .NET Framework applications gives legacy workloads a modern deployment model without requiring a rewrite. The official Microsoft base images handle the runtime dependencies, IIS configuration, and WCF hosting. Multi-stage builds keep your CI/CD pipeline clean by building inside Docker. Configuration transformation scripts let you externalize settings through environment variables. While the images are larger than their Linux counterparts, the benefits of consistent, isolated deployments make the trade-off worthwhile for organizations with significant .NET Framework investments.
