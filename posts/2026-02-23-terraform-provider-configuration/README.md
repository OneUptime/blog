# How to Implement Provider Configuration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Configuration, Provider Development, Go, Infrastructure as Code

Description: Learn how to implement the Configure method in a Terraform provider to handle API client initialization, environment variables, default values, and provider aliases.

---

Provider configuration is where your Terraform provider connects to the underlying service. The Configure method reads the provider block from HCL, validates the settings, creates an API client, and shares that client with all resources and data sources. Getting this right means your provider works seamlessly in different environments - from local development to CI/CD pipelines to Terraform Cloud.

This guide covers implementing provider configuration in depth, including handling environment variable fallbacks, multiple authentication methods, provider aliases, and configuration validation.

## The Configure Lifecycle

When Terraform starts, it processes the provider block before anything else. The lifecycle is:

1. Terraform reads the `provider` block from HCL
2. The Schema method defines what attributes are valid
3. Terraform validates the configuration against the schema
4. The Configure method receives the validated configuration
5. Configure creates an API client and makes it available to resources

```go
// The Configure method is the bridge between user configuration and your API client
func (p *ExampleProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    // This method runs once per provider instance
    // It creates the API client that all resources will use
}
```

## Basic Configuration Implementation

Here is a complete, production-ready Configure implementation.

```go
package provider

import (
    "context"
    "fmt"
    "os"
    "strconv"

    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/hashicorp/terraform-plugin-log/tflog"
)

type CloudProvider struct {
    version string
}

type CloudProviderModel struct {
    APIEndpoint types.String `tfsdk:"api_endpoint"`
    APIKey      types.String `tfsdk:"api_key"`
    SecretKey   types.String `tfsdk:"secret_key"`
    Region      types.String `tfsdk:"region"`
    Timeout     types.Int64  `tfsdk:"timeout"`
    MaxRetries  types.Int64  `tfsdk:"max_retries"`
    Debug       types.Bool   `tfsdk:"debug"`
}

func (p *CloudProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Provider for managing CloudService resources.",
        Attributes: map[string]schema.Attribute{
            "api_endpoint": schema.StringAttribute{
                Description: "API endpoint URL. Defaults to the public API. Can be set with CLOUD_API_ENDPOINT.",
                Optional:    true,
            },
            "api_key": schema.StringAttribute{
                Description: "API key for authentication. Can be set with CLOUD_API_KEY.",
                Optional:    true,
                Sensitive:   true,
            },
            "secret_key": schema.StringAttribute{
                Description: "Secret key for authentication. Can be set with CLOUD_SECRET_KEY.",
                Optional:    true,
                Sensitive:   true,
            },
            "region": schema.StringAttribute{
                Description: "Default region for resources. Can be set with CLOUD_REGION.",
                Optional:    true,
            },
            "timeout": schema.Int64Attribute{
                Description: "API request timeout in seconds. Default is 60.",
                Optional:    true,
            },
            "max_retries": schema.Int64Attribute{
                Description: "Maximum number of API request retries. Default is 3.",
                Optional:    true,
            },
            "debug": schema.BoolAttribute{
                Description: "Enable verbose debug logging.",
                Optional:    true,
            },
        },
    }
}

func (p *CloudProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    tflog.Info(ctx, "Configuring CloudService provider")

    // Step 1: Read configuration from HCL
    var config CloudProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Step 2: Resolve values with environment variable fallbacks
    // Priority: HCL attribute > environment variable > default value

    apiEndpoint := resolveString(config.APIEndpoint, "CLOUD_API_ENDPOINT", "https://api.cloudservice.com/v2")
    apiKey := resolveString(config.APIKey, "CLOUD_API_KEY", "")
    secretKey := resolveString(config.SecretKey, "CLOUD_SECRET_KEY", "")
    region := resolveString(config.Region, "CLOUD_REGION", "us-east-1")
    timeout := resolveInt64(config.Timeout, "CLOUD_TIMEOUT", 60)
    maxRetries := resolveInt64(config.MaxRetries, "CLOUD_MAX_RETRIES", 3)
    debug := resolveBool(config.Debug, "CLOUD_DEBUG", false)

    // Step 3: Validate required values
    if apiKey == "" {
        resp.Diagnostics.AddAttributeError(
            path.Root("api_key"),
            "Missing API Key",
            "The provider cannot create the API client without an API key. "+
                "Set the api_key attribute in the provider block or the CLOUD_API_KEY environment variable.",
        )
    }

    if secretKey == "" {
        resp.Diagnostics.AddAttributeError(
            path.Root("secret_key"),
            "Missing Secret Key",
            "Set the secret_key attribute in the provider block or the CLOUD_SECRET_KEY environment variable.",
        )
    }

    if resp.Diagnostics.HasError() {
        return
    }

    // Step 4: Create the API client
    tflog.Debug(ctx, "Creating CloudService API client", map[string]interface{}{
        "endpoint":    apiEndpoint,
        "region":      region,
        "timeout":     timeout,
        "max_retries": maxRetries,
        "debug":       debug,
    })

    clientConfig := &ClientConfig{
        Endpoint:   apiEndpoint,
        APIKey:     apiKey,
        SecretKey:  secretKey,
        Region:     region,
        Timeout:    int(timeout),
        MaxRetries: int(maxRetries),
        Debug:      debug,
        UserAgent:  fmt.Sprintf("terraform-provider-cloud/%s", p.version),
    }

    client, err := NewCloudClient(clientConfig)
    if err != nil {
        resp.Diagnostics.AddError(
            "Unable to Create API Client",
            fmt.Sprintf("An error occurred while creating the API client: %s\n\n"+
                "Verify your API endpoint and credentials are correct.", err),
        )
        return
    }

    // Step 5: Optionally verify connectivity
    err = client.Ping(ctx)
    if err != nil {
        resp.Diagnostics.AddWarning(
            "API Connectivity Check Failed",
            fmt.Sprintf("Could not verify API connectivity: %s\n\n"+
                "The provider will attempt to connect when resources are managed.", err),
        )
    }

    // Step 6: Share the client with resources and data sources
    resp.DataSourceData = client
    resp.ResourceData = client

    tflog.Info(ctx, "CloudService provider configured successfully", map[string]interface{}{
        "endpoint": apiEndpoint,
        "region":   region,
    })
}

// Helper functions for resolving configuration with environment variable fallbacks

func resolveString(attr types.String, envVar string, defaultVal string) string {
    // Priority: explicit attribute > environment variable > default
    if !attr.IsNull() && !attr.IsUnknown() {
        return attr.ValueString()
    }
    if v := os.Getenv(envVar); v != "" {
        return v
    }
    return defaultVal
}

func resolveInt64(attr types.Int64, envVar string, defaultVal int64) int64 {
    if !attr.IsNull() && !attr.IsUnknown() {
        return attr.ValueInt64()
    }
    if v := os.Getenv(envVar); v != "" {
        if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
            return parsed
        }
    }
    return defaultVal
}

func resolveBool(attr types.Bool, envVar string, defaultVal bool) bool {
    if !attr.IsNull() && !attr.IsUnknown() {
        return attr.ValueBool()
    }
    if v := os.Getenv(envVar); v != "" {
        if parsed, err := strconv.ParseBool(v); err == nil {
            return parsed
        }
    }
    return defaultVal
}
```

