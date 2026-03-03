# How to Create a Custom Terraform Provider from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Go, DevOps, Infrastructure as Code

Description: A step-by-step tutorial on creating a custom Terraform provider from scratch using Go, covering project setup, compilation, local testing, and publishing to the registry.

---

Creating a custom Terraform provider lets you manage any API or service as infrastructure code. While the existing ecosystem covers most cloud providers and popular SaaS tools, you will eventually encounter an internal service, a niche API, or a custom platform that needs Terraform support. This guide walks you through creating a provider from an empty directory to a working, testable binary.

We will build a provider for a fictional task management API to keep things practical. By the end, you will understand the complete lifecycle of provider development and be ready to build providers for your own APIs.

## Prerequisites

You need Go 1.21 or later installed on your machine, along with Terraform 1.5 or later. Familiarity with Go basics is helpful but not strictly required since we will explain each step.

## Project Structure

Every Terraform provider follows a standard directory layout.

```text
terraform-provider-taskmanager/
  internal/
    provider/
      provider.go          # Provider definition and configuration
      resource_task.go     # Task resource CRUD implementation
      data_source_task.go  # Task data source implementation
  main.go                  # Entry point
  go.mod                   # Go module definition
  go.sum                   # Dependency checksums
```

## Step 1: Initialize the Go Module

```bash
# Create the project directory
mkdir terraform-provider-taskmanager
cd terraform-provider-taskmanager

# Initialize the Go module
go mod init github.com/yourorg/terraform-provider-taskmanager

# Install the Terraform Plugin Framework
go get github.com/hashicorp/terraform-plugin-framework
go get github.com/hashicorp/terraform-plugin-go
```

## Step 2: Create the Entry Point

The main.go file is the binary's entry point. It starts the provider server that Terraform communicates with over gRPC.

```go
// main.go
package main

import (
    "context"
    "flag"
    "log"

    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/yourorg/terraform-provider-taskmanager/internal/provider"
)

// These variables are set during build time using ldflags
var (
    version string = "dev"
)

func main() {
    var debug bool

    // The debug flag enables the provider to run in debug mode
    // which allows attaching a debugger to the provider process
    flag.BoolVar(&debug, "debug", false, "set to true to run the provider with support for debuggers")
    flag.Parse()

    opts := providerserver.ServeOpts{
        Address: "registry.terraform.io/yourorg/taskmanager",
        Debug:   debug,
    }

    err := providerserver.Serve(context.Background(), provider.New(version), opts)
    if err != nil {
        log.Fatal(err.Error())
    }
}
```

## Step 3: Define the Provider

The provider file defines the configuration schema and creates an API client that resources and data sources use.

```go
// internal/provider/provider.go
package provider

import (
    "context"
    "net/http"

    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

// Ensure the implementation satisfies the expected interfaces
var _ provider.Provider = &TaskManagerProvider{}

// TaskManagerProvider defines the provider implementation
type TaskManagerProvider struct {
    version string
}

// TaskManagerProviderModel describes the provider data model
// These fields correspond to the provider block in HCL
type TaskManagerProviderModel struct {
    Endpoint types.String `tfsdk:"endpoint"`
    ApiKey   types.String `tfsdk:"api_key"`
}

// New returns a new provider factory function
// This is what main.go calls to create the provider
func New(version string) func() provider.Provider {
    return func() provider.Provider {
        return &TaskManagerProvider{
            version: version,
        }
    }
}

// Metadata returns the provider type name
func (p *TaskManagerProvider) Metadata(_ context.Context, _ provider.MetadataRequest, resp *provider.MetadataResponse) {
    resp.TypeName = "taskmanager"
    resp.Version = p.version
}

// Schema defines the provider-level configuration schema
func (p *TaskManagerProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Interact with the TaskManager API to manage tasks as infrastructure.",
        Attributes: map[string]schema.Attribute{
            "endpoint": schema.StringAttribute{
                Description: "The API endpoint URL for the TaskManager service.",
                Required:    true,
            },
            "api_key": schema.StringAttribute{
                Description: "API key for authenticating with the TaskManager service.",
                Required:    true,
                Sensitive:   true,
            },
        },
    }
}

// Configure prepares the API client for data sources and resources
func (p *TaskManagerProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config TaskManagerProviderModel

    // Read the provider configuration from the Terraform file
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Create an API client with the provided configuration
    client := &TaskManagerClient{
        Endpoint:   config.Endpoint.ValueString(),
        ApiKey:     config.ApiKey.ValueString(),
        HTTPClient: &http.Client{},
    }

    // Make the client available to resources and data sources
    resp.DataSourceData = client
    resp.ResourceData = client
}

// Resources defines the resources implemented in the provider
func (p *TaskManagerProvider) Resources(_ context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        NewTaskResource,
    }
}

// DataSources defines the data sources implemented in the provider
func (p *TaskManagerProvider) DataSources(_ context.Context) []func() datasource.DataSource {
    return []func() datasource.DataSource{
        NewTaskDataSource,
    }
}

// TaskManagerClient is the API client used by resources and data sources
type TaskManagerClient struct {
    Endpoint   string
    ApiKey     string
    HTTPClient *http.Client
}
```

