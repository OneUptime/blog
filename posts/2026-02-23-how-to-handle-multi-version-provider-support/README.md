# How to Handle Multi-Version Provider Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Versioning, Compatibility, Infrastructure as Code

Description: Learn how to build custom Terraform providers that support multiple API versions and Terraform protocol versions while maintaining backward compatibility for all users.

---

As your infrastructure platform evolves, its API changes. New endpoints appear, old ones get deprecated, and request and response formats shift. Meanwhile, your Terraform provider needs to work across these different API versions while also supporting multiple Terraform versions. Managing this multi-version landscape is one of the more challenging aspects of provider development.

In this guide, we will cover strategies for supporting multiple API versions, managing Terraform protocol compatibility, and building a provider that works reliably across different version combinations.

## The Multi-Version Challenge

Provider developers face two types of version challenges:

1. **API version compatibility** - Your provider needs to work with different versions of the backend API
2. **Terraform protocol compatibility** - Your provider needs to work with different versions of Terraform itself

Both need careful handling to ensure a smooth experience for all users, regardless of their environment.

## Supporting Multiple API Versions

### Version Detection

Start by detecting which API version the backend supports:

```go
// internal/client/version.go
package client

import (
    "context"
    "fmt"
    "strings"
)

// APIVersion represents a supported API version
type APIVersion struct {
    Major int
    Minor int
}

// CompareVersion returns -1, 0, or 1 based on comparison
func (v APIVersion) Compare(other APIVersion) int {
    if v.Major != other.Major {
        if v.Major < other.Major {
            return -1
        }
        return 1
    }
    if v.Minor != other.Minor {
        if v.Minor < other.Minor {
            return -1
        }
        return 1
    }
    return 0
}

// IsAtLeast returns true if this version is >= the given version
func (v APIVersion) IsAtLeast(major, minor int) bool {
    return v.Compare(APIVersion{Major: major, Minor: minor}) >= 0
}

// Client with version awareness
type Client struct {
    httpClient *http.Client
    baseURL    string
    apiKey     string
    apiVersion APIVersion
}

// DetectAPIVersion queries the API to determine its version
func (c *Client) DetectAPIVersion(ctx context.Context) (APIVersion, error) {
    type versionResponse struct {
        Version string `json:"version"`
    }

    var resp versionResponse
    err := c.doRequest(ctx, "GET", "/api/version", nil, &resp)
    if err != nil {
        // If version endpoint does not exist, assume v1
        return APIVersion{Major: 1, Minor: 0}, nil
    }

    parts := strings.Split(resp.Version, ".")
    if len(parts) < 2 {
        return APIVersion{}, fmt.Errorf("invalid API version format: %s", resp.Version)
    }

    major, _ := strconv.Atoi(parts[0])
    minor, _ := strconv.Atoi(parts[1])

    return APIVersion{Major: major, Minor: minor}, nil
}
```

### Version-Aware CRUD Operations

Adapt your resource operations based on the detected API version:

```go
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Choose the API call based on the detected version
    if r.client.apiVersion.IsAtLeast(2, 0) {
        // Use v2 API with enhanced features
        server, err := r.createServerV2(ctx, &plan)
        if err != nil {
            resp.Diagnostics.AddError("Error Creating Server", err.Error())
            return
        }
        r.mapServerV2ToModel(server, &plan)
    } else {
        // Fall back to v1 API
        server, err := r.createServerV1(ctx, &plan)
        if err != nil {
            resp.Diagnostics.AddError("Error Creating Server", err.Error())
            return
        }
        r.mapServerV1ToModel(server, &plan)
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// createServerV1 uses the v1 API endpoint
func (r *ServerResource) createServerV1(ctx context.Context, plan *ServerResourceModel) (*api.ServerV1, error) {
    return r.client.CreateServerV1(ctx, &api.CreateServerV1Request{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
        Size:   plan.Size.ValueString(),
    })
}

// createServerV2 uses the v2 API endpoint with enhanced features
func (r *ServerResource) createServerV2(ctx context.Context, plan *ServerResourceModel) (*api.ServerV2, error) {
    req := &api.CreateServerV2Request{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
        Size:   plan.Size.ValueString(),
    }

    // V2-only features
    if !plan.Labels.IsNull() {
        labels := make(map[string]string)
        plan.Labels.ElementsAs(ctx, &labels, false)
        req.Labels = labels
    }

    return r.client.CreateServerV2(ctx, req)
}
```

### Conditional Schema Based on API Version

You can adjust the schema based on the API version to expose features only when the backend supports them:

```go
func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    attributes := map[string]schema.Attribute{
        "id": schema.StringAttribute{
            Computed: true,
        },
        "name": schema.StringAttribute{
            Required: true,
        },
        "region": schema.StringAttribute{
            Required: true,
        },
        "size": schema.StringAttribute{
            Required: true,
        },
    }

    // Add v2-only attributes if the API supports them
    if r.client != nil && r.client.apiVersion.IsAtLeast(2, 0) {
        attributes["labels"] = schema.MapAttribute{
            Optional:    true,
            ElementType: types.StringType,
            Description: "Labels for the server (requires API v2.0+).",
        }
        attributes["priority"] = schema.StringAttribute{
            Optional:    true,
            Description: "Server priority level (requires API v2.0+).",
        }
    }

    resp.Schema = schema.Schema{
        Description: "Manages a server instance.",
        Attributes:  attributes,
    }
}
```

