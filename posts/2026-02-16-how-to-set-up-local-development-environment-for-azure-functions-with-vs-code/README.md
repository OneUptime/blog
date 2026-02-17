# How to Set Up Local Development Environment for Azure Functions with VS Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, VS Code, Local Development, Developer Tools, Azure, Debugging, Setup

Description: Complete guide to setting up a productive local development environment for Azure Functions using VS Code with debugging, testing, and local storage emulation.

---

Getting a proper local development environment set up for Azure Functions is one of those things that seems like it should be simple but has enough moving parts to trip you up. You need the Azure Functions Core Tools, the right VS Code extensions, a storage emulator, and proper debug configuration. In this post, I will walk through the entire setup from a fresh machine to a fully working local development environment where you can write, debug, and test Azure Functions without deploying anything to Azure.

## Prerequisites

Before you start, make sure you have these installed:

- VS Code (latest version)
- .NET 8 SDK (or Node.js 20+ / Python 3.11+ depending on your language)
- Azure CLI (for deployment and Azure resource management later)

## Step 1: Install Azure Functions Core Tools

The Azure Functions Core Tools is the local runtime that lets you run and debug functions on your machine. It replicates the Azure Functions host locally.

```bash
# On macOS using Homebrew
brew tap azure/functions
brew install azure-functions-core-tools@4

# On Windows using npm
npm install -g azure-functions-core-tools@4

# On Ubuntu/Debian
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4
```

Verify the installation.

```bash
# Check that the tools are installed correctly
func --version
# Should output something like 4.x.x
```

## Step 2: Install VS Code Extensions

Open VS Code and install these extensions. The Azure Functions extension is essential; the others make your life significantly easier.

Open the Extensions panel (Cmd+Shift+X on macOS, Ctrl+Shift+X on Windows) and search for each one.

- **Azure Functions** (ms-azuretools.vscode-azurefunctions) - Core extension for creating, debugging, and deploying functions
- **Azurite** (Azurite.azurite) - Local Azure Storage emulator that runs inside VS Code
- **Azure Resources** (ms-azuretools.vscode-azureresourcegroups) - Browse and manage Azure resources
- **C# Dev Kit** (ms-dotnettools.csdevkit) - If you are writing .NET functions
- **REST Client** (humao.rest-client) - For testing HTTP triggers without leaving VS Code

## Step 3: Create Your First Function Project

You can create a project from the command line or through the VS Code command palette. I prefer the command line because it is faster and more explicit.

```bash
# Create a new directory for your function project
mkdir my-functions && cd my-functions

# Initialize a .NET isolated worker function project
func init --dotnet-isolated

# Create an HTTP trigger function
func new --name HelloWorld --template "HTTP trigger" --authlevel anonymous
```

For Node.js or Python, swap the init flag.

```bash
# Node.js project
func init --javascript
# or
func init --typescript

# Python project
func init --python
```

## Step 4: Configure Azurite for Local Storage

Azure Functions requires a storage account for internal operations (tracking triggers, managing leases, storing function state). In production, this is an Azure Storage account. Locally, Azurite emulates it.

If you installed the Azurite VS Code extension, you can start it from the command palette (Cmd+Shift+P and type "Azurite: Start"). Alternatively, install and run it from npm.

```bash
# Install Azurite globally
npm install -g azurite

# Start Azurite with all services (blob, queue, table)
azurite --silent --location ./azurite-data --debug ./azurite-debug.log
```

Make sure your `local.settings.json` points to the local emulator.

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"
  }
}
```

The `UseDevelopmentStorage=true` connection string tells the Functions runtime to use Azurite instead of a real Azure Storage account.

## Step 5: Configure VS Code for Debugging

The Azure Functions extension creates a `.vscode` folder with the necessary configuration files. If it did not, here is what you need.

Create `.vscode/launch.json` for debug configuration.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to .NET Functions",
      "type": "coreclr",
      "request": "attach",
      "processId": "${command:azureFunctions.pickProcess}"
    }
  ]
}
```

