# How to Implement Data Sources in Terraform Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Data Source, Go, Infrastructure as Code

Description: Learn how to implement data sources in a Terraform provider to let users query and reference existing resources without managing their lifecycle through Terraform.

---

Data sources let Terraform users read information about existing infrastructure without managing it. When a user writes `data "yourservice_server" "main"`, they are asking Terraform to look up a server that already exists and make its attributes available for use in other resources. Unlike resources, data sources only implement a Read operation. They never create, update, or delete anything.

This guide covers implementing data sources in Terraform providers, including single-item lookups, list queries, filtering patterns, and handling complex response data.

## Understanding Data Sources

Data sources serve two primary purposes. First, they let users reference infrastructure that was created outside of Terraform or in a different Terraform configuration. Second, they enable lookups that inform resource creation, such as finding the latest AMI ID or looking up a VPC by name.

The key difference from resources: data sources are read during every plan and apply. They have no lifecycle management. Terraform does not track their state for drift detection.

## Implementing a Basic Data Source

A data source implementation requires three methods in the Plugin Framework: Metadata, Schema, and Read.

```go
// internal/provider/data_source_server.go
package provider

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/datasource/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

// Ensure interface compliance
var _ datasource.DataSource = &ServerDataSource{}
var _ datasource.DataSourceWithConfigure = &ServerDataSource{}

type ServerDataSource struct {
    client *APIClient
}

// Model for the data source attributes
type ServerDataSourceModel struct {
    ID            types.String `tfsdk:"id"`
    Name          types.String `tfsdk:"name"`
    Status        types.String `tfsdk:"status"`
    Region        types.String `tfsdk:"region"`
    InstanceType  types.String `tfsdk:"instance_type"`
    IPAddress     types.String `tfsdk:"ip_address"`
    PublicIP      types.String `tfsdk:"public_ip"`
    CPUCount      types.Int64  `tfsdk:"cpu_count"`
    MemoryGB      types.Int64  `tfsdk:"memory_gb"`
    Tags          types.Map    `tfsdk:"tags"`
    CreatedAt     types.String `tfsdk:"created_at"`
}

// NewServerDataSource creates a new instance of the data source
func NewServerDataSource() datasource.DataSource {
    return &ServerDataSource{}
}

// Metadata returns the data source type name
func (d *ServerDataSource) Metadata(_ context.Context, req datasource.MetadataRequest, resp *datasource.MetadataResponse) {
    resp.TypeName = req.ProviderTypeName + "_server"
}

// Schema defines the data source attributes
func (d *ServerDataSource) Schema(_ context.Context, _ datasource.SchemaRequest, resp *datasource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Use this data source to look up an existing server by ID or name.",

        Attributes: map[string]schema.Attribute{
            // Lookup attributes - at least one must be specified
            "id": schema.StringAttribute{
                Description: "The server ID. Either id or name must be specified.",
                Optional:    true,
                Computed:    true,
            },
            "name": schema.StringAttribute{
                Description: "The server name. Either id or name must be specified.",
                Optional:    true,
                Computed:    true,
            },

            // All other attributes are computed (read from the API)
            "status": schema.StringAttribute{
                Description: "Current server status.",
                Computed:    true,
            },
            "region": schema.StringAttribute{
                Description: "Deployment region.",
                Computed:    true,
            },
            "instance_type": schema.StringAttribute{
                Description: "Server instance type.",
                Computed:    true,
            },
            "ip_address": schema.StringAttribute{
                Description: "Private IP address.",
                Computed:    true,
            },
            "public_ip": schema.StringAttribute{
                Description: "Public IP address, if assigned.",
                Computed:    true,
            },
            "cpu_count": schema.Int64Attribute{
                Description: "Number of CPU cores.",
                Computed:    true,
            },
            "memory_gb": schema.Int64Attribute{
                Description: "Memory in gigabytes.",
                Computed:    true,
            },
            "tags": schema.MapAttribute{
                Description: "Server tags.",
                Computed:    true,
                ElementType: types.StringType,
            },
            "created_at": schema.StringAttribute{
                Description: "Creation timestamp.",
                Computed:    true,
            },
        },
    }
}

// Configure stores the API client
func (d *ServerDataSource) Configure(_ context.Context, req datasource.ConfigureRequest, resp *datasource.ConfigureResponse) {
    if req.ProviderData == nil {
        return
    }

    client, ok := req.ProviderData.(*APIClient)
    if !ok {
        resp.Diagnostics.AddError(
            "Unexpected Data Source Configure Type",
            "Expected *APIClient.",
        )
        return
    }

    d.client = client
}

// Read fetches the server data from the API
func (d *ServerDataSource) Read(ctx context.Context, req datasource.ReadRequest, resp *datasource.ReadResponse) {
    var config ServerDataSourceModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Validate that at least one lookup attribute is provided
    if config.ID.IsNull() && config.Name.IsNull() {
        resp.Diagnostics.AddError(
            "Missing Required Attribute",
            "Either 'id' or 'name' must be specified to look up a server.",
        )
        return
    }

    var server *api.Server
    var err error

    // Look up by ID or name
    if !config.ID.IsNull() {
        server, err = d.client.GetServer(ctx, config.ID.ValueString())
    } else {
        server, err = d.client.GetServerByName(ctx, config.Name.ValueString())
    }

    if err != nil {
        resp.Diagnostics.AddError(
            "Error Reading Server",
            fmt.Sprintf("Could not read server: %s", err),
        )
        return
    }

    if server == nil {
        resp.Diagnostics.AddError(
            "Server Not Found",
            "No server matching the specified criteria was found.",
        )
        return
    }

    // Populate the model with API data
    config.ID = types.StringValue(server.ID)
    config.Name = types.StringValue(server.Name)
    config.Status = types.StringValue(server.Status)
    config.Region = types.StringValue(server.Region)
    config.InstanceType = types.StringValue(server.InstanceType)
    config.IPAddress = types.StringValue(server.IPAddress)
    config.CPUCount = types.Int64Value(int64(server.CPUCount))
    config.MemoryGB = types.Int64Value(int64(server.MemoryGB))
    config.CreatedAt = types.StringValue(server.CreatedAt.Format(time.RFC3339))

    // Handle nullable fields
    if server.PublicIP != "" {
        config.PublicIP = types.StringValue(server.PublicIP)
    } else {
        config.PublicIP = types.StringNull()
    }

    // Handle map attributes
    if len(server.Tags) > 0 {
        tagElements := make(map[string]attr.Value)
        for k, v := range server.Tags {
            tagElements[k] = types.StringValue(v)
        }
        config.Tags, _ = types.MapValue(types.StringType, tagElements)
    } else {
        config.Tags = types.MapNull(types.StringType)
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &config)...)
}
```

