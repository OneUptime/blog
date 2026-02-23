# How to Handle Sensitive Attributes in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Security, Sensitive Data, Infrastructure as Code

Description: Learn how to properly handle sensitive attributes like passwords, API keys, and tokens in custom Terraform providers to prevent accidental exposure in logs, plans, and state files.

---

Terraform providers frequently deal with sensitive data like passwords, API keys, tokens, and certificates. Handling this data incorrectly can lead to secrets being exposed in plan output, log files, or state files. The Terraform Plugin Framework provides built-in mechanisms to protect sensitive data, but you need to use them correctly to get proper security.

In this guide, we will cover how to mark attributes as sensitive, handle sensitive data in CRUD operations, prevent leaks in error messages and logs, and understand the limitations of Terraform's sensitive data handling.

## Understanding Sensitive Data in Terraform

When an attribute is marked as sensitive in Terraform, several things happen:

1. The value is hidden in `terraform plan` and `terraform apply` output
2. The value is redacted in the Terraform UI
3. The value is still stored in the state file (in plain text by default)
4. The value is protected from being passed to non-sensitive outputs

It is important to understand that marking an attribute as sensitive does not encrypt it. The state file still contains the raw value. For true security, use encrypted state backends like S3 with encryption or Terraform Cloud.

## Marking Attributes as Sensitive

In the Plugin Framework, mark attributes as sensitive in your schema:

```go
func (r *DatabaseResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a database instance.",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed: true,
            },
            "name": schema.StringAttribute{
                Required:    true,
                Description: "The database name.",
            },
            // Password is sensitive - will be hidden in plan/apply output
            "admin_password": schema.StringAttribute{
                Required:    true,
                Sensitive:   true,
                Description: "The admin password for the database. This value will not be displayed in plan output.",
            },
            // Connection string contains the password
            "connection_string": schema.StringAttribute{
                Computed:    true,
                Sensitive:   true,
                Description: "The full connection string including credentials.",
            },
            // API key for accessing the database
            "api_key": schema.StringAttribute{
                Computed:    true,
                Sensitive:   true,
                Description: "The API key generated for this database.",
            },
            // Non-sensitive computed attributes
            "endpoint": schema.StringAttribute{
                Computed:    true,
                Description: "The database endpoint URL (without credentials).",
            },
            "status": schema.StringAttribute{
                Computed:    true,
                Description: "The current database status.",
            },
        },
    }
}
```

With this schema, `terraform plan` will show:

```
# example_database.main will be created
+ resource "example_database" "main" {
    + admin_password    = (sensitive value)
    + api_key           = (known after apply)
    + connection_string = (known after apply)
    + endpoint          = (known after apply)
    + id                = (known after apply)
    + name              = "production-db"
    + status            = (known after apply)
  }
```

## Sensitive Nested Attributes

When dealing with nested structures that contain sensitive data, you can mark individual nested attributes as sensitive:

```go
"credentials": schema.SingleNestedAttribute{
    Required:    true,
    Description: "Database access credentials.",
    Attributes: map[string]schema.Attribute{
        "username": schema.StringAttribute{
            Required:    true,
            Description: "The username for database access.",
        },
        "password": schema.StringAttribute{
            Required:    true,
            Sensitive:   true,
            Description: "The password for database access.",
        },
        "certificate": schema.StringAttribute{
            Optional:    true,
            Sensitive:   true,
            Description: "The TLS certificate for mutual authentication.",
        },
    },
},
```

Or mark the entire nested attribute as sensitive if all its contents are secret:

```go
"encryption_config": schema.SingleNestedAttribute{
    Computed:    true,
    Sensitive:   true,
    Description: "Encryption configuration including keys. All values are sensitive.",
    Attributes: map[string]schema.Attribute{
        "key_id": schema.StringAttribute{
            Computed: true,
        },
        "key_material": schema.StringAttribute{
            Computed: true,
        },
        "algorithm": schema.StringAttribute{
            Computed: true,
        },
    },
},
```

## Handling Sensitive Data in CRUD Operations

When working with sensitive data in your CRUD operations, take care not to log or expose the values:

```go
func (r *DatabaseResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan DatabaseResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Log the operation without sensitive data
    tflog.Info(ctx, "Creating database", map[string]interface{}{
        "name": plan.Name.ValueString(),
        // Do NOT log the password or any sensitive values
    })

    // Create the database
    db, err := r.client.CreateDatabase(ctx, &api.CreateDatabaseRequest{
        Name:     plan.Name.ValueString(),
        Password: plan.AdminPassword.ValueString(),
    })
    if err != nil {
        resp.Diagnostics.AddError(
            "Error Creating Database",
            // Do NOT include the password in the error message
            fmt.Sprintf("Could not create database %q: %s", plan.Name.ValueString(), err),
        )
        return
    }

    // Store sensitive computed values
    plan.ID = types.StringValue(db.ID)
    plan.ConnectionString = types.StringValue(db.ConnectionString)
    plan.APIKey = types.StringValue(db.APIKey)
    plan.Endpoint = types.StringValue(db.Endpoint)
    plan.Status = types.StringValue(db.Status)

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Using tflog with Sensitive Data

The `tflog` package supports marking specific fields as sensitive to prevent them from appearing in debug logs:

```go
import "github.com/hashicorp/terraform-plugin-log/tflog"

