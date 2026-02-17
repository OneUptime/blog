# How to Use Prisma ORM with Azure Database for MySQL in a NestJS Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prisma, Azure, MySQL, NestJS, ORM, TypeScript, Backend

Description: A step-by-step guide to integrating Prisma ORM with Azure Database for MySQL in a NestJS application for scalable backend development.

---

NestJS gives you structure. Prisma gives you type safety. Azure Database for MySQL gives you a managed database you do not have to worry about patching or backing up. Put the three together and you have a backend stack that handles growth without making you hate your own codebase six months later.

This guide walks through the full integration - from provisioning the Azure MySQL instance to building a NestJS module that wraps Prisma and exposes it cleanly through dependency injection.

## Prerequisites

You will need:

- Node.js 18 or later
- The NestJS CLI installed globally (`npm i -g @nestjs/cli`)
- An Azure account with an active subscription
- The Azure CLI installed and logged in
- Familiarity with TypeScript and basic NestJS concepts

## Provisioning Azure Database for MySQL

Azure offers a flexible server deployment option for MySQL. It is simpler to configure than the older single server option and gives you more control over compute and storage independently.

```bash
# Create a resource group for the demo
az group create --name nestjs-prisma-rg --location eastus

# Provision a MySQL flexible server
az mysql flexible-server create \
  --resource-group nestjs-prisma-rg \
  --name nestjs-mysql-server \
  --location eastus \
  --admin-user adminuser \
  --admin-password SecurePass123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 20 \
  --version 8.0.21

# Open the firewall for development access
az mysql flexible-server firewall-rule create \
  --resource-group nestjs-prisma-rg \
  --name nestjs-mysql-server \
  --rule-name dev-access \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

Create a database on the server:

```bash
# Create the application database
az mysql flexible-server db create \
  --resource-group nestjs-prisma-rg \
  --server-name nestjs-mysql-server \
  --database-name nestjs_app
```

## Scaffolding the NestJS Project

Generate a new NestJS project and add Prisma:

```bash
# Create the NestJS application
nest new nestjs-prisma-azure
cd nestjs-prisma-azure

# Install Prisma dependencies
npm install prisma --save-dev
npm install @prisma/client

# Initialize Prisma with MySQL as the provider
npx prisma init --datasource-provider mysql
```

Update the `.env` file with your Azure MySQL connection string:

```env
# Azure MySQL connection string with SSL enabled
DATABASE_URL="mysql://adminuser:SecurePass123!@nestjs-mysql-server.mysql.database.azure.com:3306/nestjs_app?sslaccept=strict"
```

## Defining the Prisma Schema

Open `prisma/schema.prisma` and define your models. This example builds an e-commerce product catalog:

```prisma
// Prisma schema for a product catalog API
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// Product categories for organizing the catalog
model Category {
  id          Int       @id @default(autoincrement())
  name        String    @unique @db.VarChar(100)
  description String?   @db.Text
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([name])
}

