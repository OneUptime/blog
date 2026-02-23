# How to Handle Complex Nested Schemas in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Schema Design, Nested Blocks, Infrastructure as Code

Description: Learn how to design and implement complex nested schemas in custom Terraform providers using blocks, objects, lists, and sets for modeling hierarchical resource configurations.

---

Many real-world infrastructure resources have complex, hierarchical configurations. A load balancer has listener rules, a security group has ingress and egress rules, and a database cluster has node configurations. Modeling these structures in your Terraform provider requires a solid understanding of nested schemas.

In this guide, we will cover how to design and implement nested schemas in custom Terraform providers, including single nested blocks, list nested blocks, set nested blocks, and deeply nested structures.

## Understanding Nested Schema Types

The Terraform Plugin Framework provides several ways to model nested data:

- **SingleNestedAttribute** - an object with named attributes (exactly one)
- **ListNestedAttribute** - an ordered list of objects
- **SetNestedAttribute** - an unordered set of unique objects
- **MapNestedAttribute** - a map of string keys to objects
- **SingleNestedBlock** - a block that appears exactly once
- **ListNestedBlock** - a block that can appear zero or more times
- **SetNestedBlock** - like ListNestedBlock but unordered

### Attributes vs Blocks

The main difference between nested attributes and nested blocks is syntax in HCL:

```hcl
# Nested attribute (uses = syntax)
resource "example_server" "web" {
  network_config = {
    vpc_id    = "vpc-123"
    subnet_id = "subnet-456"
  }
}

# Nested block (uses block syntax)
resource "example_server" "web" {
  network_config {
    vpc_id    = "vpc-123"
    subnet_id = "subnet-456"
  }
}
```

For new providers, HashiCorp recommends using nested attributes over blocks when possible.

## Single Nested Attributes

Use `SingleNestedAttribute` when your resource has a single configuration object:

```go
func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed: true,
            },
            "name": schema.StringAttribute{
                Required: true,
            },
            // Single nested attribute for network configuration
            "network_config": schema.SingleNestedAttribute{
                Required: true,
                Description: "Network configuration for the server.",
                Attributes: map[string]schema.Attribute{
                    "vpc_id": schema.StringAttribute{
                        Required:    true,
                        Description: "The VPC ID to deploy the server in.",
                    },
                    "subnet_id": schema.StringAttribute{
                        Required:    true,
                        Description: "The subnet ID within the VPC.",
                    },
                    "security_group_ids": schema.ListAttribute{
                        Optional:    true,
                        ElementType: types.StringType,
                        Description: "List of security group IDs to attach.",
                    },
                    "assign_public_ip": schema.BoolAttribute{
                        Optional:    true,
                        Computed:    true,
                        Description: "Whether to assign a public IP. Defaults to false.",
                    },
                },
            },
        },
    }
}
```

The corresponding Go model:

```go
type ServerResourceModel struct {
    ID            types.String       `tfsdk:"id"`
    Name          types.String       `tfsdk:"name"`
    NetworkConfig *NetworkConfigModel `tfsdk:"network_config"`
}

type NetworkConfigModel struct {
    VPCID            types.String `tfsdk:"vpc_id"`
    SubnetID         types.String `tfsdk:"subnet_id"`
    SecurityGroupIDs types.List   `tfsdk:"security_group_ids"`
    AssignPublicIP   types.Bool   `tfsdk:"assign_public_ip"`
}
```

## List Nested Attributes

Use `ListNestedAttribute` for ordered collections of similar objects:

```go
// Load balancer with multiple listener rules
"listener_rules": schema.ListNestedAttribute{
    Required:    true,
    Description: "List of listener rules for the load balancer.",
    NestedObject: schema.NestedAttributeObject{
        Attributes: map[string]schema.Attribute{
            "port": schema.Int64Attribute{
                Required:    true,
                Description: "The port to listen on.",
            },
            "protocol": schema.StringAttribute{
                Required:    true,
                Description: "The protocol (HTTP, HTTPS, TCP).",
            },
            "target_group_arn": schema.StringAttribute{
                Required:    true,
                Description: "The ARN of the target group.",
            },
            "priority": schema.Int64Attribute{
                Optional:    true,
                Description: "Rule priority. Lower values have higher priority.",
            },
            // Nested within the list item
            "health_check": schema.SingleNestedAttribute{
                Optional:    true,
                Description: "Health check configuration for this listener.",
                Attributes: map[string]schema.Attribute{
                    "path": schema.StringAttribute{
                        Optional:    true,
                        Description: "Health check path.",
                    },
                    "interval": schema.Int64Attribute{
                        Optional:    true,
                        Computed:    true,
                        Description: "Health check interval in seconds. Defaults to 30.",
                    },
                    "healthy_threshold": schema.Int64Attribute{
                        Optional:    true,
                        Computed:    true,
                        Description: "Number of consecutive successes required. Defaults to 3.",
                    },
                },
            },
        },
    },
},
```

The Go model:

```go
type LoadBalancerModel struct {
    ID            types.String         `tfsdk:"id"`
    Name          types.String         `tfsdk:"name"`
    ListenerRules []ListenerRuleModel  `tfsdk:"listener_rules"`
}

type ListenerRuleModel struct {
    Port           types.Int64       `tfsdk:"port"`
    Protocol       types.String      `tfsdk:"protocol"`
    TargetGroupARN types.String      `tfsdk:"target_group_arn"`
    Priority       types.Int64       `tfsdk:"priority"`
    HealthCheck    *HealthCheckModel `tfsdk:"health_check"`
}

type HealthCheckModel struct {
    Path             types.String `tfsdk:"path"`
    Interval         types.Int64  `tfsdk:"interval"`
    HealthyThreshold types.Int64  `tfsdk:"healthy_threshold"`
}
```