## Supporting Multiple Authentication Methods

Many providers need to support several authentication methods: API keys, OAuth2 tokens, service account files, and instance metadata.

```go
func (p *CloudProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config CloudProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Try authentication methods in order of priority
    var auth Authenticator

    // Method 1: Explicit API key and secret
    apiKey := resolveString(config.APIKey, "CLOUD_API_KEY", "")
    secretKey := resolveString(config.SecretKey, "CLOUD_SECRET_KEY", "")
    if apiKey != "" && secretKey != "" {
        auth = NewAPIKeyAuth(apiKey, secretKey)
        tflog.Info(ctx, "Using API key authentication")
    }

    // Method 2: Service account JSON file
    if auth == nil {
        saFile := resolveString(config.ServiceAccountFile, "CLOUD_SERVICE_ACCOUNT_FILE", "")
        if saFile != "" {
            var err error
            auth, err = NewServiceAccountAuth(saFile)
            if err != nil {
                resp.Diagnostics.AddError(
                    "Invalid Service Account File",
                    fmt.Sprintf("Could not parse service account file %s: %s", saFile, err),
                )
                return
            }
            tflog.Info(ctx, "Using service account authentication")
        }
    }

    // Method 3: Instance metadata (for cloud-hosted Terraform)
    if auth == nil {
        metadataAuth, err := NewMetadataAuth()
        if err == nil {
            auth = metadataAuth
            tflog.Info(ctx, "Using instance metadata authentication")
        }
    }

    // No authentication method found
    if auth == nil {
        resp.Diagnostics.AddError(
            "No Authentication Configured",
            "The provider requires authentication. Configure one of:\n"+
                "  1. api_key and secret_key attributes (or CLOUD_API_KEY and CLOUD_SECRET_KEY env vars)\n"+
                "  2. service_account_file attribute (or CLOUD_SERVICE_ACCOUNT_FILE env var)\n"+
                "  3. Run on a cloud instance with appropriate IAM role",
        )
        return
    }

    client := NewCloudClient(auth, resolveString(config.APIEndpoint, "CLOUD_API_ENDPOINT", ""))
    resp.DataSourceData = client
    resp.ResourceData = client
}
```

