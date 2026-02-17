# How to Deploy Azure SignalR Service with Pulumi Python and Serverless Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Pulumi, Python, SignalR, Serverless, Real-Time, Infrastructure as Code

Description: Deploy Azure SignalR Service with serverless Azure Functions integration using Pulumi Python for real-time web application infrastructure.

---

Azure SignalR Service is a managed service for adding real-time functionality to web applications. It handles WebSocket connections, automatic reconnection, scaling, and message broadcasting so you do not have to build that infrastructure yourself. When combined with Azure Functions in serverless mode, you get a cost-effective real-time messaging backend that scales to zero when idle and handles thousands of concurrent connections when busy.

Pulumi with Python gives you a familiar programming language for defining this infrastructure. This post covers deploying SignalR Service, connecting it to Azure Functions, and configuring the complete serverless real-time stack.

## Project Setup

Create a new Pulumi project with Python.

```bash
# Create the project directory and initialize Pulumi
mkdir signalr-infrastructure && cd signalr-infrastructure
pulumi new azure-python

# Install additional dependencies
pip install pulumi-azure-native
```

## Deploying SignalR Service

Start with the SignalR Service instance and its supporting resources.

```python
# __main__.py
# Deploys Azure SignalR Service with serverless Azure Functions backend

import pulumi
import pulumi_azure_native as azure
from pulumi_azure_native import resources, signalrservice, web, storage, insights

# Configuration
config = pulumi.Config()
environment = config.get("environment") or "production"
location = config.get("location") or "eastus"

# Resource group
resource_group = resources.ResourceGroup(
    "signalr-rg",
    resource_group_name=f"rg-signalr-{environment}",
    location=location,
    tags={
        "environment": environment,
        "service": "real-time-messaging",
    },
)

# SignalR Service instance
signalr = signalrservice.SignalR(
    "signalr-service",
    resource_name=f"sigr-realtime-{environment}",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    # Serverless mode - no hub server needed, works with Azure Functions
    kind="SignalR",
    sku=signalrservice.ResourceSkuArgs(
        name="Standard_S1",  # Standard tier for production
        tier="Standard",
        capacity=1,  # Number of units, each handles 1000 concurrent connections
    ),
    # Service mode: Serverless for Azure Functions integration
    features=[
        signalrservice.SignalRFeatureArgs(
            flag="ServiceMode",
            value="Serverless",
        ),
        # Enable connectivity logs for debugging
        signalrservice.SignalRFeatureArgs(
            flag="EnableConnectivityLogs",
            value="True",
        ),
        # Enable messaging logs
        signalrservice.SignalRFeatureArgs(
            flag="EnableMessagingLogs",
            value="True",
        ),
    ],
    # CORS settings for the frontend application
    cors=signalrservice.SignalRCorsSettingsArgs(
        allowed_origins=[
            "https://www.example.com",
            "https://app.example.com",
        ],
    ),
    # Network ACLs
    network_ac_ls=signalrservice.SignalRNetworkACLsArgs(
        default_action="Deny",
        public_network=signalrservice.NetworkACLArgs(
            allow=[
                "ServerConnection",
                "ClientConnection",
                "RESTAPI",
            ],
        ),
    ),
    # Enable Azure AD authentication
    identity=signalrservice.ManagedIdentityArgs(
        type="SystemAssigned",
    ),
    tags={
        "environment": environment,
    },
)
```

## Storage and Application Insights

Azure Functions needs a storage account and Application Insights for monitoring.

```python
# Storage account for Azure Functions
function_storage = storage.StorageAccount(
    "func-storage",
    account_name=f"stfuncsigr{environment}01",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    sku=storage.SkuArgs(name="Standard_LRS"),
    kind="StorageV2",
    minimum_tls_version="TLS1_2",
    allow_blob_public_access=False,
    tags={"purpose": "functions-storage"},
)

# Application Insights for monitoring
app_insights = insights.Component(
    "app-insights",
    resource_name=f"ai-signalr-{environment}",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    kind="web",
    application_type="web",
    tags={"environment": environment},
)
```

## Azure Functions for SignalR

Deploy the Azure Functions app that serves as the serverless backend for SignalR.

```python
# App Service Plan (Consumption for serverless)
app_service_plan = web.AppServicePlan(
    "func-plan",
    name=f"asp-signalr-{environment}",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    sku=web.SkuDescriptionArgs(
        name="Y1",  # Consumption plan
        tier="Dynamic",
    ),
    kind="functionapp",
    reserved=True,  # Required for Linux
)

# Get storage connection string for the Functions app
storage_connection_string = pulumi.Output.all(
    resource_group.name, function_storage.name
).apply(
    lambda args: storage.list_storage_account_keys(
        resource_group_name=args[0],
        account_name=args[1],
    )
).apply(
    lambda keys: f"DefaultEndpointsProtocol=https;AccountName={function_storage.name};AccountKey={keys.keys[0].value};EndpointSuffix=core.windows.net"
)

# Get SignalR connection string
signalr_connection_string = pulumi.Output.all(
    resource_group.name, signalr.name
).apply(
    lambda args: signalrservice.list_signal_r_keys(
        resource_group_name=args[0],
        resource_name=args[1],
    )
).apply(lambda keys: keys.primary_connection_string)

# Azure Functions app
function_app = web.WebApp(
    "func-app",
    name=f"func-signalr-{environment}",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    server_farm_id=app_service_plan.id,
    kind="functionapp",
    # Managed identity for accessing other Azure services
    identity=web.ManagedServiceIdentityArgs(
        type="SystemAssigned",
    ),
    site_config=web.SiteConfigArgs(
        # Use Python runtime
        linux_fx_version="PYTHON|3.11",
        # App settings
        app_settings=[
            web.NameValuePairArgs(
                name="AzureWebJobsStorage",
                value=storage_connection_string,
            ),
            web.NameValuePairArgs(
                name="FUNCTIONS_EXTENSION_VERSION",
                value="~4",
            ),
            web.NameValuePairArgs(
                name="FUNCTIONS_WORKER_RUNTIME",
                value="python",
            ),
            web.NameValuePairArgs(
                name="APPINSIGHTS_INSTRUMENTATIONKEY",
                value=app_insights.instrumentation_key,
            ),
            # SignalR connection string
            web.NameValuePairArgs(
                name="AzureSignalRConnectionString",
                value=signalr_connection_string,
            ),
        ],
        # Minimum TLS version
        min_tls_version="1.2",
        # Always On not supported on Consumption plan
    ),
    https_only=True,
    tags={"environment": environment},
)
```

