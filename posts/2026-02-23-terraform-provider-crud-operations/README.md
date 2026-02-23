# How to Implement Resource CRUD Operations in Terraform Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, CRUD, Go, Infrastructure as Code

Description: Learn how to implement Create, Read, Update, and Delete operations in a Terraform provider resource, including error handling, partial state, and retry logic.

---

Every Terraform resource needs four operations: Create, Read, Update, and Delete. These CRUD operations form the core of how Terraform manages infrastructure lifecycle. When a user runs `terraform apply`, Terraform calls these functions to bring real infrastructure in line with the desired configuration. Getting them right means handling errors gracefully, managing partial state, and ensuring idempotency.

This guide provides a deep dive into implementing CRUD operations in Terraform providers using both the Plugin Framework and SDKv2, with real-world patterns for handling the complexities that arise when interacting with APIs.

## The CRUD Lifecycle

Understanding when Terraform calls each function is essential.

**Create** is called when a resource exists in the configuration but not in state. This happens during the first `terraform apply` for a resource or when a ForceNew attribute changes.

**Read** is called during `terraform plan` and `terraform refresh` to get the current state of the resource from the API. It is also called after Create and Update to verify the final state.

**Update** is called when a resource exists in both configuration and state but the attribute values differ.

**Delete** is called when a resource exists in state but has been removed from the configuration, or during `terraform destroy`.

## Implementing Create

The Create function must do three things: call the API to create the resource, set the resource ID, and populate all computed attributes in the state.

```go
// Plugin Framework Create implementation
func (r *DatabaseResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    // Step 1: Read the planned configuration
    var plan DatabaseResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Step 2: Build the API request
    createReq := &api.CreateDatabaseRequest{
        Name:            plan.Name.ValueString(),
        Engine:          plan.Engine.ValueString(),
        EngineVersion:   plan.EngineVersion.ValueString(),
        InstanceClass:   plan.InstanceClass.ValueString(),
        StorageGB:       int(plan.StorageGB.ValueInt64()),
        MultiAZ:         plan.MultiAZ.ValueBool(),
    }

    // Handle optional attributes
    if !plan.SubnetGroupName.IsNull() {
        createReq.SubnetGroupName = plan.SubnetGroupName.ValueString()
    }

    // Handle tags (map attribute)
    if !plan.Tags.IsNull() {
        tags := make(map[string]string)
        resp.Diagnostics.Append(plan.Tags.ElementsAs(ctx, &tags, false)...)
        if resp.Diagnostics.HasError() {
            return
        }
        createReq.Tags = tags
    }

    // Step 3: Call the API
    database, err := r.client.CreateDatabase(ctx, createReq)
    if err != nil {
        resp.Diagnostics.AddError(
            "Error Creating Database",
            fmt.Sprintf("Could not create database %s: %s", plan.Name.ValueString(), err),
        )
        return
    }

    // Step 4: Set the resource ID (critical - without this, Terraform does not track the resource)
    plan.ID = types.StringValue(database.ID)

    // Step 5: Wait for the resource to become available (if creation is async)
    database, err = r.waitForDatabaseReady(ctx, database.ID, 30*time.Minute)
    if err != nil {
        resp.Diagnostics.AddError(
            "Error Waiting for Database",
            fmt.Sprintf("Database %s did not become available: %s", database.ID, err),
        )
        // Even though we got an error, save the ID so the resource can be managed
        resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
        return
    }

    // Step 6: Populate computed attributes from the API response
    plan.Endpoint = types.StringValue(database.Endpoint)
    plan.Port = types.Int64Value(int64(database.Port))
    plan.Status = types.StringValue(database.Status)
    plan.ARN = types.StringValue(database.ARN)
    plan.CreatedAt = types.StringValue(database.CreatedAt.Format(time.RFC3339))

    // Step 7: Save the complete state
    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Helper function to wait for async operations
func (r *DatabaseResource) waitForDatabaseReady(ctx context.Context, id string, timeout time.Duration) (*api.Database, error) {
    deadline := time.Now().Add(timeout)

    for time.Now().Before(deadline) {
        database, err := r.client.GetDatabase(ctx, id)
        if err != nil {
            return nil, err
        }

        switch database.Status {
        case "available":
            return database, nil
        case "creating", "modifying":
            // Still in progress, wait and retry
            time.Sleep(30 * time.Second)
        case "failed":
            return nil, fmt.Errorf("database creation failed: %s", database.StatusReason)
        default:
            return nil, fmt.Errorf("unexpected status: %s", database.Status)
        }
    }

    return nil, fmt.Errorf("timed out waiting for database to become available")
}
```

