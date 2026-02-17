# How to Create Azure Functions in JavaScript with HTTP and Blob Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, JavaScript, Serverless, HTTP Trigger, Blob Trigger, Node.js, Cloud Functions

Description: Learn how to create Azure Functions in JavaScript with HTTP and Blob triggers for building serverless APIs and automated file processing workflows.

---

Azure Functions lets you run JavaScript code in the cloud without managing servers. You write a function, define what triggers it, and Azure takes care of the rest. HTTP triggers turn your function into an API endpoint. Blob triggers fire whenever a file is uploaded to Azure Storage. Together, they cover two of the most common serverless patterns: lightweight APIs and automated file processing.

In this post, we will build Azure Functions in JavaScript using both HTTP and Blob triggers. We will use the v4 programming model, which is the latest and simplest way to write Azure Functions in Node.js.

## Setting Up the Project

Azure Functions v4 for Node.js uses a new programming model that is cleaner and more intuitive than previous versions.

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Create a new Functions project
func init blob-functions --javascript --model V4
cd blob-functions

# Install dependencies
npm install
```

The project structure looks like this:

```
blob-functions/
  src/
    functions/       # Your function files go here
  host.json          # Functions host configuration
  local.settings.json  # Local development settings
  package.json
```

## Configuring Local Settings

Update `local.settings.json` with your Azure Storage connection.

```json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=mystore;AccountKey=your-key;EndpointSuffix=core.windows.net",
        "FUNCTIONS_WORKER_RUNTIME": "node",
        "AzureWebJobsFeatureFlags": "EnableWorkerIndexing"
    }
}
```

For local development, you can use the Azure Storage Emulator or Azurite.

```bash
# Install and start Azurite for local storage emulation
npm install -g azurite
azurite --silent --location ./azurite-data
```

## Building HTTP-Triggered Functions

HTTP triggers are the most straightforward way to create serverless API endpoints.

```javascript
// src/functions/products.js
const { app } = require("@azure/functions");

// In-memory product store
const products = new Map();
products.set("1", { id: "1", name: "Laptop", price: 999.99, category: "Electronics" });
products.set("2", { id: "2", name: "Headphones", price: 79.99, category: "Electronics" });
products.set("3", { id: "3", name: "Coffee Maker", price: 49.99, category: "Kitchen" });

// GET /api/products - List all products
app.http("listProducts", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "products",
    handler: async (request, context) => {
        context.log("Listing all products");

        // Optional category filter from query string
        const category = request.query.get("category");

        let result = Array.from(products.values());
        if (category) {
            result = result.filter(p =>
                p.category.toLowerCase() === category.toLowerCase()
            );
        }

        return {
            jsonBody: result
        };
    }
});

// GET /api/products/:id - Get a single product
app.http("getProduct", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "products/{id}",
    handler: async (request, context) => {
        const id = request.params.id;
        context.log(`Getting product ${id}`);

        const product = products.get(id);
        if (!product) {
            return {
                status: 404,
                jsonBody: { error: "Product not found" }
            };
        }

        return { jsonBody: product };
    }
});

// POST /api/products - Create a product
app.http("createProduct", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "products",
    handler: async (request, context) => {
        const body = await request.json();
        context.log("Creating product:", body.name);

        if (!body.name || !body.price) {
            return {
                status: 400,
                jsonBody: { error: "Name and price are required" }
            };
        }

        const id = String(products.size + 1);
        const product = {
            id,
            name: body.name,
            price: body.price,
            category: body.category || "General",
            createdAt: new Date().toISOString()
        };

        products.set(id, product);

        return {
            status: 201,
            jsonBody: product
        };
    }
});

// DELETE /api/products/:id - Delete a product
app.http("deleteProduct", {
    methods: ["DELETE"],
    authLevel: "function",  // Requires a function key
    route: "products/{id}",
    handler: async (request, context) => {
        const id = request.params.id;

        if (!products.has(id)) {
            return {
                status: 404,
                jsonBody: { error: "Product not found" }
            };
        }

        products.delete(id);
        return { status: 204 };
    }
});
```

The v4 model uses `app.http()` to define HTTP-triggered functions. Each function specifies its HTTP methods, route, authentication level, and handler.

## Building Blob-Triggered Functions

Blob triggers fire whenever a file is created or updated in a specific Azure Storage container. This is useful for file processing pipelines.

```javascript
// src/functions/imageProcessor.js
const { app } = require("@azure/functions");

// Trigger when a new image is uploaded to the "uploads" container
app.storageBlob("processImage", {
    path: "uploads/{name}",  // Container name and blob name pattern
    connection: "AzureWebJobsStorage",  // Connection string setting name
    handler: async (blob, context) => {
        // context.triggerMetadata contains information about the blob
        const blobName = context.triggerMetadata.name;
        const blobSize = blob.length;

        context.log(`Processing blob: ${blobName}`);
        context.log(`Blob size: ${blobSize} bytes`);
        context.log(`Content type: ${context.triggerMetadata.properties?.contentType}`);

        // Check file size limit (e.g., reject files over 10 MB)
        if (blobSize > 10 * 1024 * 1024) {
            context.log(`Blob ${blobName} exceeds size limit, skipping`);
            return;
        }

        // Process the file based on its extension
        const extension = blobName.split(".").pop().toLowerCase();

        switch (extension) {
            case "jpg":
            case "jpeg":
            case "png":
                await processImage(blob, blobName, context);
                break;
            case "csv":
                await processCsv(blob, blobName, context);
                break;
            default:
                context.log(`Unsupported file type: ${extension}`);
        }
    }
});

