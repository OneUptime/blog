# How to Run IIS in a Windows Docker Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, IIS, windows containers, web server, ASP.NET, Windows Server, containerization

Description: Run Internet Information Services (IIS) in a Windows Docker container to host ASP.NET applications and static websites in isolated environments.

---

Internet Information Services (IIS) has been the backbone of Windows web hosting for decades. Millions of applications run on IIS, from classic ASP and ASP.NET Web Forms to modern ASP.NET MVC applications. Running IIS in a Docker container lets you isolate web applications, standardize deployments, and modernize your hosting infrastructure without rewriting a single line of application code.

This guide covers deploying IIS in a Windows container, hosting various application types, configuring the server, and optimizing for production use.

## IIS Container Images

Microsoft provides official IIS images through the Microsoft Container Registry. These come in different flavors matching the base image types.

```powershell
# Pull the IIS image based on Windows Server Core
docker pull mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Pull the IIS image based on the full Windows image (for apps needing more APIs)
docker pull mcr.microsoft.com/windows/servercore/iis:latest
```

## Running a Basic IIS Container

```powershell
# Start IIS and expose it on port 8080
docker run -d -p 8080:80 --name my-iis mcr.microsoft.com/windows/servercore/iis

# Verify IIS is running
curl http://localhost:8080
```

You should see the default IIS welcome page. IIS is fully functional inside the container with the same features you would expect on a Windows Server.

## Hosting a Static Website

The simplest use case is serving static HTML, CSS, and JavaScript files.

```dockerfile
# Dockerfile - Static website on IIS
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Remove the default IIS website content
RUN powershell -Command "Remove-Item -Recurse C:\inetpub\wwwroot\*"

# Copy your static website files into the IIS web root
COPY ./website/ C:/inetpub/wwwroot/

# IIS is already configured to serve from wwwroot by default
# The base image starts IIS automatically
```

Build and run the static site.

```powershell
# Build the image
docker build -t my-static-site .

# Run the container
docker run -d -p 80:80 --name static-site my-static-site

# Test the site
curl http://localhost
```

## Hosting an ASP.NET Web Forms Application

Many enterprise applications still run on ASP.NET Web Forms. IIS containers handle them without changes.

```dockerfile
# Dockerfile - ASP.NET Web Forms application
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Copy the published application files
COPY ./publish/ C:/inetpub/wwwroot/

# The aspnet base image includes IIS with ASP.NET 4.8 pre-configured
```

```powershell
# Build your ASP.NET application first
msbuild /p:Configuration=Release /p:DeployOnBuild=true /p:PublishUrl=./publish MyWebApp.sln

# Build the Docker image
docker build -t my-aspnet-app .

# Run with port mapping
docker run -d -p 80:80 --name aspnet-app my-aspnet-app
```

## Hosting an ASP.NET MVC Application

```dockerfile
# Dockerfile - ASP.NET MVC 5 application
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Install URL Rewrite module if your app needs it
RUN powershell -Command \
    "Invoke-WebRequest -Uri 'https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi' -OutFile rewrite.msi; \
     Start-Process msiexec.exe -ArgumentList '/i', 'rewrite.msi', '/quiet' -Wait; \
     Remove-Item rewrite.msi"

# Remove default content
RUN powershell -Command "Remove-Item -Recurse C:\inetpub\wwwroot\*"

# Copy the published MVC application
COPY ./publish/ C:/inetpub/wwwroot/
```

## Configuring IIS Inside the Container

You can configure IIS using PowerShell and the WebAdministration module.

```dockerfile
# Dockerfile - IIS with custom configuration
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Enable useful IIS features
RUN powershell -Command \
    "Install-WindowsFeature Web-Asp-Net45; \
     Install-WindowsFeature Web-Http-Redirect; \
     Install-WindowsFeature Web-Custom-Logging; \
     Install-WindowsFeature Web-Log-Libraries"

# Import the WebAdministration module and configure settings
RUN powershell -Command \
    "Import-Module WebAdministration; \
     Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' \
       -filter 'system.webServer/security/requestFiltering/requestLimits' \
       -name 'maxAllowedContentLength' -value 104857600"

# Configure application pool settings
RUN powershell -Command \
    "Import-Module WebAdministration; \
     Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name processModel.idleTimeout -Value '00:00:00'; \
     Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name recycling.periodicRestart.time -Value '00:00:00'"

COPY ./website/ C:/inetpub/wwwroot/
```

## Multiple Sites in One Container

While the container best practice is one application per container, you can run multiple IIS sites when needed.

