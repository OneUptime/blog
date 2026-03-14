# How to Build a gRPC Service in Node.js and Deploy to Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Node.js, Azure, App Service, Microservices, TypeScript, Cloud

Description: Step-by-step guide to building a gRPC service in Node.js and deploying it to Azure App Service with proper configuration.

---

Building a gRPC service in Node.js is straightforward once you understand the tooling. Node.js, with its non-blocking I/O model, pairs well with gRPC's HTTP/2 transport for handling many concurrent connections efficiently. In this guide, we will build a gRPC service from scratch, test it locally, and then deploy it to Azure App Service.

Azure App Service is a fully managed platform for hosting web applications and APIs. While it is commonly associated with HTTP-based services, you can run gRPC workloads there by using a custom container. Let us walk through the entire process.

## Project Setup

Start by initializing a new Node.js project and installing the required packages.

```bash
# Initialize the project
mkdir grpc-node-service && cd grpc-node-service
npm init -y

# Install gRPC dependencies
npm install @grpc/grpc-js @grpc/proto-loader

# Install dev dependencies
npm install -D typescript @types/node ts-node
```

## Define the Protobuf Schema

Create a `proto` directory and define your service contract.

```protobuf
// proto/task.proto
// Defines a simple task management service
syntax = "proto3";

package taskservice;

// Represents a single task
message Task {
  string id = 1;
  string title = 2;
  string description = 3;
  bool completed = 4;
}

// Request to get a task by its ID
message GetTaskRequest {
  string id = 1;
}

// Request to create a new task
message CreateTaskRequest {
  string title = 1;
  string description = 2;
}

// Request to list all tasks
message ListTasksRequest {}

// Response containing a list of tasks
message ListTasksResponse {
  repeated Task tasks = 1;
}

// The TaskService with three RPC methods
service TaskService {
  rpc GetTask(GetTaskRequest) returns (Task);
  rpc CreateTask(CreateTaskRequest) returns (Task);
  rpc ListTasks(ListTasksRequest) returns (ListTasksResponse);
}
```

## Implement the Server

Now build the server that loads the proto definition and implements the service methods.

```javascript
// server.js
// gRPC server implementation for the TaskService
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { v4: uuidv4 } = require('uuid');

// Load the proto file with these options for better compatibility
const packageDefinition = protoLoader.loadSync('./proto/task.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const taskProto = grpc.loadPackageDefinition(packageDefinition).taskservice;

// In-memory storage for tasks
const tasks = new Map();

// Implementation of the GetTask RPC method
function getTask(call, callback) {
  const task = tasks.get(call.request.id);
  if (task) {
    callback(null, task);
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      message: `Task with id ${call.request.id} not found`,
    });
  }
}

// Implementation of the CreateTask RPC method
function createTask(call, callback) {
  const id = uuidv4();
  const task = {
    id,
    title: call.request.title,
    description: call.request.description,
    completed: false,
  };
  tasks.set(id, task);
  callback(null, task);
}

// Implementation of the ListTasks RPC method
function listTasks(call, callback) {
  const allTasks = Array.from(tasks.values());
  callback(null, { tasks: allTasks });
}

// Start the gRPC server
function main() {
  const server = new grpc.Server();

  // Register the service implementation
  server.addService(taskProto.TaskService.service, {
    getTask,
    createTask,
    listTasks,
  });

  // Bind to the port from the environment variable or default to 50051
  const port = process.env.PORT || 50051;
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind server:', err);
        return;
      }
      console.log(`gRPC server running on port ${boundPort}`);
    }
  );
}

main();
```

## Write a Client for Testing

Before deploying, let us create a simple client to verify everything works locally.

```javascript
// client.js
// Simple gRPC client for testing the TaskService
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync('./proto/task.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const taskProto = grpc.loadPackageDefinition(packageDefinition).taskservice;

// Connect to the local server
const client = new taskProto.TaskService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Create a task and then retrieve it
client.createTask(
  { title: 'Learn gRPC', description: 'Build a service and deploy it' },
  (err, response) => {
    if (err) {
      console.error('Error creating task:', err);
      return;
    }
    console.log('Created task:', response);

    // Now fetch it back by ID
    client.getTask({ id: response.id }, (err, task) => {
      if (err) {
        console.error('Error getting task:', err);
        return;
      }
      console.log('Retrieved task:', task);
    });
  }
);
```

Run the server in one terminal and the client in another to confirm it works.

```bash
# Terminal 1 - start the server
node server.js

# Terminal 2 - run the client
npm install uuid  # needed for the server
node client.js
```

## Containerize the Application

Azure App Service supports custom containers, which is the best way to run gRPC workloads there. Create a Dockerfile for the service.

```dockerfile
# Dockerfile for the gRPC Node.js service
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy the application code and proto files
COPY server.js ./
COPY proto/ ./proto/

# Expose the gRPC port
EXPOSE 50051

# Start the server
CMD ["node", "server.js"]
```

## Push to Azure Container Registry

Build and push the container image to ACR.

```bash
# Create a container registry if you do not have one
az acr create --resource-group myResourceGroup --name mygrpcregistry --sku Basic

# Log in to the registry
az acr login --name mygrpcregistry

# Build the image using ACR Tasks (builds in the cloud)
az acr build --registry mygrpcregistry --image grpc-task-service:v1 .
```

