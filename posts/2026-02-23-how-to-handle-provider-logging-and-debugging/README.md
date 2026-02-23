# How to Handle Provider Logging and Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Logging, Debugging, Infrastructure as Code

Description: Learn how to implement structured logging and debugging support in custom Terraform providers using tflog, environment variables, and the debug server for interactive debugging.

---

When your Terraform provider misbehaves, logging and debugging are your primary tools for understanding what went wrong. Good logging helps users troubleshoot issues on their own, and debugging support helps you as a provider developer find and fix bugs quickly. The Terraform Plugin Framework provides a structured logging library called `tflog` and built-in support for attaching debuggers.

In this guide, we will cover how to implement effective logging in your provider, use environment variables to control log output, set up interactive debugging, and follow best practices for observable provider code.

## Understanding Terraform's Logging System

Terraform uses a structured logging system with several log levels:

| Level | Usage |
|-------|-------|
| TRACE | Very detailed diagnostic information |
| DEBUG | Detailed information for debugging |
| INFO | General operational information |
| WARN | Warning conditions that might need attention |
| ERROR | Error conditions (typically paired with diagnostics) |

Users control the log level with the `TF_LOG` environment variable:

```bash
# Show all log output
TF_LOG=TRACE terraform plan

# Show only warnings and errors
TF_LOG=WARN terraform plan

# Show only provider logs (not core Terraform logs)
TF_LOG_PROVIDER=DEBUG terraform plan

# Write logs to a file
TF_LOG=DEBUG TF_LOG_PATH=terraform.log terraform plan
```

## Using tflog for Structured Logging

The `tflog` package provides structured logging that integrates with Terraform's logging system:

```go
import (
    "context"
    "github.com/hashicorp/terraform-plugin-log/tflog"
)

func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Info-level log for normal operations
    tflog.Info(ctx, "Creating server", map[string]interface{}{
        "name":   plan.Name.ValueString(),
        "region": plan.Region.ValueString(),
        "size":   plan.Size.ValueString(),
    })

    server, err := r.client.CreateServer(ctx, &api.CreateServerRequest{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
        Size:   plan.Size.ValueString(),
    })
    if err != nil {
        // Error-level log before adding the diagnostic
        tflog.Error(ctx, "Failed to create server", map[string]interface{}{
            "name":  plan.Name.ValueString(),
            "error": err.Error(),
        })
        resp.Diagnostics.AddError("Error Creating Server", err.Error())
        return
    }

    // Debug-level log with response details
    tflog.Debug(ctx, "Server created successfully", map[string]interface{}{
        "server_id":  server.ID,
        "ip_address": server.IPAddress,
        "status":     server.Status,
    })

    // Trace-level for very detailed information
    tflog.Trace(ctx, "Full server response", map[string]interface{}{
        "response": fmt.Sprintf("%+v", server),
    })

    plan.ID = types.StringValue(server.ID)
    plan.IPAddress = types.StringValue(server.IPAddress)
    plan.Status = types.StringValue(server.Status)

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Setting Up Subsystem Logging

For larger providers, use subsystems to categorize log output:

```go
// internal/provider/provider.go
func (p *ExampleProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    // Create subsystem loggers for different components
    ctx = tflog.NewSubsystem(ctx, "api_client")
    ctx = tflog.NewSubsystem(ctx, "state_migration")

    // ... rest of configure
}

// internal/client/client.go
func (c *Client) CreateServer(ctx context.Context, req *CreateServerRequest) (*Server, error) {
    // Log using the api_client subsystem
    tflog.SubsystemDebug(ctx, "api_client", "Making create server request", map[string]interface{}{
        "url":    c.baseURL + "/servers",
        "method": "POST",
    })

    // ... make the request ...

    tflog.SubsystemDebug(ctx, "api_client", "Received response", map[string]interface{}{
        "status_code": resp.StatusCode,
        "duration_ms": elapsed.Milliseconds(),
    })

    return server, nil
}
```

Users can enable subsystem-specific logging:

```bash
# Only show api_client subsystem logs
TF_LOG_PROVIDER_EXAMPLE=DEBUG TF_LOG_PROVIDER_EXAMPLE_api_client=TRACE terraform plan
```

## Protecting Sensitive Data in Logs

Never log sensitive values like passwords or API keys. Use tflog's masking features:

```go
func (p *ExampleProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ExampleProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)

    // Mask sensitive fields globally
    ctx = tflog.MaskFieldValuesWithFieldKeys(ctx, "api_key", "password", "token", "secret")

    // Mask patterns in log messages
    ctx = tflog.MaskMessageRegexes(ctx,
        regexp.MustCompile(`Bearer\s+\S+`),
        regexp.MustCompile(`(?i)password=\S+`),
    )

    // Now any log entry with these field keys will be masked
    tflog.Debug(ctx, "Provider configured", map[string]interface{}{
        "api_url": apiURL,
        "api_key": apiKey, // This will be masked in output
    })
}
```

## Adding Context to Log Entries

Use `tflog.SetField` to add persistent context to all log entries within a scope:

```go
func (r *ServerResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    var state ServerResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)

    // Add the resource ID to all subsequent log entries
    ctx = tflog.SetField(ctx, "server_id", state.ID.ValueString())

    // All these log entries will automatically include server_id
    tflog.Debug(ctx, "Reading server state")

    server, err := r.client.GetServer(ctx, state.ID.ValueString())
    if err != nil {
        tflog.Error(ctx, "Failed to read server", map[string]interface{}{
            "error": err.Error(),
        })
        // The error log will include server_id automatically
        return
    }

    tflog.Debug(ctx, "Server state read successfully", map[string]interface{}{
        "status": server.Status,
    })
}
```

## Setting Up Interactive Debugging

The Plugin Framework supports attaching a debugger (like Delve) to your provider for step-by-step debugging.

### Enabling Debug Mode

Your provider's main function should support a `--debug` flag:

```go
// main.go
func main() {
    var debug bool
    flag.BoolVar(&debug, "debug", false, "set to true to run with debugger support")
    flag.Parse()

    opts := providerserver.ServeOpts{
        Address: "registry.terraform.io/example/example",
        Debug:   debug,
    }

    err := providerserver.Serve(context.Background(), provider.New(version), opts)
    if err != nil {
        log.Fatal(err)
    }
}
```

### Starting a Debug Session

```bash
# Build the provider
go build -gcflags="all=-N -l" -o terraform-provider-example

