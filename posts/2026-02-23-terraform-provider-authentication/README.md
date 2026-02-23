# How to Handle Provider Authentication in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Authentication, Provider Development, Go, Security, Infrastructure as Code

Description: Learn how to implement authentication in custom Terraform providers, supporting API keys, OAuth2, service accounts, and instance-based credentials securely.

---

Authentication is one of the most critical parts of a Terraform provider. It determines how your provider proves its identity to the underlying API and directly affects the security of your users' infrastructure. A well-designed authentication system supports multiple credential types, integrates with secrets management, and never exposes sensitive data in logs or state files.

This guide covers implementing authentication in custom Terraform providers, from simple API keys to complex OAuth2 flows and cloud instance-based credentials.

## Authentication Design Principles

Before writing code, establish these principles for your provider's authentication.

Support at least two authentication methods. Users running Terraform locally may prefer API keys, while CI/CD environments often use service accounts or environment-based credentials.

Never log credentials. Use the `Sensitive: true` attribute flag and be careful with debug logging to avoid exposing secrets.

Follow the principle of least privilege. Recommend that users create API credentials with only the permissions needed for the resources your provider manages.

## API Key Authentication

The simplest and most common authentication method is an API key passed as a header.

```go
package provider

import (
    "context"
    "net/http"
    "os"

    "github.com/hashicorp/terraform-plugin-framework/path"
    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/hashicorp/terraform-plugin-log/tflog"
)

type ProviderModel struct {
    APIKey   types.String `tfsdk:"api_key"`
    Endpoint types.String `tfsdk:"endpoint"`
}

func (p *MyProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "api_key": schema.StringAttribute{
                Description: "API key for authentication. Can also be set with the MYSERVICE_API_KEY environment variable.",
                Optional:    true,
                Sensitive:   true,  // Masks the value in plan output and logs
            },
            "endpoint": schema.StringAttribute{
                Description: "API endpoint URL.",
                Optional:    true,
            },
        },
    }
}

func (p *MyProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Resolve API key: config attribute takes priority over environment variable
    apiKey := os.Getenv("MYSERVICE_API_KEY")
    if !config.APIKey.IsNull() {
        apiKey = config.APIKey.ValueString()
    }

    if apiKey == "" {
        resp.Diagnostics.AddAttributeError(
            path.Root("api_key"),
            "Missing API Key",
            "Set the api_key attribute or the MYSERVICE_API_KEY environment variable.",
        )
        return
    }

    // Create an authenticated HTTP client
    transport := &apiKeyTransport{
        apiKey:    apiKey,
        transport: http.DefaultTransport,
    }

    httpClient := &http.Client{
        Transport: transport,
    }

    client := NewAPIClient(httpClient, resolveEndpoint(config.Endpoint))

    // Log that we configured successfully (but never log the key itself)
    tflog.Info(ctx, "Provider configured with API key authentication")

    resp.DataSourceData = client
    resp.ResourceData = client
}

// apiKeyTransport adds the API key header to every request
type apiKeyTransport struct {
    apiKey    string
    transport http.RoundTripper
}

func (t *apiKeyTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    // Clone the request to avoid modifying the original
    clone := req.Clone(req.Context())
    clone.Header.Set("Authorization", "Bearer "+t.apiKey)
    clone.Header.Set("User-Agent", "terraform-provider-myservice")
    return t.transport.RoundTrip(clone)
}
```

## OAuth2 Client Credentials Authentication

For APIs that use OAuth2, implement the client credentials flow to exchange a client ID and secret for an access token.

