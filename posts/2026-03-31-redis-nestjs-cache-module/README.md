# How to Set Up Redis Cache Module in NestJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, NestJS, Cache, Node.js, Performance

Description: Configure the NestJS CacheModule with a Redis store to cache service method results and HTTP responses using decorators and interceptors.

---

NestJS has a built-in `CacheModule` that integrates with various stores. Switching to Redis makes the cache shared across all NestJS instances and persistent across restarts.

## Install Dependencies

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet redis nestjs-cacheable
```

## Register CacheModule with Redis

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: { host: "localhost", port: 6379 },
          ttl: 60 * 1000, // default 60 seconds in ms
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

## Cache a Service Method with Decorator

```typescript
// products.service.ts
import { Injectable } from "@nestjs/common";
import { Cacheable, CacheEvict } from "nestjs-cacheable";

@Injectable()
export class ProductsService {

  @Cacheable({ key: (id) => `product:${id}`, ttl: 300 })
  async findOne(id: string) {
    return this.productRepository.findOne({ where: { id } });
  }

  @CacheEvict({ key: (id) => `product:${id}` })
  async update(id: string, dto: UpdateProductDto) {
    return this.productRepository.update(id, dto);
  }
}
```

## Manual Cache Operations

Inject `CACHE_MANAGER` for direct control:

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class ProductsService {

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async findOne(id: string) {
    const cached = await this.cacheManager.get<Product>(`product:${id}`);
    if (cached) return cached;

    const product = await this.productRepository.findOne({ where: { id } });
    await this.cacheManager.set(`product:${id}`, product, 300 * 1000);
    return product;
  }

  async invalidate(id: string) {
    await this.cacheManager.del(`product:${id}`);
  }
}
```

## Cache HTTP Responses with Interceptor

```typescript
// products.controller.ts
import { Controller, Get, Param, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor, CacheKey, CacheTTL } from "@nestjs/cache-manager";

@Controller("products")
@UseInterceptors(CacheInterceptor)
export class ProductsController {

  @Get()
  @CacheTTL(30 * 1000)
  findAll() {
    return this.productsService.findAll();
  }

  @Get(":id")
  @CacheKey("product-detail")
  @CacheTTL(300 * 1000)
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }
}
```

## Verify Cache in Redis CLI

```bash
redis-cli keys "*"
redis-cli ttl "product:42"
redis-cli get "product:42"
```

## Summary

NestJS CacheModule with Redis provides annotation-based and manual caching with a shared, persistent store. The `CacheInterceptor` automatically caches HTTP GET responses, while `CACHE_MANAGER` injection gives fine-grained control for service-level caching. Switching the store to Redis requires a one-line change to the module registration, making the migration from in-memory caching straightforward.