# Start the provider in debug mode
./terraform-provider-example --debug

# Output will be something like:
# Provider started. To attach Terraform CLI, set the TF_REATTACH_PROVIDERS
# environment variable with the following:
#
# TF_REATTACH_PROVIDERS='{"registry.terraform.io/example/example":{"Protocol":"grpc","ProtocolVersion":6,"Pid":12345,"Test":true,"Addr":{"Network":"unix","String":"/tmp/plugin12345"}}}'
```

### Attaching Terraform

In another terminal:

```bash
# Set the reattach variable
export TF_REATTACH_PROVIDERS='{"registry.terraform.io/example/example":...}'

# Run Terraform as normal - it will connect to your debug provider
terraform plan
```

### Using Delve for Step Debugging

```bash
# Start the provider under Delve
dlv exec ./terraform-provider-example -- --debug

# Set breakpoints
(dlv) break internal/provider/server_resource.go:42
(dlv) continue

# The provider will pause at your breakpoint when Terraform hits that code path
```

## Logging Best Practices for Different Operations

### Create Operations

```go
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    tflog.Info(ctx, "Creating resource")

    // Log the configuration being applied
    tflog.Debug(ctx, "Create configuration", map[string]interface{}{
        "name":   plan.Name.ValueString(),
        "region": plan.Region.ValueString(),
    })

    // Log API calls
    tflog.Debug(ctx, "Calling API to create server")

    // Log the result
    tflog.Info(ctx, "Resource created", map[string]interface{}{
        "id": server.ID,
    })
}
```

### Read Operations

```go
func (r *ServerResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    // Keep Read logs at DEBUG level since it runs frequently
    tflog.Debug(ctx, "Reading resource state")

    // Log not-found situations at WARN level
    if isNotFound(err) {
        tflog.Warn(ctx, "Resource not found, removing from state")
    }
}
```

### Update Operations

```go
func (r *ServerResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
    tflog.Info(ctx, "Updating resource")

    // Log what is changing
    tflog.Debug(ctx, "Planned changes", map[string]interface{}{
        "old_size": state.Size.ValueString(),
        "new_size": plan.Size.ValueString(),
    })
}
```

### Delete Operations

```go
func (r *ServerResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
    tflog.Info(ctx, "Deleting resource", map[string]interface{}{
        "id": state.ID.ValueString(),
    })

    // Log the API call
    tflog.Debug(ctx, "Calling API to delete server")

    // Log success
    tflog.Info(ctx, "Resource deleted successfully")
}
```

## Logging HTTP Requests and Responses

Create a logging transport for your HTTP client:

```go
// loggingTransport wraps an http.RoundTripper to log requests and responses
type loggingTransport struct {
    wrapped http.RoundTripper
}

func (t *loggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    ctx := req.Context()

    start := time.Now()

    tflog.Debug(ctx, "HTTP request", map[string]interface{}{
        "method": req.Method,
        "url":    req.URL.String(),
    })

    resp, err := t.wrapped.RoundTrip(req)

    duration := time.Since(start)

    if err != nil {
        tflog.Error(ctx, "HTTP request failed", map[string]interface{}{
            "method":      req.Method,
            "url":         req.URL.String(),
            "duration_ms": duration.Milliseconds(),
            "error":       err.Error(),
        })
        return resp, err
    }

    tflog.Debug(ctx, "HTTP response", map[string]interface{}{
        "method":      req.Method,
        "url":         req.URL.String(),
        "status_code": resp.StatusCode,
        "duration_ms": duration.Milliseconds(),
    })

    return resp, nil
}

// Use the logging transport in your client
func NewAPIClient(baseURL, apiKey string) *Client {
    return &Client{
        httpClient: &http.Client{
            Transport: &loggingTransport{
                wrapped: http.DefaultTransport,
            },
        },
        baseURL: baseURL,
        apiKey:  apiKey,
    }
}
```

## Best Practices

**Use appropriate log levels.** INFO for significant operations, DEBUG for details, TRACE for raw data.

**Include structured fields.** Always pass key-value pairs rather than formatting strings.

**Protect sensitive data.** Use `MaskFieldValuesWithFieldKeys` to prevent secrets from appearing in logs.

**Add context fields.** Use `SetField` to add resource IDs and other identifiers to all log entries in a scope.

**Log at operation boundaries.** Log at the start and end of each CRUD operation, and around API calls.

**Do not log in tight loops.** Avoid logging inside loops that iterate over many items. Log a summary instead.

**Support debug mode.** Include the `--debug` flag in your provider so developers can attach debuggers.

## Conclusion

Effective logging and debugging support make your Terraform provider easier to maintain and troubleshoot. By using structured logging with `tflog`, protecting sensitive data, and supporting interactive debugging, you create a provider that is transparent and diagnosable when issues arise.

For more on provider development, see our guides on [handling provider error messages](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-error-messages/view) and [testing with acceptance tests](https://oneuptime.com/blog/post/2026-02-23-how-to-test-custom-terraform-providers-with-acceptance-tests/view).