## Implementing a List Data Source

List data sources return multiple items, often with filtering support.

```go
// internal/provider/data_source_servers.go
package provider

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-framework/attr"
    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/datasource/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

type ServersDataSource struct {
    client *APIClient
}

type ServersDataSourceModel struct {
    Region types.String `tfsdk:"region"`
    Status types.String `tfsdk:"status"`
    Tags   types.Map    `tfsdk:"tags"`

    // The list of servers returned
    Servers []ServerItemModel `tfsdk:"servers"`

    // Convenience: just the IDs
    IDs types.List `tfsdk:"ids"`
}

type ServerItemModel struct {
    ID           types.String `tfsdk:"id"`
    Name         types.String `tfsdk:"name"`
    Status       types.String `tfsdk:"status"`
    Region       types.String `tfsdk:"region"`
    InstanceType types.String `tfsdk:"instance_type"`
    IPAddress    types.String `tfsdk:"ip_address"`
}

func NewServersDataSource() datasource.DataSource {
    return &ServersDataSource{}
}

func (d *ServersDataSource) Metadata(_ context.Context, req datasource.MetadataRequest, resp *datasource.MetadataResponse) {
    resp.TypeName = req.ProviderTypeName + "_servers"
}

func (d *ServersDataSource) Schema(_ context.Context, _ datasource.SchemaRequest, resp *datasource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Returns a list of servers matching the specified filters.",

        Attributes: map[string]schema.Attribute{
            // Filter attributes
            "region": schema.StringAttribute{
                Description: "Filter by region.",
                Optional:    true,
            },
            "status": schema.StringAttribute{
                Description: "Filter by status.",
                Optional:    true,
            },
            "tags": schema.MapAttribute{
                Description: "Filter by tags. All specified tags must match.",
                Optional:    true,
                ElementType: types.StringType,
            },

            // Convenience output: list of IDs
            "ids": schema.ListAttribute{
                Description: "List of server IDs matching the filters.",
                Computed:    true,
                ElementType: types.StringType,
            },

            // Full server details
            "servers": schema.ListNestedAttribute{
                Description: "List of servers matching the filters.",
                Computed:    true,
                NestedObject: schema.NestedAttributeObject{
                    Attributes: map[string]schema.Attribute{
                        "id": schema.StringAttribute{
                            Computed: true,
                        },
                        "name": schema.StringAttribute{
                            Computed: true,
                        },
                        "status": schema.StringAttribute{
                            Computed: true,
                        },
                        "region": schema.StringAttribute{
                            Computed: true,
                        },
                        "instance_type": schema.StringAttribute{
                            Computed: true,
                        },
                        "ip_address": schema.StringAttribute{
                            Computed: true,
                        },
                    },
                },
            },
        },
    }
}

func (d *ServersDataSource) Read(ctx context.Context, req datasource.ReadRequest, resp *datasource.ReadResponse) {
    var config ServersDataSourceModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Build API query filters
    filters := &api.ServerFilters{}

    if !config.Region.IsNull() {
        filters.Region = config.Region.ValueString()
    }
    if !config.Status.IsNull() {
        filters.Status = config.Status.ValueString()
    }
    if !config.Tags.IsNull() {
        tags := make(map[string]string)
        resp.Diagnostics.Append(config.Tags.ElementsAs(ctx, &tags, false)...)
        filters.Tags = tags
    }

    // Fetch servers from the API
    servers, err := d.client.ListServers(ctx, filters)
    if err != nil {
        resp.Diagnostics.AddError(
            "Error Listing Servers",
            fmt.Sprintf("Could not list servers: %s", err),
        )
        return
    }

    // Build the result models
    serverModels := make([]ServerItemModel, 0, len(servers))
    idElements := make([]attr.Value, 0, len(servers))

    for _, server := range servers {
        serverModels = append(serverModels, ServerItemModel{
            ID:           types.StringValue(server.ID),
            Name:         types.StringValue(server.Name),
            Status:       types.StringValue(server.Status),
            Region:       types.StringValue(server.Region),
            InstanceType: types.StringValue(server.InstanceType),
            IPAddress:    types.StringValue(server.IPAddress),
        })
        idElements = append(idElements, types.StringValue(server.ID))
    }

    config.Servers = serverModels
    config.IDs, _ = types.ListValue(types.StringType, idElements)

    resp.Diagnostics.Append(resp.State.Set(ctx, &config)...)
}
```

