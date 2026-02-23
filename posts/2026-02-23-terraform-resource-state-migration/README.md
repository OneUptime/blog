# How to Implement Resource State Migration in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, State Migration, Go, Infrastructure as Code

Description: Learn how to implement resource state migration in custom Terraform providers to handle schema changes without forcing users to recreate their resources.

---

As your Terraform provider evolves, resource schemas will change. You might rename an attribute, split one attribute into two, change a type from string to integer, or restructure nested blocks. Without state migration, these changes would force users to destroy and recreate their resources - which is unacceptable for production infrastructure. State migration lets you transform existing state data to match the new schema automatically.

This guide covers implementing state migration in both the Plugin Framework and SDKv2, including common migration patterns, testing strategies, and best practices for evolving your provider without breaking existing users.

## When You Need State Migration

You need state migration any time you change a resource schema in a way that is not backward compatible. Common scenarios include:

- Renaming an attribute (for example, `server_type` becomes `instance_class`)
- Changing an attribute type (for example, `port` from string to integer)
- Splitting an attribute into multiple attributes (for example, `address` becomes `host` and `port`)
- Combining multiple attributes into one (for example, `first_name` and `last_name` become `full_name`)
- Adding a required attribute with a default value that should be populated for existing resources
- Restructuring nested attributes

You do NOT need state migration when:
- Adding a new optional attribute (existing state just has it as null)
- Adding a new computed attribute (Read will populate it)
- Removing an attribute (Terraform ignores extra state attributes)

## Plugin Framework State Migration

The Plugin Framework uses the `ResourceWithUpgradeState` interface to handle state migration.

```go
package provider

import (
    "context"
    "fmt"
    "strconv"

    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

// Ensure the resource implements state upgrade
var _ resource.ResourceWithUpgradeState = &ServerResource{}

// Current schema version - increment this with each migration
const serverResourceSchemaVersion = 2

// Schema includes the version
func (r *ServerResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        // The version tells Terraform which migrations to run
        Version:     serverResourceSchemaVersion,
        Description: "Manages a server instance.",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed: true,
            },
            "name": schema.StringAttribute{
                Required: true,
            },
            // Version 2: renamed from "server_type" to "instance_class"
            "instance_class": schema.StringAttribute{
                Required:    true,
                Description: "The instance class for the server.",
            },
            // Version 2: changed from string to int
            "port": schema.Int64Attribute{
                Optional:    true,
                Computed:    true,
                Description: "Network port number.",
            },
            // Version 1: split from "address" into "host" and "port"
            "host": schema.StringAttribute{
                Optional:    true,
                Computed:    true,
                Description: "Server hostname.",
            },
            "region": schema.StringAttribute{
                Required: true,
            },
        },
    }
}

// UpgradeState defines migration functions for each previous schema version
func (r *ServerResource) UpgradeState(ctx context.Context) map[int64]resource.StateUpgrader {
    return map[int64]resource.StateUpgrader{
        // Migrate from version 0 to current
        0: {
            // PriorSchema defines what the state looked like at version 0
            PriorSchema: &schema.Schema{
                Attributes: map[string]schema.Attribute{
                    "id": schema.StringAttribute{
                        Computed: true,
                    },
                    "name": schema.StringAttribute{
                        Required: true,
                    },
                    "server_type": schema.StringAttribute{
                        Required: true,
                    },
                    // In v0, address contained "host:port" as a single string
                    "address": schema.StringAttribute{
                        Optional: true,
                        Computed: true,
                    },
                    "region": schema.StringAttribute{
                        Required: true,
                    },
                },
            },
            StateUpgrader: upgradeServerStateV0toV2,
        },
        // Migrate from version 1 to current
        1: {
            PriorSchema: &schema.Schema{
                Attributes: map[string]schema.Attribute{
                    "id": schema.StringAttribute{
                        Computed: true,
                    },
                    "name": schema.StringAttribute{
                        Required: true,
                    },
                    // In v1, already split but still called server_type
                    "server_type": schema.StringAttribute{
                        Required: true,
                    },
                    "host": schema.StringAttribute{
                        Optional: true,
                        Computed: true,
                    },
                    // In v1, port was a string
                    "port": schema.StringAttribute{
                        Optional: true,
                        Computed: true,
                    },
                    "region": schema.StringAttribute{
                        Required: true,
                    },
                },
            },
            StateUpgrader: upgradeServerStateV1toV2,
        },
    }
}

// Version 0 state model
type ServerResourceModelV0 struct {
    ID         types.String `tfsdk:"id"`
    Name       types.String `tfsdk:"name"`
    ServerType types.String `tfsdk:"server_type"`
    Address    types.String `tfsdk:"address"`
    Region     types.String `tfsdk:"region"`
}

// Version 1 state model
type ServerResourceModelV1 struct {
    ID         types.String `tfsdk:"id"`
    Name       types.String `tfsdk:"name"`
    ServerType types.String `tfsdk:"server_type"`
    Host       types.String `tfsdk:"host"`
    Port       types.String `tfsdk:"port"`
    Region     types.String `tfsdk:"region"`
}

// Migrate from v0 to current (v2)
func upgradeServerStateV0toV2(ctx context.Context, req resource.UpgradeStateRequest, resp *resource.UpgradeStateResponse) {
    // Read the old state
    var oldState ServerResourceModelV0
    resp.Diagnostics.Append(req.State.Get(ctx, &oldState)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Transform: split address into host and port
    var host string
    var port int64

    if !oldState.Address.IsNull() {
        address := oldState.Address.ValueString()
        parts := strings.SplitN(address, ":", 2)
        host = parts[0]
        if len(parts) == 2 {
            p, err := strconv.ParseInt(parts[1], 10, 64)
            if err == nil {
                port = p
            }
        }
    }

    // Build the new state
    newState := ServerResourceModel{
        ID:            oldState.ID,
        Name:          oldState.Name,
        InstanceClass: oldState.ServerType,  // Renamed attribute
        Host:          types.StringValue(host),
        Port:          types.Int64Value(port),
        Region:        oldState.Region,
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

// Migrate from v1 to current (v2)
func upgradeServerStateV1toV2(ctx context.Context, req resource.UpgradeStateRequest, resp *resource.UpgradeStateResponse) {
    var oldState ServerResourceModelV1
    resp.Diagnostics.Append(req.State.Get(ctx, &oldState)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Transform: rename server_type to instance_class, convert port from string to int
    var port int64
    if !oldState.Port.IsNull() {
        p, err := strconv.ParseInt(oldState.Port.ValueString(), 10, 64)
        if err != nil {
            resp.Diagnostics.AddError(
                "State Migration Error",
                fmt.Sprintf("Could not convert port '%s' to integer: %s",
                    oldState.Port.ValueString(), err),
            )
            return
        }
        port = p
    }

    newState := ServerResourceModel{
        ID:            oldState.ID,
        Name:          oldState.Name,
        InstanceClass: oldState.ServerType,  // Renamed
        Host:          oldState.Host,
        Port:          types.Int64Value(port),  // Type changed
        Region:        oldState.Region,
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}
```

