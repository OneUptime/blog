# How to Deploy Azure Cosmos DB with Multi-Region Writes Using Pulumi in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Azure, Cosmos DB, Go, Multi-Region, IaC, Database

Description: Deploy Azure Cosmos DB with multi-region write capability using Pulumi and Go for globally distributed, low-latency database access.

---

Azure Cosmos DB with multi-region writes lets your application write data to any region where the database is replicated. Instead of routing all writes to a single primary region and suffering latency from distant locations, each region handles writes locally and Cosmos DB syncs them automatically. This is powerful for globally distributed applications, but the configuration has several moving parts.

Pulumi lets you define this infrastructure in real programming languages. If your team writes Go, you can manage Cosmos DB - along with the rest of your Azure infrastructure - using the same language, tooling, and testing frameworks you already know. No HCL, no YAML, just Go.

## Project Setup

Start by creating a new Pulumi project.

```bash
# Create a new Pulumi project with Go
mkdir cosmos-multi-region && cd cosmos-multi-region
pulumi new azure-go --name cosmos-multi-region

# The template will create main.go, go.mod, Pulumi.yaml
```

## The Complete Deployment

Here is the full Go program that deploys a Cosmos DB account with multi-region writes enabled, a SQL API database, and a container with a partition key.

```go
// main.go
package main

import (
    "github.com/pulumi/pulumi-azure-native-sdk/documentdb/v2"
    "github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
    pulumi.Run(func(ctx *pulumi.Context) error {
        // Load configuration values
        cfg := config.New(ctx, "")
        primaryRegion := cfg.Get("primaryRegion")
        if primaryRegion == "" {
            primaryRegion = "eastus"
        }

        // Create a resource group in the primary region
        rg, err := resources.NewResourceGroup(ctx, "rg-cosmos", &resources.ResourceGroupArgs{
            ResourceGroupName: pulumi.String("rg-cosmos-multiregion"),
            Location:          pulumi.String(primaryRegion),
        })
        if err != nil {
            return err
        }

        // Define the Cosmos DB account with multi-region writes
        cosmosAccount, err := documentdb.NewDatabaseAccount(ctx, "cosmos-account",
            &documentdb.DatabaseAccountArgs{
                AccountName:       pulumi.String("cosmos-global-prod"),
                ResourceGroupName: rg.Name,
                Location:          rg.Location,

                // Enable multi-region writes
                EnableMultipleWriteLocations: pulumi.Bool(true),

                // Database account kind - GlobalDocumentDB for SQL API
                Kind: pulumi.String("GlobalDocumentDB"),

                // Consistency level for multi-region writes
                ConsistencyPolicy: &documentdb.ConsistencyPolicyArgs{
                    DefaultConsistencyLevel: documentdb.DefaultConsistencyLevelSession,
                    MaxStalenessPrefix:      pulumi.Float64(100000),
                    MaxIntervalInSeconds:    pulumi.Int(300),
                },

                // Geo-replication locations
                // Each location can handle writes when multi-write is enabled
                Locations: documentdb.LocationArray{
                    &documentdb.LocationArgs{
                        LocationName:     pulumi.String("eastus"),
                        FailoverPriority: pulumi.Int(0),
                        IsZoneRedundant:  pulumi.Bool(true),
                    },
                    &documentdb.LocationArgs{
                        LocationName:     pulumi.String("westeurope"),
                        FailoverPriority: pulumi.Int(1),
                        IsZoneRedundant:  pulumi.Bool(true),
                    },
                    &documentdb.LocationArgs{
                        LocationName:     pulumi.String("southeastasia"),
                        FailoverPriority: pulumi.Int(2),
                        IsZoneRedundant:  pulumi.Bool(true),
                    },
                },

                // Enable automatic failover
                EnableAutomaticFailover: pulumi.Bool(true),

                // Backup policy - continuous for point-in-time restore
                BackupPolicy: &documentdb.ContinuousModeBackupPolicyArgs{
                    Type: pulumi.String("Continuous"),
                    ContinuousModeProperties: &documentdb.ContinuousModePropertiesArgs{
                        Tier: pulumi.String("Continuous7Days"),
                    },
                },

                // Network settings
                PublicNetworkAccess:             pulumi.String("Enabled"),
                IsVirtualNetworkFilterEnabled:   pulumi.Bool(false),
                EnableFreeTier:                  pulumi.Bool(false),
                DisableLocalAuth:                pulumi.Bool(false),
                EnableAnalyticalStorage:         pulumi.Bool(true),

                // Tags for organization
                Tags: pulumi.StringMap{
                    "environment": pulumi.String("production"),
                    "managed-by":  pulumi.String("pulumi"),
                    "team":        pulumi.String("platform"),
                },
            })
        if err != nil {
            return err
        }

        // Create a SQL database within the Cosmos account
        database, err := documentdb.NewSqlResourceSqlDatabase(ctx, "cosmos-db",
            &documentdb.SqlResourceSqlDatabaseArgs{
                AccountName:       cosmosAccount.Name,
                ResourceGroupName: rg.Name,
                DatabaseName:      pulumi.String("appdb"),
                Resource: &documentdb.SqlDatabaseResourceArgs{
                    Id: pulumi.String("appdb"),
                },
                // Shared throughput at the database level
                Options: &documentdb.CreateUpdateOptionsArgs{
                    AutoscaleSettings: &documentdb.AutoscaleSettingsArgs{
                        MaxThroughput: pulumi.Int(4000),
                    },
                },
            })
        if err != nil {
            return err
        }

        // Create a container with partition key and indexing policy
        _, err = documentdb.NewSqlResourceSqlContainer(ctx, "cosmos-container",
            &documentdb.SqlResourceSqlContainerArgs{
                AccountName:       cosmosAccount.Name,
                ResourceGroupName: rg.Name,
                DatabaseName:      database.Name,
                ContainerName:     pulumi.String("events"),
                Resource: &documentdb.SqlContainerResourceArgs{
                    Id: pulumi.String("events"),
                    // Partition key for distributing data
                    PartitionKey: &documentdb.ContainerPartitionKeyArgs{
                        Paths: pulumi.StringArray{
                            pulumi.String("/tenantId"),
                        },
                        Kind: pulumi.String("Hash"),
                    },
                    // TTL enabled - documents expire after 30 days
                    DefaultTtl: pulumi.Int(2592000),
                    // Indexing policy
                    IndexingPolicy: &documentdb.IndexingPolicyArgs{
                        IndexingMode: pulumi.String("consistent"),
                        IncludedPaths: documentdb.IncludedPathArray{
                            &documentdb.IncludedPathArgs{
                                Path: pulumi.String("/*"),
                            },
                        },
                        ExcludedPaths: documentdb.ExcludedPathArray{
                            &documentdb.ExcludedPathArgs{
                                Path: pulumi.String("/rawData/*"),
                            },
                        },
                        // Composite indexes for common query patterns
                        CompositeIndexes: documentdb.CompositePathArrayArray{
                            documentdb.CompositePathArray{
                                &documentdb.CompositePathArgs{
                                    Path:  pulumi.String("/tenantId"),
                                    Order: pulumi.String("ascending"),
                                },
                                &documentdb.CompositePathArgs{
                                    Path:  pulumi.String("/timestamp"),
                                    Order: pulumi.String("descending"),
                                },
                            },
                        },
                    },
                    // Conflict resolution for multi-region writes
                    ConflictResolutionPolicy: &documentdb.ConflictResolutionPolicyArgs{
                        Mode:                   pulumi.String("LastWriterWins"),
                        ConflictResolutionPath: pulumi.String("/_ts"),
                    },
                    // Unique key constraints
                    UniqueKeyPolicy: &documentdb.UniqueKeyPolicyArgs{
                        UniqueKeys: documentdb.UniqueKeyArray{
                            &documentdb.UniqueKeyArgs{
                                Paths: pulumi.StringArray{
                                    pulumi.String("/eventId"),
                                    pulumi.String("/tenantId"),
                                },
                            },
                        },
                    },
                },
            })
        if err != nil {
            return err
        }

        // Export useful values
        ctx.Export("cosmosAccountName", cosmosAccount.Name)
        ctx.Export("cosmosEndpoint", cosmosAccount.DocumentEndpoint)
        ctx.Export("databaseName", database.Name)

        return nil
    })
}
```

