# How to Use MySQL with NestJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NestJS, TypeORM

Description: Integrate MySQL with NestJS using TypeORM, configure entity definitions, repositories, and transactions in a modular NestJS application.

---

NestJS is an opinionated Node.js framework that pairs naturally with MySQL via TypeORM. The combination gives you decorators-based entity definitions, dependency-injected repositories, and full transaction support in a structured module system.

## Installing Dependencies

```bash
npm install @nestjs/typeorm typeorm mysql2
```

## Database Module Configuration

In `app.module.ts`, configure TypeORM with the MySQL driver:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type:        'mysql',
      host:        process.env.DB_HOST,
      port:        Number(process.env.DB_PORT ?? 3306),
      username:    process.env.DB_USER,
      password:    process.env.DB_PASSWORD,
      database:    process.env.DB_NAME,
      entities:    [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,  // never true in production
    }),
  ],
})
export class AppModule {}
```

## Defining an Entity

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

## Feature Module Setup

```typescript
// users.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
```

## Service with Repository

```typescript
// users.service.ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  create(name: string, email: string): Promise<User> {
    const user = this.userRepo.create({ name, email });
    return this.userRepo.save(user);
  }
}
```

## Handling Transactions

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class OrderService {
  constructor(private readonly dataSource: DataSource) {}

  async placeOrder(userId: number, productId: number) {
    await this.dataSource.transaction(async (manager) => {
      await manager.decrement(Product, { id: productId }, 'stock', 1);
      await manager.save(Order, { userId, productId });
    });
  }
}
```

## Running Migrations

Set `synchronize: false` in production and use TypeORM migrations instead:

```bash
npx typeorm migration:generate src/migrations/CreateUsers -d src/data-source.ts
npx typeorm migration:run -d src/data-source.ts
```

## Summary

NestJS with TypeORM and MySQL gives you a strongly typed, modular database layer. Always disable `synchronize` in production, use migrations for schema changes, and inject the `DataSource` when you need transaction control across multiple repositories.
