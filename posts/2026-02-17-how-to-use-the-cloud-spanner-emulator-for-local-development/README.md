# How to Use the Cloud Spanner Emulator for Local Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Emulator, Local Development, Testing

Description: Set up and use the Cloud Spanner emulator for local development and testing without incurring cloud costs or needing network access.

---

Developing against a live Cloud Spanner instance works but costs money, requires network access, and adds latency to your development cycle. The Cloud Spanner emulator solves all of these problems by giving you a local Spanner instance that runs on your machine. It supports the same API as the real thing, so your application code works unchanged. In this post, I will show you how to set up the emulator and integrate it into your development workflow.

## Installing the Emulator

The Spanner emulator is included with the Google Cloud SDK. If you have gcloud installed, you just need to install the emulator component:

```bash
# Install the Spanner emulator component
gcloud components install cloud-spanner-emulator
```

On some systems, you might need to update gcloud first:

```bash
# Update gcloud to the latest version, then install the emulator
gcloud components update
gcloud components install cloud-spanner-emulator
```

## Starting the Emulator

Start the emulator with a single command:

```bash
# Start the Spanner emulator on the default ports
gcloud emulators spanner start
```

The emulator listens on two ports:
- gRPC port: 9010 (for Spanner API calls)
- REST port: 9020 (for admin operations)

You can customize the ports if needed:

```bash
# Start the emulator on custom ports
gcloud emulators spanner start --host-port=localhost:9010 --rest-port=9020
```

The emulator runs in the foreground, so open a new terminal for your development work.

## Running the Emulator with Docker

If you prefer Docker, there is an official emulator image:

```bash
# Run the Spanner emulator in Docker
docker run -p 9010:9010 -p 9020:9020 \
    gcr.io/cloud-spanner-emulator/emulator
```

The Docker approach is especially useful for CI/CD pipelines where you do not want to install the full Cloud SDK.

Here is a docker-compose snippet if you want to include it in your project:

```yaml
# docker-compose.yml - Spanner emulator service
version: '3.8'
services:
  spanner-emulator:
    image: gcr.io/cloud-spanner-emulator/emulator
    ports:
      - "9010:9010"
      - "9020:9020"
```

## Configuring Your Application

To point your application at the emulator instead of the real Spanner service, set the `SPANNER_EMULATOR_HOST` environment variable:

```bash
# Tell the Spanner client libraries to use the emulator
export SPANNER_EMULATOR_HOST=localhost:9010
```

When this environment variable is set, all Spanner client libraries automatically connect to the emulator instead of the real service. No code changes needed.

## Creating an Instance and Database on the Emulator

The emulator starts empty. You need to create an instance and database just like you would with real Spanner, but the operations are instant:

```bash
# Make sure the emulator host is set
export SPANNER_EMULATOR_HOST=localhost:9010

# Create an instance (configuration does not matter for the emulator)
gcloud spanner instances create test-instance \
    --config=emulator-config \
    --display-name="Test Instance" \
    --nodes=1

# Create a database with your schema
gcloud spanner databases create test-db \
    --instance=test-instance \
    --ddl='CREATE TABLE Users (
        UserId STRING(36) NOT NULL,
        Email STRING(256) NOT NULL,
        DisplayName STRING(128),
        CreatedAt TIMESTAMP NOT NULL
    ) PRIMARY KEY (UserId)'
```

## Writing a Setup Script

For team consistency, create a setup script that initializes the emulator with your schema:

```bash
#!/bin/bash
# setup-emulator.sh - Initialize the Spanner emulator with the application schema

# Set the emulator host
export SPANNER_EMULATOR_HOST=localhost:9010

# Wait for the emulator to be ready
echo "Waiting for Spanner emulator..."
for i in $(seq 1 30); do
    if curl -s http://localhost:9020 > /dev/null 2>&1; then
        echo "Emulator is ready"
        break
    fi
    sleep 1
done

# Create instance
gcloud spanner instances create dev-instance \
    --config=emulator-config \
    --display-name="Dev Instance" \
    --nodes=1

# Create database with full schema
gcloud spanner databases create dev-db \
    --instance=dev-instance \
    --ddl='CREATE TABLE Users (
        UserId STRING(36) NOT NULL,
        Email STRING(256) NOT NULL,
        DisplayName STRING(128),
        CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
    ) PRIMARY KEY (UserId)' \
    --ddl='CREATE TABLE Orders (
        OrderId STRING(36) NOT NULL,
        UserId STRING(36) NOT NULL,
        Status STRING(20) NOT NULL,
        TotalAmount FLOAT64 NOT NULL,
        CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
    ) PRIMARY KEY (OrderId)' \
    --ddl='CREATE INDEX OrdersByUser ON Orders(UserId)'

echo "Emulator setup complete"
```

## Using the Emulator in Python Tests

Here is how to write tests that use the emulator:

