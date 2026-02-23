# How to Use the Terraform Plugin SDK v2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Plugin SDK, Provider Development, Go, Infrastructure as Code

Description: Learn how to use the Terraform Plugin SDK v2 to build and maintain Terraform providers, understanding the schema system, CRUD functions, and migration path to the Plugin Framework.

---

The Terraform Plugin SDK v2 is the original toolkit for building Terraform providers. While HashiCorp now recommends the newer Plugin Framework for new providers, hundreds of existing providers still use SDKv2, and understanding it is essential for maintaining them. If you are working on an existing provider or need to understand how most community providers are built, this guide covers the SDKv2 patterns you need to know.

## When to Use SDKv2 vs Plugin Framework

Use SDKv2 if you are maintaining an existing provider that already uses it, or if you need to use a community library that only supports SDKv2. Use the Plugin Framework for all new provider development. HashiCorp provides a migration path from SDKv2 to the Framework using the mux server, which lets you run both side by side during a gradual migration.

## Setting Up a SDKv2 Provider

```go
// main.go
package main

import (
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
    "github.com/hashicorp/terraform-plugin-sdk/v2/plugin"
    "github.com/yourorg/terraform-provider-example/internal/provider"
)

func main() {
    plugin.Serve(&plugin.ServeOpts{
        ProviderFunc: provider.Provider,
    })
}
```

The provider definition in SDKv2 uses a function that returns a `*schema.Provider`.

```go
// internal/provider/provider.go
package provider

import (
    "context"

    "github.com/hashicorp/terraform-plugin-sdk/v2/diag"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

// Provider returns the Terraform provider configuration
func Provider() *schema.Provider {
    return &schema.Provider{
        // Provider-level configuration schema
        Schema: map[string]*schema.Schema{
            "api_url": {
                Type:        schema.TypeString,
                Required:    true,
                Description: "The API endpoint URL.",
                DefaultFunc: schema.EnvDefaultFunc("EXAMPLE_API_URL", nil),
            },
            "api_key": {
                Type:        schema.TypeString,
                Required:    true,
                Sensitive:   true,
                Description: "API authentication key.",
                DefaultFunc: schema.EnvDefaultFunc("EXAMPLE_API_KEY", nil),
            },
            "timeout": {
                Type:        schema.TypeInt,
                Optional:    true,
                Default:     30,
                Description: "Request timeout in seconds.",
            },
        },

        // Resources this provider supports
        ResourcesMap: map[string]*schema.Resource{
            "example_server":   resourceServer(),
            "example_database": resourceDatabase(),
            "example_network":  resourceNetwork(),
        },

        // Data sources this provider supports
        DataSourcesMap: map[string]*schema.Resource{
            "example_server":  dataSourceServer(),
            "example_servers": dataSourceServers(),
        },

        // ConfigureContextFunc creates the API client
        ConfigureContextFunc: providerConfigure,
    }
}

// providerConfigure creates the API client from provider configuration
func providerConfigure(ctx context.Context, d *schema.ResourceData) (interface{}, diag.Diagnostics) {
    apiURL := d.Get("api_url").(string)
    apiKey := d.Get("api_key").(string)
    timeout := d.Get("timeout").(int)

    // Create the API client
    client := NewAPIClient(apiURL, apiKey, timeout)

    // Verify connectivity
    err := client.Ping(ctx)
    if err != nil {
        return nil, diag.FromErr(err)
    }

    return client, nil
}
```

## Defining Resource Schemas

SDKv2 uses maps of `*schema.Schema` to define resource attributes.

