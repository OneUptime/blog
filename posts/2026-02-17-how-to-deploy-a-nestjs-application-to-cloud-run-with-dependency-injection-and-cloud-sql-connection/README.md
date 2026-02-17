# How to Deploy a NestJS Application to Cloud Run with Dependency Injection and Cloud SQL Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, NestJS, Cloud Run, Cloud SQL, Node.js

Description: Learn how to deploy a NestJS application to Cloud Run with proper dependency injection patterns and Cloud SQL PostgreSQL connection using TypeORM.

---

NestJS brings structure to Node.js applications with its dependency injection system, decorators, and modular architecture. Deploying it to Cloud Run with a Cloud SQL database creates a solid production setup. The dependency injection pattern works particularly well here because you can swap database connections and configurations between environments without changing your business logic.

## Project Setup

Create a new NestJS project and install the required dependencies.

```bash
# Create a new NestJS project
npx @nestjs/cli new my-api

cd my-api

# Install TypeORM and PostgreSQL driver for Cloud SQL
npm install @nestjs/typeorm typeorm pg

# Install config module for environment-based configuration
npm install @nestjs/config
```

## Database Configuration Module

Create a configuration module that handles Cloud SQL connection settings through dependency injection.

```typescript
// src/config/database.config.ts - Database configuration for Cloud SQL
import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbHost = this.configService.get<string>('DB_HOST', 'localhost');
    const isUnixSocket = dbHost.startsWith('/cloudsql');

    // Cloud Run connects to Cloud SQL via Unix socket
    // Local development uses TCP
    if (isUnixSocket) {
      return {
        type: 'postgres',
        host: dbHost,
        database: this.configService.get<string>('DB_NAME', 'myapp'),
        username: this.configService.get<string>('DB_USER', 'appuser'),
        password: this.configService.get<string>('DB_PASSWORD', ''),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false, // Never use synchronize in production
        logging: this.configService.get<string>('NODE_ENV') !== 'production',
        extra: {
          // Unix socket connection settings
          socketPath: dbHost,
        },
      };
    }

    return {
      type: 'postgres',
      host: dbHost,
      port: this.configService.get<number>('DB_PORT', 5432),
      database: this.configService.get<string>('DB_NAME', 'myapp'),
      username: this.configService.get<string>('DB_USER', 'appuser'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: this.configService.get<string>('NODE_ENV') !== 'production',
    };
  }
}
```

## Application Module

Wire the database configuration into the main application module.

```typescript
// src/app.module.ts - Root application module
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from './config/database.config';
import { ItemsModule } from './items/items.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database connection using our custom config class
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),

    // Feature modules
    ItemsModule,
    HealthModule,
  ],
})
export class AppModule {}
```

## Entity Definition

Define your database entities with TypeORM decorators.

```typescript
// src/items/item.entity.ts - Database entity
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'active' })
  @Index()
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ nullable: true })
  @Index()
  category: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Service Layer with Dependency Injection

The service layer contains your business logic and receives the repository through dependency injection.

```typescript
// src/items/items.service.ts - Business logic service
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './item.entity';
import { CreateItemDto, UpdateItemDto, ListItemsDto } from './items.dto';

@Injectable()
export class ItemsService {
  // The repository is injected automatically by NestJS
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  async findAll(query: ListItemsDto): Promise<{ data: Item[]; total: number }> {
    const { page = 1, limit = 20, status, category } = query;

    const queryBuilder = this.itemRepository.createQueryBuilder('item');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('item.status = :status', { status });
    }
    if (category) {
      queryBuilder.andWhere('item.category = :category', { category });
    }

    // Apply pagination
    queryBuilder
      .orderBy('item.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    return item;
  }

  async create(createItemDto: CreateItemDto): Promise<Item> {
    const item = this.itemRepository.create(createItemDto);
    return this.itemRepository.save(item);
  }

