# How to Use Atlas with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Atlas, Schema Migration, Infrastructure as Code, DevOps

Description: Learn how to use Atlas schema management tool with ClickHouse for declarative schema definitions, automated migrations, and CI/CD integration.

---

Atlas is a modern schema management tool that supports a declarative approach - you define the desired schema state and Atlas computes and applies the necessary changes. ClickHouse is natively supported by Atlas.

## Installation

```bash
# macOS
brew install ariga/tap/atlas

# Linux
curl -sSf https://atlasgo.sh | sh
```

## Setting Up the ClickHouse Provider

Atlas supports ClickHouse via its HCL schema language. Create `atlas.hcl`:

```hcl
env "clickhouse" {
  url = "clickhouse://default:@localhost:9000/analytics"
  src = "file://schema.hcl"
  dev = "clickhouse://default:@localhost:9000/dev_analytics"
}
```

## Defining Schema in HCL

```hcl
# schema.hcl
schema "analytics" {}

table "events" {
  schema = schema.analytics
  engine = MergeTree

  column "ts" {
    type = DateTime
  }
  column "user_id" {
    type = String
  }
  column "event_type" {
    type    = sql("LowCardinality(String)")
    default = ""
  }
  column "value" {
    type    = Float64
    default = 0
  }

  primary_key {
    columns = [column.user_id, column.ts]
  }
}
```

## Inspecting an Existing Schema

Generate HCL from your current ClickHouse schema:

```bash
atlas schema inspect \
  --url "clickhouse://default:@localhost:9000/analytics" \
  > current_schema.hcl
```

## Planning a Migration

Preview changes without applying them:

```bash
atlas schema diff \
  --from "clickhouse://default:@localhost:9000/analytics" \
  --to "file://schema.hcl" \
  --dev-url "clickhouse://default:@localhost:9000/dev_analytics"
```

## Applying Schema Changes

```bash
atlas schema apply \
  --url "clickhouse://default:@localhost:9000/analytics" \
  --to "file://schema.hcl" \
  --dev-url "clickhouse://default:@localhost:9000/dev_analytics"
```

## Versioned Migrations

Generate SQL migration files:

```bash
atlas migrate diff add_country_column \
  --dir "file://migrations" \
  --to "file://schema.hcl" \
  --dev-url "clickhouse://default:@localhost:9000/dev_analytics"
```

Apply versioned migrations:

```bash
atlas migrate apply \
  --dir "file://migrations" \
  --url "clickhouse://default:@localhost:9000/analytics"
```

## CI/CD Integration

```yaml
# .github/workflows/migrate.yml
- name: Apply ClickHouse migrations
  run: |
    atlas migrate apply \
      --dir "file://migrations" \
      --url "${{ secrets.CLICKHOUSE_URL }}"
```

## Summary

Atlas brings a declarative, infrastructure-as-code approach to ClickHouse schema management. Its inspect, diff, and apply workflow makes it easy to keep schemas consistent across environments and automate changes in CI/CD pipelines.
