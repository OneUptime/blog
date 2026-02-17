# How to Use the Bigtable HBase Client for Java to Read and Write Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Bigtable, HBase, Java, Client Library

Description: A hands-on guide to using the Bigtable HBase client for Java to connect, read, write, scan, and filter data in Cloud Bigtable using the familiar HBase API.

---

Cloud Bigtable provides an HBase-compatible client library for Java. If you have worked with Apache HBase before, you will feel right at home - the API is nearly identical. You use the same Connection, Table, Put, Get, Scan, and Result classes you already know. The difference is under the hood: instead of talking to HBase RegionServers, the client talks directly to the Cloud Bigtable service.

This is especially useful if you are migrating from HBase or if your team already has HBase expertise. Let me walk through everything from setting up the dependency to performing complex filtered scans.

## Setting Up the Project

Add the Bigtable HBase client to your Maven project.

```xml
<!-- Add to your pom.xml dependencies section -->
<dependency>
    <groupId>com.google.cloud.bigtable</groupId>
    <artifactId>bigtable-hbase-2.x-hadoop</artifactId>
    <version>2.14.1</version>
</dependency>

<!-- You also need the HBase client -->
<dependency>
    <groupId>org.apache.hbase</groupId>
    <artifactId>hbase-client</artifactId>
    <version>2.5.7</version>
</dependency>
```

For Gradle:

```groovy
// Add to your build.gradle dependencies block
implementation 'com.google.cloud.bigtable:bigtable-hbase-2.x-hadoop:2.14.1'
implementation 'org.apache.hbase:hbase-client:2.5.7'
```

## Connecting to Bigtable

The connection setup is where Bigtable diverges from standard HBase. Instead of pointing to ZooKeeper, you specify your GCP project and Bigtable instance.

```java
// Create a connection to Cloud Bigtable
// This uses the HBase compatibility layer
import com.google.cloud.bigtable.hbase.BigtableConfiguration;
import org.apache.hadoop.hbase.client.Connection;
import org.apache.hadoop.hbase.client.Table;
import org.apache.hadoop.hbase.TableName;

public class BigtableExample {
    private static final String PROJECT_ID = "your-project-id";
    private static final String INSTANCE_ID = "your-instance-id";

    public static void main(String[] args) throws Exception {
        // Create the connection - authenticates using Application Default Credentials
        try (Connection connection = BigtableConfiguration.connect(PROJECT_ID, INSTANCE_ID)) {
            System.out.println("Connected to Bigtable");

            // Get a reference to a table
            Table table = connection.getTable(TableName.valueOf("my-table"));

            // Use the table for reads and writes
            // ...

            table.close();
        }
    }
}
```

For more control over the connection, use the configuration object:

```java
// Advanced connection configuration
import org.apache.hadoop.conf.Configuration;
import com.google.cloud.bigtable.hbase.BigtableConfiguration;

Configuration config = BigtableConfiguration.configure(PROJECT_ID, INSTANCE_ID);

// Optional: specify an app profile for routing control
config.set("google.bigtable.app_profile.id", "my-app-profile");

// Optional: set timeouts
config.set("google.bigtable.grpc.channel.count", "4");

Connection connection = BigtableConfiguration.connect(config);
```

## Writing Data

Write data using the familiar Put class. Each Put targets a single row and can set multiple cells across different column families.

```java
// Write a single row to Bigtable
import org.apache.hadoop.hbase.client.Put;
import org.apache.hadoop.hbase.util.Bytes;

public void writeSingleRow(Table table) throws Exception {
    // Create a Put operation for the specified row key
    byte[] rowKey = Bytes.toBytes("user#12345");
    Put put = new Put(rowKey);

    // Add cells: column family, qualifier, value
    put.addColumn(
        Bytes.toBytes("profile"),      // Column family
        Bytes.toBytes("name"),         // Column qualifier
        Bytes.toBytes("Alice Smith")   // Value
    );

    put.addColumn(
        Bytes.toBytes("profile"),
        Bytes.toBytes("email"),
        Bytes.toBytes("alice@example.com")
    );

    put.addColumn(
        Bytes.toBytes("metrics"),
        Bytes.toBytes("login_count"),
        Bytes.toBytes("42")
    );

    // Execute the write
    table.put(put);
    System.out.println("Row written successfully");
}
```

