# How to Create a DynamoDB Table from the AWS Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Database

Description: A step-by-step walkthrough of creating a DynamoDB table from the AWS Management Console, covering table settings, keys, capacity modes, and tags.

---

DynamoDB is AWS's fully managed NoSQL database. It's fast, it scales automatically, and it doesn't need you to manage servers. But the first time you open the DynamoDB console, the options can feel overwhelming. Partition keys, sort keys, capacity modes, encryption settings - there's a lot to decide before you even store your first item.

This post walks you through creating a DynamoDB table from the AWS Console step by step. We'll cover what each setting means and when to use different options.

## Opening the DynamoDB Console

Log into the AWS Management Console and search for "DynamoDB" in the search bar, or navigate directly to the DynamoDB service. Make sure you're in the right AWS region - DynamoDB tables are regional, so if you create a table in us-east-1, it won't be visible in eu-west-1.

Click "Create table" to get started.

## Step 1: Table Name

Choose a name that describes the data you're storing. Table names must be unique within your AWS account and region. Common naming patterns:

```
Users
Orders
Products
user-sessions
order-items-prod
myapp-dev-events
```

A good practice is to include the environment in the name if you're running multiple environments in the same account. Something like `orders-prod` vs `orders-staging`.

## Step 2: Partition Key

The partition key is the most important decision you'll make. It determines how DynamoDB distributes your data across storage partitions. Every item in your table must have a partition key, and DynamoDB uses it for lookups.

Enter a name for your partition key and select the data type:

- **String (S)** - the most common choice. Good for IDs, emails, usernames.
- **Number (N)** - useful for numeric identifiers.
- **Binary (B)** - rarely used, but available for binary data.

For a Users table, you might use `userId` as the partition key with type String:

```
Partition key: userId (String)
```

For detailed guidance on choosing partition keys, check out our post on [choosing the right partition key for DynamoDB](https://oneuptime.com/blog/post/2026-02-12-dynamodb-partition-key/view).

## Step 3: Sort Key (Optional)

The sort key is optional. Adding one creates a composite primary key (partition key + sort key). This is useful when you need to store multiple related items under the same partition key.

For example, an orders table might use:

```
Partition key: customerId (String)
Sort key: orderDate (String)
```

This lets you query all orders for a customer and sort them by date. Without a sort key, each partition key value can only appear once in the table.

Common sort key patterns:

```
# Timestamp-based
Sort key: createdAt (String)  - store ISO dates like "2026-02-12T10:30:00Z"

# Hierarchical
Sort key: path (String)  - store paths like "USA#California#San_Francisco"

# Composite
Sort key: type#id (String)  - store like "ORDER#12345" or "PAYMENT#67890"
```

## Step 4: Table Settings

You'll see a "Table settings" section with two options:

- **Default settings** - uses AWS defaults for everything
- **Customize settings** - lets you configure each option

For learning and development, default settings are fine. For production, you'll want to customize.

## Step 5: Capacity Mode

This is a big decision. DynamoDB offers two capacity modes:

**On-Demand** - you pay per request. No capacity planning needed. DynamoDB automatically scales up and down. Great for unpredictable workloads or when you're just getting started.

**Provisioned** - you specify how many reads and writes per second your table needs. You pay for the provisioned capacity whether you use it or not. Cheaper for predictable, steady workloads.

For more details on choosing between these, see our post on [DynamoDB on-demand vs provisioned capacity](https://oneuptime.com/blog/post/2026-02-12-dynamodb-on-demand-vs-provisioned/view).

If you choose Provisioned, you'll need to set:

```
Read capacity units (RCUs): 5  (1 RCU = one 4KB strongly consistent read per second)
Write capacity units (WCUs): 5  (1 WCU = one 1KB write per second)
```

You can also enable Auto Scaling, which adjusts capacity based on usage:

```
Auto Scaling settings:
  Minimum capacity: 5
  Maximum capacity: 100
  Target utilization: 70%
```

## Step 6: Secondary Indexes

You can add Global Secondary Indexes (GSIs) and Local Secondary Indexes (LSIs) at this point, though you can also add GSIs later.

**GSI** - lets you query by a different partition key and optional sort key. You can add up to 20 per table.

**LSI** - lets you use a different sort key with the same partition key. You can only add these at table creation time (up to 5 per table).

If you need to query users by email instead of userId, you'd add a GSI:

```
GSI Name: email-index
Partition key: email (String)
Sort key: (none)
Projection: ALL  (copies all attributes to the index)
```

## Step 7: Encryption

DynamoDB encrypts all data at rest by default. You choose who manages the encryption key:

- **AWS owned key** (default) - free, AWS manages everything
- **AWS managed key** - uses AWS KMS, shows up in your KMS console
- **Customer managed key** - you create and manage the key in KMS, gives you full control

For most applications, the default AWS owned key is sufficient. Use customer managed keys when you have compliance requirements that demand full key control.

## Step 8: Tags

Tags help you organize and track costs. Add key-value pairs like:

```
Environment: production
Team: backend
Project: ecommerce
CostCenter: 1234
```

Tags don't affect functionality, but they're essential for cost allocation and resource management in larger organizations.

## Step 9: Create the Table

Click "Create table" and wait about 10-20 seconds. DynamoDB creates tables quickly compared to other AWS services.

Once the table status shows "Active", you're ready to start adding data.

## Adding Your First Item

Click on your table, then go to the "Explore table items" tab. Click "Create item."

The console gives you a form view and a JSON view. Here's what an item looks like in JSON:

```json
{
  "userId": { "S": "user-001" },
  "name": { "S": "Jane Smith" },
  "email": { "S": "jane@example.com" },
  "signupDate": { "S": "2026-02-12" },
  "plan": { "S": "premium" },
  "loginCount": { "N": "42" }
}
```

In the form view, you click "Add new attribute" for each field beyond the keys. Select the type (String, Number, Boolean, List, Map, etc.) and enter the value.

## Querying Your Data

After adding a few items, you can query them from the "Explore table items" tab. Use the "Query" option (not Scan) when possible.

Select the table or index to query, enter the partition key value, and optionally filter by sort key:

```
Query settings:
  Partition key (userId): user-001
  Sort key condition: begins_with "2026-02"
```

This is much more efficient than scanning the entire table. Scans read every item and should be avoided in production.

## Common Table Design Patterns

Here are a few common patterns to get you started:

**User profiles table:**
```
Table: Users
Partition key: userId (String)
No sort key needed - one item per user
```

**Order history table:**
```
Table: Orders
Partition key: customerId (String)
Sort key: orderTimestamp (String)
GSI: orderStatus-index (partition key: status, sort key: orderTimestamp)
```

**Chat messages table:**
```
Table: Messages
Partition key: channelId (String)
Sort key: timestamp (String)
```

## What to Do Next

After creating your table, you'll probably want to:

1. Set up proper IAM policies to control who can access the table
2. Create Global Secondary Indexes for your access patterns
3. Enable DynamoDB Streams if you need change data capture
4. Set up backups (point-in-time recovery or on-demand backups)
5. Configure monitoring and alarms

For monitoring DynamoDB performance in production, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to set up dashboards and alerts for throttling, latency, and error rates.

## Wrapping Up

Creating a DynamoDB table through the console is straightforward once you understand the options. The two biggest decisions are your key design (partition key and optional sort key) and your capacity mode. Get those right, and everything else falls into place. Start with on-demand mode for development, think carefully about your partition key based on your access patterns, and add indexes as needed. DynamoDB rewards upfront design work - it's much easier to get the data model right from the start than to restructure later.