## Deploy to Azure App Service

Create an App Service plan and web app configured for container deployment.

```bash
# Create an App Service plan with Linux containers
az appservice plan create \
  --name grpc-service-plan \
  --resource-group myResourceGroup \
  --is-linux \
  --sku P1v3

# Create the web app with the container image
az webapp create \
  --resource-group myResourceGroup \
  --plan grpc-service-plan \
  --name grpc-task-service \
  --deployment-container-image-name mygrpcregistry.azurecr.io/grpc-task-service:v1

# Configure the app to use ACR credentials
az webapp config container set \
  --name grpc-task-service \
  --resource-group myResourceGroup \
  --docker-custom-image-name mygrpcregistry.azurecr.io/grpc-task-service:v1 \
  --docker-registry-server-url https://mygrpcregistry.azurecr.io

# Set the PORT environment variable
az webapp config appsettings set \
  --name grpc-task-service \
  --resource-group myResourceGroup \
  --settings PORT=50051
```

## Important: HTTP/2 Configuration

Azure App Service needs HTTP/2 enabled for gRPC to work. Configure it through the CLI.

```bash
# Enable HTTP/2 on the App Service
az webapp config set \
  --name grpc-task-service \
  --resource-group myResourceGroup \
  --http20-enabled true

# Also set the minimum TLS version for security
az webapp config set \
  --name grpc-task-service \
  --resource-group myResourceGroup \
  --min-tls-version 1.2
```

## Health Checks

For production deployments, add a health check endpoint. The simplest approach is to implement the gRPC Health Checking Protocol.

```javascript
// health.js
// Implements the standard gRPC health checking protocol
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load the standard health check proto
const healthProtoPath = require.resolve(
  'grpc-health-check/src/proto/health.proto'
);
const packageDefinition = protoLoader.loadSync(healthProtoPath);
const healthProto =
  grpc.loadPackageDefinition(packageDefinition).grpc.health.v1;

// Health check implementation
function check(call, callback) {
  callback(null, { status: 'SERVING' });
}

function watch(call) {
  call.write({ status: 'SERVING' });
}

module.exports = { check, watch, healthProto };
```

## Error Handling and Logging

In production, you want structured logging and proper error handling. Here is how to add an interceptor for logging.

```javascript
// interceptor.js
// Logs all incoming gRPC calls with timing information
function loggingInterceptor(methodDescriptor, nextCall) {
  return function (metadata, listener, next) {
    const startTime = Date.now();
    const method = methodDescriptor.path;

    console.log(JSON.stringify({
      level: 'info',
      message: 'gRPC call started',
      method,
      timestamp: new Date().toISOString(),
    }));

    // Wrap the listener to log when the call completes
    const wrappedListener = {
      ...listener,
      onReceiveStatus: (status) => {
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
          level: status.code === grpc.status.OK ? 'info' : 'error',
          message: 'gRPC call completed',
          method,
          statusCode: status.code,
          durationMs: duration,
        }));
        listener.onReceiveStatus(status);
      },
    };

    next(metadata, wrappedListener);
  };
}

module.exports = { loggingInterceptor };
```

## Continuous Deployment

Set up continuous deployment so that pushing a new image automatically updates the App Service.

```bash
# Enable continuous deployment from ACR
az webapp deployment container config \
  --name grpc-task-service \
  --resource-group myResourceGroup \
  --enable-cd true

# This returns a webhook URL that ACR can call on image push
# Configure ACR to notify App Service on new pushes
az acr webhook create \
  --name appServiceDeploy \
  --registry mygrpcregistry \
  --uri <WEBHOOK_URL_FROM_ABOVE> \
  --actions push
```

## Performance Tuning

A few tips for running gRPC efficiently on Azure App Service:

- **Keep-alive settings**: Configure gRPC keep-alive pings to prevent idle connections from being terminated by Azure's load balancer, which has a default idle timeout of 4 minutes.
- **Connection limits**: Node.js is single-threaded, so a single instance handles all connections on one event loop. For CPU-intensive workloads, consider using Node.js worker threads or scaling out to multiple instances.
- **Message size limits**: The default maximum message size in gRPC is 4MB. If your service handles larger payloads, increase this limit in the server options.

```javascript
// Server options for production tuning
const server = new grpc.Server({
  'grpc.max_receive_message_length': 10 * 1024 * 1024, // 10MB
  'grpc.max_send_message_length': 10 * 1024 * 1024,    // 10MB
  'grpc.keepalive_time_ms': 60000,                      // Send keepalive every 60s
  'grpc.keepalive_timeout_ms': 20000,                   // Wait 20s for keepalive ack
});
```

## Summary

We built a gRPC service in Node.js, containerized it, and deployed it to Azure App Service. The key steps were defining the protobuf contract, implementing the service handlers, packaging it in a Docker container, and enabling HTTP/2 on the App Service. Node.js works well for gRPC services that are I/O-bound, and Azure App Service gives you a managed hosting platform with automatic scaling and deployment options. For services that need more control over the infrastructure or request-level load balancing, consider Azure Kubernetes Service instead.