## Implementing Read

Read must handle three scenarios: the resource exists and we update state, the resource was deleted outside Terraform and we remove it from state, and the API returns an error.

```go
func (r *DatabaseResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    // Step 1: Get the current state
    var state DatabaseResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Step 2: Fetch the current state from the API
    database, err := r.client.GetDatabase(ctx, state.ID.ValueString())
    if err != nil {
        // Handle 404 - resource was deleted outside of Terraform
        if api.IsNotFoundError(err) {
            resp.State.RemoveResource(ctx)
            return
        }

        resp.Diagnostics.AddError(
            "Error Reading Database",
            fmt.Sprintf("Could not read database %s: %s", state.ID.ValueString(), err),
        )
        return
    }

    // Step 3: Update all attributes from the API response
    state.Name = types.StringValue(database.Name)
    state.Engine = types.StringValue(database.Engine)
    state.EngineVersion = types.StringValue(database.EngineVersion)
    state.InstanceClass = types.StringValue(database.InstanceClass)
    state.StorageGB = types.Int64Value(int64(database.StorageGB))
    state.MultiAZ = types.BoolValue(database.MultiAZ)
    state.Endpoint = types.StringValue(database.Endpoint)
    state.Port = types.Int64Value(int64(database.Port))
    state.Status = types.StringValue(database.Status)
    state.ARN = types.StringValue(database.ARN)

    // Handle optional/nullable attributes
    if database.SubnetGroupName != "" {
        state.SubnetGroupName = types.StringValue(database.SubnetGroupName)
    } else {
        state.SubnetGroupName = types.StringNull()
    }

    // Handle map attributes
    if len(database.Tags) > 0 {
        tagElements := make(map[string]attr.Value)
        for k, v := range database.Tags {
            tagElements[k] = types.StringValue(v)
        }
        state.Tags, _ = types.MapValue(types.StringType, tagElements)
    } else {
        state.Tags = types.MapNull(types.StringType)
    }

    // Step 4: Save the updated state
    resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}
```

## Implementing Update

Update should only modify the attributes that changed. Reading the prior state helps determine what needs updating.

```go
func (r *DatabaseResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
    // Read the plan (desired state) and current state
    var plan DatabaseResourceModel
    var state DatabaseResourceModel

    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    updateReq := &api.UpdateDatabaseRequest{}
    needsUpdate := false

    // Check each mutable attribute for changes
    if !plan.InstanceClass.Equal(state.InstanceClass) {
        updateReq.InstanceClass = plan.InstanceClass.ValueStringPointer()
        needsUpdate = true
    }

    if !plan.StorageGB.Equal(state.StorageGB) {
        newSize := int(plan.StorageGB.ValueInt64())
        updateReq.StorageGB = &newSize
        needsUpdate = true
    }

    if !plan.MultiAZ.Equal(state.MultiAZ) {
        val := plan.MultiAZ.ValueBool()
        updateReq.MultiAZ = &val
        needsUpdate = true
    }

    // Handle tags update separately
    if !plan.Tags.Equal(state.Tags) {
        tags := make(map[string]string)
        resp.Diagnostics.Append(plan.Tags.ElementsAs(ctx, &tags, false)...)
        if resp.Diagnostics.HasError() {
            return
        }
        updateReq.Tags = tags
        needsUpdate = true
    }

    // Only call the API if something actually changed
    if needsUpdate {
        _, err := r.client.UpdateDatabase(ctx, state.ID.ValueString(), updateReq)
        if err != nil {
            resp.Diagnostics.AddError(
                "Error Updating Database",
                fmt.Sprintf("Could not update database %s: %s", state.ID.ValueString(), err),
            )
            return
        }

        // Wait for the modification to complete
        _, err = r.waitForDatabaseReady(ctx, state.ID.ValueString(), 30*time.Minute)
        if err != nil {
            resp.Diagnostics.AddError(
                "Error Waiting for Database Update",
                fmt.Sprintf("Database %s did not stabilize after update: %s", state.ID.ValueString(), err),
            )
            return
        }
    }

    // Read the final state from the API to capture all computed values
    database, err := r.client.GetDatabase(ctx, state.ID.ValueString())
    if err != nil {
        resp.Diagnostics.AddError(
            "Error Reading Database After Update",
            fmt.Sprintf("Could not read database %s: %s", state.ID.ValueString(), err),
        )
        return
    }

    // Update plan with server-side computed values
    plan.Endpoint = types.StringValue(database.Endpoint)
    plan.Port = types.Int64Value(int64(database.Port))
    plan.Status = types.StringValue(database.Status)

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Implementing Delete

Delete should be idempotent. If the resource is already gone, that is not an error.

```go
func (r *DatabaseResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
    var state DatabaseResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Attempt to delete the resource
    err := r.client.DeleteDatabase(ctx, state.ID.ValueString())
    if err != nil {
        // If it is already gone, that is fine
        if api.IsNotFoundError(err) {
            return
        }

        resp.Diagnostics.AddError(
            "Error Deleting Database",
            fmt.Sprintf("Could not delete database %s: %s", state.ID.ValueString(), err),
        )
        return
    }

    // Wait for deletion to complete
    err = r.waitForDatabaseDeleted(ctx, state.ID.ValueString(), 30*time.Minute)
    if err != nil {
        resp.Diagnostics.AddError(
            "Error Waiting for Database Deletion",
            fmt.Sprintf("Database %s was not fully deleted: %s", state.ID.ValueString(), err),
        )
        return
    }

    // State is automatically removed when Delete succeeds without error
}