## Using Data Sources in Terraform

Users interact with your data sources like this.

```hcl
# Look up a single server by name
data "yourservice_server" "main" {
  name = "production-web-01"
}

# Use the server's attributes in a resource
resource "yourservice_firewall_rule" "allow_web" {
  server_id = data.yourservice_server.main.id
  port      = 443
  protocol  = "tcp"
  source    = "0.0.0.0/0"
}

# List servers with filters
data "yourservice_servers" "web_tier" {
  region = "us-east-1"
  status = "running"
  tags = {
    tier = "web"
  }
}

# Use the filtered server IDs
resource "yourservice_load_balancer_target" "web" {
  for_each = toset(data.yourservice_servers.web_tier.ids)

  load_balancer_id = yourservice_load_balancer.main.id
  server_id        = each.value
}
```

## SDKv2 Data Source Implementation

For comparison, here is the same data source in SDKv2.

```go
func dataSourceServer() *schema.Resource {
    return &schema.Resource{
        ReadContext: dataSourceServerRead,
        Schema: map[string]*schema.Schema{
            "id": {
                Type:     schema.TypeString,
                Optional: true,
                Computed: true,
            },
            "name": {
                Type:     schema.TypeString,
                Optional: true,
                Computed: true,
            },
            "status": {
                Type:     schema.TypeString,
                Computed: true,
            },
            "region": {
                Type:     schema.TypeString,
                Computed: true,
            },
            "ip_address": {
                Type:     schema.TypeString,
                Computed: true,
            },
        },
    }
}

func dataSourceServerRead(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*APIClient)

    var server *api.Server
    var err error

    if id, ok := d.GetOk("id"); ok {
        server, err = client.GetServer(ctx, id.(string))
    } else if name, ok := d.GetOk("name"); ok {
        server, err = client.GetServerByName(ctx, name.(string))
    } else {
        return diag.Errorf("either 'id' or 'name' must be specified")
    }

    if err != nil {
        return diag.FromErr(err)
    }

    d.SetId(server.ID)
    d.Set("name", server.Name)
    d.Set("status", server.Status)
    d.Set("region", server.Region)
    d.Set("ip_address", server.IPAddress)

    return nil
}
```

## Best Practices

Always validate that sufficient lookup criteria are provided. If your data source can look up by ID or name, ensure the user provides at least one.

Return clear error messages when no results are found. Distinguish between "no matching resource" and "API error" scenarios.

For list data sources, provide both a detailed list and a convenience list of just IDs. The ID list makes it easy to use with `for_each`.

Cache data source results within a single Terraform run when possible. If the same data source is referenced multiple times with the same parameters, avoid making redundant API calls.

Set the ID on data sources too. Even though data sources do not manage lifecycle, Terraform expects an ID. For single-item lookups, use the resource's natural ID. For list queries, use a hash of the filter parameters.

For more on the provider resource lifecycle, see our guide on [Implementing Resource CRUD Operations](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-crud-operations/view).

## Conclusion

Data sources are an essential part of any Terraform provider. They let users query existing infrastructure and feed that information into their Terraform configurations. By implementing both single-item lookups and filtered list queries, you give users the flexibility to reference any existing resource in your system. Keep data source implementations simple, return clear error messages, and always validate that sufficient lookup criteria are provided.
