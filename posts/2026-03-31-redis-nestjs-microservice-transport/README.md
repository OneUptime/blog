# How to Use Redis as NestJS Microservice Transport

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, NestJS, Microservice, Transport, Node.js

Description: Use Redis as a NestJS microservice transport layer to send messages and emit events between services using the built-in Redis transport strategy.

---

NestJS supports multiple transport strategies for microservices. The Redis transport uses Pub/Sub for event broadcasting and request-response patterns via dedicated reply channels, making it simple to connect services without a message broker like Kafka or RabbitMQ.

## Install Dependencies

```bash
npm install @nestjs/microservices ioredis
```

## Create a Microservice

`order-service/main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.REDIS,
    options: {
      host: "localhost",
      port: 6379,
    },
  });
  await app.listen();
  console.log("Order microservice started");
}
bootstrap();
```

## Define Message Handlers

```typescript
// order.controller.ts
import { Controller } from "@nestjs/common";
import { MessagePattern, EventPattern, Payload } from "@nestjs/microservices";

@Controller()
export class OrderController {

  @MessagePattern("get_order")
  async getOrder(@Payload() data: { id: string }) {
    return { id: data.id, status: "shipped", total: 99.99 };
  }

  @EventPattern("order_created")
  async handleOrderCreated(@Payload() data: { orderId: string }) {
    console.log(`Processing new order: ${data.orderId}`);
    // Trigger warehouse, email, etc.
  }
}
```

`@MessagePattern` handles request-response calls. `@EventPattern` handles fire-and-forget events.

## Call from an API Gateway

```typescript
// api-gateway/orders.module.ts
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "ORDER_SERVICE",
        transport: Transport.REDIS,
        options: { host: "localhost", port: 6379 },
      },
    ]),
  ],
  controllers: [OrdersGatewayController],
})
export class OrdersModule {}
```

```typescript
// api-gateway/orders-gateway.controller.ts
import { Controller, Get, Post, Param, Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("orders")
export class OrdersGatewayController {

  constructor(@Inject("ORDER_SERVICE") private client: ClientProxy) {}

  @Get(":id")
  async getOrder(@Param("id") id: string) {
    return firstValueFrom(this.client.send("get_order", { id }));
  }

  @Post(":id/create")
  async createOrder(@Param("id") orderId: string) {
    this.client.emit("order_created", { orderId }); // fire-and-forget
    return { queued: true };
  }
}
```

## Hybrid App (HTTP + Microservice)

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: { host: "localhost", port: 6379 },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

## Summary

NestJS Redis transport provides a lightweight, zero-configuration microservice communication layer backed by Redis Pub/Sub. `@MessagePattern` enables synchronous request-response communication, while `@EventPattern` handles asynchronous event broadcasting. The hybrid app pattern allows a single NestJS application to serve both HTTP and microservice traffic simultaneously.