Create `.vscode/tasks.json` for build tasks.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "clean",
      "command": "dotnet",
      "args": ["clean", "/property:GenerateFullPaths=true", "/consoleloggerparameters:NoSummary"],
      "type": "process",
      "problemMatcher": "$msCompile"
    },
    {
      "label": "build",
      "command": "dotnet",
      "args": ["build", "/property:GenerateFullPaths=true", "/consoleloggerparameters:NoSummary"],
      "type": "process",
      "dependsOn": "clean",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": "$msCompile"
    },
    {
      "label": "clean release",
      "command": "dotnet",
      "args": ["clean", "--configuration", "Release"],
      "type": "process",
      "problemMatcher": "$msCompile"
    },
    {
      "label": "publish",
      "command": "dotnet",
      "args": ["publish", "--configuration", "Release", "/property:GenerateFullPaths=true"],
      "type": "process",
      "dependsOn": "clean release",
      "problemMatcher": "$msCompile"
    },
    {
      "type": "func",
      "label": "func: host start",
      "command": "host start",
      "problemMatcher": "$func-dotnet-watch",
      "isBackground": true,
      "dependsOn": "build"
    }
  ]
}
```

## Step 6: Run and Debug

To start your function locally, press F5 in VS Code (or use the Run menu). VS Code will build your project, start the Functions host, and attach the debugger. You should see output like this in the terminal.

```
Azure Functions Core Tools
Core Tools Version: 4.0.xxxx

Functions:
    HelloWorld: [GET,POST] http://localhost:7071/api/HelloWorld

For detailed output, run func with --verbose flag.
```

Set a breakpoint in your function code by clicking in the gutter next to a line number, then make a request to the function URL. The debugger will pause at your breakpoint, and you can inspect variables, step through code, and use the debug console.

## Step 7: Testing HTTP Triggers with REST Client

Instead of switching to Postman or curl, use the REST Client extension directly in VS Code. Create a file called `test.http` in your project.

```http
### Test the HelloWorld function with GET
GET http://localhost:7071/api/HelloWorld?name=Developer

### Test the HelloWorld function with POST
POST http://localhost:7071/api/HelloWorld
Content-Type: application/json

{
    "name": "Developer"
}

### Test with different parameters
GET http://localhost:7071/api/HelloWorld?name=Production+Test
```

Click "Send Request" above any request to execute it and see the response inline.

## Step 8: Working with Queue and Timer Triggers Locally

Queue triggers and timer triggers work locally just like they do in Azure, as long as Azurite is running. To send a message to a local queue for testing, you can use the Azure Storage Explorer or a quick script.

```bash
# Use the Azure CLI to send a test message to a local queue via Azurite
# First, set the connection string to the local emulator
export AZURE_STORAGE_CONNECTION_STRING="UseDevelopmentStorage=true"

# Create a queue and send a message
az storage queue create --name myqueue
az storage message put --queue-name myqueue --content "Test message"
```

For timer triggers, the function will fire on the configured schedule. You can also trigger it manually by sending an HTTP POST to the admin endpoint.

```http
### Manually trigger a timer function
POST http://localhost:7071/admin/functions/MyTimerFunction
Content-Type: application/json

{}
```

## Step 9: Environment-Specific Configuration

Use `local.settings.json` for local settings and environment variables. This file should not be committed to source control (it is in `.gitignore` by default).

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=localhost;Database=mydb;Trusted_Connection=true;",
    "ApiKey": "local-dev-key",
    "FeatureFlags__NewFeature": "true"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*"
  }
}
```

## Recommended VS Code Settings

Add these to your workspace `.vscode/settings.json` for a better Azure Functions development experience.

```json
{
  "azureFunctions.deploySubpath": ".",
  "azureFunctions.projectLanguage": "C#",
  "azureFunctions.projectRuntime": "~4",
  "azureFunctions.preDeployTask": "publish",
  "files.exclude": {
    "bin": true,
    "obj": true,
    ".vs": true
  },
  "editor.formatOnSave": true
}
```

## Summary

A good local development setup for Azure Functions needs four things: the Core Tools runtime, proper VS Code extensions, a local storage emulator (Azurite), and correct debug configuration. Once these are in place, you get the full development loop - write code, set breakpoints, run the function, hit it with test requests, and iterate. This local-first approach is much faster than deploying to Azure for every change and gives you the same debugging capabilities you would have with any other application.