## Version-Specific Request/Response Mapping

Create separate mapping functions for each API version to keep the code clean:

```go
// internal/provider/server_mappers.go

// mapServerV1ToModel converts a v1 API response to the Terraform model
func (r *ServerResource) mapServerV1ToModel(server *api.ServerV1, model *ServerResourceModel) {
    model.ID = types.StringValue(server.ID)
    model.Name = types.StringValue(server.Name)
    model.Region = types.StringValue(server.Region)
    model.Size = types.StringValue(server.Size)
    model.IPAddress = types.StringValue(server.IPAddress)
    model.Status = types.StringValue(server.Status)

    // V1 does not have labels or priority
    model.Labels = types.MapNull(types.StringType)
    model.Priority = types.StringNull()
}

// mapServerV2ToModel converts a v2 API response to the Terraform model
func (r *ServerResource) mapServerV2ToModel(server *api.ServerV2, model *ServerResourceModel) {
    model.ID = types.StringValue(server.ID)
    model.Name = types.StringValue(server.Name)
    model.Region = types.StringValue(server.Region)
    model.Size = types.StringValue(server.Size)
    model.IPAddress = types.StringValue(server.IPAddress)
    model.Status = types.StringValue(server.Status)

    // V2 includes labels and priority
    if server.Labels != nil {
        labelMap, _ := types.MapValueFrom(context.Background(), types.StringType, server.Labels)
        model.Labels = labelMap
    } else {
        model.Labels = types.MapNull(types.StringType)
    }

    if server.Priority != "" {
        model.Priority = types.StringValue(server.Priority)
    } else {
        model.Priority = types.StringNull()
    }
}
```

## Terraform Protocol Compatibility

Terraform uses a protocol to communicate with providers. The main protocol versions are:

- **Protocol 5** - Used by SDK v2
- **Protocol 6** - Used by the Plugin Framework

### Supporting Both Protocols

If you need to support both Terraform versions that use protocol 5 and protocol 6, use the mux server:

```go
// main.go
func main() {
    ctx := context.Background()

    // Protocol 6 server (Plugin Framework)
    frameworkServer := providerserver.NewProtocol6(provider.New(version)())

    // If you also have SDK v2 resources, include them
    // sdkServer := ... (upgrade from protocol 5)

    // Serve with protocol 6
    opts := providerserver.ServeOpts{
        Address: "registry.terraform.io/example/example",
    }

    err := providerserver.Serve(ctx, provider.New(version), opts)
    if err != nil {
        log.Fatal(err)
    }
}
```

### Terraform Version Constraints

Specify minimum Terraform version in your provider:

```go
func (p *ExampleProvider) Metadata(ctx context.Context, req provider.MetadataRequest, resp *provider.MetadataResponse) {
    resp.TypeName = "example"
    resp.Version = p.version
}
```

And in your documentation:

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    example = {
      source  = "example/example"
      version = "~> 2.0"
    }
  }
}
```

## Testing Multiple Versions

Set up your test matrix to cover different API versions:

```yaml
# .github/workflows/test.yml
jobs:
  acceptance-tests:
    strategy:
      matrix:
        api-version: ["v1", "v2"]
        terraform-version: ["1.5", "1.6", "1.7"]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ matrix.terraform-version }}

      - name: Run acceptance tests
        env:
          TF_ACC: "1"
          EXAMPLE_API_VERSION: ${{ matrix.api-version }}
          EXAMPLE_API_KEY: ${{ secrets.EXAMPLE_API_KEY }}
        run: go test ./internal/provider/ -v -timeout 60m
```

## Feature Flags

Use feature flags to conditionally enable functionality based on API capabilities:

```go
// internal/provider/features.go
type ProviderFeatures struct {
    SupportsLabels     bool
    SupportsPriority   bool
    SupportsBulkOps    bool
    SupportsWebhooks   bool
}

func DetectFeatures(apiVersion APIVersion) ProviderFeatures {
    return ProviderFeatures{
        SupportsLabels:   apiVersion.IsAtLeast(2, 0),
        SupportsPriority: apiVersion.IsAtLeast(2, 0),
        SupportsBulkOps:  apiVersion.IsAtLeast(2, 1),
        SupportsWebhooks: apiVersion.IsAtLeast(2, 2),
    }
}
```

## Best Practices

**Detect API version during Configure.** Query the API version once during provider configuration and cache it for all subsequent operations.

**Fail gracefully for unsupported features.** If a user tries to use a v2 feature with a v1 API, provide a clear error message explaining the minimum required version.

**Test against all supported versions.** Your CI matrix should cover every API version and Terraform version combination you support.

**Document version requirements.** Clearly state which API version is required for each feature in your attribute descriptions.

**Support at least two API versions.** When the backend releases v3, continue supporting v2 for a reasonable period.

**Use separate mapping functions.** Keep version-specific code isolated in separate functions to make maintenance easier.

## Conclusion

Supporting multiple versions adds complexity to your provider, but it is essential for serving a diverse user base. By detecting API versions at startup, adapting operations based on capabilities, and testing across version combinations, you can build a provider that works reliably regardless of the user's environment.

For more on provider versioning, see our guides on [versioning custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-version-custom-terraform-providers/view) and [handling breaking changes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-breaking-changes-in-custom-providers/view).