async function processImage(blob, name, context) {
    context.log(`Processing image: ${name}`);
    // In a real app, you might:
    // - Generate thumbnails using sharp
    // - Extract EXIF metadata
    // - Run through an image classification model
    // - Write the processed result to another container
    context.log(`Image ${name} processed successfully`);
}

async function processCsv(blob, name, context) {
    // Convert buffer to string and parse CSV
    const content = blob.toString("utf8");
    const lines = content.split("\n");

    context.log(`CSV file ${name} has ${lines.length} lines`);

    // Process each line
    const headers = lines[0].split(",");
    context.log(`Headers: ${headers.join(", ")}`);

    // In a real app, you might insert rows into a database
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(",");
            context.log(`Row ${i}: ${values.join(", ")}`);
        }
    }
}
```

## Blob Input and Output Bindings

You can also use blob storage as input and output bindings alongside other triggers.

```javascript
// src/functions/copyBlob.js
const { app, input, output } = require("@azure/functions");

// Define the output binding for the processed container
const blobOutput = output.storageBlob({
    path: "processed/{name}",
    connection: "AzureWebJobsStorage"
});

// When a file lands in "uploads", process it and copy to "processed"
app.storageBlob("copyAndProcess", {
    path: "uploads/{name}",
    connection: "AzureWebJobsStorage",
    return: blobOutput,  // Return value goes to the output binding
    handler: async (blob, context) => {
        const blobName = context.triggerMetadata.name;
        context.log(`Copying blob ${blobName} to processed container`);

        // Transform the blob content
        // For text files, convert to uppercase as a simple example
        if (blobName.endsWith(".txt")) {
            const content = blob.toString("utf8");
            const processed = content.toUpperCase();
            return Buffer.from(processed);
        }

        // For other files, copy as-is
        return blob;
    }
});
```

## Combining HTTP and Blob Triggers

A common pattern is having an HTTP endpoint that uploads a file to blob storage, which then triggers a processing function.

```javascript
// src/functions/uploadEndpoint.js
const { app, output } = require("@azure/functions");

// Output binding to write the uploaded file to blob storage
const blobOutput = output.storageBlob({
    path: "uploads/{fileName}",
    connection: "AzureWebJobsStorage"
});

// HTTP endpoint for file uploads
app.http("uploadFile", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "upload/{fileName}",
    extraOutputs: [blobOutput],
    handler: async (request, context) => {
        const fileName = request.params.fileName;
        context.log(`Receiving upload: ${fileName}`);

        // Read the request body as a buffer
        const fileData = Buffer.from(await request.arrayBuffer());

        // Write to blob storage through the output binding
        context.extraOutputs.set(blobOutput, fileData);

        context.log(`File ${fileName} written to uploads container`);

        return {
            status: 201,
            jsonBody: {
                message: "File uploaded successfully",
                fileName: fileName,
                size: fileData.length
            }
        };
    }
});
```

The processing flow looks like this:

```mermaid
graph LR
    A[HTTP POST /api/upload/file.csv] --> B[Upload Function]
    B --> C[Blob Storage - uploads container]
    C -->|Blob Trigger| D[Process Function]
    D --> E[Blob Storage - processed container]
```

## Error Handling

Handle errors gracefully in your functions.

```javascript
// src/functions/robustProcessor.js
const { app } = require("@azure/functions");

app.storageBlob("robustProcessor", {
    path: "uploads/{name}",
    connection: "AzureWebJobsStorage",
    handler: async (blob, context) => {
        const blobName = context.triggerMetadata.name;

        try {
            context.log(`Processing ${blobName}`);

            // Validate the blob
            if (!blob || blob.length === 0) {
                context.log(`Empty blob detected: ${blobName}, skipping`);
                return;
            }

            // Process the blob
            await processBlob(blob, blobName);

            context.log(`Successfully processed ${blobName}`);
        } catch (error) {
            // Log the error with context for debugging
            context.error(`Failed to process ${blobName}: ${error.message}`);
            context.error(`Stack trace: ${error.stack}`);

            // Throw the error to trigger a retry
            // Azure Functions automatically retries blob triggers up to 5 times
            throw error;
        }
    }
});

async function processBlob(blob, name) {
    // Your processing logic here
    await new Promise(resolve => setTimeout(resolve, 1000));
}
```

## Local Development and Testing

Run your functions locally with the Azure Functions Core Tools.

```bash
# Start the local development server
func start

# Test HTTP endpoints
curl http://localhost:7071/api/products
curl -X POST http://localhost:7071/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Widget", "price": 9.99, "category": "Tools"}'

# Upload a file to trigger the blob function
curl -X POST http://localhost:7071/api/upload/test.txt \
  -H "Content-Type: text/plain" \
  -d "Hello from Azure Functions"
```

## Deploying to Azure

Deploy your functions to Azure.

```bash
# Create a resource group
az group create --name functions-demo-rg --location eastus

# Create a storage account for the function app
az storage account create \
  --name functionsdemostore \
  --resource-group functions-demo-rg \
  --location eastus \
  --sku Standard_LRS

# Create the function app
az functionapp create \
  --name my-blob-functions \
  --resource-group functions-demo-rg \
  --storage-account functionsdemostore \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4

# Deploy the functions
func azure functionapp publish my-blob-functions

# Create the blob containers
az storage container create --name uploads --account-name functionsdemostore
az storage container create --name processed --account-name functionsdemostore
```

## Wrapping Up

Azure Functions with JavaScript v4 provides a clean, simple model for building serverless applications. HTTP triggers give you instant API endpoints without infrastructure management. Blob triggers automate file processing pipelines with automatic retries. The v4 programming model with `app.http()` and `app.storageBlob()` is much more intuitive than previous versions. Start with HTTP triggers for your API endpoints, add blob triggers for file processing, and let Azure handle the scaling.
