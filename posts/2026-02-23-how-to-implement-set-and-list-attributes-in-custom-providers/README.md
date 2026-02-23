# How to Implement Set and List Attributes in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Schema Design, Collections, Infrastructure as Code

Description: Learn how to implement set and list attributes in custom Terraform providers, including simple collections, nested object lists, and proper handling of ordering and uniqueness.

---

Many infrastructure resources have collection-type attributes: a list of security group IDs, a set of allowed IP addresses, or a list of configuration rules. Terraform provides both List and Set types for modeling these collections, and choosing the right one affects how Terraform detects changes and plans updates.

In this guide, we will cover how to implement List and Set attributes in your custom Terraform provider, including simple collections, nested object collections, and the important differences between the two types.

## Lists vs Sets

Understanding the difference between lists and sets is crucial for correct behavior:

**Lists** are ordered collections that allow duplicates. Terraform tracks items by their index position. Reordering items in a list creates a diff.

**Sets** are unordered collections of unique items. Terraform compares sets by their contents, not by position. Reordering items in a set does not create a diff.

| Feature | List | Set |
|---------|------|-----|
| Order matters | Yes | No |
| Allows duplicates | Yes | No |
| Comparison | By position | By content |
| Reorder creates diff | Yes | No |

## Simple List Attributes

Use `ListAttribute` for ordered collections of primitive values:

```go
func (r *SecurityGroupResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed: true,
            },
            "name": schema.StringAttribute{
                Required: true,
            },
            // A list of CIDR blocks - order matters for rule priority
            "allowed_cidrs": schema.ListAttribute{
                Required:    true,
                ElementType: types.StringType,
                Description: "Ordered list of allowed CIDR blocks. Rules are evaluated in order.",
            },
            // A list of port numbers
            "exposed_ports": schema.ListAttribute{
                Optional:    true,
                ElementType: types.Int64Type,
                Description: "List of ports to expose.",
            },
        },
    }
}
```

### Working with List Values in CRUD

```go
type SecurityGroupModel struct {
    ID           types.String `tfsdk:"id"`
    Name         types.String `tfsdk:"name"`
    AllowedCIDRs types.List   `tfsdk:"allowed_cidrs"`
    ExposedPorts types.List   `tfsdk:"exposed_ports"`
}

func (r *SecurityGroupResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan SecurityGroupModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Convert Terraform list to Go slice
    var cidrs []string
    resp.Diagnostics.Append(plan.AllowedCIDRs.ElementsAs(ctx, &cidrs, false)...)

    var ports []int64
    if !plan.ExposedPorts.IsNull() {
        resp.Diagnostics.Append(plan.ExposedPorts.ElementsAs(ctx, &ports, false)...)
    }

    if resp.Diagnostics.HasError() {
        return
    }

    // Build the API request
    createReq := &api.CreateSecurityGroupRequest{
        Name:         plan.Name.ValueString(),
        AllowedCIDRs: cidrs,
        ExposedPorts: intSliceToIntSlice(ports),
    }

    sg, err := r.client.CreateSecurityGroup(ctx, createReq)
    if err != nil {
        resp.Diagnostics.AddError("Error Creating Security Group", err.Error())
        return
    }

    // Convert API response back to Terraform list
    plan.ID = types.StringValue(sg.ID)

    cidrList, diags := types.ListValueFrom(ctx, types.StringType, sg.AllowedCIDRs)
    resp.Diagnostics.Append(diags...)
    plan.AllowedCIDRs = cidrList

    if len(sg.ExposedPorts) > 0 {
        portList, diags := types.ListValueFrom(ctx, types.Int64Type, sg.ExposedPorts)
        resp.Diagnostics.Append(diags...)
        plan.ExposedPorts = portList
    } else {
        plan.ExposedPorts = types.ListNull(types.Int64Type)
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Simple Set Attributes

Use `SetAttribute` for unordered collections of unique values:

```go
"tags": schema.SetAttribute{
    Optional:    true,
    ElementType: types.StringType,
    Description: "Set of tags to apply. Order does not matter, duplicates are ignored.",
},
"security_group_ids": schema.SetAttribute{
    Optional:    true,
    ElementType: types.StringType,
    Description: "Set of security group IDs to attach.",
},
```

### Working with Set Values

```go
// Convert Terraform set to Go slice
var tags []string
if !plan.Tags.IsNull() {
    resp.Diagnostics.Append(plan.Tags.ElementsAs(ctx, &tags, false)...)
}

// Convert Go slice back to Terraform set
tagSet, diags := types.SetValueFrom(ctx, types.StringType, apiResponse.Tags)
resp.Diagnostics.Append(diags...)
plan.Tags = tagSet

// Creating an empty set (not null)
emptySet := types.SetValueMust(types.StringType, []attr.Value{})

// Creating a null set
nullSet := types.SetNull(types.StringType)
```

## List Nested Attributes

For lists of complex objects, use `ListNestedAttribute`:

```go
"rules": schema.ListNestedAttribute{
    Required:    true,
    Description: "Ordered list of firewall rules. Evaluated top to bottom.",
    NestedObject: schema.NestedAttributeObject{
        Attributes: map[string]schema.Attribute{
            "action": schema.StringAttribute{
                Required:    true,
                Description: "Rule action: allow or deny.",
            },
            "protocol": schema.StringAttribute{
                Required:    true,
                Description: "Protocol: tcp, udp, or icmp.",
            },
            "port_range": schema.StringAttribute{
                Optional:    true,
                Description: "Port range (e.g., 80-443). Required for tcp and udp.",
            },
            "source": schema.StringAttribute{
                Required:    true,
                Description: "Source CIDR block.",
            },
            "description": schema.StringAttribute{
                Optional:    true,
                Description: "Human-readable description of the rule.",
            },
        },
    },
},
```

### Working with Nested Lists

```go
type FirewallModel struct {
    ID    types.String     `tfsdk:"id"`
    Name  types.String     `tfsdk:"name"`
    Rules []FirewallRule   `tfsdk:"rules"`
}