```go
// internal/provider/resource_server.go
package provider

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-sdk/v2/diag"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/validation"
)

func resourceServer() *schema.Resource {
    return &schema.Resource{
        Description: "Manages a server instance.",

        CreateContext: resourceServerCreate,
        ReadContext:   resourceServerRead,
        UpdateContext: resourceServerUpdate,
        DeleteContext: resourceServerDelete,

        // Support terraform import
        Importer: &schema.ResourceImporter{
            StateContext: schema.ImportStatePassthroughContext,
        },

        Schema: map[string]*schema.Schema{
            // String attribute
            "name": {
                Type:         schema.TypeString,
                Required:     true,
                Description:  "Name of the server.",
                ValidateFunc: validation.StringLenBetween(3, 64),
            },

            // String with allowed values
            "size": {
                Type:         schema.TypeString,
                Required:     true,
                Description:  "Server size tier.",
                ValidateFunc: validation.StringInSlice([]string{"small", "medium", "large"}, false),
            },

            // String that forces resource replacement when changed
            "region": {
                Type:         schema.TypeString,
                Required:     true,
                ForceNew:     true,
                Description:  "Deployment region. Changing this forces a new resource.",
                ValidateFunc: validation.StringInSlice([]string{"us-east-1", "us-west-2", "eu-west-1"}, false),
            },

            // Integer attribute
            "cpu_count": {
                Type:         schema.TypeInt,
                Optional:     true,
                Default:      2,
                Description:  "Number of CPU cores.",
                ValidateFunc: validation.IntBetween(1, 128),
            },

            // Boolean attribute
            "public_ip": {
                Type:        schema.TypeBool,
                Optional:    true,
                Default:     false,
                Description: "Whether to assign a public IP address.",
            },

            // Computed string (read-only, set by the API)
            "ip_address": {
                Type:        schema.TypeString,
                Computed:    true,
                Description: "IP address assigned to the server.",
            },

            // List of strings
            "dns_names": {
                Type:        schema.TypeList,
                Computed:    true,
                Description: "DNS names assigned to the server.",
                Elem: &schema.Schema{
                    Type: schema.TypeString,
                },
            },

            // Map of strings
            "tags": {
                Type:        schema.TypeMap,
                Optional:    true,
                Description: "Tags to apply to the server.",
                Elem: &schema.Schema{
                    Type: schema.TypeString,
                },
            },

            // Set of strings (unordered)
            "security_groups": {
                Type:        schema.TypeSet,
                Optional:    true,
                Description: "Security group IDs to attach.",
                Elem: &schema.Schema{
                    Type: schema.TypeString,
                },
            },

            // Nested block (sub-resource)
            "network_interface": {
                Type:        schema.TypeList,
                Optional:    true,
                MaxItems:    4,
                Description: "Network interfaces to attach.",
                Elem: &schema.Resource{
                    Schema: map[string]*schema.Schema{
                        "subnet_id": {
                            Type:     schema.TypeString,
                            Required: true,
                        },
                        "private_ip": {
                            Type:     schema.TypeString,
                            Optional: true,
                            Computed: true,
                        },
                        "interface_id": {
                            Type:     schema.TypeString,
                            Computed: true,
                        },
                    },
                },
            },

            // Timestamps
            "created_at": {
                Type:        schema.TypeString,
                Computed:    true,
                Description: "Timestamp when the server was created.",
            },
        },

        // Timeouts for long-running operations
        Timeouts: &schema.ResourceTimeout{
            Create: schema.DefaultTimeout(30 * time.Minute),
            Update: schema.DefaultTimeout(20 * time.Minute),
            Delete: schema.DefaultTimeout(10 * time.Minute),
        },
    }
}
```

## Implementing CRUD Functions

SDKv2 CRUD functions receive a ResourceData object for reading and setting attribute values.

```go
// Create operation
func resourceServerCreate(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    // Get the API client from the provider configuration
    client := meta.(*APIClient)

    // Read values from the Terraform configuration
    createReq := &ServerCreateRequest{
        Name:     d.Get("name").(string),
        Size:     d.Get("size").(string),
        Region:   d.Get("region").(string),
        CPUCount: d.Get("cpu_count").(int),
        PublicIP: d.Get("public_ip").(bool),
    }

    // Handle optional map attribute
    if v, ok := d.GetOk("tags"); ok {
        tags := make(map[string]string)
        for key, val := range v.(map[string]interface{}) {
            tags[key] = val.(string)
        }
        createReq.Tags = tags
    }

    // Handle optional set attribute
    if v, ok := d.GetOk("security_groups"); ok {
        sgSet := v.(*schema.Set)
        sgs := make([]string, 0, sgSet.Len())
        for _, sg := range sgSet.List() {
            sgs = append(sgs, sg.(string))
        }
        createReq.SecurityGroups = sgs
    }

    // Call the API
    server, err := client.CreateServer(ctx, createReq)
    if err != nil {
        return diag.FromErr(fmt.Errorf("error creating server: %w", err))
    }

    // Set the resource ID - this is required for all create operations
    d.SetId(server.ID)

    // Set computed attributes
    d.Set("ip_address", server.IPAddress)
    d.Set("dns_names", server.DNSNames)
    d.Set("created_at", server.CreatedAt)

    return resourceServerRead(ctx, d, meta)
}

// Read operation - refreshes state from the API
func resourceServerRead(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*APIClient)

    server, err := client.GetServer(ctx, d.Id())
    if err != nil {
        // If the resource no longer exists, remove it from state
        if isNotFoundError(err) {
            d.SetId("")
            return nil
        }
        return diag.FromErr(fmt.Errorf("error reading server: %w", err))
    }

    // Set all attributes from the API response
    d.Set("name", server.Name)
    d.Set("size", server.Size)
    d.Set("region", server.Region)
    d.Set("cpu_count", server.CPUCount)
    d.Set("public_ip", server.PublicIP)
    d.Set("ip_address", server.IPAddress)
    d.Set("dns_names", server.DNSNames)
    d.Set("tags", server.Tags)
    d.Set("created_at", server.CreatedAt)

    return nil
}

// Update operation
func resourceServerUpdate(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*APIClient)

    updateReq := &ServerUpdateRequest{}

    // Only include changed attributes in the update request
    if d.HasChange("name") {
        updateReq.Name = stringPtr(d.Get("name").(string))
    }

    if d.HasChange("size") {
        updateReq.Size = stringPtr(d.Get("size").(string))
    }

    if d.HasChange("cpu_count") {
        updateReq.CPUCount = intPtr(d.Get("cpu_count").(int))
    }

    if d.HasChange("tags") {
        tags := make(map[string]string)
        for key, val := range d.Get("tags").(map[string]interface{}) {
            tags[key] = val.(string)
        }
        updateReq.Tags = tags
    }

    _, err := client.UpdateServer(ctx, d.Id(), updateReq)
    if err != nil {
        return diag.FromErr(fmt.Errorf("error updating server: %w", err))
    }

    return resourceServerRead(ctx, d, meta)
}

// Delete operation
func resourceServerDelete(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*APIClient)

    err := client.DeleteServer(ctx, d.Id())
    if err != nil {
        if isNotFoundError(err) {
            // Already deleted, nothing to do
            return nil
        }
        return diag.FromErr(fmt.Errorf("error deleting server: %w", err))
    }

    // Clear the ID to indicate the resource has been removed
    d.SetId("")
    return nil
}
```

