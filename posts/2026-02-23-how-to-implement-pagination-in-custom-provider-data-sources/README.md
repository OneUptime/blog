# How to Implement Pagination in Custom Provider Data Sources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Pagination, Data Source, Infrastructure as Code

Description: Learn how to implement pagination in custom Terraform provider data sources to efficiently retrieve large datasets from APIs using offset, cursor, and page-based pagination.

---

Data sources in Terraform providers often need to retrieve lists of resources from an API. When those lists contain hundreds or thousands of items, the API typically returns results in pages rather than all at once. Your provider needs to handle this pagination transparently so users get complete results without having to manage the pagination themselves.

In this guide, we will cover how to implement the three most common pagination patterns in Terraform provider data sources: offset-based, cursor-based, and page-based pagination.

## Why Pagination Matters

APIs paginate results for good reasons:

- **Performance** - Returning thousands of items in a single response is slow and memory-intensive
- **Reliability** - Smaller responses are less likely to timeout or fail
- **Resource management** - Pagination prevents the API from being overwhelmed

Your Terraform provider must handle pagination to ensure users get complete, accurate results from data sources.

## Offset-Based Pagination

Offset-based pagination uses an offset and limit to specify which slice of results to return. This is common in SQL-backed APIs.

### API Pattern

```text
GET /api/v1/servers?offset=0&limit=100
GET /api/v1/servers?offset=100&limit=100
GET /api/v1/servers?offset=200&limit=100
```

### Implementation

```go
// internal/provider/servers_data_source.go
package provider

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/datasource/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/hashicorp/terraform-plugin-log/tflog"
)

type ServersDataSource struct {
    client *api.Client
}

type ServersDataSourceModel struct {
    ID      types.String        `tfsdk:"id"`
    Region  types.String        `tfsdk:"region"`
    Servers []ServerItemModel   `tfsdk:"servers"`
}

type ServerItemModel struct {
    ID     types.String `tfsdk:"id"`
    Name   types.String `tfsdk:"name"`
    Region types.String `tfsdk:"region"`
    Status types.String `tfsdk:"status"`
}

func (d *ServersDataSource) Read(ctx context.Context, req datasource.ReadRequest, resp *datasource.ReadResponse) {
    var config ServersDataSourceModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Fetch all servers using offset-based pagination
    allServers, err := d.fetchAllServersWithOffset(ctx, config.Region.ValueString())
    if err != nil {
        resp.Diagnostics.AddError(
            "Error reading servers",
            fmt.Sprintf("Could not list servers: %s", err),
        )
        return
    }

    // Convert API responses to Terraform model
    config.ID = types.StringValue("servers-" + config.Region.ValueString())
    config.Servers = make([]ServerItemModel, len(allServers))
    for i, server := range allServers {
        config.Servers[i] = ServerItemModel{
            ID:     types.StringValue(server.ID),
            Name:   types.StringValue(server.Name),
            Region: types.StringValue(server.Region),
            Status: types.StringValue(server.Status),
        }
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &config)...)
}

// fetchAllServersWithOffset retrieves all servers using offset pagination
func (d *ServersDataSource) fetchAllServersWithOffset(ctx context.Context, region string) ([]api.Server, error) {
    var allServers []api.Server
    pageSize := 100
    offset := 0

    for {
        tflog.Debug(ctx, "Fetching server page", map[string]interface{}{
            "offset":    offset,
            "page_size": pageSize,
        })

        // Make the paginated API call
        result, err := d.client.ListServers(ctx, &api.ListServersRequest{
            Region: region,
            Offset: offset,
            Limit:  pageSize,
        })
        if err != nil {
            return nil, fmt.Errorf("error fetching servers at offset %d: %w", offset, err)
        }

        // Append results
        allServers = append(allServers, result.Servers...)

        // Check if we have retrieved all results
        if len(result.Servers) < pageSize {
            // Last page - fewer results than requested
            break
        }

        // Also check against total count if the API provides it
        if result.TotalCount > 0 && len(allServers) >= result.TotalCount {
            break
        }

        offset += pageSize
    }

    tflog.Info(ctx, "Retrieved all servers", map[string]interface{}{
        "total": len(allServers),
    })

    return allServers, nil
}
```

