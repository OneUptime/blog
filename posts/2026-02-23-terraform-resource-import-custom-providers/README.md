# How to Implement Resource Import in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Resource Import, Go, Infrastructure as Code

Description: Learn how to implement the resource import capability in custom Terraform providers so users can bring existing infrastructure under Terraform management.

---

Resource import lets users bring existing infrastructure under Terraform management without recreating it. When someone runs `terraform import yourservice_server.main server-123`, Terraform calls your provider's import function to read the resource's current state from the API and populate the Terraform state. Without import support, users would need to destroy and recreate their existing resources to manage them with Terraform, which is unacceptable for production infrastructure.

This guide covers implementing resource import in custom Terraform providers, from simple ID-based imports to complex multi-attribute imports.

## How Import Works

The import process has three steps. First, Terraform calls the ImportState function on your resource with an identifier provided by the user. Second, ImportState parses the identifier and sets enough state for the Read function to work. Third, Terraform calls Read to populate the complete state from the API.

The minimal implementation simply passes the user-provided ID into the state's ID attribute and lets Read handle the rest.

## Simple ID-Based Import

Most resources can be imported using a single identifier. The Plugin Framework provides a helper function for this common case.

```go
package provider

import (
    "context"

    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/path"
)

// Ensure the resource implements ImportState
var _ resource.ResourceWithImportState = &ServerResource{}

// ImportState handles terraform import for simple ID-based lookups
func (r *ServerResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
    // ImportStatePassthroughID sets the "id" attribute from the import identifier
    // This is all you need when your resource uses a single ID field
    resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}
```

Users import the resource with:

```bash
terraform import yourservice_server.main server-abc123
```

After import, Terraform calls Read with the ID set to "server-abc123", and Read populates all the other attributes from the API.

## Composite Key Import

Some resources are identified by multiple attributes rather than a single ID. For example, a firewall rule might be identified by both a server ID and a rule ID, or a database user by a database name and username.

```go
import (
    "context"
    "fmt"
    "strings"

    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/path"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

// FirewallRuleResource is identified by server_id and rule_id
type FirewallRuleResourceModel struct {
    ID       types.String `tfsdk:"id"`
    ServerID types.String `tfsdk:"server_id"`
    RuleID   types.String `tfsdk:"rule_id"`
    Port     types.Int64  `tfsdk:"port"`
    Protocol types.String `tfsdk:"protocol"`
    Source   types.String `tfsdk:"source"`
}

func (r *FirewallRuleResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
    // Users provide the import ID as "server_id/rule_id"
    // Example: terraform import yourservice_firewall_rule.web "server-123/rule-456"

    idParts := strings.SplitN(req.ID, "/", 2)

    if len(idParts) != 2 || idParts[0] == "" || idParts[1] == "" {
        resp.Diagnostics.AddError(
            "Invalid Import ID",
            fmt.Sprintf("Expected import ID format: server_id/rule_id, got: %s", req.ID),
        )
        return
    }

    serverID := idParts[0]
    ruleID := idParts[1]

    // Set both identifying attributes in the state
    resp.Diagnostics.Append(resp.State.SetAttribute(ctx, path.Root("server_id"), serverID)...)
    resp.Diagnostics.Append(resp.State.SetAttribute(ctx, path.Root("rule_id"), ruleID)...)
    resp.Diagnostics.Append(resp.State.SetAttribute(ctx, path.Root("id"), fmt.Sprintf("%s/%s", serverID, ruleID))...)
}

// The Read function must handle both normal reads and post-import reads
func (r *FirewallRuleResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    var state FirewallRuleResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Use the composite key to look up the resource
    rule, err := r.client.GetFirewallRule(ctx, state.ServerID.ValueString(), state.RuleID.ValueString())
    if err != nil {
        if isNotFoundError(err) {
            resp.State.RemoveResource(ctx)
            return
        }
        resp.Diagnostics.AddError("Error reading firewall rule", err.Error())
        return
    }

    // Populate all attributes from the API response
    state.Port = types.Int64Value(int64(rule.Port))
    state.Protocol = types.StringValue(rule.Protocol)
    state.Source = types.StringValue(rule.Source)

    resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}
```

## Import by Name Instead of ID

Sometimes users know the name of a resource but not its internal ID. You can support name-based import by looking up the ID during import.

```go
func (r *DatabaseResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
    identifier := req.ID

    // Try to determine if the identifier is an ID or a name
    // IDs typically follow a pattern like "db-" prefix
    if strings.HasPrefix(identifier, "db-") {
        // It is an ID, pass it through
        resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
        return
    }

    // Treat it as a name and look up the ID
    database, err := r.client.GetDatabaseByName(ctx, identifier)
    if err != nil {
        resp.Diagnostics.AddError(
            "Error Looking Up Database",
            fmt.Sprintf("Could not find database with name '%s': %s\n\n"+
                "You can also import by ID: terraform import yourservice_database.main db-abc123",
                identifier, err),
        )
        return
    }

    // Set the ID from the lookup result
    resp.Diagnostics.Append(resp.State.SetAttribute(ctx, path.Root("id"), database.ID)...)
    resp.Diagnostics.Append(resp.State.SetAttribute(ctx, path.Root("name"), database.Name)...)
}
```

## SDKv2 Import Implementation

