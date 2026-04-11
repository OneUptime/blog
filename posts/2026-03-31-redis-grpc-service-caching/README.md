# How to Use Redis for gRPC Service Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, gRPC, Caching

Description: Learn how to add Redis caching to gRPC services to reduce backend load and improve response times by caching serialized protobuf responses.

---

gRPC services often serve repeated queries for the same data. Without caching, every RPC call hits the database or upstream service. Redis can store serialized protobuf or JSON responses and serve them directly, reducing latency and backend load.

## Caching Strategy for gRPC

The most practical approach is to cache at the service implementation layer - check Redis before executing business logic, and store the result after execution.

## Project Setup

```bash
npm install @grpc/grpc-js @grpc/proto-loader redis
```

## Service Implementation with Redis Cache

```javascript
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const packageDef = protoLoader.loadSync('product.proto');
const productProto = grpc.loadPackageDefinition(packageDef).product;

async function getProduct(call, callback) {
  const productId = call.request.id;
  const cacheKey = `grpc:product:${productId}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return callback(null, JSON.parse(cached));
  }

  // Fetch from database
  const product = await db.products.findById(productId);
  if (!product) {
    return callback({
      code: grpc.status.NOT_FOUND,
      message: `Product ${productId} not found`
    });
  }

  const response = {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock
  };

  // Cache for 5 minutes
  await redis.setEx(cacheKey, 300, JSON.stringify(response));

  callback(null, response);
}

const server = new grpc.Server();
server.addService(productProto.ProductService.service, { getProduct });
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('gRPC server running on port 50051');
});
```

## List Caching with Cache Invalidation

```javascript
async function listProducts(call, callback) {
  const cacheKey = `grpc:products:list:${JSON.stringify(call.request)}`;

  const cached = await redis.get(cacheKey);
  if (cached) return callback(null, JSON.parse(cached));

  const products = await db.products.findAll(call.request);
  const response = { products };

  await redis.setEx(cacheKey, 60, JSON.stringify(response));
  callback(null, response);
}

// Invalidate on write operations
async function updateProduct(call, callback) {
  const updated = await db.products.update(call.request.id, call.request);

  // Invalidate cached entry and list caches
  await redis.del(`grpc:product:${call.request.id}`);
  const listKeys = await redis.keys('grpc:products:list:*');
  if (listKeys.length) await redis.del(listKeys);

  callback(null, updated);
}
```

## gRPC Interceptor for Transparent Caching

```javascript
function cacheInterceptor(options, nextCall) {
  return new grpc.InterceptingCall(nextCall(options), {
    start(metadata, listener, next) {
      next(metadata, {
        onReceiveMessage(message, next) {
          // Cache the response message
          const cacheKey = `grpc:${options.method_definition.path}`;
          redis.setEx(cacheKey, 300, JSON.stringify(message));
          next(message);
        }
      });
    }
  });
}
```

## Summary

Redis caching in gRPC services follows the same cache-aside pattern as REST APIs. Check Redis first, return the cached response immediately, and populate the cache on cache misses. Invalidate specific keys when write operations occur. For read-heavy gRPC services like product catalogs or user lookups, this pattern dramatically reduces database roundtrips.