```python
import os
import unittest
import uuid
from google.cloud import spanner

class TestUserService(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Set up the Spanner emulator connection once for all tests."""
        # The SPANNER_EMULATOR_HOST env var should already be set
        # Client automatically connects to the emulator when it is set
        cls.client = spanner.Client(project="test-project")
        cls.instance = cls.client.instance("dev-instance")
        cls.database = cls.instance.database("dev-db")

    def test_create_user(self):
        """Test that we can insert and read back a user."""
        user_id = str(uuid.uuid4())
        email = f"test-{user_id}@example.com"

        # Insert a user
        with self.database.batch() as batch:
            batch.insert(
                table="Users",
                columns=["UserId", "Email", "DisplayName", "CreatedAt"],
                values=[[user_id, email, "Test User", spanner.COMMIT_TIMESTAMP]]
            )

        # Read the user back
        with self.database.snapshot() as snapshot:
            results = snapshot.execute_sql(
                "SELECT Email, DisplayName FROM Users WHERE UserId = @id",
                params={"id": user_id},
                param_types={"id": spanner.param_types.STRING}
            )
            rows = list(results)

        # Verify the data
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][0], email)
        self.assertEqual(rows[0][1], "Test User")

    def test_query_orders_by_user(self):
        """Test querying orders for a specific user."""
        user_id = str(uuid.uuid4())
        order_id = str(uuid.uuid4())

        # Insert test data
        with self.database.batch() as batch:
            batch.insert(
                table="Users",
                columns=["UserId", "Email", "DisplayName", "CreatedAt"],
                values=[[user_id, f"{user_id}@test.com", "Buyer", spanner.COMMIT_TIMESTAMP]]
            )
            batch.insert(
                table="Orders",
                columns=["OrderId", "UserId", "Status", "TotalAmount", "CreatedAt"],
                values=[[order_id, user_id, "PENDING", 99.99, spanner.COMMIT_TIMESTAMP]]
            )

        # Query orders by user
        with self.database.snapshot() as snapshot:
            results = snapshot.execute_sql(
                "SELECT OrderId, Status, TotalAmount FROM Orders WHERE UserId = @uid",
                params={"uid": user_id},
                param_types={"uid": spanner.param_types.STRING}
            )
            rows = list(results)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][1], "PENDING")

if __name__ == "__main__":
    unittest.main()
```

## Using the Emulator in Go Tests

```go
package main

import (
    "context"
    "os"
    "testing"

    "cloud.google.com/go/spanner"
    "google.golang.org/api/iterator"
)

func TestInsertAndReadUser(t *testing.T) {
    // Ensure the emulator host is set
    if os.Getenv("SPANNER_EMULATOR_HOST") == "" {
        t.Skip("SPANNER_EMULATOR_HOST not set, skipping emulator test")
    }

    ctx := context.Background()

    // Connect to the emulator
    client, err := spanner.NewClient(ctx,
        "projects/test-project/instances/dev-instance/databases/dev-db")
    if err != nil {
        t.Fatalf("Failed to create client: %v", err)
    }
    defer client.Close()

    // Insert a test user using a mutation
    userID := "test-user-001"
    m := spanner.InsertOrUpdate("Users",
        []string{"UserId", "Email", "DisplayName", "CreatedAt"},
        []interface{}{userID, "test@example.com", "Test", spanner.CommitTimestamp})

    _, err = client.Apply(ctx, []*spanner.Mutation{m})
    if err != nil {
        t.Fatalf("Failed to insert user: %v", err)
    }

    // Read the user back
    row, err := client.Single().ReadRow(ctx, "Users",
        spanner.Key{userID},
        []string{"Email", "DisplayName"})
    if err != nil {
        t.Fatalf("Failed to read user: %v", err)
    }

    var email, name string
    if err := row.Columns(&email, &name); err != nil {
        t.Fatalf("Failed to parse row: %v", err)
    }

    if email != "test@example.com" {
        t.Errorf("Expected email test@example.com, got %s", email)
    }
}
```

## Emulator Limitations

The emulator does not replicate every aspect of production Spanner:

- No multi-region behavior or replication
- No TrueTime, so commit timestamps are based on the local clock
- Performance characteristics differ significantly from real Spanner
- Some system tables (like SPANNER_SYS statistics tables) are not available
- No IAM or access control

Do not use the emulator for performance testing or capacity planning. It is designed for functional testing and development only.

## CI/CD Integration

Add the emulator to your CI pipeline for automated testing:

```yaml
# GitHub Actions example
name: Run Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      spanner-emulator:
        image: gcr.io/cloud-spanner-emulator/emulator
        ports:
          - 9010:9010
          - 9020:9020

    steps:
      - uses: actions/checkout@v4
      - name: Set up environment
        run: |
          export SPANNER_EMULATOR_HOST=localhost:9010
          # Run your schema setup script
          ./setup-emulator.sh
      - name: Run tests
        env:
          SPANNER_EMULATOR_HOST: localhost:9010
        run: pytest tests/
```

## Wrapping Up

The Cloud Spanner emulator is an essential tool for any team building on Spanner. It eliminates cloud costs during development, removes the need for network access, and makes tests fast and reproducible. Set it up as part of your standard development environment, include it in your CI pipeline, and you will catch schema and query issues long before they reach production. Just remember that it is for functional testing only - always validate performance on a real Spanner instance before launching.