## Handling Provider Aliases

Users can create multiple instances of a provider with different configurations using aliases.

```hcl
# User's Terraform configuration
provider "cloud" {
  region = "us-east-1"
}

provider "cloud" {
  alias  = "europe"
  region = "eu-west-1"
}

# Resource using the default provider
resource "cloud_server" "us_app" {
  name = "app-us"
}

# Resource using the aliased provider
resource "cloud_server" "eu_app" {
  provider = cloud.europe
  name     = "app-eu"
}
```

Your provider does not need special code for aliases. Terraform handles creating separate provider instances, each calling Configure independently with its own configuration. The key is that your Configure method is stateless and creates a new client each time it runs.

## Validating Configuration

Use the optional ValidateConfig interface for complex validation that spans multiple attributes.

```go
// Implement the ValidateConfig interface
var _ provider.ProviderWithValidateConfig = &CloudProvider{}

func (p *CloudProvider) ValidateConfig(ctx context.Context, req provider.ValidateConfigRequest, resp *provider.ValidateConfigResponse) {
    var config CloudProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Cross-attribute validation: if api_key is set, secret_key must also be set
    if !config.APIKey.IsNull() && config.SecretKey.IsNull() {
        resp.Diagnostics.AddAttributeError(
            path.Root("secret_key"),
            "Missing Secret Key",
            "When api_key is specified, secret_key must also be provided.",
        )
    }

    if config.APIKey.IsNull() && !config.SecretKey.IsNull() {
        resp.Diagnostics.AddAttributeError(
            path.Root("api_key"),
            "Missing API Key",
            "When secret_key is specified, api_key must also be provided.",
        )
    }

    // Validate endpoint format if provided
    if !config.APIEndpoint.IsNull() && !config.APIEndpoint.IsUnknown() {
        endpoint := config.APIEndpoint.ValueString()
        if !strings.HasPrefix(endpoint, "https://") {
            resp.Diagnostics.AddAttributeWarning(
                path.Root("api_endpoint"),
                "Insecure API Endpoint",
                "The API endpoint does not use HTTPS. This is not recommended for production use.",
            )
        }
    }
}
```

## Logging in Provider Configuration

Use structured logging to help users debug configuration issues.

```go
import "github.com/hashicorp/terraform-plugin-log/tflog"

func (p *CloudProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    // Add provider version to all log messages
    ctx = tflog.SetField(ctx, "provider_version", p.version)

    tflog.Info(ctx, "Starting provider configuration")

    // Log non-sensitive configuration details
    tflog.Debug(ctx, "Resolved configuration", map[string]interface{}{
        "endpoint":    apiEndpoint,
        "region":      region,
        "timeout":     timeout,
        "auth_method": authMethod,
        // Never log sensitive values like API keys
    })

    // Log warnings at the appropriate level
    tflog.Warn(ctx, "Using default API endpoint", map[string]interface{}{
        "endpoint": "https://api.cloudservice.com/v2",
    })
}
```

## Best Practices

Support environment variables for all configuration attributes. This lets users configure the provider without putting secrets in HCL files, which is essential for CI/CD environments.

Validate configuration eagerly. Check that required values are present and well-formed in Configure rather than waiting for the first resource operation to fail.

Use structured logging extensively. Users debugging configuration issues depend on clear log messages to understand what the provider is doing.

Make error messages actionable. Instead of "authentication failed," tell users which configuration attributes or environment variables they need to set.

Test configuration edge cases. Write acceptance tests that verify the provider works with environment variables, with explicit configuration, and with missing credentials.

For more on implementing the resources that consume this configuration, see our guide on [Implementing Resource CRUD Operations](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-crud-operations/view).

## Conclusion

Provider configuration is the entry point for every Terraform provider interaction. A well-implemented Configure method handles multiple authentication methods, supports environment variable fallbacks, validates eagerly with clear error messages, and creates an API client that resources and data sources can rely on. By following the patterns in this guide, you build a provider that works seamlessly across development, CI/CD, and production environments.