// Products in the catalog
model Product {
  id          Int       @id @default(autoincrement())
  sku         String    @unique @db.VarChar(50)
  name        String    @db.VarChar(200)
  description String?   @db.Text
  price       Decimal   @db.Decimal(10, 2)
  stock       Int       @default(0)
  active      Boolean   @default(true)
  category    Category  @relation(fields: [categoryId], references: [id])
  categoryId  Int
  reviews     Review[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([categoryId])
  @@index([price])
  @@index([active])
}

// Customer reviews for products
model Review {
  id        Int      @id @default(autoincrement())
  rating    Int
  comment   String?  @db.Text
  author    String   @db.VarChar(100)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId Int
  createdAt DateTime @default(now())

  @@index([productId])
  @@index([rating])
}
```

Run the migration:

```bash
# Generate and apply the migration to Azure MySQL
npx prisma migrate dev --name initial_schema
```

## Creating the Prisma Service

NestJS uses dependency injection, so you want Prisma wrapped in a service that can be injected anywhere. Create a dedicated module for it:

```bash
# Generate the Prisma module and service
nest generate module prisma
nest generate service prisma
```

Here is the Prisma service that extends PrismaClient and hooks into the NestJS lifecycle:

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Configure logging for development
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  // Connect to the database when the module initializes
  async onModuleInit() {
    await this.$connect();
  }

  // Disconnect cleanly when the module is destroyed
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Make it available globally by exporting it from the module:

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global module so we don't need to import it everywhere
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## Building the Products Module

Now build a products module that uses the Prisma service. Start by generating the files:

```bash
# Generate the products module, controller, and service
nest generate module products
nest generate controller products
nest generate service products
```

Define DTOs for input validation:

```typescript
// src/products/dto/create-product.dto.ts
import { IsString, IsNumber, IsInt, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsInt()
  categoryId: number;
}
```

The products service handles all database operations through Prisma:

```typescript
// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Create a new product in the catalog
  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        stock: dto.stock,
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });
  }

  // Get all products with optional filtering
  async findAll(params: {
    skip?: number;
    take?: number;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const { skip = 0, take = 20, categoryId, minPrice, maxPrice } = params;

    // Build the where clause dynamically
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(categoryId && { categoryId }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined && { gte: minPrice }),
              ...(maxPrice !== undefined && { lte: maxPrice }),
            },
          }
        : {}),
    };

    return this.prisma.product.findMany({
      where,
      skip,
      take,
      include: {
        category: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get a single product by ID with its reviews
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  // Update product stock after a purchase
  async updateStock(id: number, quantity: number) {
    return this.prisma.product.update({
      where: { id },
      data: {
        stock: { decrement: quantity },
      },
    });
  }
}
```

Wire it up with the controller:

```typescript
// src/products/products.controller.ts
import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.findAll({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}
```

## Handling Transactions

For operations that need to be atomic, Prisma supports interactive transactions that work well inside NestJS services:

```typescript
// Example: Creating a product with an initial review atomically
async createWithReview(dto: CreateProductDto, review: { rating: number; comment: string; author: string }) {
  return this.prisma.$transaction(async (tx) => {
    // Create the product first
    const product = await tx.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        price: new Prisma.Decimal(dto.price),
        stock: dto.stock,
        categoryId: dto.categoryId,
      },
    });

    // Then create the review linked to the product
    const productReview = await tx.review.create({
      data: {
        rating: review.rating,
        comment: review.comment,
        author: review.author,
        productId: product.id,
      },
    });

    return { product, review: productReview };
  });
}
```

## Connection Pooling Considerations

Azure MySQL flexible servers have connection limits tied to the compute tier. The Burstable B1ms tier allows around 150 connections. Since NestJS typically runs as a long-lived process, you want to set the pool size appropriately:

```env
# Limit the connection pool to 10 connections
DATABASE_URL="mysql://adminuser:SecurePass123!@nestjs-mysql-server.mysql.database.azure.com:3306/nestjs_app?sslaccept=strict&connection_limit=10"
```

## Testing with Prisma

NestJS makes it straightforward to mock the Prisma service in unit tests:

```typescript
// src/products/products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  // Mock the Prisma service methods
  const mockPrismaService = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(ProductsService);
    prisma = module.get(PrismaService);
  });

  it('should create a product', async () => {
    const dto = { sku: 'TEST-001', name: 'Test', price: 29.99, stock: 10, categoryId: 1 };
    mockPrismaService.product.create.mockResolvedValue({ id: 1, ...dto });

    const result = await service.create(dto);
    expect(result.sku).toBe('TEST-001');
  });
});
```

## Wrapping Up

The combination of NestJS, Prisma, and Azure Database for MySQL gives you a backend that is well-structured, type-safe, and operationally manageable. NestJS handles the application architecture, Prisma handles the data layer with full TypeScript support, and Azure handles the database infrastructure. The Prisma module pattern shown here scales well as your application grows - you add new services that inject PrismaService and you are ready to go. The schema stays in version control through Prisma migrations, and the auto-generated types mean your IDE catches mistakes before your users do.
