# How to Create Azure Functions in Python with HTTP Triggers and Blob Storage Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Python, Serverless, HTTP Trigger, Blob Storage, Bindings, Cloud

Description: Build serverless Azure Functions in Python with HTTP triggers and Blob Storage input/output bindings for event-driven file processing.

---

Azure Functions lets you run code without thinking about servers. You write a function, define what triggers it (an HTTP request, a timer, a new message on a queue), and Azure handles the rest. The Python programming model v2 makes this even simpler with decorators that feel natural to Python developers. In this post, I will cover creating functions with HTTP triggers and Blob Storage bindings - a common pattern for APIs that process files.

## Setting Up Your Development Environment

You need the Azure Functions Core Tools and the Azure CLI.

```bash
# Install Azure Functions Core Tools (macOS)
brew tap azure/functions
brew install azure-functions-core-tools@4

# Or on Ubuntu
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/

# Verify installation
func --version
```

## Creating a New Function Project

The v2 programming model uses a single Python file with decorators instead of separate function.json files.

```bash
# Create a new function project
func init my-functions --python --model V2
cd my-functions

# Install dependencies
pip install -r requirements.txt
```

Your project structure looks like this:

```
my-functions/
    function_app.py    # All your functions live here
    requirements.txt
    host.json          # Global configuration
    local.settings.json  # Local environment variables
```

## Basic HTTP Trigger

Let me start with the simplest possible function - an HTTP endpoint that returns a greeting.

```python
# function_app.py
import azure.functions as func
import json
from datetime import datetime

app = func.FunctionApp()


@app.function_name(name="hello")
@app.route(route="hello", methods=["GET"])
def hello(req: func.HttpRequest) -> func.HttpResponse:
    """A simple HTTP trigger that returns a greeting."""
    name = req.params.get("name", "World")

    return func.HttpResponse(
        json.dumps({
            "message": f"Hello, {name}!",
            "timestamp": datetime.utcnow().isoformat()
        }),
        mimetype="application/json",
        status_code=200
    )
```

Run it locally to test.

```bash
# Start the function locally
func start

# Test it
curl "http://localhost:7071/api/hello?name=Azure"
# Returns: {"message": "Hello, Azure!", "timestamp": "2026-02-16T10:00:00"}
```

## HTTP Trigger with Request Body

For POST endpoints that accept JSON data:

```python
@app.function_name(name="create_order")
@app.route(route="orders", methods=["POST"])
def create_order(req: func.HttpRequest) -> func.HttpResponse:
    """Create a new order from JSON request body."""
    try:
        # Parse the JSON body
        body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON in request body"}),
            mimetype="application/json",
            status_code=400
        )

    # Validate required fields
    if "product" not in body or "quantity" not in body:
        return func.HttpResponse(
            json.dumps({"error": "product and quantity are required"}),
            mimetype="application/json",
            status_code=400
        )

    # Process the order (in real life, save to database)
    order = {
        "id": f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "product": body["product"],
        "quantity": body["quantity"],
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    return func.HttpResponse(
        json.dumps(order),
        mimetype="application/json",
        status_code=201
    )
```

## Blob Storage Output Binding

Output bindings let you write data to other Azure services without explicitly creating clients. Here is a function that receives data via HTTP and saves it to Blob Storage.

```python
@app.function_name(name="save_report")
@app.route(route="reports", methods=["POST"])
@app.blob_output(
    arg_name="outputblob",
    path="reports/{DateTime:yyyy}/{DateTime:MM}/{DateTime:dd}/{rand-guid}.json",
    connection="AzureWebJobsStorage"
)
def save_report(req: func.HttpRequest, outputblob: func.Out[str]) -> func.HttpResponse:
    """
    Receive a report via HTTP POST and save it to Blob Storage.
    The blob path includes the date for automatic organization.
    """
    try:
        report_data = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)

    # Add metadata to the report
    report_data["saved_at"] = datetime.utcnow().isoformat()
    report_data["source"] = "api"

    # Write to Blob Storage via the output binding
    outputblob.set(json.dumps(report_data, indent=2))

    return func.HttpResponse(
        json.dumps({"message": "Report saved to blob storage"}),
        mimetype="application/json",
        status_code=201
    )
```

The path template `reports/{DateTime:yyyy}/{DateTime:MM}/{DateTime:dd}/{rand-guid}.json` automatically organizes blobs by date with a unique filename.

## Blob Storage Input Binding

Input bindings let you read from Blob Storage. This example reads a configuration file from a blob when the function is triggered.

```python
@app.function_name(name="get_config")
@app.route(route="config/{filename}", methods=["GET"])
@app.blob_input(
    arg_name="configblob",
    path="config/{filename}",
    connection="AzureWebJobsStorage"
)
def get_config(req: func.HttpRequest, configblob: func.InputStream) -> func.HttpResponse:
    """
    Read a configuration file from Blob Storage.
    The filename comes from the URL path parameter.
    """
    if configblob is None:
        return func.HttpResponse(
            json.dumps({"error": "Configuration file not found"}),
            mimetype="application/json",
            status_code=404
        )

    # Read the blob content
    content = configblob.read().decode("utf-8")

    return func.HttpResponse(
        content,
        mimetype="application/json",
        status_code=200
    )
```