## Understanding the Configuration

Let me break down the key decisions in this deployment.

### Multi-Region Writes

The `EnableMultipleWriteLocations: pulumi.Bool(true)` flag is what enables multi-region writes. Without it, all writes go to the primary region and are replicated asynchronously to other regions.

### Consistency Level

We use Session consistency, which is the default and most commonly used level. With multi-region writes, Session consistency guarantees that a client will read its own writes within the same session, regardless of which region it connects to. Stronger consistency levels like Strong or Bounded Staleness are available but come with higher latency.

### Conflict Resolution

When two regions write to the same document simultaneously, a conflict occurs. We use Last Writer Wins with the `_ts` (timestamp) path, which means the write with the most recent timestamp wins. For more complex scenarios, you can use stored procedures for custom conflict resolution.

### Zone Redundancy

Each location has `IsZoneRedundant: pulumi.Bool(true)`, which means data is replicated across availability zones within each region. This protects against zone-level failures in addition to region-level failures.

### Autoscale Throughput

The database uses autoscale with a max of 4000 RU/s. Cosmos DB will automatically scale between 10% of the max (400 RU/s) and the max based on demand. This is more cost-effective than provisioned throughput for workloads with variable traffic.

## Deploying

```bash
# Preview the changes
pulumi preview

# Deploy
pulumi up

# Get the outputs
pulumi stack output cosmosEndpoint
```