```go
type OAuth2ProviderModel struct {
    ClientID     types.String `tfsdk:"client_id"`
    ClientSecret types.String `tfsdk:"client_secret"`
    TokenURL     types.String `tfsdk:"token_url"`
    Scopes       types.List   `tfsdk:"scopes"`
    Endpoint     types.String `tfsdk:"endpoint"`
}

func (p *MyProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "client_id": schema.StringAttribute{
                Description: "OAuth2 client ID. Can be set with MYSERVICE_CLIENT_ID.",
                Optional:    true,
            },
            "client_secret": schema.StringAttribute{
                Description: "OAuth2 client secret. Can be set with MYSERVICE_CLIENT_SECRET.",
                Optional:    true,
                Sensitive:   true,
            },
            "token_url": schema.StringAttribute{
                Description: "OAuth2 token endpoint URL.",
                Optional:    true,
            },
            "scopes": schema.ListAttribute{
                Description: "OAuth2 scopes to request.",
                Optional:    true,
                ElementType: types.StringType,
            },
            "endpoint": schema.StringAttribute{
                Description: "API endpoint URL.",
                Optional:    true,
            },
        },
    }
}

func (p *MyProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config OAuth2ProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    clientID := resolveString(config.ClientID, "MYSERVICE_CLIENT_ID", "")
    clientSecret := resolveString(config.ClientSecret, "MYSERVICE_CLIENT_SECRET", "")
    tokenURL := resolveString(config.TokenURL, "MYSERVICE_TOKEN_URL", "https://auth.myservice.com/oauth/token")

    if clientID == "" || clientSecret == "" {
        resp.Diagnostics.AddError(
            "Missing OAuth2 Credentials",
            "Both client_id and client_secret must be configured.",
        )
        return
    }

    // Resolve scopes
    scopes := []string{"api:read", "api:write"}
    if !config.Scopes.IsNull() {
        resp.Diagnostics.Append(config.Scopes.ElementsAs(ctx, &scopes, false)...)
        if resp.Diagnostics.HasError() {
            return
        }
    }

    // Create OAuth2 authenticated client
    oauthConfig := &oauth2.Config{
        ClientID:     clientID,
        ClientSecret: clientSecret,
        TokenURL:     tokenURL,
        Scopes:       scopes,
    }

    // Use client credentials flow
    tokenSource := oauthConfig.TokenSource(ctx, &oauth2.Token{})

    // The oauth2 transport automatically refreshes tokens when they expire
    httpClient := oauth2.NewClient(ctx, tokenSource)

    // Verify we can get a token
    _, err := tokenSource.Token()
    if err != nil {
        resp.Diagnostics.AddError(
            "OAuth2 Authentication Failed",
            fmt.Sprintf("Could not obtain access token: %s\n\n"+
                "Verify your client_id and client_secret are correct.", err),
        )
        return
    }

    tflog.Info(ctx, "Provider configured with OAuth2 authentication")

    client := NewAPIClient(httpClient, resolveEndpoint(config.Endpoint))
    resp.DataSourceData = client
    resp.ResourceData = client
}
```

## Service Account File Authentication

Some providers support JSON key files, similar to Google Cloud service accounts.

```go
type ServiceAccountProviderModel struct {
    CredentialsFile types.String `tfsdk:"credentials_file"`
    Credentials     types.String `tfsdk:"credentials"`
    Endpoint        types.String `tfsdk:"endpoint"`
}

func (p *MyProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ServiceAccountProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    var credentialJSON []byte

    // Priority: inline credentials > file > environment variable
    if !config.Credentials.IsNull() {
        credentialJSON = []byte(config.Credentials.ValueString())
        tflog.Info(ctx, "Using inline credentials")
    } else {
        credFile := resolveString(config.CredentialsFile, "MYSERVICE_CREDENTIALS_FILE", "")
        if credFile != "" {
            var err error
            credentialJSON, err = os.ReadFile(credFile)
            if err != nil {
                resp.Diagnostics.AddError(
                    "Cannot Read Credentials File",
                    fmt.Sprintf("Could not read credentials file at %s: %s", credFile, err),
                )
                return
            }
            tflog.Info(ctx, "Using credentials from file", map[string]interface{}{
                "file": credFile,
            })
        }
    }

    if credentialJSON == nil {
        resp.Diagnostics.AddError(
            "No Credentials Found",
            "Configure credentials using the credentials attribute, "+
                "credentials_file attribute, or MYSERVICE_CREDENTIALS_FILE environment variable.",
        )
        return
    }

    // Parse the service account credentials
    var creds ServiceAccountCredentials
    if err := json.Unmarshal(credentialJSON, &creds); err != nil {
        resp.Diagnostics.AddError(
            "Invalid Credentials Format",
            fmt.Sprintf("Could not parse credentials JSON: %s", err),
        )
        return
    }

    // Create authenticated client from service account
    auth, err := NewServiceAccountAuth(creds)
    if err != nil {
        resp.Diagnostics.AddError(
            "Authentication Error",
            fmt.Sprintf("Could not create authenticated client: %s", err),
        )
        return
    }

    client := NewAPIClient(auth.HTTPClient(), resolveEndpoint(config.Endpoint))
    resp.DataSourceData = client
    resp.ResourceData = client
}
```

