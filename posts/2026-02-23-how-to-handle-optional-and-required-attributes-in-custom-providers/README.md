# How to Handle Optional and Required Attributes in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Schema Design, Attributes, Infrastructure as Code

Description: Learn how to design and implement optional and required attributes in custom Terraform providers, including defaults, conditional requirements, and handling null values properly.

---

Getting the optional and required designations right for your Terraform provider attributes is fundamental to good user experience. Mark too many things as required and users are frustrated by having to specify values they do not care about. Mark everything as optional and users struggle to figure out what they actually need to set. The right balance makes your provider intuitive and easy to use.

In this guide, we will cover the different attribute configurations available in the Plugin Framework, how to handle null and unknown values, and best practices for designing schemas that are both flexible and user-friendly.

## Attribute Configuration Options

The Plugin Framework provides four boolean flags that control how an attribute behaves:

| Flag | Description |
|------|-------------|
| `Required` | User must provide a value |
| `Optional` | User may provide a value |
| `Computed` | Provider can set the value |
| `Sensitive` | Value is hidden in output |

These can be combined in specific ways:

| Combination | Behavior |
|-------------|----------|
| Required only | User must set it, provider never changes it |
| Optional only | User may set it, null if not set |
| Computed only | Read-only, set by provider |
| Optional + Computed | User may set it, provider fills in default if not set |
| Required + Computed | Not typically used (contradictory) |

## Required Attributes

Required attributes must be specified by the user. Use them for attributes that the API needs and that have no sensible default:

```go
func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            // Name is required - every server needs a unique name
            "name": schema.StringAttribute{
                Required:    true,
                Description: "The server name. Must be unique within the project.",
            },
            // Region is required - we cannot guess where the user wants to deploy
            "region": schema.StringAttribute{
                Required:    true,
                Description: "The deployment region (e.g., us-east-1, eu-west-1).",
            },
        },
    }
}
```

Required attributes:
- Must be set in the configuration
- Are never null or unknown during create
- Generate an error if missing

## Optional Attributes

Optional attributes let users customize behavior without requiring them to specify everything:

```go
"description": schema.StringAttribute{
    Optional:    true,
    Description: "A human-readable description of the server.",
},
"tags": schema.MapAttribute{
    Optional:    true,
    ElementType: types.StringType,
    Description: "Tags to assign to the server.",
},
```

When an optional attribute is not set by the user, its value is null. You must handle null values in your CRUD operations:

```go
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)

    createReq := &api.CreateServerRequest{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
    }

    // Handle optional attributes - check for null before using
    if !plan.Description.IsNull() {
        desc := plan.Description.ValueString()
        createReq.Description = &desc
    }

    if !plan.Tags.IsNull() {
        tags := make(map[string]string)
        plan.Tags.ElementsAs(ctx, &tags, false)
        createReq.Tags = tags
    }

    // ... rest of create logic
}
```

## Optional with Computed (Server Defaults)

When the API provides a default value for an optional attribute, use Optional + Computed:

```go
"instance_type": schema.StringAttribute{
    Optional:    true,
    Computed:    true,
    Description: "The instance type. Defaults to 'small' if not specified.",
},
"port": schema.Int64Attribute{
    Optional:    true,
    Computed:    true,
    Description: "The port number. Defaults to 8080 if not specified.",
},
```

### Using Static Defaults

For simple defaults known at plan time, use the `Default` field:

```go
"instance_type": schema.StringAttribute{
    Optional:    true,
    Computed:    true,
    Default:     stringdefault.StaticString("small"),
    Description: "The instance type. Defaults to 'small'.",
},
"port": schema.Int64Attribute{
    Optional:    true,
    Computed:    true,
    Default:     int64default.StaticInt64(8080),
    Description: "The port number. Defaults to 8080.",
},
"enabled": schema.BoolAttribute{
    Optional:    true,
    Computed:    true,
    Default:     booldefault.StaticBool(true),
    Description: "Whether the feature is enabled. Defaults to true.",
},
```

### Using Dynamic Defaults

When the default comes from the API response, handle it in the Create operation:

```go
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)

    createReq := &api.CreateServerRequest{
        Name: plan.Name.ValueString(),
    }

    // Only set instance_type if the user specified it
    if !plan.InstanceType.IsNull() && !plan.InstanceType.IsUnknown() {
        createReq.InstanceType = plan.InstanceType.ValueString()
    }
    // If null/unknown, the API will use its own default

    server, err := r.client.CreateServer(ctx, createReq)
    if err != nil {
        resp.Diagnostics.AddError("Error Creating Server", err.Error())
        return
    }

    // Update the plan with the actual value (either user-specified or API default)
    plan.InstanceType = types.StringValue(server.InstanceType)

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Conditional Requirements

Sometimes an attribute is only required when another attribute has a specific value. Implement this with config validators:

```go
func (r *ServerResource) ConfigValidators(ctx context.Context) []resource.ConfigValidator {
    return []resource.ConfigValidator{
        &conditionalRequiredValidator{
            conditionPath:  path.Root("enable_ssl"),
            conditionValue: true,
            requiredPath:   path.Root("certificate_path"),
            message:        "certificate_path is required when enable_ssl is true",
        },
    }
}