## Adding a Second Container

One of the nice things about using Go is that you can use loops and functions to reduce repetition.

```go
// Define multiple containers with different configurations
containers := []struct {
    name         string
    partitionKey string
    ttl          int
}{
    {"events", "/tenantId", 2592000},
    {"users", "/userId", -1},
    {"sessions", "/userId", 86400},
}

for _, c := range containers {
    _, err = documentdb.NewSqlResourceSqlContainer(ctx, "container-"+c.name,
        &documentdb.SqlResourceSqlContainerArgs{
            AccountName:       cosmosAccount.Name,
            ResourceGroupName: rg.Name,
            DatabaseName:      database.Name,
            ContainerName:     pulumi.String(c.name),
            Resource: &documentdb.SqlContainerResourceArgs{
                Id: pulumi.String(c.name),
                PartitionKey: &documentdb.ContainerPartitionKeyArgs{
                    Paths: pulumi.StringArray{pulumi.String(c.partitionKey)},
                    Kind:  pulumi.String("Hash"),
                },
                DefaultTtl: pulumi.Int(c.ttl),
                ConflictResolutionPolicy: &documentdb.ConflictResolutionPolicyArgs{
                    Mode:                   pulumi.String("LastWriterWins"),
                    ConflictResolutionPath: pulumi.String("/_ts"),
                },
            },
        })
    if err != nil {
        return err
    }
}
```

This is something that is awkward in HCL but natural in Go - iterating over a slice of structs to create multiple resources with different configurations.

## Cost Considerations

Multi-region writes effectively multiply your RU consumption by the number of write regions. A 4000 RU/s database replicated across three write regions costs roughly three times what a single-region database costs. Make sure your workload genuinely benefits from multi-region writes before enabling it.

## Conclusion

Pulumi with Go gives you a type-safe, programmable way to deploy complex Cosmos DB configurations. The multi-region write setup we built includes zone redundancy, autoscale throughput, conflict resolution, composite indexes, and TTL - all the pieces you need for a production-ready globally distributed database. The Go SDK catches configuration errors at compile time, and the familiar language constructs make it easy to scale the configuration as your data model grows.
