# How to Implement Plan Modification in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Plan Modification, Infrastructure as Code, Custom Provider

Description: Learn how to implement plan modifiers in custom Terraform providers to control attribute behavior during planning, including default values and force replacement.

---

Plan modification is a powerful feature in Terraform's Plugin Framework that lets you control how attribute values behave during the planning phase. With plan modifiers, you can set default values, mark resources for replacement when certain attributes change, and customize the planned state before Terraform shows it to the user.

In this guide, we will explore the different types of plan modifiers available and show you how to implement them effectively in your custom Terraform provider.

## Understanding Plan Modification

When a user runs `terraform plan`, Terraform computes a plan that describes the changes it will make to reach the desired state. During this process, the provider has an opportunity to modify the planned values for each attribute. This is where plan modifiers come in.

Plan modifiers can do several things:

- Set default values for optional attributes
- Mark a resource for replacement when an attribute changes (force new)
- Compute values that depend on other attributes
- Suppress unnecessary diffs
- Add warnings or errors to the plan

## The Plan Modification Lifecycle

Plan modifiers run after validation and before the plan is presented to the user. They receive the current state (if any), the configuration, and the proposed new value. They can then modify the planned value or add diagnostics.

The order of operations is:

1. Configuration parsing
2. Validation
3. Plan modification
4. Plan output to user
5. Apply (if approved)

## Built-in Plan Modifiers

The Plugin Framework provides several built-in plan modifiers that cover common use cases.

### Default Values

One of the most common needs is setting default values for optional attributes:

```go
import (
    "context"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/int64planmodifier"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/boolplanmodifier"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/stringdefault"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/int64default"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/booldefault"
)

func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            // String attribute with a default value
            "region": schema.StringAttribute{
                Optional: true,
                Computed: true,
                Default:  stringdefault.StaticString("us-east-1"),
                Description: "The region where the server will be deployed. Defaults to us-east-1.",
            },
            // Integer attribute with a default value
            "port": schema.Int64Attribute{
                Optional: true,
                Computed: true,
                Default:  int64default.StaticInt64(8080),
                Description: "The port number for the server. Defaults to 8080.",
            },
            // Boolean attribute with a default value
            "enable_monitoring": schema.BoolAttribute{
                Optional: true,
                Computed: true,
                Default:  booldefault.StaticBool(true),
                Description: "Whether to enable monitoring. Defaults to true.",
            },
        },
    }
}
```

### Require Replacement

When certain attributes change, the resource must be destroyed and recreated. You can mark these attributes with `RequiresReplace`:

```go
"instance_type": schema.StringAttribute{
    Required: true,
    PlanModifiers: []planmodifier.String{
        // If instance_type changes, the resource must be replaced
        stringplanmodifier.RequiresReplace(),
    },
},
```

There is also `RequiresReplaceIfConfigured`, which only forces replacement if the attribute is explicitly set in the configuration (as opposed to being null):

```go
"availability_zone": schema.StringAttribute{
    Optional: true,
    PlanModifiers: []planmodifier.String{
        stringplanmodifier.RequiresReplaceIfConfigured(),
    },
},
```

### Use State for Unknown

When a computed attribute's value will not change after creation, you can use `UseStateForUnknown` to prevent unnecessary diffs:

```go
"id": schema.StringAttribute{
    Computed: true,
    PlanModifiers: []planmodifier.String{
        // The ID will not change after creation,
        // so use the state value for planning
        stringplanmodifier.UseStateForUnknown(),
    },
},
```

## Creating Custom Plan Modifiers

When built-in plan modifiers do not meet your needs, you can create custom ones. Let us walk through several examples.

### Conditional Default Value

Here is a plan modifier that sets a default value based on another attribute:

```go
// conditionalDefaultModifier sets a default value based on another attribute
type conditionalDefaultModifier struct {
    dependentPath path.Path
    valueMap      map[string]string
}

// Description returns a plain text description
func (m conditionalDefaultModifier) Description(ctx context.Context) string {
    return "Sets a default value based on another attribute"
}

// MarkdownDescription returns a markdown description
func (m conditionalDefaultModifier) MarkdownDescription(ctx context.Context) string {
    return "Sets a default value based on another attribute"
}

// PlanModifyString implements the plan modification logic
func (m conditionalDefaultModifier) PlanModifyString(ctx context.Context, req planmodifier.StringRequest, resp *planmodifier.StringResponse) {
    // Do not modify if the value is already set in config
    if !req.ConfigValue.IsNull() {
        return
    }

    // Read the dependent attribute value
    var dependentValue types.String
    resp.Diagnostics.Append(req.Plan.GetAttribute(ctx, m.dependentPath, &dependentValue)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // If the dependent value is unknown, we cannot compute the default
    if dependentValue.IsUnknown() {
        resp.PlanValue = types.StringUnknown()
        return
    }

    // Look up the default value based on the dependent attribute
    if defaultVal, ok := m.valueMap[dependentValue.ValueString()]; ok {
        resp.PlanValue = types.StringValue(defaultVal)
    }
}

// ConditionalDefault returns a plan modifier that sets defaults conditionally
func ConditionalDefault(dependentAttr string, valueMap map[string]string) planmodifier.String {
    return conditionalDefaultModifier{
        dependentPath: path.Root(dependentAttr),
        valueMap:      valueMap,
    }
}
```

Usage in a schema:

```go
"storage_class": schema.StringAttribute{
    Optional: true,
    Computed: true,
    PlanModifiers: []planmodifier.String{
        // Set default storage class based on environment
        ConditionalDefault("environment", map[string]string{
            "production":  "ssd",
            "staging":     "hdd",
            "development": "hdd",
        }),
    },
},
```

### Conditional Replacement

Sometimes you want to force replacement only under certain conditions:

```go
// conditionalReplaceModifier forces replacement based on a condition
type conditionalReplaceModifier struct{}

func (m conditionalReplaceModifier) Description(ctx context.Context) string {
    return "Forces replacement when the value changes to a different category"
}

func (m conditionalReplaceModifier) MarkdownDescription(ctx context.Context) string {
    return "Forces replacement when the value changes to a different category"
}

func (m conditionalReplaceModifier) PlanModifyString(ctx context.Context, req planmodifier.StringRequest, resp *planmodifier.StringResponse) {
    // If there is no state (creating for the first time), skip
    if req.StateValue.IsNull() {
        return
    }

    // If values are the same, no change needed
    if req.StateValue.Equal(req.PlanValue) {
        return
    }

    oldValue := req.StateValue.ValueString()
    newValue := req.PlanValue.ValueString()

    // Only force replacement if changing between size categories
    // For example: small -> medium is okay, but small -> large requires replacement
    oldCategory := getSizeCategory(oldValue)
    newCategory := getSizeCategory(newValue)

    if oldCategory != newCategory {
        resp.RequiresReplace = true
    }
}

func getSizeCategory(size string) string {
    switch size {
    case "small", "medium":
        return "standard"
    case "large", "xlarge":
        return "premium"
    default:
        return "unknown"
    }
}
```

### Immutable After Creation

A common pattern is attributes that can be set during creation but cannot be changed afterward:

```go
// immutableModifier prevents an attribute from being changed after creation
type immutableModifier struct{}

func (m immutableModifier) Description(ctx context.Context) string {
    return "Value cannot be changed after resource creation"
}

func (m immutableModifier) MarkdownDescription(ctx context.Context) string {
    return "Value cannot be changed after resource creation"
}

func (m immutableModifier) PlanModifyString(ctx context.Context, req planmodifier.StringRequest, resp *planmodifier.StringResponse) {
    // If there is no state, this is a create operation - allow any value
    if req.StateValue.IsNull() {
        return
    }

    // If the config value differs from the state value, report an error
    if !req.ConfigValue.IsNull() && !req.ConfigValue.Equal(req.StateValue) {
        resp.Diagnostics.AddAttributeError(
            req.Path,
            "Immutable Attribute",
            fmt.Sprintf(
                "The %s attribute cannot be changed after creation. "+
                    "Current value: %s, attempted value: %s. "+
                    "To change this value, destroy and recreate the resource.",
                req.Path, req.StateValue.ValueString(), req.ConfigValue.ValueString(),
            ),
        )
    }
}

// Immutable returns a plan modifier that prevents changes after creation
func Immutable() planmodifier.String {
    return immutableModifier{}
}
```

## Plan Modifiers for Different Attribute Types

The Plugin Framework supports plan modifiers for all attribute types. Each type has its own interface:

```go
// String plan modifier
type StringPlanModifier interface {
    PlanModifyString(context.Context, StringRequest, *StringResponse)
}

// Int64 plan modifier
type Int64PlanModifier interface {
    PlanModifyInt64(context.Context, Int64Request, *Int64Response)
}

// Bool plan modifier
type BoolPlanModifier interface {
    PlanModifyBool(context.Context, BoolRequest, *BoolResponse)
}

// List plan modifier
type ListPlanModifier interface {
    PlanModifyList(context.Context, ListRequest, *ListResponse)
}

// Object plan modifier
type ObjectPlanModifier interface {
    PlanModifyObject(context.Context, ObjectRequest, *ObjectResponse)
}
```

## Resource-Level Plan Modification

In addition to attribute-level plan modifiers, you can implement resource-level plan modification using the `ModifyPlan` method:

```go
func (r *ServerResource) ModifyPlan(ctx context.Context, req resource.ModifyPlanRequest, resp *resource.ModifyPlanResponse) {
    // Skip if destroying
    if req.Plan.Raw.IsNull() {
        return
    }

    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Add a warning if using a deprecated instance type
    if plan.InstanceType.ValueString() == "t2.micro" {
        resp.Diagnostics.AddWarning(
            "Deprecated Instance Type",
            "The t2.micro instance type is deprecated. Consider using t3.micro instead.",
        )
    }

    // Compute a derived attribute
    if !plan.Name.IsUnknown() && !plan.Region.IsUnknown() {
        fqdn := fmt.Sprintf("%s.%s.example.com", plan.Name.ValueString(), plan.Region.ValueString())
        plan.FQDN = types.StringValue(fqdn)
    }

    resp.Diagnostics.Append(resp.Plan.Set(ctx, &plan)...)
}
```

## Best Practices

When implementing plan modifiers, keep these guidelines in mind:

**Always check for null and unknown values.** During planning, attributes may be null (not set) or unknown (depends on another resource). Handle both cases explicitly.

**Do not make API calls in plan modifiers.** Plan modifiers should be fast and deterministic. Avoid making external calls that could slow down the planning phase or produce inconsistent results.

**Use built-in modifiers when possible.** The framework provides well-tested plan modifiers for common cases. Only create custom modifiers when you need behavior that is not available out of the box.

**Order matters.** Plan modifiers run in the order they are defined. If you have multiple modifiers on an attribute, make sure they are in the correct order.

**Document your modifiers.** Use meaningful descriptions so that users understand the behavior when they read the provider documentation.

## Conclusion

Plan modification is a powerful mechanism that gives you fine-grained control over how your provider handles attribute values during planning. By combining built-in plan modifiers with custom implementations, you can create providers that provide excellent user experiences with sensible defaults, clear replacement behavior, and computed values.

For more on custom provider development, see our guides on [implementing validation in custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-validation-in-custom-providers/view) and [handling complex nested schemas](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-nested-schemas-in-custom-providers/view).