For bulk writes, use a batch of Puts for better throughput:

```java
// Write multiple rows in a batch for better throughput
// This is more efficient than writing one row at a time
import java.util.ArrayList;
import java.util.List;

public void writeBatch(Table table, List<UserEvent> events) throws Exception {
    List<Put> puts = new ArrayList<>();

    for (UserEvent event : events) {
        // Build the row key
        byte[] rowKey = Bytes.toBytes(
            event.getUserId() + "#" + event.getTimestamp()
        );
        Put put = new Put(rowKey);

        // Add event data
        put.addColumn(
            Bytes.toBytes("event"),
            Bytes.toBytes("type"),
            Bytes.toBytes(event.getType())
        );

        put.addColumn(
            Bytes.toBytes("event"),
            Bytes.toBytes("source"),
            Bytes.toBytes(event.getSource())
        );

        put.addColumn(
            Bytes.toBytes("event"),
            Bytes.toBytes("payload"),
            Bytes.toBytes(event.getPayload())
        );

        puts.add(put);
    }

    // Write all rows in one batch call
    table.put(puts);
    System.out.println("Wrote " + puts.size() + " rows");
}
```

## Reading a Single Row

Use the Get class to read a specific row by its key.

```java
// Read a single row by its row key
import org.apache.hadoop.hbase.client.Get;
import org.apache.hadoop.hbase.client.Result;

public void readSingleRow(Table table) throws Exception {
    byte[] rowKey = Bytes.toBytes("user#12345");
    Get get = new Get(rowKey);

    // Optional: restrict to specific column families or columns
    get.addFamily(Bytes.toBytes("profile"));
    // Or be more specific:
    // get.addColumn(Bytes.toBytes("profile"), Bytes.toBytes("name"));

    Result result = table.get(get);

    if (result.isEmpty()) {
        System.out.println("Row not found");
        return;
    }

    // Extract values from the result
    String name = Bytes.toString(
        result.getValue(Bytes.toBytes("profile"), Bytes.toBytes("name"))
    );
    String email = Bytes.toString(
        result.getValue(Bytes.toBytes("profile"), Bytes.toBytes("email"))
    );

    System.out.println("Name: " + name);
    System.out.println("Email: " + email);
}
```

## Scanning Rows

Scans let you read a range of rows efficiently. This is the primary way to query time-series and other range-based data.

```java
// Scan a range of rows using start and stop keys
import org.apache.hadoop.hbase.client.Scan;
import org.apache.hadoop.hbase.client.ResultScanner;

public void scanRows(Table table) throws Exception {
    // Scan all events for user 12345
    Scan scan = new Scan();
    scan.withStartRow(Bytes.toBytes("user#12345#"));
    scan.withStopRow(Bytes.toBytes("user#12345#~"));  // ~ is after all printable chars

    // Performance tuning
    scan.setCaching(100);        // Number of rows to fetch per RPC
    scan.setBatch(10);           // Number of columns to fetch per row per RPC
    scan.setMaxResultSize(1024 * 1024);  // Max bytes per RPC response

    // Optional: only read specific columns
    scan.addColumn(Bytes.toBytes("event"), Bytes.toBytes("type"));
    scan.addColumn(Bytes.toBytes("event"), Bytes.toBytes("timestamp"));

    try (ResultScanner scanner = table.getScanner(scan)) {
        int count = 0;
        for (Result result : scanner) {
            String rowKey = Bytes.toString(result.getRow());
            String eventType = Bytes.toString(
                result.getValue(Bytes.toBytes("event"), Bytes.toBytes("type"))
            );
            System.out.println("Row: " + rowKey + ", Type: " + eventType);
            count++;
        }
        System.out.println("Total rows scanned: " + count);
    }
}
```