## Cursor-Based Pagination

Cursor-based pagination uses an opaque cursor token to fetch the next page. This is more efficient for large datasets and handles insertions during pagination better than offset-based approaches.

### API Pattern

```text
GET /api/v1/servers?limit=100
Response: { "servers": [...], "next_cursor": "eyJpZCI6MTAwfQ==" }

GET /api/v1/servers?limit=100&cursor=eyJpZCI6MTAwfQ==
Response: { "servers": [...], "next_cursor": "eyJpZCI6MjAwfQ==" }

GET /api/v1/servers?limit=100&cursor=eyJpZCI6MjAwfQ==
Response: { "servers": [...], "next_cursor": "" }
```

### Implementation

```go
// fetchAllServersWithCursor retrieves all servers using cursor pagination
func (d *ServersDataSource) fetchAllServersWithCursor(ctx context.Context, region string) ([]api.Server, error) {
    var allServers []api.Server
    pageSize := 100
    cursor := ""

    for {
        tflog.Debug(ctx, "Fetching server page", map[string]interface{}{
            "cursor":    cursor,
            "page_size": pageSize,
        })

        // Make the paginated API call
        result, err := d.client.ListServers(ctx, &api.ListServersRequest{
            Region: region,
            Limit:  pageSize,
            Cursor: cursor,
        })
        if err != nil {
            return nil, fmt.Errorf("error fetching servers: %w", err)
        }

        // Append results
        allServers = append(allServers, result.Servers...)

        // Check if there are more pages
        if result.NextCursor == "" {
            // No more pages
            break
        }

        cursor = result.NextCursor
    }

    return allServers, nil
}
```

## Page-Based Pagination

Page-based pagination uses a page number and page size:

### API Pattern

```text
GET /api/v1/servers?page=1&per_page=100
GET /api/v1/servers?page=2&per_page=100
GET /api/v1/servers?page=3&per_page=100
```

### Implementation

```go
// fetchAllServersWithPageNumber retrieves all servers using page number pagination
func (d *ServersDataSource) fetchAllServersWithPageNumber(ctx context.Context, region string) ([]api.Server, error) {
    var allServers []api.Server
    perPage := 100
    page := 1

    for {
        tflog.Debug(ctx, "Fetching server page", map[string]interface{}{
            "page":     page,
            "per_page": perPage,
        })

        result, err := d.client.ListServers(ctx, &api.ListServersRequest{
            Region:  region,
            Page:    page,
            PerPage: perPage,
        })
        if err != nil {
            return nil, fmt.Errorf("error fetching page %d: %w", page, err)
        }

        allServers = append(allServers, result.Servers...)

        // Check if we have all results
        if len(result.Servers) < perPage || page >= result.TotalPages {
            break
        }

        page++
    }

    return allServers, nil
}
```

## Generic Pagination Helper

To avoid repeating pagination logic, create a generic pagination helper:

```go
// internal/helpers/paginator.go
package helpers

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-log/tflog"
)

// PageFetcher is a function that fetches a single page of results
// It receives a page token (empty for first page) and returns
// results, the next page token (empty if no more pages), and any error
type PageFetcher[T any] func(ctx context.Context, pageToken string) ([]T, string, error)

// FetchAllPages retrieves all pages of results using the given fetcher
func FetchAllPages[T any](ctx context.Context, fetcher PageFetcher[T]) ([]T, error) {
    var allResults []T
    pageToken := ""
    pageNum := 0

    for {
        pageNum++
        tflog.Debug(ctx, "Fetching page", map[string]interface{}{
            "page_number": pageNum,
            "page_token":  pageToken,
        })

        results, nextToken, err := fetcher(ctx, pageToken)
        if err != nil {
            return nil, fmt.Errorf("error fetching page %d: %w", pageNum, err)
        }

        allResults = append(allResults, results...)

        if nextToken == "" {
            break
        }

        pageToken = nextToken
    }

    tflog.Info(ctx, "Fetched all pages", map[string]interface{}{
        "total_items": len(allResults),
        "total_pages": pageNum,
    })

    return allResults, nil
}
```

