# How to Handle Breaking Changes in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Breaking Changes, Migration, Infrastructure as Code

Description: Learn how to plan, implement, and communicate breaking changes in custom Terraform providers while minimizing disruption through state migration and upgrade guides.

---

Breaking changes are sometimes unavoidable when evolving a Terraform provider. APIs change, better patterns emerge, and early design decisions may need to be revisited. The key is handling these changes in a way that minimizes disruption for your users and gives them a clear path forward.

In this guide, we will cover how to identify breaking changes, implement state migrations, provide upgrade guides, and use deprecation strategies to make major version transitions as smooth as possible.

## What Constitutes a Breaking Change

A breaking change is any modification that causes existing Terraform configurations or state files to stop working correctly. Here are the common types:

**Schema changes:**
- Removing an attribute
- Renaming an attribute
- Changing an attribute from optional to required
- Changing an attribute type (string to integer, for example)
- Changing a block type to an attribute or vice versa

**Behavioral changes:**
- Changing default values
- Changing how import IDs are formatted
- Changing the resource ID format
- Changing which API operations are used for CRUD

**Removed functionality:**
- Removing a resource or data source entirely
- Removing support for a Terraform version
- Removing a provider configuration option

## Planning Breaking Changes

Before making a breaking change, plan carefully:

### Step 1: Document the Motivation

Write down why the change is necessary. Common reasons include:

- The current API is being deprecated
- The current schema does not support new features
- The current implementation has design flaws
- User feedback indicates the current behavior is confusing

### Step 2: Assess the Impact

Determine how many users will be affected:

```bash
# Check Registry download statistics for affected resources
# Review GitHub issues and discussions
# Look at the resource usage in your acceptance tests
```

### Step 3: Plan the Migration Path

For every breaking change, define how users will migrate:

- Can you provide automatic state migration?
- Is a simple find-and-replace sufficient?
- Do users need to recreate resources?

## Implementing State Migration

When you change the structure of a resource's state, implement state upgraders so that Terraform can automatically migrate existing state to the new format.

### State Upgraders in the Plugin Framework

```go
// internal/provider/server_resource.go

// ServerResourceModel represents the current (v1) schema
type ServerResourceModel struct {
    ID        types.String `tfsdk:"id"`
    Name      types.String `tfsdk:"name"`
    Region    types.String `tfsdk:"region"`
    // New in v1: split "size" into "cpu" and "memory"
    CPU       types.Int64  `tfsdk:"cpu"`
    Memory    types.Int64  `tfsdk:"memory"`
}

// ServerResourceModelV0 represents the previous (v0) schema
type ServerResourceModelV0 struct {
    ID     types.String `tfsdk:"id"`
    Name   types.String `tfsdk:"name"`
    Region types.String `tfsdk:"region"`
    Size   types.String `tfsdk:"size"`
}

// UpgradeState handles state migration from older versions
func (r *ServerResource) UpgradeState(ctx context.Context) map[int64]resource.StateUpgrader {
    return map[int64]resource.StateUpgrader{
        // Upgrade from v0 to v1
        0: {
            // Define the prior schema (v0)
            PriorSchema: &schema.Schema{
                Attributes: map[string]schema.Attribute{
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
                },
            },
            // Define the upgrade function
            StateUpgrader: func(ctx context.Context, req resource.UpgradeStateRequest, resp *resource.UpgradeStateResponse) {
                var priorState ServerResourceModelV0
                resp.Diagnostics.Append(req.State.Get(ctx, &priorState)...)
                if resp.Diagnostics.HasError() {
                    return
                }

                // Convert old "size" to new "cpu" and "memory"
                cpu, memory := convertSizeToCPUMemory(priorState.Size.ValueString())

                upgradedState := ServerResourceModel{
                    ID:     priorState.ID,
                    Name:   priorState.Name,
                    Region: priorState.Region,
                    CPU:    types.Int64Value(cpu),
                    Memory: types.Int64Value(memory),
                }

                resp.Diagnostics.Append(resp.State.Set(ctx, &upgradedState)...)
            },
        },
    }
}

// convertSizeToCPUMemory maps old size strings to CPU and memory values
func convertSizeToCPUMemory(size string) (int64, int64) {
    switch size {
    case "small":
        return 1, 1024
    case "medium":
        return 2, 2048
    case "large":
        return 4, 4096
    case "xlarge":
        return 8, 8192
    default:
        return 1, 1024
    }
}
```

Make sure your schema includes the version:

```go
func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        // Current schema version - increment when state format changes
        Version: 1,
        Attributes: map[string]schema.Attribute{
            // ... current schema ...
        },
    }
}
```

## Deprecation Strategy

Before making a breaking change, deprecate the old behavior in a minor version:

### Deprecating Attributes

```go
// v1.5.0 - Deprecate the old attribute
"size": schema.StringAttribute{
    Optional:          true,
    DeprecatedMessage: "The 'size' attribute is deprecated and will be removed in v2.0.0. Use 'cpu' and 'memory' instead.",
},
// Add the new attributes alongside
"cpu": schema.Int64Attribute{
    Optional: true,
    Computed: true,
    Description: "Number of CPU cores. Replaces the deprecated 'size' attribute.",
},
"memory": schema.Int64Attribute{
    Optional: true,
    Computed: true,
    Description: "Memory in MB. Replaces the deprecated 'size' attribute.",
},
```

