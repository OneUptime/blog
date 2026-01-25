# How to Build Type-Safe GraphQL APIs with NestJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NestJS, GraphQL, TypeScript, API, Type Safety, Node.js, Backend

Description: A practical guide to building type-safe GraphQL APIs with NestJS using the code-first approach. Learn how to leverage TypeScript decorators for automatic schema generation, implement resolvers, and create maintainable GraphQL services.

---

> GraphQL has become a popular choice for building flexible APIs, but maintaining type safety between your schema and code can be challenging. NestJS solves this problem elegantly with its code-first approach, where your TypeScript classes become the source of truth for your GraphQL schema.

Building a GraphQL API with proper type safety means catching errors at compile time rather than runtime. NestJS provides decorators that let you define your schema directly in TypeScript, eliminating the need to maintain separate schema files and reducing the risk of type mismatches.

---

## Prerequisites

Before diving in, ensure you have:
- Node.js 18 or higher
- Basic understanding of TypeScript and decorators
- Familiarity with GraphQL concepts (queries, mutations, resolvers)
- An empty NestJS project or willingness to create one

---

## Project Setup

Start by creating a new NestJS project and installing the required GraphQL packages.

```bash
# Create a new NestJS project
npm i -g @nestjs/cli
nest new graphql-api

# Install GraphQL dependencies
cd graphql-api
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

Configure the GraphQL module in your application. The code-first approach uses decorators to generate the schema automatically from your TypeScript classes.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Configure GraphQL with Apollo Server driver
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Auto-generate schema file from TypeScript definitions
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      // Sort schema alphabetically for consistency
      sortSchema: true,
      // Enable GraphQL Playground in development
      playground: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

---

## Defining Object Types

Object types represent the shape of data returned by your API. In NestJS, you define them as classes with decorators that specify GraphQL field types.

```typescript
// src/users/models/user.model.ts
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

// Define an enum and register it with GraphQL
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

// Register the enum so GraphQL knows about it
registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'Available user roles in the system',
});

// The ObjectType decorator marks this class as a GraphQL type
@ObjectType({ description: 'User account in the system' })
export class User {
  // ID field type for unique identifiers
  @Field(() => ID, { description: 'Unique user identifier' })
  id: string;

  // String fields are inferred automatically
  @Field({ description: 'User email address' })
  email: string;

  @Field({ description: 'Display name' })
  name: string;

  // Use the enum type we registered above
  @Field(() => UserRole, { description: 'User permission level' })
  role: UserRole;

  // Nullable fields require explicit configuration
  @Field({ nullable: true, description: 'Profile biography' })
  bio?: string;

  // Date fields need explicit type specification
  @Field(() => Date, { description: 'Account creation timestamp' })
  createdAt: Date;

  // Fields can be marked as non-nullable (default) or nullable
  @Field(() => Date, { nullable: true })
  lastLoginAt?: Date;
}
```

For nested types, create separate model classes and reference them in your parent type.

```typescript
// src/users/models/post.model.ts
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { User } from './user.model';

@ObjectType({ description: 'Blog post created by a user' })
export class Post {
  @Field(() => ID)
  id: string;

  @Field({ description: 'Post title' })
  title: string;

  @Field({ description: 'Post content body' })
  content: string;

  // Reference another ObjectType for nested data
  @Field(() => User, { description: 'Post author' })
  author: User;

  // Int type for numeric fields
  @Field(() => Int, { defaultValue: 0 })
  viewCount: number;

  @Field(() => [String], { description: 'Post tags' })
  tags: string[];

  @Field()
  published: boolean;
}
```

---

## Creating Input Types

Input types define the shape of data sent to mutations. They use the InputType decorator and follow similar patterns to object types.

```typescript
// src/users/dto/create-user.input.ts
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../models/user.model';