  async update(id: string, updateItemDto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);
    Object.assign(item, updateItemDto);
    return this.itemRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.itemRepository.remove(item);
  }
}
```

## DTOs for Validation

Define DTOs with class-validator decorators for request validation.

```typescript
// src/items/items.dto.ts - Data Transfer Objects
import { IsString, IsOptional, IsNumber, IsPositive, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  category?: string;
}

export class ListItemsDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
```

## Controller

The controller handles HTTP requests and delegates to the service.

```typescript
// src/items/items.controller.ts - HTTP controller
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto, ListItemsDto } from './items.dto';

@Controller('api/v1/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async findAll(@Query() query: ListItemsDto) {
    const { data, total } = await this.itemsService.findAll(query);
    return {
      data,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.itemsService.findOne(id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createItemDto: CreateItemDto) {
    return { data: await this.itemsService.create(createItemDto) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    return { data: await this.itemsService.update(id, updateItemDto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.itemsService.remove(id);
  }
}
```

## Module Registration

Register the entity, service, and controller in the items module.

```typescript
// src/items/items.module.ts - Items feature module
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './item.entity';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Item])],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService], // Export if other modules need the service
})
export class ItemsModule {}
```

## Health Check Module

Add a health check that verifies database connectivity.

```typescript
// src/health/health.controller.ts - Health checks
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller()
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  @Get('health')
  async health() {
    // Test the database connection
    let dbStatus = 'disconnected';
    try {
      await this.connection.query('SELECT 1');
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = `error: ${error.message}`;
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
```

## Main Entry Point

Configure the NestJS application for Cloud Run.

```typescript
// src/main.ts - Application entry point
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,       // Auto-transform types
    }),
  );

  // Cloud Run sets the PORT environment variable
  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`Application running on port ${port}`);
}

bootstrap();
```

## Dockerfile

Create a multi-stage Dockerfile for production.

```dockerfile
# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
USER node
CMD ["node", "dist/main.js"]
```

## Deploying to Cloud Run

Deploy with Cloud SQL connection.

```bash
# Build and push the container
gcloud builds submit --tag gcr.io/my-project/nestjs-api

# Deploy to Cloud Run with Cloud SQL
gcloud run deploy nestjs-api \
    --image gcr.io/my-project/nestjs-api \
    --region us-central1 \
    --add-cloudsql-instances=my-project:us-central1:my-instance \
    --set-env-vars="DB_HOST=/cloudsql/my-project:us-central1:my-instance,DB_NAME=myapp,NODE_ENV=production" \
    --set-secrets="DB_PASSWORD=db-password:latest,DB_USER=db-user:latest" \
    --memory 512Mi \
    --min-instances 0 \
    --max-instances 10 \
    --allow-unauthenticated
```

## Running Migrations

Use TypeORM's migration CLI during deployment.

```bash
# Generate a migration from entity changes
npx typeorm migration:generate -d src/config/datasource.ts src/migrations/AddItems

# Run migrations in Cloud Build before deployment
gcloud run jobs create run-migrations \
    --image gcr.io/my-project/nestjs-api \
    --set-cloudsql-instances=my-project:us-central1:my-instance \
    --set-env-vars="DB_HOST=/cloudsql/my-project:us-central1:my-instance" \
    --set-secrets="DB_PASSWORD=db-password:latest,DB_USER=db-user:latest" \
    --command="npx,typeorm,migration:run,-d,dist/config/datasource.js"
```

## Monitoring Your NestJS API

A production NestJS application needs observability into request handling, database query performance, and error rates. OneUptime (https://oneuptime.com) can monitor your Cloud Run service endpoint, track response times, and alert you when your API experiences issues, whether they stem from database connectivity problems or application errors.

## Summary

NestJS on Cloud Run with Cloud SQL gives you a well-structured, production-ready API. The dependency injection system keeps your code modular and testable - the database configuration, services, and repositories are all swappable. The key things to configure correctly are the Cloud SQL Unix socket connection for Cloud Run, TypeORM entity registration, and the validation pipeline. Once deployed, Cloud Run handles scaling, HTTPS, and load balancing while you focus on building features.
