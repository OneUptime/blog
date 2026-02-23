# How to Implement Timeouts in Custom Provider Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Timeouts, Infrastructure as Code, Custom Providers

Description: Learn how to implement configurable timeouts in custom Terraform provider resources for create, read, update, and delete operations to handle long-running infrastructure tasks.

---

Infrastructure operations can take a long time. Creating a database cluster might take 15 minutes, resizing a virtual machine might take 5 minutes, and deleting a load balancer might take several minutes while connections drain. Without proper timeout handling, Terraform operations can hang indefinitely or fail prematurely.

In this guide, we will cover how to implement configurable timeouts in your custom Terraform provider resources, including default timeouts, user-configurable overrides, and best practices for handling long-running operations.

## Why Timeouts Matter

Timeouts serve two important purposes in Terraform providers:

1. **User protection** - They prevent operations from running indefinitely when something goes wrong on the API side.
2. **User flexibility** - They let users increase timeouts for resources that legitimately take longer in their environment, such as large database clusters or complex networking setups.

Without timeouts, a stuck API call can leave users waiting forever. With timeouts that are too aggressive, legitimate operations fail unnecessarily.

## Adding Timeouts to Your Schema

The Plugin Framework provides built-in timeout support. Add timeouts to your resource schema using the `timeouts` block:

```go
import (
    "context"
    "time"

    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework-timeouts/resource/timeouts"
)

func (r *DatabaseClusterResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a database cluster.",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed: true,
            },
            "name": schema.StringAttribute{
                Required: true,
            },
            "engine": schema.StringAttribute{
                Required: true,
            },
            "node_count": schema.Int64Attribute{
                Required: true,
            },
        },
        Blocks: map[string]schema.Block{
            // Add the timeouts block
            "timeouts": timeouts.Block(ctx, timeouts.Opts{
                Create: true,  // Enable create timeout
                Read:   true,  // Enable read timeout
                Update: true,  // Enable update timeout
                Delete: true,  // Enable delete timeout
            }),
        },
    }
}
```

This lets users configure timeouts in their HCL:

```hcl
resource "example_database_cluster" "main" {
  name       = "production-db"
  engine     = "postgresql"
  node_count = 3

  timeouts {
    create = "30m"  # Allow 30 minutes for creation
    update = "20m"  # Allow 20 minutes for updates
    delete = "15m"  # Allow 15 minutes for deletion
  }
}
```

## Reading Timeouts in CRUD Operations

In your CRUD operations, read the timeout values and use them to set context deadlines:

```go
// Define default timeouts
const (
    defaultCreateTimeout = 20 * time.Minute
    defaultReadTimeout   = 5 * time.Minute
    defaultUpdateTimeout = 20 * time.Minute
    defaultDeleteTimeout = 10 * time.Minute
)

// Include timeouts in your resource model
type DatabaseClusterModel struct {
    ID        types.String   `tfsdk:"id"`
    Name      types.String   `tfsdk:"name"`
    Engine    types.String   `tfsdk:"engine"`
    NodeCount types.Int64    `tfsdk:"node_count"`
    Timeouts  timeouts.Value `tfsdk:"timeouts"`
}

func (r *DatabaseClusterResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan DatabaseClusterModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Create a context with the configured timeout
    createTimeout, diags := plan.Timeouts.Create(ctx, defaultCreateTimeout)
    resp.Diagnostics.Append(diags...)
    if resp.Diagnostics.HasError() {
        return
    }

    ctx, cancel := context.WithTimeout(ctx, createTimeout)
    defer cancel()

    // Make the API call to create the cluster
    createReq := &api.CreateClusterRequest{
        Name:      plan.Name.ValueString(),
        Engine:    plan.Engine.ValueString(),
        NodeCount: int(plan.NodeCount.ValueInt64()),
    }

    cluster, err := r.client.CreateCluster(ctx, createReq)
    if err != nil {
        resp.Diagnostics.AddError(
            "Error creating database cluster",
            fmt.Sprintf("Could not create cluster: %s", err),
        )
        return
    }

    // Wait for the cluster to become ready
    cluster, err = r.waitForClusterReady(ctx, cluster.ID)
    if err != nil {
        resp.Diagnostics.AddError(
            "Error waiting for cluster",
            fmt.Sprintf("Cluster did not become ready within the timeout: %s", err),
        )
        return
    }

    // Update state
    plan.ID = types.StringValue(cluster.ID)
    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Implementing Polling with Timeouts

Most long-running operations require polling the API until the operation completes. Here is a robust polling implementation that respects timeouts:

```go
// waitForClusterReady polls until the cluster reaches "ready" status
func (r *DatabaseClusterResource) waitForClusterReady(ctx context.Context, clusterID string) (*api.Cluster, error) {
    // Define polling parameters
    pollInterval := 30 * time.Second
    ticker := time.NewTicker(pollInterval)
    defer ticker.Stop()

    // Initial check
    cluster, err := r.client.GetCluster(ctx, clusterID)
    if err != nil {
        return nil, fmt.Errorf("error reading cluster: %w", err)
    }
    if cluster.Status == "ready" {
        return cluster, nil
    }

    // Poll until ready or timeout
    for {
        select {
        case <-ctx.Done():
            // Context was cancelled (timeout reached)
            return nil, fmt.Errorf(
                "timed out waiting for cluster %s to become ready (current status: %s)",
                clusterID, cluster.Status,
            )
        case <-ticker.C:
            // Poll the API
            cluster, err = r.client.GetCluster(ctx, clusterID)
            if err != nil {
                return nil, fmt.Errorf("error reading cluster during wait: %w", err)
            }

            tflog.Debug(ctx, "Waiting for cluster to become ready", map[string]interface{}{
                "cluster_id": clusterID,
                "status":     cluster.Status,
            })

            switch cluster.Status {
            case "ready":
                return cluster, nil
            case "failed", "error":
                return nil, fmt.Errorf(
                    "cluster %s entered failed state: %s",
                    clusterID, cluster.StatusMessage,
                )
            default:
                // Still provisioning, continue polling
                continue
            }
        }
    }
}
```

## Using the Retry Helper

The `terraform-plugin-sdk` provides a retry helper that works well with timeouts:

```go
import (
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/retry"
)

