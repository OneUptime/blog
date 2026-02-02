# How to Use Apache Spark with Scala

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Scala, Apache Spark, Big Data, Data Processing, Distributed Computing

Description: Learn how to process big data with Apache Spark and Scala, covering RDDs, DataFrames, transformations, actions, and performance optimization.

---

Apache Spark is the go-to framework for processing massive datasets across clusters of machines. While you can use Spark with Python, Java, or R, Scala is its native language. Spark itself is written in Scala, which means the Scala API is always up to date, has the best performance, and gives you access to features before they land in other languages.

If you're processing terabytes of data and need to squeeze out every bit of performance, Scala is the way to go. Let's dig into how to use Spark effectively.

## Setting Up SparkSession

Everything starts with a SparkSession. This is your entry point to all Spark functionality - DataFrames, SQL, streaming, and the underlying SparkContext for RDDs.

```scala
import org.apache.spark.sql.SparkSession

// Create a SparkSession - the entry point for all Spark operations
val spark = SparkSession.builder()
  .appName("MySparkApp")
  .master("local[*]")  // Use all available cores locally
  .config("spark.sql.shuffle.partitions", "200")
  .getOrCreate()

// Import implicits for DataFrame operations like .toDF()
import spark.implicits._

// When you're done, stop the session to release resources
// spark.stop()
```

In production, you'd remove the `.master()` call and let the cluster manager handle that. The config options let you tune Spark for your workload.

## RDDs - The Foundation

Resilient Distributed Datasets (RDDs) are Spark's original abstraction. They're immutable, distributed collections that you transform through operations. While DataFrames are more common now, understanding RDDs helps you debug performance issues and handle unstructured data.

```scala
// Get the SparkContext from SparkSession
val sc = spark.sparkContext

// Create an RDD from a collection
val numbers = sc.parallelize(Seq(1, 2, 3, 4, 5, 6, 7, 8, 9, 10))

// Create an RDD from a file - each line becomes an element
val logLines = sc.textFile("hdfs:///logs/application.log")

// RDDs are lazy - nothing executes until you call an action
val doubled = numbers.map(_ * 2)
val evens = doubled.filter(_ % 2 == 0)

// Actions trigger computation
val result = evens.collect()  // Returns Array[Int] to the driver
println(result.mkString(", "))  // 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
```

## DataFrames - Structured and Optimized

DataFrames are distributed collections with named columns, like database tables. They're built on top of RDDs but use Spark's Catalyst optimizer to generate efficient execution plans. For most use cases, DataFrames outperform hand-written RDD code.

```scala
// Create a DataFrame from a case class
case class Person(name: String, age: Int, city: String)

val people = Seq(
  Person("Alice", 28, "New York"),
  Person("Bob", 35, "San Francisco"),
  Person("Charlie", 42, "New York"),
  Person("Diana", 31, "Chicago")
).toDF()

// Show the DataFrame contents
people.show()
// +-------+---+-------------+
// |   name|age|         city|
// +-------+---+-------------+
// |  Alice| 28|     New York|
// |    Bob| 35|San Francisco|
// |Charlie| 42|     New York|
// |  Diana| 31|      Chicago|
// +-------+---+-------------+

// Filter and select columns
val nyResidents = people
  .filter($"city" === "New York")
  .select($"name", $"age")

// Aggregations
val avgAgeByCity = people
  .groupBy($"city")
  .agg(avg($"age").as("avg_age"))
```

## RDD vs DataFrame Comparison

| Feature | RDD | DataFrame |
|---------|-----|-----------|
| Type Safety | Compile-time type checking | Runtime schema validation |
| Optimization | Manual optimization required | Catalyst optimizer auto-optimizes |
| Performance | Can be slower for structured data | 10-100x faster with tungsten |
| Use Case | Unstructured data, low-level control | Structured data, SQL-like operations |
| Serialization | Java serialization (slow) | Tungsten binary format (fast) |
| API Style | Functional transformations | SQL-like DSL |

## Transformations vs Actions

This distinction trips up many beginners. Transformations are lazy - they define what to do but don't execute. Actions trigger the actual computation.