### Handling Both Old and New in CRUD Operations

During the deprecation period, support both the old and new attributes:

```go
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    createReq := &api.CreateServerRequest{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
    }

    // Support both old and new attributes during transition
    if !plan.Size.IsNull() && plan.Size.ValueString() != "" {
        // Use legacy size attribute
        createReq.Size = plan.Size.ValueString()
        tflog.Warn(ctx, "Using deprecated 'size' attribute. Please migrate to 'cpu' and 'memory'.")
    } else {
        // Use new cpu and memory attributes
        createReq.CPU = plan.CPU.ValueInt64()
        createReq.Memory = plan.Memory.ValueInt64()
    }

    // ... rest of create logic
}
```

## Deprecating Resources

When removing an entire resource, follow this timeline:

```
v1.4.0: Add deprecation warning to the resource
v1.5.0: Log warning when resource is used
v2.0.0: Remove the resource
```

```go
func (r *LegacyServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        DeprecationMessage: "The example_legacy_server resource is deprecated. " +
            "Use example_server instead. This resource will be removed in v2.0.0.",
        // ... attributes ...
    }
}
```

## Writing Upgrade Guides

For every major version release, write a comprehensive upgrade guide:

```markdown
# Upgrading to v2.0.0

## Breaking Changes

### Resource: example_server

The `size` attribute has been replaced by `cpu` and `memory` attributes.

**Before (v1.x):**
    resource "example_server" "web" {
      name   = "web-01"
      region = "us-east-1"
      size   = "medium"
    }

**After (v2.0):**
    resource "example_server" "web" {
      name   = "web-01"
      region = "us-east-1"
      cpu    = 2
      memory = 2048
    }

**State Migration:** This change includes automatic state migration.
No manual state editing is required. Simply update your configuration
and run terraform plan.

### Removed: example_legacy_server

The example_legacy_server resource has been removed. Migrate to
example_server before upgrading to v2.0.0.
```

## Testing State Migrations

Always test your state migrations thoroughly:

```go
func TestServerResourceStateUpgradeV0(t *testing.T) {
    t.Parallel()

    testCases := map[string]struct {
        priorState    ServerResourceModelV0
        expectedState ServerResourceModel
    }{
        "small size": {
            priorState: ServerResourceModelV0{
                ID:     types.StringValue("srv-123"),
                Name:   types.StringValue("web-01"),
                Region: types.StringValue("us-east-1"),
                Size:   types.StringValue("small"),
            },
            expectedState: ServerResourceModel{
                ID:     types.StringValue("srv-123"),
                Name:   types.StringValue("web-01"),
                Region: types.StringValue("us-east-1"),
                CPU:    types.Int64Value(1),
                Memory: types.Int64Value(1024),
            },
        },
        "large size": {
            priorState: ServerResourceModelV0{
                ID:     types.StringValue("srv-456"),
                Name:   types.StringValue("db-01"),
                Region: types.StringValue("us-west-2"),
                Size:   types.StringValue("large"),
            },
            expectedState: ServerResourceModel{
                ID:     types.StringValue("srv-456"),
                Name:   types.StringValue("db-01"),
                Region: types.StringValue("us-west-2"),
                CPU:    types.Int64Value(4),
                Memory: types.Int64Value(4096),
            },
        },
    }

    for name, tc := range testCases {
        name, tc := name, tc
        t.Run(name, func(t *testing.T) {
            t.Parallel()
            // Test the state upgrade function
            cpu, memory := convertSizeToCPUMemory(tc.priorState.Size.ValueString())
            if cpu != tc.expectedState.CPU.ValueInt64() {
                t.Errorf("CPU: expected %d, got %d", tc.expectedState.CPU.ValueInt64(), cpu)
            }
            if memory != tc.expectedState.Memory.ValueInt64() {
                t.Errorf("Memory: expected %d, got %d", tc.expectedState.Memory.ValueInt64(), memory)
            }
        })
    }
}
```

## Best Practices

**Deprecate before removing.** Always give users at least one minor version cycle with deprecation warnings before removing features in a major version.

**Provide automatic state migration.** Whenever possible, implement state upgraders so users do not have to manually edit their state files.

**Communicate early and often.** Announce breaking changes well before the major version release through GitHub discussions, changelogs, and documentation.

**Test migrations thoroughly.** State migration bugs can corrupt user state, so test every migration path with comprehensive test cases.

**Support the previous major version.** After a major release, maintain the previous version with bug fixes for at least a few months.

## Conclusion

Breaking changes are a necessary part of evolving a Terraform provider, but they do not have to be painful. By planning carefully, implementing state migrations, providing clear deprecation warnings, and writing comprehensive upgrade guides, you can make major version transitions smooth for your users.

For more on provider versioning, see our guides on [versioning custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-version-custom-terraform-providers/view) and [publishing to the Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-publish-custom-terraform-providers-to-registry/view).
