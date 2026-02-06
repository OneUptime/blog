# How to Compare gRPC vs REST vs GraphQL Performance Using OpenTelemetry Benchmark Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, REST, GraphQL, Performance Benchmarking

Description: Benchmark and compare gRPC, REST, and GraphQL API performance using OpenTelemetry traces and metrics for data-driven protocol selection.

Choosing between gRPC, REST, and GraphQL is often based on opinions and blog posts rather than actual measurements. The performance characteristics of each protocol depend heavily on your specific payload sizes, call patterns, and infrastructure. Instead of guessing, you can instrument all three with OpenTelemetry, run comparable workloads, and let the data decide.

## Setting Up the Test Services

Create a simple service that implements the same operation across all three protocols. We will use a product catalog as the example:

### REST Endpoint

```javascript
// rest-server.js
const express = require('express');
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('protocol-benchmark');
const app = express();

app.get('/api/products/:id', async (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttribute('protocol', 'rest');
  span.setAttribute('payload.type', 'json');

  const product = await fetchProduct(req.params.id);

  // Measure serialization time explicitly
  const serStart = performance.now();
  const body = JSON.stringify(product);
  const serDuration = performance.now() - serStart;
  span.setAttribute('serialization.duration_ms', serDuration);
  span.setAttribute('response.body_size', Buffer.byteLength(body));

  res.json(product);
});

app.get('/api/products', async (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttribute('protocol', 'rest');

  const products = await fetchProducts(req.query.limit || 50);

  const body = JSON.stringify(products);
  span.setAttribute('response.body_size', Buffer.byteLength(body));
  span.setAttribute('response.item_count', products.length);

  res.json(products);
});
```

### gRPC Service

```javascript
// grpc-server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { trace, SpanKind } = require('@opentelemetry/api');

const tracer = trace.getTracer('protocol-benchmark');

const packageDefinition = protoLoader.loadSync('product.proto');
const productProto = grpc.loadPackageDefinition(packageDefinition).product;

const server = new grpc.Server();

server.addService(productProto.ProductService.service, {
  getProduct: async (call, callback) => {
    return tracer.startActiveSpan('grpc.GetProduct', {
      kind: SpanKind.SERVER,
      attributes: {
        'protocol': 'grpc',
        'rpc.system': 'grpc',
        'rpc.method': 'GetProduct',
      },
    }, async (span) => {
      try {
        const product = await fetchProduct(call.request.id);
        span.setAttribute('response.item_count', 1);
        callback(null, product);
      } catch (err) {
        span.recordException(err);
        callback(err);
      } finally {
        span.end();
      }
    });
  },

  listProducts: async (call, callback) => {
    return tracer.startActiveSpan('grpc.ListProducts', {
      kind: SpanKind.SERVER,
      attributes: { 'protocol': 'grpc' },
    }, async (span) => {
      const products = await fetchProducts(call.request.limit);
      span.setAttribute('response.item_count', products.length);
      callback(null, { products });
      span.end();
    });
  },
});
```

### GraphQL Service

```javascript
// graphql-server.js
const { ApolloServer, gql } = require('apollo-server-express');
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('protocol-benchmark');

const typeDefs = gql`
  type Product {
    id: ID!
    name: String!
    price: Float!
    description: String
    category: String
    inventory: Int
  }
  type Query {
    product(id: ID!): Product
    products(limit: Int): [Product!]!
  }
`;

const resolvers = {
  Query: {
    product: async (_, { id }) => {
      const span = trace.getActiveSpan();
      span.setAttribute('protocol', 'graphql');
      span.setAttribute('graphql.operation', 'product');

      const product = await fetchProduct(id);
      return product;
    },
    products: async (_, { limit = 50 }) => {
      const span = trace.getActiveSpan();
      span.setAttribute('protocol', 'graphql');
      span.setAttribute('graphql.operation', 'products');
      span.setAttribute('response.item_count', limit);

      return fetchProducts(limit);
    },
  },
};
```

## The Benchmark Runner

Run identical workloads against all three protocols:

```python
# benchmark_runner.py
import grpc
import requests
import time
import json
from concurrent.futures import ThreadPoolExecutor
from opentelemetry import trace, metrics

tracer = trace.get_tracer("benchmark-client")
meter = metrics.get_meter("benchmark-client")

bench_duration = meter.create_histogram("benchmark.request.duration", unit="ms")
bench_size = meter.create_histogram("benchmark.response.size", unit="By")

def benchmark_rest(base_url, product_id, iterations=1000):
    """Benchmark REST API calls."""
    durations = []
    for i in range(iterations):
        start = time.time()
        resp = requests.get(f"{base_url}/api/products/{product_id}")
        duration_ms = (time.time() - start) * 1000
        durations.append(duration_ms)

        bench_duration.record(duration_ms, {
            "protocol": "rest",
            "operation": "get_product",
            "iteration": str(i),
        })
        bench_size.record(len(resp.content), {"protocol": "rest"})

    return durations

def benchmark_grpc(endpoint, product_id, iterations=1000):
    """Benchmark gRPC calls."""
    channel = grpc.insecure_channel(endpoint)
    stub = product_pb2_grpc.ProductServiceStub(channel)

    durations = []
    for i in range(iterations):
        start = time.time()
        response = stub.GetProduct(product_pb2.GetProductRequest(id=product_id))
        duration_ms = (time.time() - start) * 1000
        durations.append(duration_ms)

        bench_duration.record(duration_ms, {
            "protocol": "grpc",
            "operation": "get_product",
        })

    channel.close()
    return durations

def benchmark_graphql(endpoint, product_id, iterations=1000):
    """Benchmark GraphQL calls."""
    query = '{ product(id: "%s") { id name price description category inventory } }' % product_id

    durations = []
    for i in range(iterations):
        start = time.time()
        resp = requests.post(endpoint, json={"query": query})
        duration_ms = (time.time() - start) * 1000
        durations.append(duration_ms)

        bench_duration.record(duration_ms, {
            "protocol": "graphql",
            "operation": "get_product",
        })
        bench_size.record(len(resp.content), {"protocol": "graphql"})

    return durations

def run_full_benchmark():
    """Run benchmarks and print comparison."""
    import numpy as np

    print("Running benchmarks (1000 iterations each)...\n")

    rest_results = benchmark_rest("http://localhost:3000", "prod-123")
    grpc_results = benchmark_grpc("localhost:50051", "prod-123")
    graphql_results = benchmark_graphql("http://localhost:4000/graphql", "prod-123")

    for name, results in [("REST", rest_results), ("gRPC", grpc_results), ("GraphQL", graphql_results)]:
        arr = np.array(results)
        print(f"{name}:")
        print(f"  P50: {np.percentile(arr, 50):.2f}ms")
        print(f"  P95: {np.percentile(arr, 95):.2f}ms")
        print(f"  P99: {np.percentile(arr, 99):.2f}ms")
        print(f"  Mean: {np.mean(arr):.2f}ms")
        print()

if __name__ == "__main__":
    run_full_benchmark()
```

## Analyzing the Results

Query the benchmark metrics to build a comparison dashboard:

```promql
# P95 latency comparison across protocols
histogram_quantile(0.95,
  sum(rate(benchmark_request_duration_milliseconds_bucket[5m])) by (le, protocol)
)

# Average response size comparison
avg(benchmark_response_size_bytes) by (protocol)

# Throughput comparison (requests handled per second on the server side)
sum(rate(http_server_duration_seconds_count[5m])) by (protocol)
```

## What the Numbers Typically Show

Based on typical benchmarks, here is what you can expect to find (though your specific results will vary):

**gRPC** generally wins on raw latency for small payloads due to Protocol Buffers' efficient binary serialization and HTTP/2 multiplexing. The difference is most pronounced for high-frequency, small-payload calls between internal services.

**REST** with JSON is the simplest to debug and has the widest tooling support. Its performance is perfectly adequate for most external APIs and moderate-frequency internal calls.

**GraphQL** adds overhead from query parsing and validation, but saves bandwidth when clients only need a subset of fields. For large objects where clients typically need only 3 of 20 fields, GraphQL can actually be faster end-to-end because it transfers less data.

The key insight from OpenTelemetry traces is not just the total duration, but the breakdown. Serialization time, network transfer time, and server processing time all contribute differently for each protocol. Your traces show you exactly where each protocol spends its time.

## Wrapping Up

Protocol performance comparisons should be based on your actual workloads, not generic benchmarks from the internet. By instrumenting all three protocols with OpenTelemetry and running controlled benchmarks, you get data specific to your payload sizes, network conditions, and server configuration. Let the traces and metrics guide your decision, and re-run the benchmarks whenever your usage patterns change.