func (r *DatabaseResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan DatabaseResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)

    // Mark fields as sensitive in the logging context
    // This prevents them from appearing in log output even at TRACE level
    ctx = tflog.SetField(ctx, "admin_password", plan.AdminPassword.ValueString())
    ctx = tflog.MaskFieldValuesWithFieldKeys(ctx, "admin_password")

    tflog.Info(ctx, "Creating database", map[string]interface{}{
        "name":   plan.Name.ValueString(),
        "region": plan.Region.ValueString(),
    })

    // ... rest of create logic ...
}

// For masking all sensitive fields globally in the provider
func (p *ExampleProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ExampleProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)

    // Mask the API key in all log output for this provider
    ctx = tflog.MaskFieldValuesWithFieldKeys(ctx, "api_key")

    // You can also mask specific log message values by regex
    ctx = tflog.MaskMessageRegexes(ctx, regexp.MustCompile(`(?i)(password|secret|token)=[^\s]+`))
}
```

## Write-Only Attributes

Some attributes, like passwords, should only be sent to the API during create or update but never read back. Handle these carefully:

```go
func (r *DatabaseResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    var state DatabaseResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    db, err := r.client.GetDatabase(ctx, state.ID.ValueString())
    if err != nil {
        // ... error handling ...
        return
    }

    // Update non-sensitive attributes from the API
    state.Name = types.StringValue(db.Name)
    state.Endpoint = types.StringValue(db.Endpoint)
    state.Status = types.StringValue(db.Status)

    // Do NOT overwrite the password from the API response
    // The API likely does not return it anyway
    // Keep the existing value from state
    // state.AdminPassword remains unchanged

    resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}
```

## Handling Sensitive Data in Import

When importing a resource, sensitive attributes typically cannot be recovered:

```go
func (r *DatabaseResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
    // Import the ID
    resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)

    // Add a warning about sensitive attributes
    resp.Diagnostics.AddWarning(
        "Sensitive Attributes Not Imported",
        "The admin_password attribute cannot be recovered during import. "+
            "You will need to set it in your configuration. "+
            "Terraform will detect a difference on the next plan.",
    )
}
```

## Provider Configuration Security

Handle provider-level sensitive attributes like API keys properly:

```go
func (p *ExampleProvider) Schema(ctx context.Context, req provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "api_key": schema.StringAttribute{
                Optional:  true,
                Sensitive: true,
                Description: "API key for authentication. " +
                    "Recommended: use the EXAMPLE_API_KEY environment variable instead of hardcoding.",
            },
        },
    }
}

func (p *ExampleProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ExampleProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)

    // Prefer environment variables for sensitive values
    apiKey := os.Getenv("EXAMPLE_API_KEY")
    if !config.APIKey.IsNull() {
        apiKey = config.APIKey.ValueString()

        // Warn if the API key is set in config (it will be in state)
        resp.Diagnostics.AddWarning(
            "API Key in Configuration",
            "The API key is set directly in the provider configuration. "+
                "This means it will be stored in the Terraform state file. "+
                "Consider using the EXAMPLE_API_KEY environment variable instead.",
        )
    }

    if apiKey == "" {
        resp.Diagnostics.AddError(
            "Missing API Key",
            "Set the EXAMPLE_API_KEY environment variable or configure api_key in the provider block.",
        )
        return
    }
}
```

## Preventing Sensitive Data Leaks in Error Messages

Always sanitize error messages to prevent accidental exposure of sensitive data:

```go
// sanitizeError removes potentially sensitive information from error messages
func sanitizeError(err error) string {
    message := err.Error()

    // Remove potential credentials from URLs
    re := regexp.MustCompile(`(https?://)[^:]+:[^@]+@`)
    message = re.ReplaceAllString(message, "${1}***:***@")

    // Remove potential tokens
    re = regexp.MustCompile(`(?i)(token|key|password|secret)=\S+`)
    message = re.ReplaceAllString(message, "${1}=***")

    return message
}
```

## Best Practices

**Mark all secrets as Sensitive.** Passwords, API keys, tokens, certificates, and connection strings should all be marked sensitive.

**Use environment variables for provider credentials.** Encourage users to use environment variables instead of hardcoding secrets in configurations.

**Never log sensitive values.** Use `tflog.MaskFieldValuesWithFieldKeys` to prevent secrets from appearing in debug logs.

**Sanitize error messages.** Strip sensitive data from error messages before passing them to diagnostics.

**Document sensitive attributes clearly.** Tell users which attributes are sensitive and how to manage them securely.

**Recommend encrypted state backends.** In your documentation, advise users to use encrypted state storage.

**Handle write-only attributes in Read.** Do not overwrite sensitive values with empty strings during Read operations.

## Conclusion

Proper handling of sensitive attributes is critical for building a trustworthy Terraform provider. By marking attributes as sensitive, protecting log output, sanitizing error messages, and guiding users toward secure practices, you can ensure that your provider handles secrets responsibly.

For more on provider development, see our guides on [implementing validation](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-validation-in-custom-providers/view) and [handling provider error messages](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-error-messages/view).