```scala
val data = spark.read.json("events.json")

// Transformations - nothing executes yet
val filtered = data.filter($"event_type" === "purchase")
val grouped = filtered.groupBy($"user_id").count()
val sorted = grouped.orderBy($"count".desc)

// Actions - these trigger execution
sorted.show()           // Display results
sorted.collect()        // Return all rows to driver
sorted.count()          // Count rows
sorted.first()          // Get first row
sorted.write.parquet("output/")  // Write to storage
```

Common transformations: `map`, `filter`, `flatMap`, `groupBy`, `join`, `select`, `withColumn`

Common actions: `collect`, `count`, `first`, `take`, `show`, `write`, `foreach`

## Running SQL Queries

Spark SQL lets you query DataFrames using standard SQL syntax. This is great for analysts who know SQL but aren't comfortable with the DataFrame API.

```scala
// Register a DataFrame as a temporary view
people.createOrReplaceTempView("people")

// Run SQL queries against the view
val results = spark.sql("""
  SELECT city, AVG(age) as avg_age, COUNT(*) as population
  FROM people
  WHERE age > 25
  GROUP BY city
  ORDER BY population DESC
""")

results.show()

// You can also read directly into SQL
spark.read
  .option("header", "true")
  .csv("customers.csv")
  .createOrReplaceTempView("customers")

val orderSummary = spark.sql("""
  SELECT c.name, COUNT(o.id) as order_count
  FROM customers c
  JOIN orders o ON c.id = o.customer_id
  GROUP BY c.name
""")
```

## Caching for Performance

When you use a DataFrame multiple times, Spark recomputes it each time by default. Caching stores the result in memory so subsequent uses are instant.

```scala
// Read and transform data
val processedData = spark.read
  .parquet("raw_events/")
  .filter($"timestamp" > "2024-01-01")
  .withColumn("day", dayofmonth($"timestamp"))

// Cache because we'll use this multiple times
processedData.cache()

// First action materializes the cache
val totalCount = processedData.count()

// These are fast - they read from cache
val byDay = processedData.groupBy($"day").count()
val byUser = processedData.groupBy($"user_id").count()

// Remove from cache when done
processedData.unpersist()
```

Storage levels control where and how data is cached:

```scala
import org.apache.spark.storage.StorageLevel

// Memory only - fastest but may spill
df.persist(StorageLevel.MEMORY_ONLY)

// Memory and disk - spills to disk if needed
df.persist(StorageLevel.MEMORY_AND_DISK)

// Serialized - uses less memory but CPU for deserialization
df.persist(StorageLevel.MEMORY_ONLY_SER)
```

## Performance Optimization Tips

After working with Spark on production systems, here are the things that make the biggest difference:

**Partition your data wisely.** Too few partitions underutilize your cluster. Too many create scheduling overhead. Aim for 100-200MB per partition.

```scala
// Repartition based on a key for better join performance
val partitionedSales = sales.repartition(200, $"customer_id")

// Coalesce reduces partitions without a full shuffle
val compacted = largeDataset.coalesce(100)
```

**Avoid shuffles when possible.** Shuffles move data between nodes and are expensive. Use broadcast joins for small tables.

```scala
import org.apache.spark.sql.functions.broadcast

// Small lookup table - broadcast it to all nodes
val countries = spark.read.csv("countries.csv")

// Broadcast join avoids shuffling the large table
val enriched = largeEvents.join(
  broadcast(countries),
  $"country_code" === $"code"
)
```

**Use the right file format.** Parquet is columnar and compressed - reads are fast because Spark only loads columns you need.

```scala
// Write as Parquet with partitioning
processedData.write
  .partitionBy("year", "month")
  .parquet("output/events/")

// Reads are fast - Spark only scans relevant partitions
val jan2024 = spark.read
  .parquet("output/events/")
  .filter($"year" === 2024 && $"month" === 1)
```

**Check the execution plan.** When things are slow, the explain plan shows you what Spark is actually doing.

```scala
// See the logical and physical plans
df.explain(true)

// Look for:
// - Unnecessary shuffles (Exchange nodes)
// - Full table scans when filter pushdown should work
// - Skewed partitions in join operations
```

## Getting Started

Add Spark to your build.sbt:

```scala
libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % "3.5.0",
  "org.apache.spark" %% "spark-sql" % "3.5.0"
)
```

Start with local mode for development, then deploy to a cluster when you need scale. Spark runs on standalone clusters, YARN, Kubernetes, or managed services like Databricks and EMR. The same code works everywhere - you just change the configuration.