## SignalR Hub Functions

Here is what the Azure Functions code looks like for a typical SignalR serverless setup. This is the application code that you deploy separately from the infrastructure.

```python
# function_app.py
# Azure Functions that handle SignalR connections and messages

import azure.functions as func
import json
import logging

app = func.FunctionApp()

# Negotiate endpoint - clients call this to get a SignalR connection token
@app.route(route="negotiate", auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(
    arg_name="connectionInfo",
    type="signalRConnectionInfo",
    hub_name="chat",
    connection_string_setting="AzureSignalRConnectionString"
)
def negotiate(req: func.HttpRequest, connectionInfo) -> func.HttpResponse:
    """
    Returns SignalR connection info to the client.
    The client uses this to establish a WebSocket connection.
    """
    logging.info("Client requesting SignalR connection info")
    return func.HttpResponse(connectionInfo)


# Broadcast a message to all connected clients
@app.route(route="messages", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_output_binding(
    arg_name="signalRMessages",
    type="signalR",
    hub_name="chat",
    connection_string_setting="AzureSignalRConnectionString"
)
def broadcast(req: func.HttpRequest, signalRMessages: func.Out[str]) -> func.HttpResponse:
    """
    Receives a message via HTTP POST and broadcasts it
    to all connected SignalR clients.
    """
    body = req.get_json()

    message = {
        "target": "newMessage",
        "arguments": [
            {
                "sender": body.get("sender", "anonymous"),
                "text": body.get("text", ""),
                "timestamp": body.get("timestamp", ""),
            }
        ],
    }

    signalRMessages.set(json.dumps(message))
    logging.info(f"Message broadcast from {body.get('sender')}")

    return func.HttpResponse("Message sent", status_code=200)


# Send a message to a specific user
@app.route(route="messages/user/{userId}", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_output_binding(
    arg_name="signalRMessages",
    type="signalR",
    hub_name="chat",
    connection_string_setting="AzureSignalRConnectionString"
)
def send_to_user(req: func.HttpRequest, signalRMessages: func.Out[str]) -> func.HttpResponse:
    """
    Sends a message to a specific user identified by userId.
    """
    user_id = req.route_params.get("userId")
    body = req.get_json()

    message = {
        "userId": user_id,
        "target": "directMessage",
        "arguments": [body],
    }

    signalRMessages.set(json.dumps(message))
    return func.HttpResponse(f"Message sent to {user_id}", status_code=200)
```

## Custom Domain and Upstream Settings

For production, configure a custom domain and upstream URLs so SignalR routes events to your Functions.

```python
# Configure upstream URLs so SignalR sends events to Functions
signalr_with_upstream = signalrservice.SignalR(
    "signalr-with-upstream",
    resource_name=f"sigr-realtime-{environment}",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    kind="SignalR",
    sku=signalrservice.ResourceSkuArgs(
        name="Standard_S1",
        tier="Standard",
        capacity=1,
    ),
    features=[
        signalrservice.SignalRFeatureArgs(
            flag="ServiceMode",
            value="Serverless",
        ),
    ],
    # Upstream settings route SignalR events to Azure Functions
    upstream=signalrservice.ServerlessUpstreamSettingsArgs(
        templates=[
            signalrservice.UpstreamTemplateArgs(
                # Route all hub events to the Functions app
                hub_pattern="*",
                event_pattern="*",
                category_pattern="*",
                url_template=pulumi.Output.concat(
                    "https://", function_app.default_host_name,
                    "/runtime/webhooks/signalr?code=",
                    # The system key is needed for SignalR to call Functions
                    "{systemKey}"
                ),
            ),
        ],
    ),
    tags={"environment": environment},
)
```

## Outputs

Export values needed by the frontend application and other infrastructure.

```python
# Export important outputs
pulumi.export("signalr_hostname", signalr.host_name)
pulumi.export("signalr_public_port", signalr.public_port)
pulumi.export("function_app_url", function_app.default_host_name.apply(
    lambda hostname: f"https://{hostname}"
))
pulumi.export("negotiate_url", function_app.default_host_name.apply(
    lambda hostname: f"https://{hostname}/api/negotiate"
))
pulumi.export("resource_group_name", resource_group.name)
```

## Deploying

```bash
# Preview the deployment
pulumi preview

# Deploy everything
pulumi up

# Get the negotiate URL for the frontend
pulumi stack output negotiate_url
```

## Summary

Pulumi Python makes it straightforward to deploy Azure SignalR Service with a serverless Functions backend. The infrastructure includes the SignalR Service in serverless mode, a Consumption-plan Functions app with the SignalR connection string, and proper network and CORS configuration. The serverless mode means you only pay for messages sent and connections established, making it cost-effective for applications with variable traffic. With the infrastructure defined in Python, you get the full power of a programming language for configuration logic, making it easy to handle different environments and conditional settings.