## Using Filters

Bigtable supports HBase filters for server-side data filtering. This reduces the amount of data transferred over the network.

```java
// Use filters to narrow down results server-side
import org.apache.hadoop.hbase.filter.*;
import org.apache.hadoop.hbase.CompareOperator;

public void scanWithFilters(Table table) throws Exception {
    Scan scan = new Scan();
    scan.withStartRow(Bytes.toBytes("user#12345#"));
    scan.withStopRow(Bytes.toBytes("user#12345#~"));

    // Filter 1: Only return rows where event type is "purchase"
    SingleColumnValueFilter typeFilter = new SingleColumnValueFilter(
        Bytes.toBytes("event"),
        Bytes.toBytes("type"),
        CompareOperator.EQUAL,
        Bytes.toBytes("purchase")
    );
    // Include rows where the column does not exist
    typeFilter.setFilterIfMissing(true);

    scan.setFilter(typeFilter);

    try (ResultScanner scanner = table.getScanner(scan)) {
        for (Result result : scanner) {
            System.out.println("Purchase event: " + Bytes.toString(result.getRow()));
        }
    }
}

// Combining multiple filters
public void scanWithMultipleFilters(Table table) throws Exception {
    Scan scan = new Scan();

    // Create a filter list - all filters must match (AND)
    FilterList filterList = new FilterList(FilterList.Operator.MUST_PASS_ALL);

    // Filter by event type
    filterList.addFilter(new SingleColumnValueFilter(
        Bytes.toBytes("event"),
        Bytes.toBytes("type"),
        CompareOperator.EQUAL,
        Bytes.toBytes("page_view")
    ));

    // Filter by value prefix on the page column
    filterList.addFilter(new SingleColumnValueFilter(
        Bytes.toBytes("event"),
        Bytes.toBytes("page"),
        CompareOperator.EQUAL,
        new BinaryPrefixComparator(Bytes.toBytes("/dashboard"))
    ));

    // Limit to 100 results
    filterList.addFilter(new PageFilter(100));

    scan.setFilter(filterList);

    try (ResultScanner scanner = table.getScanner(scan)) {
        for (Result result : scanner) {
            String page = Bytes.toString(
                result.getValue(Bytes.toBytes("event"), Bytes.toBytes("page"))
            );
            System.out.println("Dashboard page view: " + page);
        }
    }
}
```

## Prefix Scans

A very common pattern is scanning by row key prefix.

```java
// Scan all rows with a specific prefix
// PrefixFilter is optimized for this use case
public List<Map<String, String>> scanByPrefix(Table table, String prefix) throws Exception {
    Scan scan = new Scan();
    scan.setRowPrefixFilter(Bytes.toBytes(prefix));
    scan.setCaching(500);

    List<Map<String, String>> results = new ArrayList<>();

    try (ResultScanner scanner = table.getScanner(scan)) {
        for (Result result : scanner) {
            Map<String, String> row = new HashMap<>();
            row.put("key", Bytes.toString(result.getRow()));

            // Iterate over all cells in the result
            result.listCells().forEach(cell -> {
                String family = Bytes.toString(cell.getFamilyArray(),
                    cell.getFamilyOffset(), cell.getFamilyLength());
                String qualifier = Bytes.toString(cell.getQualifierArray(),
                    cell.getQualifierOffset(), cell.getQualifierLength());
                String value = Bytes.toString(cell.getValueArray(),
                    cell.getValueOffset(), cell.getValueLength());
                row.put(family + ":" + qualifier, value);
            });

            results.add(row);
        }
    }

    return results;
}

// Usage
List<Map<String, String>> userEvents = scanByPrefix(table, "user#12345#");
```

## Deleting Data

Delete specific cells, columns, or entire rows.

