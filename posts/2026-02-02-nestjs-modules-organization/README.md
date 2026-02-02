# How to Use Modules for Code Organization in NestJS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, NestJS, Modules, Architecture, Best Practices

Description: Learn how to organize NestJS applications using modules for better code organization, encapsulation, and maintainability.

---

If you've worked on any decent-sized Node.js application, you know how quickly things can get out of hand. Files everywhere, circular dependencies, services that do too much - it's a mess. NestJS solves a lot of this with its module system, which forces you to think about organization from the start.

In this guide, we'll cover how modules work in NestJS and how to use them effectively. Whether you're building a small API or a large enterprise application, understanding modules will save you countless hours of refactoring later.

## What Are Modules in NestJS?

A module in NestJS is a class decorated with `@Module()`. It's basically a container that groups related functionality together - controllers, services, and other providers that belong together. Think of it like organizing your codebase into logical buckets.

Every NestJS app has at least one module - the root module (usually `AppModule`). From there, you build out your application by creating feature modules that handle specific parts of your domain.

```typescript
// app.module.ts - The root module
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [UsersModule, OrdersModule], // Import feature modules
})
export class AppModule {}
```

## The @Module Decorator Options

The `@Module()` decorator takes a metadata object with four properties. Here's what each one does:

| Property | Description | Use Case |
|----------|-------------|----------|
| `providers` | Services and other providers available within this module | Register services that handle business logic |
| `controllers` | Controllers that handle HTTP requests for this module | Define API endpoints for this feature |
| `imports` | Other modules whose exported providers are needed here | Bring in functionality from other modules |
| `exports` | Providers that should be available to other modules | Share services across module boundaries |

## Creating a Feature Module

Let's build a real example - a users module that handles user-related operations:

```typescript
// users/users.service.ts
import { Injectable } from '@nestjs/common';

// The @Injectable decorator marks this class as a provider
// NestJS will manage its lifecycle and dependencies
@Injectable()
export class UsersService {
  private users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find(user => user.id === id);
  }

  create(userData: { name: string; email: string }) {
    const newUser = {
      id: this.users.length + 1,
      ...userData,
    };
    this.users.push(newUser);
    return newUser;
  }
}
```

```typescript
// users/users.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  // NestJS injects UsersService automatically
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(Number(id));
  }

  @Post()
  create(@Body() createUserDto: { name: string; email: string }) {
    return this.usersService.create(createUserDto);
  }
}
```

```typescript
// users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController], // Handle HTTP requests
  providers: [UsersService],      // Business logic
  exports: [UsersService],        // Make available to other modules
})
export class UsersModule {}
```

## Sharing Services Between Modules

Here's where the module system really shines. Say you have an orders module that needs to look up user information. Instead of duplicating code, you import the users module:

```typescript
// orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  // UsersService is injected because we imported UsersModule
  constructor(private readonly usersService: UsersService) {}

  createOrder(userId: number, items: string[]) {
    // Verify the user exists before creating an order
    const user = this.usersService.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: Date.now(),
      userId,
      items,
      userName: user.name,
      createdAt: new Date(),
    };
  }
}
```

```typescript
// orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],        // Import to use UsersService
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

The key thing here: `UsersModule` must export `UsersService` for this to work. If you forget the export, you'll get a dependency injection error.

## Global Modules

Some services are used everywhere - logging, configuration, database connections. Rather than importing these modules everywhere, you can make them global:

```typescript
// database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global() // This module's exports are available everywhere
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

Now `DatabaseService` is available in any module without explicitly importing `DatabaseModule`. Use this sparingly though - it makes dependencies less obvious and can lead to coupling issues if overused.

## Dynamic Modules

Sometimes you need to configure a module differently based on context. Dynamic modules let you pass configuration when importing:

```typescript
// config/config.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from './config.service';

@Module({})
export class ConfigModule {
  // Static method that returns a module definition
  static forRoot(options: { envPath: string }): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options, // Pass configuration as a provider
        },
        ConfigService,
      ],
      exports: [ConfigService],
      global: true, // Make it global so config is available everywhere
    };
  }
}
```

```typescript
// config/config.service.ts
import { Injectable, Inject } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';

@Injectable()
export class ConfigService {
  private config: Record<string, string>;

  constructor(@Inject('CONFIG_OPTIONS') private options: { envPath: string }) {
    // Load environment file based on passed options
    const envFile = path.resolve(process.cwd(), options.envPath);
    const result = dotenv.config({ path: envFile });
    this.config = result.parsed || {};
  }

  get(key: string): string {
    return this.config[key] || process.env[key];
  }
}
```

Use it in your app module:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envPath: '.env' }), // Configure on import
    UsersModule,
  ],
})
export class AppModule {}
```

## Module Organization Best Practices

After working with NestJS on several projects, here are some patterns that work well:

**Keep modules focused.** Each module should handle one specific area of your domain. If your users module also handles authentication, billing, and notifications, it's doing too much.

**Use a shared module for common utilities.** Things like custom decorators, pipes, and guards that are used across multiple modules can live in a shared module.

```typescript
// shared/shared.module.ts
import { Module } from '@nestjs/common';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ValidationPipe } from './pipes/validation.pipe';

@Module({
  providers: [LoggingInterceptor, ValidationPipe],
  exports: [LoggingInterceptor, ValidationPipe],
})
export class SharedModule {}
```

**Follow a consistent file structure.** The CLI generates a standard structure that works well:

```
src/
  users/
    dto/
      create-user.dto.ts
    users.controller.ts
    users.service.ts
    users.module.ts
  orders/
    dto/
      create-order.dto.ts
    orders.controller.ts
    orders.service.ts
    orders.module.ts
  app.module.ts
  main.ts
```

**Be explicit about dependencies.** Even if a global module makes a service available everywhere, consider importing modules explicitly where you use them. It makes the dependency graph clearer and helps when you need to trace issues.

## Wrapping Up

Modules are the backbone of NestJS application architecture. They force you to think about how different parts of your application relate to each other, which leads to better organized and more maintainable code.

Start simple with feature modules, add shared modules as common patterns emerge, and use global and dynamic modules when they genuinely simplify things. The goal is a codebase where you can look at a module's imports and understand exactly what it depends on.

The NestJS CLI can generate modules for you with `nest generate module users`, which sets up the boilerplate. From there, it's just a matter of adding your business logic and wiring things together.
