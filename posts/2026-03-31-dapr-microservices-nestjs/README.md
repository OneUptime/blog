# How to Build Microservices with Dapr and NestJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, NestJS, Microservice, TypeScript, Architecture

Description: Learn how to build scalable TypeScript microservices using Dapr and NestJS with dependency injection, decorators, and distributed systems primitives.

---

## Introduction

NestJS provides a structured, opinionated framework for building scalable Node.js applications with TypeScript. Integrating Dapr with NestJS adds state management, pub/sub, and service invocation while keeping the clean module and dependency injection patterns that NestJS developers expect.

## Project Setup

```bash
npm install -g @nestjs/cli
nest new order-service
cd order-service
npm install @dapr/dapr
```

## Creating a Dapr Module

Create a reusable NestJS module for the Dapr client:

```typescript
// src/dapr/dapr.module.ts
import { Module, Global } from "@nestjs/common";
import { DaprClient } from "@dapr/dapr";

@Global()
@Module({
  providers: [
    {
      provide: "DAPR_CLIENT",
      useFactory: () => {
        return new DaprClient({
          daprHost: process.env.DAPR_HOST ?? "127.0.0.1",
          daprPort: process.env.DAPR_HTTP_PORT ?? "3500",
        });
      },
    },
  ],
  exports: ["DAPR_CLIENT"],
})
export class DaprModule {}
```

## Creating the Orders Service

```typescript
// src/orders/orders.service.ts
import { Injectable, Inject } from "@nestjs/common";
import { DaprClient } from "@dapr/dapr";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(@Inject("DAPR_CLIENT") private dapr: DaprClient) {}

  async create(dto: CreateOrderDto) {
    const order = {
      id: `order-${Date.now()}`,
      ...dto,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await this.dapr.state.save("statestore", [
      { key: order.id, value: order },
    ]);

    await this.dapr.pubsub.publish("pubsub", "order-created", order);

    return order;
  }

  async findById(id: string) {
    return this.dapr.state.get("statestore", id);
  }
}
```

## Creating the Orders Controller

```typescript
// src/orders/orders.controller.ts
import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.ordersService.findById(id);
  }
}
```

## Handling Pub/Sub Subscriptions

Register a subscription endpoint:

```typescript
import { Controller, Post, Body } from "@nestjs/common";
import { OrdersService } from "./orders.service";

@Controller()
export class SubscriptionsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("payment-processed")
  async handlePaymentProcessed(@Body() event: any) {
    const order = event.data;
    console.log("Payment processed for order:", order.id);
    await this.ordersService.markPaid(order.id);
    return { status: "SUCCESS" };
  }
}
```

## App Module

```typescript
// src/app.module.ts
import { Module } from "@nestjs/common";
import { DaprModule } from "./dapr/dapr.module";
import { OrdersModule } from "./orders/orders.module";

@Module({
  imports: [DaprModule, OrdersModule],
})
export class AppModule {}
```

## Running with Dapr

```bash
dapr run \
  --app-id order-service \
  --app-port 3000 \
  --resources-path ./dapr/components \
  -- npm run start
```

## Summary

Building microservices with Dapr and NestJS combines NestJS's structured dependency injection and module system with Dapr's portable distributed systems primitives. A dedicated `DaprModule` makes the `DaprClient` available across your entire application, and the clean separation between controllers, services, and Dapr interactions keeps your codebase maintainable as it scales.