## Set Nested Attributes

Use `SetNestedAttribute` when order does not matter and items must be unique:

```go
// Security group with unordered ingress rules
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
            "cidr_blocks": schema.ListAttribute{
                Optional:    true,
                ElementType: types.StringType,
            },
        },
    },
},
```

## Deeply Nested Structures

For complex resources, you may need multiple levels of nesting:

```go
// Database cluster with deeply nested configuration
"cluster_config": schema.SingleNestedAttribute{
    Required:    true,
    Description: "Configuration for the database cluster.",
    Attributes: map[string]schema.Attribute{
        "engine": schema.StringAttribute{
            Required: true,
        },
        "version": schema.StringAttribute{
            Required: true,
        },
        // First level of nesting: node configuration
        "nodes": schema.ListNestedAttribute{
            Required:    true,
            Description: "List of nodes in the cluster.",
            NestedObject: schema.NestedAttributeObject{
                Attributes: map[string]schema.Attribute{
                    "role": schema.StringAttribute{
                        Required:    true,
                        Description: "Node role: primary or replica.",
                    },
                    "instance_type": schema.StringAttribute{
                        Required: true,
                    },
                    // Second level of nesting: storage configuration
                    "storage": schema.SingleNestedAttribute{
                        Required:    true,
                        Description: "Storage configuration for the node.",
                        Attributes: map[string]schema.Attribute{
                            "type": schema.StringAttribute{
                                Required:    true,
                                Description: "Storage type: ssd or hdd.",
                            },
                            "size_gb": schema.Int64Attribute{
                                Required:    true,
                                Description: "Storage size in gigabytes.",
                            },
                            "iops": schema.Int64Attribute{
                                Optional:    true,
                                Description: "Provisioned IOPS. Only applicable for ssd storage.",
                            },
                        },
                    },
                },
            },
        },
        // First level: backup configuration
        "backup": schema.SingleNestedAttribute{
            Optional:    true,
            Description: "Backup configuration.",
            Attributes: map[string]schema.Attribute{
                "enabled": schema.BoolAttribute{
                    Optional: true,
                    Computed: true,
                },
                "retention_days": schema.Int64Attribute{
                    Optional: true,
                    Computed: true,
                },
                "schedule": schema.StringAttribute{
                    Optional:    true,
                    Description: "Cron expression for backup schedule.",
                },
            },
        },
    },
},
```

## Working with Nested Data in CRUD Operations

Reading and writing nested data requires careful handling:

```go
func (r *LoadBalancerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan LoadBalancerModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Convert nested model to API request
    createReq := &api.CreateLoadBalancerRequest{
        Name: plan.Name.ValueString(),
    }

    // Convert listener rules from model to API format
    for _, rule := range plan.ListenerRules {
        apiRule := api.ListenerRule{
            Port:           int(rule.Port.ValueInt64()),
            Protocol:       rule.Protocol.ValueString(),
            TargetGroupARN: rule.TargetGroupARN.ValueString(),
        }

        if !rule.Priority.IsNull() {
            priority := int(rule.Priority.ValueInt64())
            apiRule.Priority = &priority
        }

        // Handle nested health check
        if rule.HealthCheck != nil {
            apiRule.HealthCheck = &api.HealthCheck{
                Path:     rule.HealthCheck.Path.ValueString(),
                Interval: int(rule.HealthCheck.Interval.ValueInt64()),
            }
        }

        createReq.ListenerRules = append(createReq.ListenerRules, apiRule)
    }

    // Make the API call
    lb, err := r.client.CreateLoadBalancer(ctx, createReq)
    if err != nil {
        resp.Diagnostics.AddError("Error creating load balancer", err.Error())
        return
    }

    // Map API response back to model
    plan.ID = types.StringValue(lb.ID)
    // ... map other fields ...

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Best Practices

**Keep nesting depth reasonable.** Try to limit nesting to two or three levels. Deeply nested schemas are hard for users to understand and work with.

**Use SingleNestedAttribute for configuration objects.** When a resource has a single configuration block (like network_config), use SingleNestedAttribute.

**Use ListNestedAttribute for ordered collections.** When the order of items matters (like listener rules with priorities), use ListNestedAttribute.

**Use SetNestedAttribute for unordered collections.** When order does not matter and duplicates should not exist, use SetNestedAttribute.

**Flatten when possible.** If a nested structure only has one or two attributes, consider flattening them into the parent. For example, instead of nesting `storage { size_gb = 100 }`, just use `storage_size_gb = 100`.

**Validate at the right level.** Use attribute-level validators for individual values and resource-level validators for cross-attribute validation within nested structures.

## Conclusion

Complex nested schemas are essential for modeling real-world infrastructure resources in Terraform providers. By choosing the right nesting type, designing clean data models, and carefully handling the conversion between Terraform types and API types, you can create providers that support even the most complex resource configurations.

For more on schema design, see our guides on [implementing set and list attributes](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-set-and-list-attributes-in-custom-providers/view) and [handling optional and required attributes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-optional-and-required-attributes-in-custom-providers/view).