## Step 4: Implement the Task Resource

The resource implementation handles Create, Read, Update, and Delete operations.

```go
// internal/provider/resource_task.go
package provider

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

// Ensure the implementation satisfies the expected interfaces
var _ resource.Resource = &TaskResource{}
var _ resource.ResourceWithImportState = &TaskResource{}

// TaskResource defines the resource implementation
type TaskResource struct {
    client *TaskManagerClient
}

// TaskResourceModel describes the resource data model
type TaskResourceModel struct {
    ID          types.String `tfsdk:"id"`
    Title       types.String `tfsdk:"title"`
    Description types.String `tfsdk:"description"`
    Status      types.String `tfsdk:"status"`
    Priority    types.Int64  `tfsdk:"priority"`
    Assignee    types.String `tfsdk:"assignee"`
    CreatedAt   types.String `tfsdk:"created_at"`
    UpdatedAt   types.String `tfsdk:"updated_at"`
}

// NewTaskResource creates a new resource instance
func NewTaskResource() resource.Resource {
    return &TaskResource{}
}

// Metadata sets the resource type name
func (r *TaskResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
    resp.TypeName = req.ProviderTypeName + "_task"
}

// Schema defines the resource attributes
func (r *TaskResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a task in the TaskManager system.",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Description: "The unique identifier of the task.",
                Computed:    true,
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.UseStateForUnknown(),
                },
            },
            "title": schema.StringAttribute{
                Description: "The title of the task.",
                Required:    true,
            },
            "description": schema.StringAttribute{
                Description: "Detailed description of the task.",
                Optional:    true,
            },
            "status": schema.StringAttribute{
                Description: "Current status of the task (open, in_progress, done).",
                Optional:    true,
                Computed:    true,
            },
            "priority": schema.Int64Attribute{
                Description: "Priority level from 1 (highest) to 5 (lowest).",
                Optional:    true,
                Computed:    true,
            },
            "assignee": schema.StringAttribute{
                Description: "Email of the person assigned to this task.",
                Optional:    true,
            },
            "created_at": schema.StringAttribute{
                Description: "Timestamp when the task was created.",
                Computed:    true,
            },
            "updated_at": schema.StringAttribute{
                Description: "Timestamp when the task was last updated.",
                Computed:    true,
            },
        },
    }
}

// Configure stores the provider client for use in CRUD methods
func (r *TaskResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
    if req.ProviderData == nil {
        return
    }

    client, ok := req.ProviderData.(*TaskManagerClient)
    if !ok {
        resp.Diagnostics.AddError(
            "Unexpected Resource Configure Type",
            "Expected *TaskManagerClient, got something else.",
        )
        return
    }

    r.client = client
}

// Create handles creating a new task
func (r *TaskResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan TaskResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Build the API request body
    taskData := map[string]interface{}{
        "title": plan.Title.ValueString(),
    }
    if !plan.Description.IsNull() {
        taskData["description"] = plan.Description.ValueString()
    }
    if !plan.Status.IsNull() {
        taskData["status"] = plan.Status.ValueString()
    }
    if !plan.Priority.IsNull() {
        taskData["priority"] = plan.Priority.ValueInt64()
    }
    if !plan.Assignee.IsNull() {
        taskData["assignee"] = plan.Assignee.ValueString()
    }

    body, _ := json.Marshal(taskData)

    // Make the API call
    httpReq, _ := http.NewRequest("POST", r.client.Endpoint+"/api/tasks", bytes.NewReader(body))
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+r.client.ApiKey)

    httpResp, err := r.client.HTTPClient.Do(httpReq)
    if err != nil {
        resp.Diagnostics.AddError("API Error", fmt.Sprintf("Unable to create task: %s", err))
        return
    }
    defer httpResp.Body.Close()

    // Parse the response
    var result map[string]interface{}
    respBody, _ := io.ReadAll(httpResp.Body)
    json.Unmarshal(respBody, &result)

    // Set the state from the API response
    plan.ID = types.StringValue(result["id"].(string))
    plan.Status = types.StringValue(result["status"].(string))
    plan.CreatedAt = types.StringValue(result["created_at"].(string))
    plan.UpdatedAt = types.StringValue(result["updated_at"].(string))

    if priority, ok := result["priority"].(float64); ok {
        plan.Priority = types.Int64Value(int64(priority))
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Read refreshes the Terraform state with the latest data
func (r *TaskResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    var state TaskResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Fetch the current state from the API
    httpReq, _ := http.NewRequest("GET",
        r.client.Endpoint+"/api/tasks/"+state.ID.ValueString(), nil)
    httpReq.Header.Set("Authorization", "Bearer "+r.client.ApiKey)

    httpResp, err := r.client.HTTPClient.Do(httpReq)
    if err != nil {
        resp.Diagnostics.AddError("API Error", fmt.Sprintf("Unable to read task: %s", err))
        return
    }
    defer httpResp.Body.Close()

    if httpResp.StatusCode == 404 {
        // Resource no longer exists, remove from state
        resp.State.RemoveResource(ctx)
        return
    }

    var result map[string]interface{}
    body, _ := io.ReadAll(httpResp.Body)
    json.Unmarshal(body, &result)

    // Update state with fresh data
    state.Title = types.StringValue(result["title"].(string))
    state.Status = types.StringValue(result["status"].(string))
    state.UpdatedAt = types.StringValue(result["updated_at"].(string))

    resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

// Update handles modifying an existing task
func (r *TaskResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
    var plan TaskResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    taskData := map[string]interface{}{
        "title": plan.Title.ValueString(),
    }
    if !plan.Description.IsNull() {
        taskData["description"] = plan.Description.ValueString()
    }
    if !plan.Status.IsNull() {
        taskData["status"] = plan.Status.ValueString()
    }

    body, _ := json.Marshal(taskData)

    httpReq, _ := http.NewRequest("PUT",
        r.client.Endpoint+"/api/tasks/"+plan.ID.ValueString(),
        bytes.NewReader(body))
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+r.client.ApiKey)

    httpResp, err := r.client.HTTPClient.Do(httpReq)
    if err != nil {
        resp.Diagnostics.AddError("API Error", fmt.Sprintf("Unable to update task: %s", err))
        return
    }
    defer httpResp.Body.Close()

    var result map[string]interface{}
    respBody, _ := io.ReadAll(httpResp.Body)
    json.Unmarshal(respBody, &result)

    plan.UpdatedAt = types.StringValue(result["updated_at"].(string))

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Delete removes the task from the API
func (r *TaskResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
    var state TaskResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    httpReq, _ := http.NewRequest("DELETE",
        r.client.Endpoint+"/api/tasks/"+state.ID.ValueString(), nil)
    httpReq.Header.Set("Authorization", "Bearer "+r.client.ApiKey)

    _, err := r.client.HTTPClient.Do(httpReq)
    if err != nil {
        resp.Diagnostics.AddError("API Error", fmt.Sprintf("Unable to delete task: %s", err))
        return
    }
}

// ImportState handles terraform import
func (r *TaskResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
    resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}
```