type conditionalRequiredValidator struct {
    conditionPath  path.Path
    conditionValue bool
    requiredPath   path.Path
    message        string
}

func (v *conditionalRequiredValidator) Description(ctx context.Context) string {
    return v.message
}

func (v *conditionalRequiredValidator) MarkdownDescription(ctx context.Context) string {
    return v.message
}

func (v *conditionalRequiredValidator) ValidateResource(ctx context.Context, req resource.ValidateConfigRequest, resp *resource.ValidateConfigResponse) {
    var conditionVal types.Bool
    resp.Diagnostics.Append(req.Config.GetAttribute(ctx, v.conditionPath, &conditionVal)...)

    if conditionVal.IsNull() || conditionVal.IsUnknown() {
        return
    }

    if conditionVal.ValueBool() == v.conditionValue {
        var requiredVal types.String
        resp.Diagnostics.Append(req.Config.GetAttribute(ctx, v.requiredPath, &requiredVal)...)

        if requiredVal.IsNull() {
            resp.Diagnostics.AddAttributeError(
                v.requiredPath,
                "Missing Required Attribute",
                v.message,
            )
        }
    }
}
```

## Mutually Exclusive Attributes

When two attributes cannot be set at the same time:

```go
func (r *ServerResource) ConfigValidators(ctx context.Context) []resource.ConfigValidator {
    return []resource.ConfigValidator{
        resourcevalidator.Conflicting(
            path.MatchRoot("inline_policy"),
            path.MatchRoot("policy_arn"),
        ),
    }
}
```

## At Least One Required

When at least one attribute from a group must be set:

```go
func (r *ServerResource) ConfigValidators(ctx context.Context) []resource.ConfigValidator {
    return []resource.ConfigValidator{
        resourcevalidator.AtLeastOneOf(
            path.MatchRoot("email"),
            path.MatchRoot("phone"),
        ),
    }
}
```

## Handling Null Values Consistently

Create helper functions for converting between null Terraform values and Go pointer types:

```go
// stringValueOrNil converts a Terraform string to a Go *string
func stringValueOrNil(v types.String) *string {
    if v.IsNull() || v.IsUnknown() {
        return nil
    }
    s := v.ValueString()
    return &s
}

// int64ValueOrNil converts a Terraform int64 to a Go *int64
func int64ValueOrNil(v types.Int64) *int64 {
    if v.IsNull() || v.IsUnknown() {
        return nil
    }
    i := v.ValueInt64()
    return &i
}

// stringFromPtr converts a Go *string to a Terraform string
func stringFromPtr(s *string) types.String {
    if s == nil {
        return types.StringNull()
    }
    return types.StringValue(*s)
}

// int64FromPtr converts a Go *int64 to a Terraform int64
func int64FromPtr(i *int64) types.Int64 {
    if i == nil {
        return types.Int64Null()
    }
    return types.Int64Value(*i)
}
```

Use them in your CRUD operations:

```go
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)

    createReq := &api.CreateServerRequest{
        Name:        plan.Name.ValueString(),
        Region:      plan.Region.ValueString(),
        Description: stringValueOrNil(plan.Description),
        Port:        int64ValueOrNil(plan.Port),
    }

    server, err := r.client.CreateServer(ctx, createReq)
    // ...

    // Map response back
    plan.Description = stringFromPtr(server.Description)
    plan.Port = int64FromPtr(server.Port)
}
```

## Best Practices

**Make the minimum set of attributes required.** Only require attributes that the API truly needs and that have no sensible default.

**Use Optional + Computed for server defaults.** When the API provides defaults, use this combination so users see the actual value in state.

**Document default values.** In your attribute description, always mention what the default value is for optional attributes.

**Handle null consistently.** Use helper functions to convert between null Terraform values and Go pointer types.

**Use conditional requirements sparingly.** They add complexity. If a group of attributes always goes together, consider a nested object instead.

**Validate early.** Use schema validators and config validators to catch invalid combinations during plan, not during apply.

**Consider backward compatibility.** When adding new attributes to an existing resource, make them optional to avoid breaking existing configurations.

## Conclusion

Designing the right mix of optional and required attributes is key to creating a user-friendly Terraform provider. By choosing appropriate defaults, handling null values correctly, and implementing conditional requirements where needed, you create a schema that is both flexible and intuitive.

For more on schema design, see our guides on [implementing computed attributes](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-computed-attributes-in-custom-providers/view) and [implementing set and list attributes](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-set-and-list-attributes-in-custom-providers/view).
