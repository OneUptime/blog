# How to Implement Computed Attributes in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Computed Attributes, Schema Design, Infrastructure as Code

Description: Learn how to implement computed attributes in custom Terraform providers for values determined by the API, including read-only attributes, computed defaults, and plan-time known values.

---

Computed attributes are values in a Terraform resource that are determined by the API rather than set by the user. Examples include resource IDs, timestamps, IP addresses, and status fields. These attributes are essential for resources that have server-side generated properties, but implementing them correctly requires understanding how Terraform handles unknown values during planning.

In this guide, we will cover the different patterns for computed attributes, how to handle them in CRUD operations, and how to minimize unnecessary diffs in your plans.

## Types of Computed Attributes

Terraform supports several patterns for computed attributes:

### Pure Computed (Read-Only)

Attributes that are solely determined by the API. Users cannot set these values.

```go
"id": schema.StringAttribute{
    Computed:    true,
    Description: "The unique identifier assigned by the server.",
},
"created_at": schema.StringAttribute{
    Computed:    true,
    Description: "The timestamp when the resource was created.",
},
"ip_address": schema.StringAttribute{
    Computed:    true,
    Description: "The IP address assigned to the server.",
},
"status": schema.StringAttribute{
    Computed:    true,
    Description: "The current status of the resource.",
},
```

### Optional and Computed (With Server Default)

Attributes that the user can optionally set, but if they do not, the server provides a default value.

```go
"region": schema.StringAttribute{
    Optional:    true,
    Computed:    true,
    Description: "The region for the resource. If not specified, the server assigns a default region.",
},
"instance_type": schema.StringAttribute{
    Optional:    true,
    Computed:    true,
    Description: "The instance type. Defaults to the smallest available type if not specified.",
},
```

### Required but with Computed Sub-Properties

Attributes that the user must set, but the API adds additional computed properties:

```go
"network": schema.SingleNestedAttribute{
    Required: true,
    Attributes: map[string]schema.Attribute{
        "vpc_id": schema.StringAttribute{
            Required:    true,
            Description: "The VPC to deploy into.",
        },
        "private_ip": schema.StringAttribute{
            Computed:    true,
            Description: "The private IP address assigned by the VPC.",
        },
        "dns_name": schema.StringAttribute{
            Computed:    true,
            Description: "The DNS name assigned to the resource.",
        },
    },
},
```

## Handling Unknown Values During Planning

When Terraform plans a create operation, computed attributes have "unknown" values because they have not been determined yet. This is shown in plan output as:

```
+ id         = (known after apply)
+ ip_address = (known after apply)
```

After the resource is created, these values become known. In subsequent plans, the previously known values should be stable. Use `UseStateForUnknown` to tell Terraform that a computed value will not change after creation:

```go
"id": schema.StringAttribute{
    Computed: true,
    PlanModifiers: []planmodifier.String{
        // Tell Terraform to use the existing state value during plan
        // This prevents unnecessary "known after apply" in update plans
        stringplanmodifier.UseStateForUnknown(),
    },
},
"created_at": schema.StringAttribute{
    Computed: true,
    PlanModifiers: []planmodifier.String{
        // Creation timestamp never changes
        stringplanmodifier.UseStateForUnknown(),
    },
},
```

## Setting Computed Values in Create

During the Create operation, populate all computed attributes from the API response:

```go
type ServerResourceModel struct {
    ID          types.String `tfsdk:"id"`
    Name        types.String `tfsdk:"name"`
    Region      types.String `tfsdk:"region"`
    IPAddress   types.String `tfsdk:"ip_address"`
    Status      types.String `tfsdk:"status"`
    CreatedAt   types.String `tfsdk:"created_at"`
    FQDN        types.String `tfsdk:"fqdn"`
}

func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Make the API call
    server, err := r.client.CreateServer(ctx, &api.CreateServerRequest{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
    })
    if err != nil {
        resp.Diagnostics.AddError("Error Creating Server", err.Error())
        return
    }

    // Populate all computed attributes from the API response
    plan.ID = types.StringValue(server.ID)
    plan.IPAddress = types.StringValue(server.IPAddress)
    plan.Status = types.StringValue(server.Status)
    plan.CreatedAt = types.StringValue(server.CreatedAt.Format(time.RFC3339))
    plan.FQDN = types.StringValue(server.FQDN)

    // If region was optional and the server chose a default
    if plan.Region.IsNull() || plan.Region.IsUnknown() {
        plan.Region = types.StringValue(server.Region)
    }

    // Save the complete state
    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Refreshing Computed Values in Read

The Read operation must refresh all computed values from the API to detect drift:

```go
func (r *ServerResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    var state ServerResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    server, err := r.client.GetServer(ctx, state.ID.ValueString())
    if err != nil {
        if isNotFound(err) {
            resp.State.RemoveResource(ctx)
            return
        }
        resp.Diagnostics.AddError("Error Reading Server", err.Error())
        return
    }

    // Refresh all attributes including computed ones
    state.Name = types.StringValue(server.Name)
    state.Region = types.StringValue(server.Region)
    state.IPAddress = types.StringValue(server.IPAddress)
    state.Status = types.StringValue(server.Status)
    state.CreatedAt = types.StringValue(server.CreatedAt.Format(time.RFC3339))
    state.FQDN = types.StringValue(server.FQDN)

    resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}