// InputType decorator for mutation arguments
@InputType({ description: 'Data required to create a new user' })
export class CreateUserInput {
  // Combine GraphQL decorators with class-validator for validation
  @Field({ description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @Field({ description: 'User display name' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @Field({ description: 'Account password' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  // Optional fields with default values
  @Field(() => UserRole, {
    defaultValue: UserRole.USER,
    description: 'User role assignment'
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @Field({ nullable: true, description: 'Optional profile bio' })
  @IsOptional()
  bio?: string;
}
```

For update operations, create a separate input type with all fields optional.

```typescript
// src/users/dto/update-user.input.ts
import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';

// PartialType makes all fields from CreateUserInput optional
@InputType({ description: 'Data for updating an existing user' })
export class UpdateUserInput extends PartialType(CreateUserInput) {
  // ID is required to identify which user to update
  @Field(() => ID, { description: 'User ID to update' })
  id: string;
}
```

---

## Building Resolvers

Resolvers handle the actual logic for queries and mutations. NestJS provides decorators to define resolver methods that map to your GraphQL schema.

```typescript
// src/users/users.resolver.ts
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
  Int
} from '@nestjs/graphql';
import { User, UserRole } from './models/user.model';
import { Post } from './models/post.model';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersService } from './users.service';
import { PostsService } from '../posts/posts.service';

// Resolver decorator specifies which ObjectType this resolver handles
@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
  ) {}

  // Query decorator defines a read operation
  @Query(() => [User], {
    name: 'users',
    description: 'Retrieve all users'
  })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  // Query with arguments for filtering
  @Query(() => User, {
    name: 'user',
    description: 'Find a user by ID',
    nullable: true
  })
  async findOne(
    @Args('id', { type: () => ID, description: 'User ID to find' }) id: string,
  ): Promise<User | null> {
    return this.usersService.findById(id);
  }

  // Query with multiple filter arguments
  @Query(() => [User], { name: 'usersByRole' })
  async findByRole(
    @Args('role', { type: () => UserRole }) role: UserRole,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<User[]> {
    return this.usersService.findByRole(role, limit);
  }

  // Mutation for creating data
  @Mutation(() => User, { description: 'Create a new user account' })
  async createUser(
    @Args('input', { description: 'User creation data' }) input: CreateUserInput,
  ): Promise<User> {
    return this.usersService.create(input);
  }

  // Mutation for updating data
  @Mutation(() => User, { description: 'Update an existing user' })
  async updateUser(
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    return this.usersService.update(input.id, input);
  }

  // Mutation for deleting data
  @Mutation(() => Boolean, { description: 'Delete a user by ID' })
  async deleteUser(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.usersService.delete(id);
  }

  // ResolveField handles nested data fetching
  // This runs when the 'posts' field is requested on a User
  @ResolveField(() => [Post], { description: 'Posts authored by this user' })
  async posts(@Parent() user: User): Promise<Post[]> {
    // Parent decorator gives access to the parent User object
    return this.postsService.findByAuthorId(user.id);
  }

  // Computed field that does not exist in the database
  @ResolveField(() => Int, { description: 'Total posts by this user' })
  async postCount(@Parent() user: User): Promise<number> {
    const posts = await this.postsService.findByAuthorId(user.id);
    return posts.length;
  }
}
```

---

## Implementing the Service Layer

The service layer contains the business logic and data access code. Keep your resolvers thin by delegating work to services.

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole } from './models/user.model';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  // In-memory storage for demonstration purposes
  // Replace with actual database calls in production
  private users: User[] = [];

  async findAll(): Promise<User[]> {
    return this.users;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async findByRole(role: UserRole, limit: number): Promise<User[]> {
    return this.users
      .filter(user => user.role === role)
      .slice(0, limit);
  }

  async create(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email: input.email,
      name: input.name,
      role: input.role || UserRole.USER,
      bio: input.bio,
      createdAt: new Date(),
      lastLoginAt: null,
    };

    this.users.push(user);
    return user;
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const index = this.users.findIndex(user => user.id === id);

    if (index === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Merge existing user with updates
    const updated = {
      ...this.users[index],
      ...input,
      id, // Ensure ID cannot be changed
    };

    this.users[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex(user => user.id === id);

    if (index === -1) {
      return false;
    }

    this.users.splice(index, 1);
    return true;
  }
}
```

---

## Adding Validation

NestJS integrates with class-validator to provide automatic input validation. Enable the validation pipe globally to validate all incoming data.

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      // Automatically transform payloads to DTO instances
      transform: true,
      // Strip properties that are not in the DTO
      whitelist: true,
      // Throw error if unknown properties are present
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(3000);
  console.log('GraphQL API running at http://localhost:3000/graphql');
}
bootstrap();
```

---

## Error Handling

Create custom exceptions that translate to meaningful GraphQL errors.

```typescript
// src/common/exceptions/graphql-exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { GraphQLError } from 'graphql';

export class UserNotFoundError extends GraphQLError {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`, {
      extensions: {
        code: 'USER_NOT_FOUND',
        userId,
      },
    });
  }
}

export class DuplicateEmailError extends GraphQLError {
  constructor(email: string) {
    super(`A user with email ${email} already exists`, {
      extensions: {
        code: 'DUPLICATE_EMAIL',
        email,
      },
    });
  }
}
```

---

## Module Organization

Organize your GraphQL components into feature modules for maintainability.

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PostsModule],
  providers: [UsersResolver, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## Testing Your API

Run the application and test your GraphQL API using the built-in Playground.

```bash
npm run start:dev
```

Navigate to `http://localhost:3000/graphql` and try these queries:

```graphql
# Create a new user
mutation {
  createUser(input: {
    email: "alice@example.com"
    name: "Alice"
    password: "securepassword123"
    role: ADMIN
  }) {
    id
    email
    name
    role
    createdAt
  }
}

# Query all users with their post counts
query {
  users {
    id
    name
    email
    role
    postCount
    posts {
      id
      title
    }
  }
}

# Find a specific user
query {
  user(id: "user-uuid-here") {
    id
    name
    bio
  }
}
```

---

## Best Practices

When building type-safe GraphQL APIs with NestJS, keep these practices in mind:

1. **Use code-first approach** for maximum type safety between TypeScript and GraphQL
2. **Validate inputs** using class-validator decorators on input types
3. **Keep resolvers thin** by moving business logic to services
4. **Use ResolveField** for computed or nested data to avoid N+1 queries
5. **Register enums** with registerEnumType so GraphQL understands them
6. **Add descriptions** to types and fields for self-documenting APIs

---

## Conclusion

NestJS provides a powerful foundation for building type-safe GraphQL APIs. The code-first approach eliminates the gap between your TypeScript code and GraphQL schema, catching type errors at compile time rather than runtime.

By combining decorators, validation, and proper module organization, you can build maintainable GraphQL services that scale with your application. The integration with class-validator ensures that incoming data meets your requirements before reaching your business logic.

Start with simple types and resolvers, then expand to more complex patterns like nested resolvers and custom scalars as your API grows.

---

*Building observable GraphQL APIs? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your NestJS applications, including request tracing, error tracking, and performance metrics.*