## Multi-Method Authentication with Fallback Chain

A production provider often needs to support all authentication methods with automatic fallback.

```go
func (p *MyProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Try authentication methods in order of priority
    authenticators := []struct {
        name string
        try  func() (Authenticator, error)
    }{
        {
            name: "API Key",
            try: func() (Authenticator, error) {
                key := resolveString(config.APIKey, "MYSERVICE_API_KEY", "")
                if key == "" {
                    return nil, fmt.Errorf("no API key configured")
                }
                return NewAPIKeyAuth(key), nil
            },
        },
        {
            name: "OAuth2 Client Credentials",
            try: func() (Authenticator, error) {
                clientID := resolveString(config.ClientID, "MYSERVICE_CLIENT_ID", "")
                clientSecret := resolveString(config.ClientSecret, "MYSERVICE_CLIENT_SECRET", "")
                if clientID == "" || clientSecret == "" {
                    return nil, fmt.Errorf("no OAuth2 credentials configured")
                }
                return NewOAuth2Auth(ctx, clientID, clientSecret)
            },
        },
        {
            name: "Service Account",
            try: func() (Authenticator, error) {
                credFile := resolveString(config.CredentialsFile, "MYSERVICE_CREDENTIALS_FILE", "")
                if credFile == "" {
                    return nil, fmt.Errorf("no credentials file configured")
                }
                return NewServiceAccountFileAuth(credFile)
            },
        },
        {
            name: "Instance Metadata",
            try: func() (Authenticator, error) {
                return NewInstanceMetadataAuth()
            },
        },
    }

    var auth Authenticator
    var authMethod string

    for _, a := range authenticators {
        result, err := a.try()
        if err != nil {
            tflog.Debug(ctx, fmt.Sprintf("Auth method %s not available: %s", a.name, err))
            continue
        }
        auth = result
        authMethod = a.name
        break
    }

    if auth == nil {
        resp.Diagnostics.AddError(
            "No Authentication Method Available",
            "The provider could not authenticate with any available method.\n\n"+
                "Configure one of the following:\n"+
                "  - api_key attribute or MYSERVICE_API_KEY environment variable\n"+
                "  - client_id + client_secret attributes or environment variables\n"+
                "  - credentials_file attribute or MYSERVICE_CREDENTIALS_FILE\n"+
                "  - Run on an instance with appropriate IAM role",
        )
        return
    }

    tflog.Info(ctx, "Provider authenticated", map[string]interface{}{
        "method": authMethod,
    })

    client := NewAPIClient(auth.HTTPClient(), resolveEndpoint(config.Endpoint))
    resp.DataSourceData = client
    resp.ResourceData = client
}
```

## Storing Credentials Securely

Guide your users toward secure credential management.

```hcl
# BAD: Credentials hardcoded in configuration
provider "myservice" {
  api_key = "sk-1234567890abcdef"  # Do not do this
}

# GOOD: Use environment variables
provider "myservice" {
  # Reads from MYSERVICE_API_KEY environment variable
}

# GOOD: Use a secrets manager
data "vault_generic_secret" "myservice" {
  path = "secret/myservice"
}

provider "myservice" {
  api_key = data.vault_generic_secret.myservice.data["api_key"]
}

# GOOD: Use Terraform variables with sensitive flag
variable "myservice_api_key" {
  type      = string
  sensitive = true
}

provider "myservice" {
  api_key = var.myservice_api_key
}
```

## Best Practices

Mark all credential attributes as `Sensitive: true`. This prevents Terraform from displaying them in plan output, CLI output, and logs.

Support environment variables for all credential attributes. This is the standard pattern for CI/CD environments where you cannot put secrets in HCL files.

Validate credentials early. Attempt a lightweight API call during Configure to verify the credentials work. Return a clear error message if they do not.

Never log credentials. Even at debug level, do not include API keys, tokens, or secrets in log messages. Log the authentication method but not the credential values.

Document which permissions the credentials need. Your provider documentation should specify the minimum required API permissions so users can create least-privilege credentials.

For more on provider configuration patterns, see our guide on [Implementing Provider Configuration in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-configuration/view).

## Conclusion

Authentication in Terraform providers must balance security with usability. By supporting multiple authentication methods, providing clear error messages, and following security best practices like marking attributes as sensitive and supporting environment variables, you build a provider that works securely across all deployment environments. The authentication fallback chain pattern gives users maximum flexibility while keeping the provider code clean and maintainable.