Using the generic helper:

```go
func (d *ServersDataSource) fetchAllServers(ctx context.Context, region string) ([]api.Server, error) {
    return helpers.FetchAllPages(ctx, func(ctx context.Context, pageToken string) ([]api.Server, string, error) {
        result, err := d.client.ListServers(ctx, &api.ListServersRequest{
            Region: region,
            Limit:  100,
            Cursor: pageToken,
        })
        if err != nil {
            return nil, "", err
        }
        return result.Servers, result.NextCursor, nil
    })
}
```

## Filtering Results

Often you need to filter the paginated results based on user-specified criteria:

```go
func (d *ServersDataSource) Schema(ctx context.Context, req datasource.SchemaRequest, resp *datasource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "List servers with optional filtering.",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{Computed: true},
            "region": schema.StringAttribute{
                Optional:    true,
                Description: "Filter servers by region.",
            },
            "status": schema.StringAttribute{
                Optional:    true,
                Description: "Filter servers by status (running, stopped).",
            },
            "name_prefix": schema.StringAttribute{
                Optional:    true,
                Description: "Filter servers whose name starts with this prefix.",
            },
            "servers": schema.ListNestedAttribute{
                Computed: true,
                NestedObject: schema.NestedAttributeObject{
                    Attributes: map[string]schema.Attribute{
                        "id":     schema.StringAttribute{Computed: true},
                        "name":   schema.StringAttribute{Computed: true},
                        "region": schema.StringAttribute{Computed: true},
                        "status": schema.StringAttribute{Computed: true},
                    },
                },
            },
        },
    }
}
```

Apply server-side filters when the API supports them, and client-side filters for additional criteria:

```go
func (d *ServersDataSource) Read(ctx context.Context, req datasource.ReadRequest, resp *datasource.ReadResponse) {
    var config ServersDataSourceModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)

    // Build the API request with server-side filters
    listReq := &api.ListServersRequest{
        Limit: 100,
    }
    if !config.Region.IsNull() {
        listReq.Region = config.Region.ValueString()
    }
    if !config.Status.IsNull() {
        listReq.Status = config.Status.ValueString()
    }

    // Fetch all pages
    allServers, err := helpers.FetchAllPages(ctx, func(ctx context.Context, token string) ([]api.Server, string, error) {
        listReq.Cursor = token
        result, err := d.client.ListServers(ctx, listReq)
        if err != nil {
            return nil, "", err
        }
        return result.Servers, result.NextCursor, nil
    })
    if err != nil {
        resp.Diagnostics.AddError("Error listing servers", err.Error())
        return
    }

    // Apply client-side filters
    if !config.NamePrefix.IsNull() {
        prefix := config.NamePrefix.ValueString()
        filtered := make([]api.Server, 0)
        for _, s := range allServers {
            if strings.HasPrefix(s.Name, prefix) {
                filtered = append(filtered, s)
            }
        }
        allServers = filtered
    }

    // ... convert to model and set state ...
}
```

## Best Practices

**Always paginate.** Never assume the API will return all results in a single call, even if your test data is small.

**Use server-side filtering when possible.** Sending filters to the API reduces the amount of data transferred and processed.

**Log pagination progress.** Use debug logging to show which page is being fetched, so users can diagnose slow data source reads.

**Handle empty results gracefully.** An empty page should not cause an error. Return an empty list instead.

**Respect API rate limits during pagination.** Each page fetch counts as an API call. Integrate with your rate limiting logic.

**Set reasonable page sizes.** Use the maximum page size the API supports to minimize the number of API calls.

## Conclusion

Pagination is essential for data sources that retrieve lists of resources. By implementing robust pagination logic with proper error handling, logging, and filtering, you ensure your data sources work correctly regardless of how many resources exist in the user's environment.

For more on data source development, see our guides on [handling API rate limiting](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-api-rate-limiting-in-custom-providers/view) and [handling complex nested schemas](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-nested-schemas-in-custom-providers/view).