## Custom Validation Functions

SDKv2 supports custom validation through ValidateFunc.

```go
// Custom validation for IP addresses
func validateIPAddress(v interface{}, k string) (warns []string, errs []error) {
    value := v.(string)
    if net.ParseIP(value) == nil {
        errs = append(errs, fmt.Errorf("%q is not a valid IP address: %s", k, value))
    }
    return
}

// Custom validation for CIDR blocks
func validateCIDR(v interface{}, k string) (warns []string, errs []error) {
    value := v.(string)
    _, _, err := net.ParseCIDR(value)
    if err != nil {
        errs = append(errs, fmt.Errorf("%q is not a valid CIDR block: %s", k, value))
    }
    return
}
```

## Using DiffSuppressFunc

DiffSuppressFunc lets you ignore differences that are not meaningful.

```go
"description": {
    Type:     schema.TypeString,
    Optional: true,
    // Ignore whitespace-only differences
    DiffSuppressFunc: func(k, old, new string, d *schema.ResourceData) bool {
        return strings.TrimSpace(old) == strings.TrimSpace(new)
    },
},

"name": {
    Type:     schema.TypeString,
    Required: true,
    // Case-insensitive comparison
    DiffSuppressFunc: func(k, old, new string, d *schema.ResourceData) bool {
        return strings.EqualFold(old, new)
    },
},
```

## Migrating to the Plugin Framework

HashiCorp provides a mux server that lets you run SDKv2 and Plugin Framework resources in the same provider. This enables incremental migration.

```go
// main.go with mux server
package main

import (
    "context"
    "log"

    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/hashicorp/terraform-plugin-go/tfprotov6"
    "github.com/hashicorp/terraform-plugin-go/tfprotov6/tf6server"
    "github.com/hashicorp/terraform-plugin-mux/tf6muxserver"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"

    frameworkProvider "github.com/yourorg/terraform-provider-example/internal/framework"
    sdkProvider "github.com/yourorg/terraform-provider-example/internal/sdkv2"
)

func main() {
    ctx := context.Background()

    // Create mux server combining both SDKv2 and Framework providers
    muxServer, err := tf6muxserver.NewMuxServer(
        ctx,
        // SDKv2 provider (existing resources)
        func() tfprotov6.ProviderServer {
            return schema.NewGRPCProviderServer(sdkProvider.Provider())
        },
        // Framework provider (new resources)
        providerserver.NewProtocol6(frameworkProvider.New("dev")),
    )
    if err != nil {
        log.Fatal(err)
    }

    tf6server.Serve(
        "registry.terraform.io/yourorg/example",
        muxServer.ProviderServer,
    )
}
```

## Best Practices

Always handle the case where a resource no longer exists in the Read function. If the API returns a 404, clear the resource ID to remove it from state rather than returning an error.

Use `HasChange()` in Update to only send changed attributes to the API. This prevents unnecessary API calls and avoids overwriting attributes with stale values.

Set computed attributes after every API call, not just during Create. The API may change these values at any time.

Use meaningful error messages that include the resource ID and the operation that failed. This helps users debug issues quickly.

For new provider development, see our guide on [the Terraform Plugin Framework](https://oneuptime.com/blog/post/2026-02-23-terraform-plugin-framework/view).

## Conclusion

The Terraform Plugin SDK v2 remains the foundation of most existing Terraform providers. Understanding its patterns - the schema map, CRUD functions, ResourceData, and validation - is essential for maintaining these providers. While new development should use the Plugin Framework, the mux server provides a smooth migration path that lets you move resources one at a time without breaking existing users.