```

## Computed Attributes That Change on Update

Some computed attributes change when the resource is updated. For example, an `updated_at` timestamp or an IP address that changes when a server is resized:

```go
"updated_at": schema.StringAttribute{
    Computed:    true,
    Description: "Timestamp of the last update.",
    // Do NOT use UseStateForUnknown here, because this value
    // changes with every update
},
"ip_address": schema.StringAttribute{
    Computed:    true,
    Description: "The server IP address. May change when the server is resized.",
    // Do NOT use UseStateForUnknown if the value can change
},
```

For these attributes, you can use a custom plan modifier that marks them as unknown when specific other attributes change:

```go
// unknownOnChangeModifier marks an attribute as unknown when a dependent attribute changes
type unknownOnChangeModifier struct {
    dependentPaths []path.Path
}

func (m unknownOnChangeModifier) PlanModifyString(ctx context.Context, req planmodifier.StringRequest, resp *planmodifier.StringResponse) {
    // If this is a create, the value is already unknown
    if req.StateValue.IsNull() {
        return
    }

    // Check if any dependent attribute is changing
    for _, depPath := range m.dependentPaths {
        var stateValue, planValue types.String
        req.State.GetAttribute(ctx, depPath, &stateValue)
        req.Plan.GetAttribute(ctx, depPath, &planValue)

        if !stateValue.Equal(planValue) {
            // Dependent attribute is changing, mark this as unknown
            resp.PlanValue = types.StringUnknown()
            return
        }
    }

    // No changes detected, keep the current value
}

func UnknownOnChange(dependentAttrs ...string) planmodifier.String {
    paths := make([]path.Path, len(dependentAttrs))
    for i, attr := range dependentAttrs {
        paths[i] = path.Root(attr)
    }
    return unknownOnChangeModifier{dependentPaths: paths}
}
```

Use it in your schema:

```go
"ip_address": schema.StringAttribute{
    Computed: true,
    PlanModifiers: []planmodifier.String{
        // IP might change when size or region changes
        UnknownOnChange("size", "region"),
    },
},
```

## Computed Defaults from Provider Configuration

Sometimes a computed default depends on the provider configuration:

```go
func (r *ServerResource) ModifyPlan(ctx context.Context, req resource.ModifyPlanRequest, resp *resource.ModifyPlanResponse) {
    if req.Plan.Raw.IsNull() {
        return // Destroying
    }

    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)

    // If region is not set, use the provider's default region
    if plan.Region.IsUnknown() || plan.Region.IsNull() {
        plan.Region = types.StringValue(r.client.DefaultRegion)
        resp.Diagnostics.Append(resp.Plan.Set(ctx, &plan)...)
    }
}
```

## Handling Null vs Unknown vs Empty

Understanding the difference between null, unknown, and empty string is critical for computed attributes:

```go
// Null: the attribute has no value (not set by user, not computed yet)
types.StringNull()

// Unknown: the value exists but is not yet known (will be computed)
types.StringUnknown()

// Empty string: a known value that happens to be empty
types.StringValue("")

// Known value
types.StringValue("us-east-1")
```

When setting computed values:

```go
func setComputedValues(plan *ServerResourceModel, server *api.Server) {
    // Always set to a real value, never leave as unknown after create/read
    plan.ID = types.StringValue(server.ID)

    // Handle optional API fields that might be empty
    if server.IPAddress != "" {
        plan.IPAddress = types.StringValue(server.IPAddress)
    } else {
        // The API returned no IP - set to null, not unknown
        plan.IPAddress = types.StringNull()
    }
}
```

## Best Practices

**Use UseStateForUnknown for stable computed values.** Attributes like ID, created_at, and ARN do not change after creation and should use this plan modifier.

**Do not use UseStateForUnknown for volatile attributes.** Status, updated_at, and other attributes that can change should not use UseStateForUnknown.

**Always populate computed attributes in Create.** After a successful create, every computed attribute should have a real value, not unknown.

**Refresh computed attributes in Read.** The Read operation should update all computed values from the API.

**Handle optional+computed carefully.** When an attribute is both optional and computed, check if the user set it before applying a server default.

**Use null for absent values, not empty strings.** When the API returns no value for an optional computed attribute, use `types.StringNull()` instead of `types.StringValue("")`.

## Conclusion

Computed attributes are a fundamental part of Terraform providers, representing the server-side properties of your resources. By using the right combination of `Computed`, `Optional`, plan modifiers, and careful value handling, you can create a provider where plans are clean, diffs are meaningful, and users always have accurate state.

For more on schema design, see our guides on [handling optional and required attributes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-optional-and-required-attributes-in-custom-providers/view) and [implementing plan modification](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-plan-modification-in-custom-providers/view).
