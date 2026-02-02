# How to Use TypeORM with NestJS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, NestJS, TypeORM, Database, ORM

Description: A comprehensive guide to using TypeORM with NestJS for database operations, including entities, repositories, relations, and migrations.

---

NestJS and TypeORM work really well together. NestJS provides a clean architecture with dependency injection, while TypeORM gives you a powerful ORM with decorators that feel natural in TypeScript. This guide walks through setting everything up from scratch and covers the patterns you will actually use in production.

## Installation and Setup

First, install the required packages:

```bash
npm install @nestjs/typeorm typeorm pg
```

Configure TypeORM in your app module. The `forRoot` method sets up the database connection that gets shared across your entire application.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'myapp',
      // Auto-load all entities from this pattern
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // Never use synchronize in production - use migrations instead
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class AppModule {}
```

For production apps, use a configuration service to manage your database settings:

```typescript
// app.module.ts - using ConfigService
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
})
export class AppModule {}
```

## Defining Entities

Entities are TypeScript classes that map to database tables. TypeORM uses decorators to define columns, relationships, and constraints.

```typescript
// user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // One user has many posts
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}
```

### Common Column Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@PrimaryGeneratedColumn()` | Auto-generated primary key | `@PrimaryGeneratedColumn('uuid')` |
| `@Column()` | Basic column | `@Column({ length: 255, nullable: true })` |
| `@Index()` | Database index | `@Index({ unique: true })` |
| `@CreateDateColumn()` | Auto-set on insert | Timestamp of creation |
| `@UpdateDateColumn()` | Auto-update on save | Timestamp of last update |
| `@DeleteDateColumn()` | Soft delete timestamp | Used with soft deletes |

## Entity Relations

TypeORM supports all standard relationship types. Here is how to set up related entities:

```typescript
// post.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Tag } from './tag.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  published: boolean;

  // Many posts belong to one author
  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  // Many-to-many with tags through a join table
  @ManyToMany(() => Tag, (tag) => tag.posts)
  @JoinTable({
    name: 'post_tags',
    joinColumn: { name: 'post_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: Tag[];
}
```

```typescript
// tag.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Post, (post) => post.tags)
  posts: Post[];
}
```

## Using Repositories

Register entities in feature modules, then inject repositories into your services:

```typescript
// posts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
```

```typescript
// posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { CreatePostDto, UpdatePostDto } from './dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create({
      ...dto,
      authorId: userId,
    });
    return this.postsRepository.save(post);
  }

  async findAll(page = 1, limit = 10): Promise<Post[]> {
    return this.postsRepository.find({
      relations: ['author', 'tags'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author', 'tags'],
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    await this.postsRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.postsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
  }
}
```

## Custom Repositories

For complex queries, create custom repositories that extend the base repository:

```typescript
// posts.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Post } from './post.entity';

@Injectable()
export class PostsRepository extends Repository<Post> {
  constructor(private dataSource: DataSource) {
    super(Post, dataSource.createEntityManager());
  }

  async findPublishedByAuthor(authorId: string): Promise<Post[]> {
    return this.createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .where('post.authorId = :authorId', { authorId })
      .andWhere('post.published = :published', { published: true })
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }

  async findWithTagCount(): Promise<(Post & { tagCount: number })[]> {
    return this.createQueryBuilder('post')
      .leftJoin('post.tags', 'tag')
      .addSelect('COUNT(tag.id)', 'tagCount')
      .groupBy('post.id')
      .getRawAndEntities()
      .then(({ entities, raw }) =>
        entities.map((entity, index) => ({
          ...entity,
          tagCount: parseInt(raw[index].tagCount, 10),
        })),
      );
  }

  async searchPosts(query: string): Promise<Post[]> {
    return this.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.title ILIKE :query', { query: `%${query}%` })
      .orWhere('post.content ILIKE :query', { query: `%${query}%` })
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }
}
```

Register the custom repository as a provider:

```typescript
// posts.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  providers: [PostsService, PostsRepository],
  controllers: [PostsController],
})
export class PostsModule {}
```

## Transactions

Wrap multiple operations in a transaction to ensure data consistency:

```typescript
// posts.service.ts
import { DataSource } from 'typeorm';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private dataSource: DataSource,
  ) {}

  async createWithTags(
    userId: string,
    dto: CreatePostDto,
    tagNames: string[],
  ): Promise<Post> {
    // Use a transaction to create post and tags together
    return this.dataSource.transaction(async (manager) => {
      // Create or find tags
      const tags = await Promise.all(
        tagNames.map(async (name) => {
          let tag = await manager.findOne(Tag, { where: { name } });
          if (!tag) {
            tag = manager.create(Tag, { name });
            await manager.save(tag);
          }
          return tag;
        }),
      );

      // Create and save the post with tags
      const post = manager.create(Post, {
        ...dto,
        authorId: userId,
        tags,
      });

      return manager.save(post);
    });
  }

  async transferPostOwnership(
    postId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, {
        where: { id: postId, authorId: fromUserId },
      });

      if (!post) {
        throw new NotFoundException('Post not found or not owned by user');
      }

      post.authorId = toUserId;
      await manager.save(post);

      // Log the transfer
      await manager.insert('post_transfers', {
        postId,
        fromUserId,
        toUserId,
        transferredAt: new Date(),
      });
    });
  }
}
```

## Migrations

Never use `synchronize: true` in production. Use migrations to version control your database schema.

Generate a migration after changing entities:

```bash
# Generate migration from entity changes
npx typeorm migration:generate -d src/data-source.ts src/migrations/AddUserMetadata

# Create an empty migration for custom SQL
npx typeorm migration:create src/migrations/SeedInitialData

# Run pending migrations
npx typeorm migration:run -d src/data-source.ts

# Revert the last migration
npx typeorm migration:revert -d src/data-source.ts
```

Create a data source file for the CLI:

```typescript
// data-source.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
```

Example migration file:

```typescript
// migrations/1706889600000-AddUserMetadata.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserMetadata1706889600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "metadata" jsonb
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_metadata"
      ON "users" USING GIN ("metadata")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_metadata"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "metadata"`);
  }
}
```

## Query Optimization

A few tips for keeping your queries performant:

```typescript
// Select only the fields you need
const users = await this.usersRepository.find({
  select: ['id', 'name', 'email'],
});

// Use query builder for complex joins
const posts = await this.postsRepository
  .createQueryBuilder('post')
  .innerJoinAndSelect('post.author', 'author')
  .leftJoinAndSelect('post.tags', 'tag')
  .where('author.isActive = :isActive', { isActive: true })
  .andWhere('post.published = :published', { published: true })
  .cache(60000) // Cache results for 60 seconds
  .getMany();

// Batch inserts for large datasets
const chunks = chunkArray(users, 500);
for (const chunk of chunks) {
  await this.usersRepository.insert(chunk);
}
```

## Summary

| Pattern | When to Use |
|---------|-------------|
| **Standard Repository** | Basic CRUD operations |
| **Custom Repository** | Complex queries, reusable query logic |
| **QueryBuilder** | Dynamic queries, joins, aggregations |
| **Transactions** | Multiple related operations that must succeed together |
| **Migrations** | All production schema changes |

TypeORM with NestJS gives you a solid foundation for building data-driven applications. Start with the standard repository pattern for simple cases, move to custom repositories when queries get complex, and always use migrations for production deployments. The decorator-based approach fits naturally with NestJS and keeps your code clean and type-safe.