```java
// Delete operations
import org.apache.hadoop.hbase.client.Delete;

public void deleteExamples(Table table) throws Exception {
    // Delete an entire row
    Delete deleteRow = new Delete(Bytes.toBytes("user#12345#old-event"));
    table.delete(deleteRow);

    // Delete a specific column from a row
    Delete deleteColumn = new Delete(Bytes.toBytes("user#12345"));
    deleteColumn.addColumn(
        Bytes.toBytes("profile"),
        Bytes.toBytes("temp_field")
    );
    table.delete(deleteColumn);

    // Delete all columns in a family for a row
    Delete deleteFamily = new Delete(Bytes.toBytes("user#12345"));
    deleteFamily.addFamily(Bytes.toBytes("cache"));
    table.delete(deleteFamily);

    // Batch delete
    List<Delete> deletes = new ArrayList<>();
    for (String key : keysToDelete) {
        deletes.add(new Delete(Bytes.toBytes(key)));
    }
    table.delete(deletes);
}
```

## Buffered Mutator for High-Throughput Writes

For the highest write throughput, use the BufferedMutator. It batches writes client-side and sends them in bulk.

```java
// BufferedMutator for high-throughput async writes
// Buffers mutations and flushes them in batches automatically
import org.apache.hadoop.hbase.client.BufferedMutator;
import org.apache.hadoop.hbase.client.BufferedMutatorParams;

public void highThroughputWrites(Connection connection) throws Exception {
    TableName tableName = TableName.valueOf("events");

    // Configure the buffered mutator
    BufferedMutatorParams params = new BufferedMutatorParams(tableName)
        .writeBufferSize(5 * 1024 * 1024);  // 5 MB buffer

    try (BufferedMutator mutator = connection.getBufferedMutator(params)) {
        // Write many rows - they are buffered and sent in batches
        for (int i = 0; i < 100000; i++) {
            Put put = new Put(Bytes.toBytes("event#" + System.nanoTime()));
            put.addColumn(
                Bytes.toBytes("data"),
                Bytes.toBytes("value"),
                Bytes.toBytes("event-data-" + i)
            );
            mutator.mutate(put);

            if (i % 10000 == 0) {
                System.out.println("Queued " + i + " writes");
            }
        }

        // Flush any remaining mutations
        mutator.flush();
        System.out.println("All writes complete");
    }
}
```

## Error Handling

Proper error handling is important for production applications.

```java
// Robust error handling for Bigtable operations
import org.apache.hadoop.hbase.client.RetriesExhaustedWithDetailsException;
import java.io.IOException;

public void robustWrite(Table table, Put put) {
    int maxRetries = 3;
    int retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            table.put(put);
            return;  // Success
        } catch (RetriesExhaustedWithDetailsException e) {
            // Batch operation had partial failures
            System.err.println("Partial failure: " + e.getNumExceptions() + " failed");
            for (int i = 0; i < e.getNumExceptions(); i++) {
                System.err.println("  Row: " + Bytes.toString(e.getRow(i).getRow()));
                System.err.println("  Error: " + e.getCause(i).getMessage());
            }
            retryCount++;
        } catch (IOException e) {
            System.err.println("Write failed: " + e.getMessage());
            retryCount++;
            if (retryCount < maxRetries) {
                try {
                    Thread.sleep(1000 * retryCount);  // Exponential backoff
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }
    System.err.println("Write failed after " + maxRetries + " retries");
}
```

## Wrapping Up

The Bigtable HBase client for Java gives you a familiar API for working with Cloud Bigtable. If you know HBase, you already know 90% of what you need. The connection setup is different (BigtableConfiguration instead of ZooKeeper), but everything else - Put, Get, Scan, filters, BufferedMutator - works the same way. For new projects, consider using the native Bigtable Java client instead, which offers more Bigtable-specific features. But for teams migrating from HBase or maintaining compatibility between HBase and Bigtable deployments, the HBase client is the right choice.