## SDKv2 State Migration

SDKv2 uses a different approach with `SchemaVersion` and `StateUpgraders`.

```go
func resourceServer() *schema.Resource {
    return &schema.Resource{
        // Current schema version
        SchemaVersion: 2,

        // Current schema (what the resource looks like now)
        Schema: map[string]*schema.Schema{
            "name": {
                Type:     schema.TypeString,
                Required: true,
            },
            "instance_class": {
                Type:     schema.TypeString,
                Required: true,
            },
            "host": {
                Type:     schema.TypeString,
                Optional: true,
                Computed: true,
            },
            "port": {
                Type:     schema.TypeInt,
                Optional: true,
                Computed: true,
            },
        },

        // State upgrade functions
        StateUpgraders: []schema.StateUpgrader{
            {
                // Upgrade from version 0 to version 1
                Version: 0,
                Type: cty.Object(map[string]cty.Type{
                    "id":          cty.String,
                    "name":        cty.String,
                    "server_type": cty.String,
                    "address":     cty.String,
                }),
                Upgrade: upgradeServerV0,
            },
            {
                // Upgrade from version 1 to version 2
                Version: 1,
                Type: cty.Object(map[string]cty.Type{
                    "id":          cty.String,
                    "name":        cty.String,
                    "server_type": cty.String,
                    "host":        cty.String,
                    "port":        cty.String,
                }),
                Upgrade: upgradeServerV1,
            },
        },

        // CRUD functions
        CreateContext: resourceServerCreate,
        ReadContext:   resourceServerRead,
        UpdateContext: resourceServerUpdate,
        DeleteContext: resourceServerDelete,
    }
}

func upgradeServerV0(ctx context.Context, rawState map[string]interface{}, meta interface{}) (map[string]interface{}, error) {
    // Split address into host and port
    if address, ok := rawState["address"].(string); ok {
        parts := strings.SplitN(address, ":", 2)
        rawState["host"] = parts[0]
        if len(parts) == 2 {
            rawState["port"] = parts[1]
        }
        delete(rawState, "address")
    }

    // Rename server_type to instance_class
    if serverType, ok := rawState["server_type"]; ok {
        rawState["instance_class"] = serverType
        delete(rawState, "server_type")
    }

    return rawState, nil
}

func upgradeServerV1(ctx context.Context, rawState map[string]interface{}, meta interface{}) (map[string]interface{}, error) {
    // Rename server_type to instance_class
    if serverType, ok := rawState["server_type"]; ok {
        rawState["instance_class"] = serverType
        delete(rawState, "server_type")
    }

    // Convert port from string to int
    if portStr, ok := rawState["port"].(string); ok {
        port, err := strconv.Atoi(portStr)
        if err != nil {
            return nil, fmt.Errorf("could not convert port '%s' to integer: %w", portStr, err)
        }
        rawState["port"] = port
    }

    return rawState, nil
}
```