func (r *DatabaseClusterResource) waitForClusterReadyWithRetry(ctx context.Context, clusterID string, timeout time.Duration) (*api.Cluster, error) {
    var cluster *api.Cluster

    err := retry.RetryContext(ctx, timeout, func() *retry.RetryError {
        var err error
        cluster, err = r.client.GetCluster(ctx, clusterID)
        if err != nil {
            // Non-retryable error
            return retry.NonRetryableError(
                fmt.Errorf("error reading cluster: %w", err),
            )
        }

        switch cluster.Status {
        case "ready":
            // Done, no error
            return nil
        case "failed", "error":
            // Non-retryable - the cluster has failed
            return retry.NonRetryableError(
                fmt.Errorf("cluster entered failed state: %s", cluster.StatusMessage),
            )
        default:
            // Still provisioning, retry
            return retry.RetryableError(
                fmt.Errorf("cluster status is %s, waiting for ready", cluster.Status),
            )
        }
    })

    if err != nil {
        return nil, err
    }

    return cluster, nil
}
```

## Timeout Handling for Delete Operations

Delete operations need special care because the resource might be partially deleted when the timeout expires:

```go
func (r *DatabaseClusterResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
    var state DatabaseClusterModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Get the delete timeout
    deleteTimeout, diags := state.Timeouts.Delete(ctx, defaultDeleteTimeout)
    resp.Diagnostics.Append(diags...)
    if resp.Diagnostics.HasError() {
        return
    }

    ctx, cancel := context.WithTimeout(ctx, deleteTimeout)
    defer cancel()

    // Initiate deletion
    err := r.client.DeleteCluster(ctx, state.ID.ValueString())
    if err != nil {
        // Check if the cluster was already deleted
        if isNotFoundError(err) {
            return
        }
        resp.Diagnostics.AddError(
            "Error deleting cluster",
            fmt.Sprintf("Could not delete cluster %s: %s", state.ID.ValueString(), err),
        )
        return
    }

    // Wait for deletion to complete
    err = r.waitForClusterDeleted(ctx, state.ID.ValueString())
    if err != nil {
        resp.Diagnostics.AddError(
            "Error waiting for cluster deletion",
            fmt.Sprintf("Cluster %s was not fully deleted within the timeout: %s", state.ID.ValueString(), err),
        )
        return
    }
}

func (r *DatabaseClusterResource) waitForClusterDeleted(ctx context.Context, clusterID string) error {
    pollInterval := 15 * time.Second
    ticker := time.NewTicker(pollInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return fmt.Errorf("timed out waiting for cluster deletion")
        case <-ticker.C:
            _, err := r.client.GetCluster(ctx, clusterID)
            if err != nil {
                if isNotFoundError(err) {
                    // Cluster has been deleted
                    return nil
                }
                return fmt.Errorf("error checking cluster status: %w", err)
            }
            // Cluster still exists, keep waiting
            tflog.Debug(ctx, "Waiting for cluster to be deleted", map[string]interface{}{
                "cluster_id": clusterID,
            })
        }
    }
}
```

## Choosing Default Timeout Values

Selecting appropriate default timeout values is important. Here are some guidelines:

| Operation | Typical Range | Recommendation |
|-----------|--------------|----------------|
| Create (simple) | 1-5 min | 5 minutes |
| Create (complex) | 5-30 min | 20 minutes |
| Read | < 1 min | 5 minutes |
| Update (simple) | 1-5 min | 10 minutes |
| Update (complex) | 5-30 min | 20 minutes |
| Delete | 1-10 min | 10 minutes |

Consider the actual API behavior when setting defaults. If your API typically takes 10 minutes to create a resource, set the default create timeout to at least 15-20 minutes to allow for variation.

## Best Practices

**Always set defaults.** Never leave timeouts without defaults. Users should be able to use your provider without configuring timeouts.

**Log progress during polling.** Use `tflog.Debug` to log status updates while waiting, so users can see progress in debug mode.

**Handle timeout errors gracefully.** When a timeout expires, include the current status in the error message so users know how far the operation got.

**Check for already-completed states.** Before starting to poll, check if the resource is already in the desired state. This handles cases where the API returns synchronously.

**Make poll intervals reasonable.** Do not poll too frequently (wasting API quota) or too infrequently (delaying completion detection). 15-30 seconds is usually appropriate.

**Handle terminal failure states.** If the resource enters a failed state during provisioning, stop polling immediately and return a clear error rather than waiting for the timeout.

## Conclusion

Proper timeout handling is essential for building reliable Terraform providers, especially when managing infrastructure that takes time to provision. By providing configurable timeouts with sensible defaults, implementing robust polling with proper error handling, and logging progress during long operations, you create a provider that handles real-world infrastructure timing gracefully.

For more on building robust providers, see our guides on [handling API rate limiting](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-api-rate-limiting-in-custom-providers/view) and [handling provider error messages](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-error-messages/view).
