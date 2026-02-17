# How to Create a Cloud Spanner Instance and Database Using the gcloud CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, gcloud CLI, Database, Google Cloud

Description: Learn how to create and configure a Cloud Spanner instance and database from the command line using gcloud CLI with practical examples.

---

Cloud Spanner is Google's globally distributed relational database that combines the consistency guarantees of a traditional relational database with the horizontal scalability you typically only get from NoSQL systems. While you can set things up through the Google Cloud Console, using the gcloud CLI gives you repeatability and the ability to script your infrastructure. In this post, I will walk through the full process of creating a Cloud Spanner instance and database from scratch using the command line.

## Prerequisites

Before getting started, make sure you have the following in place:

- A Google Cloud project with billing enabled
- The Google Cloud SDK (gcloud) installed and configured
- The Cloud Spanner API enabled on your project

If you have not enabled the Spanner API yet, run this command to do so:

```bash
# Enable the Cloud Spanner API for the current project
gcloud services enable spanner.googleapis.com
```

You should also verify that your gcloud is pointed at the right project:

```bash
# Check which project is currently active
gcloud config get-value project
```

If you need to switch projects:

```bash
# Set the active project to your target project
gcloud config set project my-project-id
```

## Understanding Cloud Spanner Instance Configurations

Before creating an instance, you need to pick an instance configuration. This determines where your data is physically stored. There are regional configurations (data in a single region) and multi-region configurations (data replicated across multiple regions).

To see all available configurations:

```bash
# List all available Spanner instance configurations
gcloud spanner instance-configs list
```

This will output something like:

```
NAME                     DISPLAY_NAME
regional-us-central1     us-central1
regional-us-east1        us-east1
regional-europe-west1    europe-west1
nam6                     United States (NAM6)
nam-eur-asia1            North America, Europe, Asia
```

For most development and single-region workloads, a regional configuration is the right choice. Multi-region configurations are for when you need higher availability guarantees and can tolerate the additional cost and slightly higher write latency.

## Creating a Cloud Spanner Instance

Now let's create the instance. The key parameters are the instance ID, the display name, the configuration, and the number of processing units or nodes.

```bash
# Create a regional Spanner instance with 100 processing units
gcloud spanner instances create my-spanner-instance \
    --config=regional-us-central1 \
    --display-name="My Spanner Instance" \
    --processing-units=100
```

A few things to note about processing units:

- The minimum is 100 processing units (equivalent to 0.1 nodes)
- 1 node equals 1000 processing units
- You can scale in increments of 100 up to 1000, and in increments of 1000 after that
- Each 1000 processing units provides roughly 10,000 reads per second or 2,000 writes per second

For a production workload, you might want to start with at least 1000 processing units (1 node). For development and testing, 100 processing units keeps costs low while still giving you a real Spanner instance to work with.

You can verify the instance was created:

```bash
# Verify the instance exists and check its details
gcloud spanner instances describe my-spanner-instance
```

The output will show you the instance configuration, state, and current processing units.

## Creating a Database

With the instance running, you can now create a database inside it. A single Spanner instance can hold multiple databases.

```bash
# Create an empty database on the instance
gcloud spanner databases create my-database \
    --instance=my-spanner-instance
```

You can also create a database with an initial schema by passing DDL statements:

```bash
# Create a database with an initial table definition
gcloud spanner databases create my-database \
    --instance=my-spanner-instance \
    --ddl='CREATE TABLE Users (
        UserId STRING(36) NOT NULL,
        Email STRING(256) NOT NULL,
        DisplayName STRING(128),
        CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
    ) PRIMARY KEY (UserId)'
```

If you need to pass multiple DDL statements, you can separate them with semicolons or use the `--ddl` flag multiple times:

```bash
# Create a database with multiple tables
gcloud spanner databases create my-database \
    --instance=my-spanner-instance \
    --ddl='CREATE TABLE Users (
        UserId STRING(36) NOT NULL,
        Email STRING(256) NOT NULL,
        CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
    ) PRIMARY KEY (UserId)' \
    --ddl='CREATE TABLE Orders (
        OrderId STRING(36) NOT NULL,
        UserId STRING(36) NOT NULL,
        Amount FLOAT64 NOT NULL,
        CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
    ) PRIMARY KEY (OrderId)'
```

## Verifying Your Setup

Let's confirm everything is in place. List all databases on the instance:

```bash
# List all databases in the instance
gcloud spanner databases list --instance=my-spanner-instance
```

Check the schema of your database:

```bash
# Show the DDL (schema) of the database
gcloud spanner databases ddl describe my-database \
    --instance=my-spanner-instance
```

You can also run a quick query to make sure things work end to end:

```bash
# Run a simple query against the database
gcloud spanner databases execute-sql my-database \
    --instance=my-spanner-instance \
    --sql='SELECT 1 AS test'
```

## Updating the Schema After Creation

Schemas evolve, and Spanner supports online schema changes. You can add tables, columns, and indexes without downtime:

```bash
# Add a new column to an existing table
gcloud spanner databases ddl update my-database \
    --instance=my-spanner-instance \
    --ddl='ALTER TABLE Users ADD COLUMN LastLoginAt TIMESTAMP'
```

Schema changes in Spanner are applied asynchronously. For large tables, adding an index might take some time, but reads and writes continue uninterrupted during the process.

## Scaling the Instance

One of the great things about Spanner is that you can scale up or down without any downtime. If you started small and need more capacity:

```bash
# Scale up to 3 nodes (3000 processing units)
gcloud spanner instances update my-spanner-instance \
    --processing-units=3000
```

Scaling down works the same way, though you want to make sure you are not dropping below the capacity needed for your current data size and throughput.

## Cleaning Up

If you are done experimenting and want to avoid ongoing charges, delete the database and instance:

```bash
# Delete the database first
gcloud spanner databases delete my-database \
    --instance=my-spanner-instance

# Then delete the instance
gcloud spanner instances delete my-spanner-instance
```

Be careful with these commands in production - there is no undo.

## Wrapping Up

Setting up Cloud Spanner through the gcloud CLI is straightforward once you understand the hierarchy: project, instance configuration, instance, and database. The CLI approach is especially useful when you need to automate instance creation as part of CI/CD pipelines or infrastructure-as-code workflows. Starting with 100 processing units gives you a cost-effective way to explore Spanner's capabilities, and you can scale up seamlessly as your needs grow. If you are building an application that needs strong consistency and horizontal scalability, Spanner is worth serious consideration.