## Testing State Migrations

State migrations need thorough testing because bugs in migration code can corrupt users' state files.

```go
func TestServerResourceStateUpgradeV0(t *testing.T) {
    // Create a mock v0 state
    v0State := map[string]interface{}{
        "id":          "server-123",
        "name":        "test-server",
        "server_type": "t3.medium",
        "address":     "10.0.1.5:8080",
    }

    // Run the migration
    v1State, err := upgradeServerV0(context.Background(), v0State, nil)
    if err != nil {
        t.Fatalf("unexpected error: %s", err)
    }

    // Verify the migration results
    if v1State["instance_class"] != "t3.medium" {
        t.Errorf("expected instance_class 't3.medium', got '%v'", v1State["instance_class"])
    }

    if v1State["host"] != "10.0.1.5" {
        t.Errorf("expected host '10.0.1.5', got '%v'", v1State["host"])
    }

    if v1State["port"] != "8080" {
        t.Errorf("expected port '8080', got '%v'", v1State["port"])
    }

    // Verify old attributes are removed
    if _, exists := v1State["server_type"]; exists {
        t.Error("server_type should have been removed")
    }

    if _, exists := v1State["address"]; exists {
        t.Error("address should have been removed")
    }
}

func TestServerResourceStateUpgradeV0_NilAddress(t *testing.T) {
    // Test migration with missing optional attributes
    v0State := map[string]interface{}{
        "id":          "server-456",
        "name":        "test-server-2",
        "server_type": "t3.large",
    }

    v1State, err := upgradeServerV0(context.Background(), v0State, nil)
    if err != nil {
        t.Fatalf("unexpected error: %s", err)
    }

    if v1State["instance_class"] != "t3.large" {
        t.Errorf("expected instance_class 't3.large', got '%v'", v1State["instance_class"])
    }
}

// Acceptance test that verifies the full migration path
func TestAccServerResource_MigrateV0ToV2(t *testing.T) {
    resource.Test(t, resource.TestCase{
        Steps: []resource.TestStep{
            // Step 1: Create with the current provider
            {
                Config: testAccServerConfig("test-migrate"),
                Check: resource.ComposeTestCheckFunc(
                    resource.TestCheckResourceAttr("yourservice_server.test", "instance_class", "t3.medium"),
                    resource.TestCheckResourceAttr("yourservice_server.test", "host", "10.0.1.5"),
                    resource.TestCheckResourceAttr("yourservice_server.test", "port", "8080"),
                ),
            },
        },
    })
}
```

## Multi-Step Migration Chains

When your schema has gone through many versions, migrations chain together. Terraform runs them sequentially: v0 to v1, v1 to v2, v2 to v3, and so on.

```go
// Version history:
// v0: Original schema with "address" field
// v1: Split "address" into "host" and "port" (port as string)
// v2: Renamed "server_type" to "instance_class", port changed to int
// v3: Added "network" nested attribute, moved host/port into it

// Each migration only needs to transform from version N to version N+1
// Terraform chains them automatically
```

The key insight is that each migration only needs to handle one version increment. If a resource is at v0 and the current schema is v3, Terraform runs v0-to-v1, then v1-to-v2, then v2-to-v3 in sequence.

## Best Practices

Always increment SchemaVersion when making incompatible schema changes. Forgetting this causes Terraform to try reading old state with the new schema, which fails silently or produces corrupt state.

Write migration functions that handle missing and null values. Old state might not have attributes that were added in intermediate versions.

Test every migration path. Test v0 to current, v1 to current, and every intermediate step. Also test with null values and edge cases.

Keep old migration code forever. Even if you think nobody is running v0, someone might have a state file from years ago. Removing old migrations breaks their upgrade path.

Make migrations idempotent. If a migration is accidentally run twice, it should produce the same result.

Never make API calls in migration functions. Migrations transform the state data only. The Read function handles fetching fresh data after migration completes.

For more on provider schema design, see our guide on [Defining Provider Schema in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-schema/view).

## Conclusion

State migration is the safety net that lets you evolve your provider's schema without breaking existing users. By defining prior schemas and transformation functions for each version, you ensure that Terraform can automatically upgrade state data to match the current schema. The investment in writing and testing migrations pays off in provider stability, because users can upgrade to new provider versions with confidence that their state will be handled correctly.