For providers using the older SDKv2, import is implemented slightly differently.

```go
func resourceServer() *schema.Resource {
    return &schema.Resource{
        // ... CRUD functions ...

        Importer: &schema.ResourceImporter{
            StateContext: resourceServerImportState,
        },
    }
}

// Simple passthrough import (most common)
func resourceServerImportState(ctx context.Context, d *schema.ResourceData, meta interface{}) ([]*schema.ResourceData, error) {
    // The import ID is already set as the resource ID
    // Read will be called next to populate all attributes
    return []*schema.ResourceData{d}, nil
}

// Composite key import in SDKv2
func resourceFirewallRuleImportState(ctx context.Context, d *schema.ResourceData, meta interface{}) ([]*schema.ResourceData, error) {
    parts := strings.SplitN(d.Id(), "/", 2)
    if len(parts) != 2 {
        return nil, fmt.Errorf("expected import ID format: server_id/rule_id, got: %s", d.Id())
    }

    d.Set("server_id", parts[0])
    d.Set("rule_id", parts[1])
    d.SetId(fmt.Sprintf("%s/%s", parts[0], parts[1]))

    return []*schema.ResourceData{d}, nil
}

// Import with API lookup
func resourceDatabaseImportState(ctx context.Context, d *schema.ResourceData, meta interface{}) ([]*schema.ResourceData, error) {
    client := meta.(*APIClient)
    identifier := d.Id()

    // Try name-based lookup
    database, err := client.GetDatabaseByName(ctx, identifier)
    if err != nil {
        // Fall back to ID-based lookup
        database, err = client.GetDatabase(ctx, identifier)
        if err != nil {
            return nil, fmt.Errorf("could not find database '%s': %w", identifier, err)
        }
    }

    d.SetId(database.ID)
    return []*schema.ResourceData{d}, nil
}
```

## Testing Import

Write acceptance tests that verify import works correctly.

```go
func TestAccServerResource_Import(t *testing.T) {
    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            // Step 1: Create the resource
            {
                Config: `
                    resource "yourservice_server" "test" {
                        name   = "import-test-server"
                        region = "us-east-1"
                        size   = "medium"

                        tags = {
                            environment = "test"
                        }
                    }
                `,
            },
            // Step 2: Import it and verify all attributes match
            {
                ResourceName:      "yourservice_server.test",
                ImportState:       true,
                ImportStateVerify: true,
                // If any attributes cannot be read back from the API,
                // exclude them from verification
                ImportStateVerifyIgnore: []string{"password"},
            },
        },
    })
}

// Test composite key import
func TestAccFirewallRule_Import(t *testing.T) {
    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: `
                    resource "yourservice_firewall_rule" "test" {
                        server_id = yourservice_server.test.id
                        port      = 443
                        protocol  = "tcp"
                        source    = "0.0.0.0/0"
                    }
                `,
            },
            {
                ResourceName:  "yourservice_firewall_rule.test",
                ImportState:   true,
                ImportStateIdFunc: func(s *terraform.State) (string, error) {
                    // Build the composite import ID from state
                    rs := s.RootModule().Resources["yourservice_firewall_rule.test"]
                    serverID := rs.Primary.Attributes["server_id"]
                    ruleID := rs.Primary.Attributes["rule_id"]
                    return fmt.Sprintf("%s/%s", serverID, ruleID), nil
                },
                ImportStateVerify: true,
            },
        },
    })
}
```

## Handling Write-Only Attributes

Some attributes like passwords or secrets are set during creation but cannot be read back from the API. These need special handling during import.

```go
func (r *DatabaseResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
    resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)

    // Warn the user about attributes that cannot be imported
    resp.Diagnostics.AddWarning(
        "Import Does Not Include Password",
        "The database password cannot be read from the API. After import, you must "+
            "set the 'password' attribute in your configuration to match the existing password, "+
            "or Terraform will attempt to update it on the next apply.",
    )
}
```

In the schema, mark write-only attributes appropriately.

```go
"password": schema.StringAttribute{
    Description: "Database admin password. Cannot be read after creation.",
    Required:    true,
    Sensitive:   true,
    PlanModifiers: []planmodifier.String{
        // Do not show a diff if the value has not changed in config
        stringplanmodifier.UseStateForUnknown(),
    },
},
```

## Best Practices

Always implement import for every resource. Users expect to be able to bring existing infrastructure under Terraform management. Lack of import support is a major usability gap.

Document the import ID format clearly. Users need to know whether to pass an ID, a name, or a composite key. Include examples in your documentation.

Test import thoroughly. Verify that every attribute is correctly populated after import, not just the ID.

Handle both ID and name imports when possible. Users may not know the internal ID of their resources, so supporting name-based lookup makes import more accessible.

Warn about write-only attributes. If your API does not return certain attributes like passwords, tell users what they need to do after import.

For more on resource lifecycle management, see our guide on [Implementing Resource CRUD Operations](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-crud-operations/view).

## Conclusion

Resource import is an essential capability that lets users adopt Terraform incrementally. By implementing ImportState correctly - handling both simple ID-based imports and complex composite keys - you make it easy for users to bring their existing infrastructure under Terraform management without disruption. Always pair your import implementation with comprehensive acceptance tests to verify that the imported state matches what your Read function produces.