## Blob Trigger

Beyond bindings, you can trigger a function whenever a new blob is created. This is perfect for processing uploaded files.

```python
@app.function_name(name="process_upload")
@app.blob_trigger(
    arg_name="inputblob",
    path="uploads/{name}",
    connection="AzureWebJobsStorage"
)
@app.blob_output(
    arg_name="outputblob",
    path="processed/{name}",
    connection="AzureWebJobsStorage"
)
def process_upload(inputblob: func.InputStream, outputblob: func.Out[bytes]) -> None:
    """
    Triggered when a new file is uploaded to the 'uploads' container.
    Processes it and saves the result to the 'processed' container.
    """
    filename = inputblob.name
    file_size = inputblob.length

    print(f"Processing blob: {filename}, Size: {file_size} bytes")

    # Read the content
    content = inputblob.read()

    # Process the content (example: convert text to uppercase)
    if filename.endswith(".txt"):
        processed = content.decode("utf-8").upper().encode("utf-8")
    else:
        processed = content  # Pass through non-text files

    # Write to the output container
    outputblob.set(processed)
    print(f"Processed file saved: processed/{filename}")
```

## Configuring Local Settings

Your local.settings.json file holds the connection string for local development.

```json
{
    "IsEncrypted": false,
    "Values": {
        "FUNCTIONS_WORKER_RUNTIME": "python",
        "AzureWebJobsStorage": "UseDevelopmentStorage=true"
    }
}
```

For local development, `UseDevelopmentStorage=true` tells the SDK to use the Azurite storage emulator. Install and start it.

```bash
# Install Azurite
npm install -g azurite

# Start the emulator in a separate terminal
azurite --silent --location /tmp/azurite
```

## Deploying to Azure

Create the Azure resources and deploy.

```bash
# Create a resource group
az group create --name functions-rg --location eastus

# Create a storage account (required by Azure Functions)
az storage account create \
    --name myfuncsstorage \
    --resource-group functions-rg \
    --location eastus \
    --sku Standard_LRS

# Create the function app
az functionapp create \
    --name my-python-functions \
    --resource-group functions-rg \
    --storage-account myfuncsstorage \
    --consumption-plan-location eastus \
    --runtime python \
    --runtime-version 3.11 \
    --functions-version 4 \
    --os-type linux

# Deploy your code
func azure functionapp publish my-python-functions
```

## Testing the Deployed Functions

```bash
# Get the function URL
FUNC_URL=$(az functionapp show \
    --name my-python-functions \
    --resource-group functions-rg \
    --query "defaultHostName" -o tsv)

# Test the HTTP trigger
curl "https://$FUNC_URL/api/hello?name=Azure"

# Test the POST endpoint
curl -X POST "https://$FUNC_URL/api/reports" \
    -H "Content-Type: application/json" \
    -d '{"title": "Daily Metrics", "cpu_avg": 45.2, "memory_avg": 68.1}'
```

## Combining Multiple Bindings

The real power of Azure Functions comes from combining triggers and bindings. Here is a function that receives a file upload via HTTP, saves it to Blob Storage, and returns a download URL.

```python
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from datetime import timedelta

@app.function_name(name="upload_file")
@app.route(route="upload", methods=["POST"])
@app.blob_output(
    arg_name="outputblob",
    path="uploads/{rand-guid}.dat",
    connection="AzureWebJobsStorage"
)
def upload_file(req: func.HttpRequest, outputblob: func.Out[bytes]) -> func.HttpResponse:
    """
    Accept a file upload via HTTP and store it in Blob Storage.
    Returns the blob path for future reference.
    """
    # Read the uploaded file from the request body
    file_content = req.get_body()

    if len(file_content) == 0:
        return func.HttpResponse(
            json.dumps({"error": "No file content in request body"}),
            status_code=400,
            mimetype="application/json"
        )

    # Save to blob storage via output binding
    outputblob.set(file_content)

    return func.HttpResponse(
        json.dumps({
            "message": "File uploaded successfully",
            "size_bytes": len(file_content)
        }),
        mimetype="application/json",
        status_code=201
    )
```

## Monitoring and Debugging

Azure Functions integrates with Application Insights for monitoring.

```bash
# View function execution logs
func azure functionapp logstream my-python-functions

# Check function status in Azure
az functionapp function list \
    --name my-python-functions \
    --resource-group functions-rg \
    --output table
```

## Best Practices

1. **Keep functions small and focused.** Each function should do one thing well.
2. **Use bindings instead of SDK clients when possible.** Bindings handle connections and retries for you.
3. **Set appropriate timeouts.** The consumption plan has a 5-minute default timeout.
4. **Use async functions for I/O-heavy workloads** to improve throughput.
5. **Monitor cold starts.** The consumption plan can have cold starts of several seconds for Python functions.

## Wrapping Up

Azure Functions with the Python v2 programming model gives you a clean, decorator-based approach to serverless development. HTTP triggers handle your API endpoints, Blob Storage bindings handle file I/O, and blob triggers react to new files automatically. The combination lets you build event-driven architectures without managing any infrastructure.