```powershell
# Dockerfile - Multiple IIS sites
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Create directories for each site
RUN powershell -Command \
    "New-Item -ItemType Directory -Path C:\sites\site1; \
     New-Item -ItemType Directory -Path C:\sites\site2"

# Copy site content
COPY ./site1/ C:/sites/site1/
COPY ./site2/ C:/sites/site2/

# Configure sites using PowerShell
RUN powershell -Command \
    "Import-Module WebAdministration; \
     Remove-Website -Name 'Default Web Site'; \
     New-Website -Name 'Site1' -PhysicalPath 'C:\sites\site1' -Port 80 -HostHeader 'site1.example.com'; \
     New-Website -Name 'Site2' -PhysicalPath 'C:\sites\site2' -Port 80 -HostHeader 'site2.example.com'"

EXPOSE 80
```

## Connection Strings and Configuration

Pass configuration to your IIS application using environment variables.

```dockerfile
# Dockerfile - IIS app with environment-based configuration
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

COPY ./publish/ C:/inetpub/wwwroot/

# Set environment variables that web.config can reference
ENV DB_CONNECTION="Server=db-server;Database=myapp;Integrated Security=false;User Id=sa;Password=MyPassword"
ENV APP_ENVIRONMENT="production"

# Create a startup script that updates web.config from environment variables
COPY startup.ps1 C:/startup.ps1

ENTRYPOINT ["powershell", "C:\\startup.ps1"]
```

Create the startup script that configures the application before IIS starts.

```powershell
# startup.ps1 - Configure web.config from environment variables
$webConfig = "C:\inetpub\wwwroot\web.config"

if (Test-Path $webConfig) {
    $xml = [xml](Get-Content $webConfig)

    # Update connection string from environment variable
    $connString = $xml.SelectSingleNode("//connectionStrings/add[@name='DefaultConnection']")
    if ($connString -and $env:DB_CONNECTION) {
        $connString.connectionString = $env:DB_CONNECTION
        Write-Host "Updated connection string from environment"
    }

    # Update app settings
    $appSetting = $xml.SelectSingleNode("//appSettings/add[@key='Environment']")
    if ($appSetting -and $env:APP_ENVIRONMENT) {
        $appSetting.value = $env:APP_ENVIRONMENT
    }

    $xml.Save($webConfig)
}

# Start IIS and keep the container running
Start-Service W3SVC
Write-Host "IIS started successfully"

# Monitor the IIS process to keep the container alive
while ($true) {
    Start-Sleep -Seconds 10
    $svc = Get-Service W3SVC
    if ($svc.Status -ne "Running") {
        Write-Error "IIS has stopped unexpectedly"
        exit 1
    }
}
```

## Docker Compose with a Database

Run your IIS application alongside a SQL Server database.

```yaml
# docker-compose.yml - IIS app with SQL Server
version: "3.8"

services:
  web:
    build: .
    ports:
      - "80:80"
    environment:
      - DB_CONNECTION=Server=db;Database=myapp;User Id=sa;Password=YourStrong!Passw0rd
    depends_on:
      - db
    networks:
      - app-net

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      SA_PASSWORD: "YourStrong!Passw0rd"
      ACCEPT_EULA: "Y"
    volumes:
      - sql_data:/var/opt/mssql
    networks:
      - app-net

volumes:
  sql_data:

networks:
  app-net:
```

## IIS Log Management

IIS generates log files that accumulate inside the container. Forward them to stdout for Docker's log driver.

```powershell
# Dockerfile addition - Forward IIS logs to stdout
# Add this to your Dockerfile

# Configure IIS to log to a known location
RUN powershell -Command \
    "Import-Module WebAdministration; \
     Set-ItemProperty 'IIS:\Sites\Default Web Site' -Name logFile.directory -Value 'C:\iis-logs'"

# Add a log tailer to the startup script
# Append to startup.ps1:
# Start-Job -ScriptBlock {
#     while ($true) {
#         Get-Content C:\iis-logs\W3SVC1\*.log -Tail 0 -Wait | Write-Host
#     }
# }
```

## Health Checks

Add health checks so Docker can monitor the IIS container.

```dockerfile
# Add a health check that verifies IIS is responding
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD powershell -Command "try { $response = Invoke-WebRequest -Uri http://localhost -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
```

## Performance Optimization

```dockerfile
# Optimize the container for production
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Disable IIS features you do not need to reduce attack surface
RUN powershell -Command \
    "Remove-WindowsFeature Web-DAV-Publishing; \
     Remove-WindowsFeature Web-Ftp-Server"

# Pre-compile ASP.NET for faster cold starts
RUN powershell -Command \
    "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\aspnet_compiler.exe -v / -p C:\inetpub\wwwroot"

COPY ./publish/ C:/inetpub/wwwroot/
```

## Conclusion

IIS in a Windows Docker container gives you the best of both worlds: the familiar IIS hosting environment your Windows applications expect, wrapped in the portability and isolation of containers. You can containerize existing ASP.NET applications without code changes, standardize deployments across development and production environments, and manage IIS workloads with the same Docker tooling you use for everything else. Start by containerizing your simplest IIS application, validate it works correctly, and then move on to more complex deployments with databases and multi-site configurations.
