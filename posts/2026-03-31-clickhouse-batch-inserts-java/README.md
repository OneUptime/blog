# How to Handle Batch Inserts in ClickHouse from Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Java, Batch Insert, Performance, JDBC

Description: Efficiently insert large volumes of data into ClickHouse from Java using JDBC batch API and the async insert server feature.

---

## Why Batch Inserts Are Essential

ClickHouse is optimized for bulk writes. Sending thousands of single-row inserts causes excessive part merges and degrades performance. Batching rows into a single INSERT statement or using async inserts dramatically increases throughput.

## JDBC Batch with PreparedStatement

```java
import java.sql.*;
import java.util.List;

public class EventBatchInserter {

    private final DataSource dataSource;

    public EventBatchInserter(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public void insert(List<Event> events) throws SQLException {
        String sql = "INSERT INTO events (user_id, event_name, ts) VALUES (?, ?, ?)";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            int batchSize = 0;
            for (Event e : events) {
                ps.setLong(1, e.getUserId());
                ps.setString(2, e.getName());
                ps.setTimestamp(3, Timestamp.from(e.getTimestamp()));
                ps.addBatch();

                if (++batchSize % 5_000 == 0) {
                    ps.executeBatch();
                    ps.clearBatch();
                    batchSize = 0;
                }
            }
            // flush remaining
            if (batchSize > 0) {
                ps.executeBatch();
            }
        }
    }
}
```

Flush every 5,000 rows to keep memory usage bounded.

## Enabling Async Insert on the Server

For lower-latency producers that cannot buffer rows locally, enable async insert.

```java
String url = "jdbc:ch://localhost:8123/default"
           + "?async_insert=1&wait_for_async_insert=0";
```

With this setting, ClickHouse acknowledges the INSERT immediately and flushes to a part in the background.

## Choosing Batch Size

| Scenario | Recommended Batch Size |
|---|---|
| Synchronous JDBC | 5,000 - 100,000 rows |
| Async insert | 100 - 5,000 rows |
| Via HTTP (JSON) | 10,000+ rows |

Larger batches reduce merge pressure but increase memory on the client side.

## Using the ClickHouse Java Client Directly

The `clickhouse-client` library supports streaming inserts that bypass JDBC overhead.

```java
import com.clickhouse.client.*;
import com.clickhouse.data.*;

ClickHouseNode server = ClickHouseNode.of("http://localhost:8123/default");
try (ClickHouseClient client = ClickHouseClient.newInstance();
     ClickHouseResponse resp = client.write(server)
         .table("events")
         .format(ClickHouseFormat.RowBinary)
         .data(out -> {
             for (Event e : events) {
                 BinaryStreamUtils.writeInt64(out, e.getUserId());
                 out.writeAsciiString(e.getName());
             }
         })
         .executeAndWait()) {
    System.out.println("Written: " + resp.getSummary().getWrittenRows());
}
```

## Summary

For Java-to-ClickHouse writes, use JDBC `addBatch`/`executeBatch` with flush intervals of 5,000 rows for synchronous pipelines, or enable async insert for low-latency producers. The native ClickHouse Java client offers even higher throughput via streaming RowBinary inserts.