func (r *DatabaseResource) waitForDatabaseDeleted(ctx context.Context, id string, timeout time.Duration) error {
    deadline := time.Now().Add(timeout)

    for time.Now().Before(deadline) {
        _, err := r.client.GetDatabase(ctx, id)
        if err != nil {
            if api.IsNotFoundError(err) {
                return nil  // Successfully deleted
            }
            return err
        }
        time.Sleep(15 * time.Second)
    }

    return fmt.Errorf("timed out waiting for deletion")
}
```

## Error Handling Patterns

Good error handling is what separates a production-quality provider from a prototype.

```go
// Always provide context in error messages
resp.Diagnostics.AddError(
    "Error Creating Database",  // Short summary
    fmt.Sprintf(
        "Could not create database '%s' in region '%s': %s\n\n"+
            "Please verify your API credentials and that the region is valid.",
        plan.Name.ValueString(),
        plan.Region.ValueString(),
        err,
    ),
)

// Use warnings for non-fatal issues
resp.Diagnostics.AddWarning(
    "Database Using Default Configuration",
    "No instance class was specified. The database will use the default 'db.t3.micro' instance class.",
)

// Attribute-level errors for specific field problems
resp.Diagnostics.AddAttributeError(
    path.Root("engine_version"),
    "Unsupported Engine Version",
    fmt.Sprintf("Engine version '%s' is not available for engine '%s'.",
        plan.EngineVersion.ValueString(),
        plan.Engine.ValueString()),
)
```

## Retry Logic

Network errors and API rate limits require retry logic.

```go
func (r *DatabaseResource) createWithRetry(ctx context.Context, req *api.CreateDatabaseRequest) (*api.Database, error) {
    var lastErr error

    for attempt := 0; attempt < 3; attempt++ {
        if attempt > 0 {
            // Exponential backoff: 1s, 2s, 4s
            time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
        }

        database, err := r.client.CreateDatabase(ctx, req)
        if err == nil {
            return database, nil
        }

        // Only retry on transient errors
        if api.IsRetryableError(err) {
            lastErr = err
            continue
        }

        // Non-retryable error, return immediately
        return nil, err
    }

    return nil, fmt.Errorf("failed after 3 attempts, last error: %w", lastErr)
}
```

## Best Practices

Always save state after setting the ID, even if subsequent steps fail. If Create sets the ID and then fails while waiting for the resource to become ready, saving the ID lets users run `terraform apply` again rather than creating a duplicate resource.

Call Read at the end of Create and Update. This ensures the state reflects the actual API response rather than the planned values.

Make Delete idempotent. If a resource is already gone, Delete should succeed. Users should be able to run `terraform destroy` multiple times without errors.

Use meaningful error messages. Include the resource name, ID, and operation in every error message so users can quickly identify the problem.

For more on provider schema design, see our guide on [Defining Provider Schema in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-schema/view).

## Conclusion

CRUD operations are the heart of every Terraform provider. Creating resources reliably, reading their current state accurately, updating only what changed, and deleting cleanly are the four operations that make infrastructure as code work. By handling errors gracefully, implementing retry logic, and saving partial state when operations fail, you build a provider that users can trust with their production infrastructure.