type FirewallRule struct {
    Action      types.String `tfsdk:"action"`
    Protocol    types.String `tfsdk:"protocol"`
    PortRange   types.String `tfsdk:"port_range"`
    Source      types.String `tfsdk:"source"`
    Description types.String `tfsdk:"description"`
}

func (r *FirewallResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan FirewallModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)

    // Convert nested list to API format
    apiRules := make([]api.FirewallRule, len(plan.Rules))
    for i, rule := range plan.Rules {
        apiRules[i] = api.FirewallRule{
            Action:   rule.Action.ValueString(),
            Protocol: rule.Protocol.ValueString(),
            Source:   rule.Source.ValueString(),
        }
        if !rule.PortRange.IsNull() {
            apiRules[i].PortRange = rule.PortRange.ValueString()
        }
        if !rule.Description.IsNull() {
            apiRules[i].Description = rule.Description.ValueString()
        }
    }

    // ... create the resource ...
}
```

## Set Nested Attributes

For unordered collections of unique objects:

```go
"ingress_rules": schema.SetNestedAttribute{
    Optional:    true,
    Description: "Set of ingress rules. Order does not matter.",
    NestedObject: schema.NestedAttributeObject{
        Attributes: map[string]schema.Attribute{
            "from_port": schema.Int64Attribute{
                Required: true,
            },
            "to_port": schema.Int64Attribute{
                Required: true,
            },
            "protocol": schema.StringAttribute{
                Required: true,
            },
            "cidr_blocks": schema.SetAttribute{
                Required:    true,
                ElementType: types.StringType,
            },
        },
    },
},
```

## Map Attributes

For key-value pair collections, use `MapAttribute`:

```go
"labels": schema.MapAttribute{
    Optional:    true,
    ElementType: types.StringType,
    Description: "Labels to assign as key-value pairs.",
},
"environment_variables": schema.MapAttribute{
    Optional:    true,
    ElementType: types.StringType,
    Description: "Environment variables for the container.",
},
```

Working with maps:

```go
// Read from plan
var labels map[string]string
if !plan.Labels.IsNull() {
    resp.Diagnostics.Append(plan.Labels.ElementsAs(ctx, &labels, false)...)
}

// Write back to state
labelMap, diags := types.MapValueFrom(ctx, types.StringType, apiResponse.Labels)
resp.Diagnostics.Append(diags...)
plan.Labels = labelMap
```

## Handling Empty Collections

Be careful with the distinction between null and empty collections:

```go
// Null collection - attribute not set at all
plan.Tags = types.SetNull(types.StringType)

// Empty collection - attribute set but with no items
plan.Tags = types.SetValueMust(types.StringType, []attr.Value{})
```

In your Read operation, handle the API response correctly:

```go
func setCollectionFromAPI(ctx context.Context, apiTags []string) types.Set {
    if apiTags == nil {
        // API returned nil - attribute is not set
        return types.SetNull(types.StringType)
    }
    if len(apiTags) == 0 {
        // API returned empty list - attribute is set but empty
        return types.SetValueMust(types.StringType, []attr.Value{})
    }
    // API returned values
    tagSet, _ := types.SetValueFrom(ctx, types.StringType, apiTags)
    return tagSet
}
```

## Validating Collection Elements

Add validators to collection attributes to validate individual elements:

```go
"allowed_cidrs": schema.ListAttribute{
    Required:    true,
    ElementType: types.StringType,
    Validators: []validator.List{
        // Ensure at least one CIDR is specified
        listvalidator.SizeAtLeast(1),
        // Ensure no more than 50 CIDRs
        listvalidator.SizeAtMost(50),
        // Validate each element
        listvalidator.ValueStringsAre(
            stringvalidator.RegexMatches(
                regexp.MustCompile(`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/\d{1,2}$`),
                "must be a valid CIDR block",
            ),
        ),
    },
},
```

## Best Practices

**Use Sets when order does not matter.** This prevents unnecessary diffs when users reorder items in their configuration.

**Use Lists when order matters.** Firewall rules, priority-based configurations, and similar ordered data should use lists.

**Validate collection sizes.** Use `SizeAtLeast` and `SizeAtMost` to enforce reasonable limits.

**Handle null vs empty correctly.** A null collection means "not specified" while an empty collection means "explicitly empty". These often have different meanings to the API.

**Use nested attributes for complex items.** When collection items have multiple properties, use nested attributes instead of encoding them as strings.

**Document ordering behavior.** In your attribute description, tell users whether order matters and whether duplicates are allowed.

## Conclusion

List and Set attributes are essential for modeling the collection-type properties that most infrastructure resources have. By choosing the right collection type, handling null and empty states correctly, and implementing proper validation, you create a provider that handles complex configurations naturally and predictably.

For more on schema design, see our guides on [handling complex nested schemas](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-nested-schemas-in-custom-providers/view) and [handling optional and required attributes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-optional-and-required-attributes-in-custom-providers/view).
