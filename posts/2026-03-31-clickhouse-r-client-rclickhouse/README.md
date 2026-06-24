# How to Use ClickHouse R Client (RClickHouse)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, R, RClickHouse, DBI, Data Analysis

Description: Learn how to connect to ClickHouse from R using RClickHouse and DBI to run queries, fetch data frames, and insert results from data analysis.

---

`RClickhouse` provides a DBI-compliant interface to ClickHouse for R users. This lets data scientists query ClickHouse directly from R, pull results into data frames, and push computed data back - all without leaving the R ecosystem.

## Installation

```r
install.packages("RClickhouse")
# or from GitHub for the latest version:
# devtools::install_github("IMSMWU/RClickhouse")
```

## Connecting with DBI

```r
library(DBI)
library(RClickhouse)

con <- dbConnect(
  RClickhouse::clickhouse(),
  host     = "localhost",
  port     = 9000,
  dbname   = "default",
  user     = "default",
  password = "",
  compression = "lz4"
)
```

## Listing Tables

```r
dbListTables(con)
```

## Running a Query

```r
result <- dbGetQuery(con, "SELECT number, number * number AS sq FROM numbers(10)")
print(result)
```

`dbGetQuery` returns a standard R `data.frame`.

## Fetching Large Results with dbFetch

```r
res <- dbSendQuery(con, "SELECT * FROM events WHERE event_date >= '2024-01-01'")
repeat {
  chunk <- dbFetch(res, n = 10000)
  if (nrow(chunk) == 0) break
  # process chunk
  cat("Fetched", nrow(chunk), "rows\n")
}
dbClearResult(res)
```

## Inserting a Data Frame

```r
df <- data.frame(
  id         = 1:3,
  event_date = as.Date(c("2024-01-01", "2024-01-02", "2024-01-03")),
  event_type = c("pageview", "click", "purchase"),
  stringsAsFactors = FALSE
)

dbWriteTable(con, "events", df, append = TRUE, row.names = FALSE)
```

## DDL Statements

```r
dbExecute(con, "
  CREATE TABLE IF NOT EXISTS events (
    id         UInt64,
    event_date Date,
    event_type String
  ) ENGINE = MergeTree()
  ORDER BY (event_date, id)
")
```

## Integration with dplyr

Use `dbplyr` to write dplyr chains against ClickHouse:

```r
library(dplyr)
library(dbplyr)

events_tbl <- tbl(con, "events")

events_tbl %>%
  filter(event_type == "pageview") %>%
  group_by(event_date) %>%
  summarise(cnt = n()) %>%
  arrange(event_date) %>%
  collect()
```

## Closing the Connection

```r
dbDisconnect(con)
```

## Summary

`RClickhouse` gives R users a DBI-compliant path to ClickHouse. Use `dbGetQuery` for small result sets, `dbFetch` for chunked streaming, and `dbWriteTable` to push data frames back. The `dbplyr` integration lets you write familiar dplyr pipelines that translate to optimized ClickHouse SQL.