## Step 5: Build and Test Locally

```bash
# Build the provider binary
go build -o terraform-provider-taskmanager

# Create the local provider directory
mkdir -p ~/.terraform.d/plugins/registry.terraform.io/yourorg/taskmanager/0.1.0/darwin_arm64

# Copy the binary (adjust OS/arch as needed)
cp terraform-provider-taskmanager ~/.terraform.d/plugins/registry.terraform.io/yourorg/taskmanager/0.1.0/darwin_arm64/
```

Create a test configuration to verify the provider works.

```hcl
# test/main.tf
terraform {
  required_providers {
    taskmanager = {
      source  = "yourorg/taskmanager"
      version = "0.1.0"
    }
  }
}

provider "taskmanager" {
  endpoint = "http://localhost:8080"
  api_key  = "test-api-key"
}

resource "taskmanager_task" "example" {
  title       = "My first managed task"
  description = "Created by Terraform"
  status      = "open"
  priority    = 1
  assignee    = "developer@company.com"
}

output "task_id" {
  value = taskmanager_task.example.id
}
```

## Step 6: Run Your Provider

```bash
cd test
terraform init
terraform plan
terraform apply
```

## Best Practices

Use the Terraform Plugin Framework rather than the older SDKv2 for new providers. The framework provides better type safety and a more modern development experience.

Implement comprehensive error handling. Every API call can fail, and your provider should return clear, actionable error messages.

Add acceptance tests that run against a real or mocked API. Terraform provides testing utilities specifically designed for provider testing.

Version your provider using semantic versioning. Breaking changes to the schema should increment the major version.

For more on Terraform provider concepts, see our guide on [Terraform Plugin Framework](https://oneuptime.com/blog/post/2026-02-23-terraform-plugin-framework/view).

## Conclusion

Building a custom Terraform provider is a structured process that follows clear patterns. You define a provider with configuration, create resources with CRUD operations, and expose data sources for reading existing infrastructure. The Go-based Plugin Framework handles the gRPC communication, serialization, and state management so you can focus on implementing the business logic that interacts with your API. Start with a single resource, get it working end to end, and then expand your provider's capabilities from there.
