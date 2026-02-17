# How to Build a GraphQL API with NestJS and Deploy to Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, NestJS, Azure Container Apps, TypeScript, Node.js, API, Cloud

Description: Build a production-ready GraphQL API with NestJS using the code-first approach and deploy it to Azure Container Apps with autoscaling.

---

NestJS is one of the best frameworks for building structured, maintainable Node.js applications. Its module-based architecture, dependency injection, and first-class TypeScript support make it a natural fit for building GraphQL APIs. When you combine it with Azure Container Apps for hosting, you get a fully managed serverless container platform that scales automatically.

In this post, we will build a GraphQL API using NestJS's code-first approach, add pagination and error handling, containerize it, and deploy it to Azure Container Apps.

## Why NestJS for GraphQL?

NestJS offers two approaches to building GraphQL APIs: schema-first and code-first. The code-first approach is particularly nice because you define your GraphQL schema using TypeScript decorators and classes. The schema is generated automatically from your code, which means you never have to maintain a separate `.graphql` file. Your TypeScript types serve as the single source of truth.

## Project Setup

```bash
# Create a new NestJS project
npx @nestjs/cli new graphql-api
cd graphql-api

# Install GraphQL dependencies
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql

# Install additional utilities
npm install class-validator class-transformer
```

## Define the GraphQL Module

First, configure the GraphQL module in the root app module.

```typescript
// src/app.module.ts
// Root module that imports the GraphQL configuration
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { RecipeModule } from './recipe/recipe.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true, // Auto-generate schema from code
      playground: true,     // Enable GraphQL Playground
      introspection: true,  // Allow schema introspection
      sortSchema: true,     // Sort the generated schema alphabetically
    }),
    RecipeModule,
  ],
})
export class AppModule {}
```

## Create the Object Types

Define your GraphQL types using TypeScript classes with decorators.

```typescript
// src/recipe/models/recipe.model.ts
// GraphQL object type representing a recipe
import { Field, ID, ObjectType, Float, Int } from '@nestjs/graphql';

@ObjectType({ description: 'A cooking recipe' })
export class Recipe {
  @Field(() => ID)
  id: string;

  @Field({ description: 'Name of the recipe' })
  title: string;

  @Field({ nullable: true, description: 'Detailed cooking instructions' })
  description?: string;

  @Field(() => [String], { description: 'List of ingredients' })
  ingredients: string[];

  @Field(() => Int, { description: 'Cooking time in minutes' })
  cookingTime: number;

  @Field(() => Float, { description: 'Average user rating' })
  rating: number;

  @Field({ description: 'When the recipe was created' })
  createdAt: Date;
}
```

## Create Input Types

Separate input types for creating and updating recipes.

```typescript
// src/recipe/dto/create-recipe.input.ts
// Input type for creating a new recipe
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, Min, Max, ArrayMinSize } from 'class-validator';

@InputType()
export class CreateRecipeInput {
  @Field()
  @IsNotEmpty({ message: 'Title cannot be empty' })
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String])
  @ArrayMinSize(1, { message: 'At least one ingredient is required' })
  ingredients: string[];

  @Field(() => Int)
  @Min(1)
  @Max(1440) // 24 hours max
  cookingTime: number;
}
```

```typescript
// src/recipe/dto/update-recipe.input.ts
// Input type for updating an existing recipe
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, Min, Max } from 'class-validator';

@InputType()
export class UpdateRecipeInput {
  @Field({ nullable: true })
  @IsOptional()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  description?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  ingredients?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  @Max(1440)
  cookingTime?: number;
}
```

## Add Pagination

Implement cursor-based pagination for the recipes list.

```typescript
// src/recipe/dto/pagination.args.ts
// Pagination arguments for list queries
import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Min, Max } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 0 })
  @Min(0)
  offset: number = 0;

  @Field(() => Int, { defaultValue: 20 })
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

## Implement the Service

The service contains the business logic.

```typescript
// src/recipe/recipe.service.ts
// Service layer that handles recipe CRUD operations
import { Injectable, NotFoundException } from '@nestjs/common';
import { Recipe } from './models/recipe.model';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { UpdateRecipeInput } from './dto/update-recipe.input';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RecipeService {
  // In-memory store - replace with a real database in production
  private recipes: Map<string, Recipe> = new Map();

  findAll(offset: number, limit: number): Recipe[] {
    const allRecipes = Array.from(this.recipes.values());
    // Sort by creation date descending, then paginate
    return allRecipes
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  findOne(id: string): Recipe {
    const recipe = this.recipes.get(id);
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    return recipe;
  }

  create(input: CreateRecipeInput): Recipe {
    const recipe: Recipe = {
      id: uuidv4(),
      ...input,
      rating: 0,
      createdAt: new Date(),
    };
    this.recipes.set(recipe.id, recipe);
    return recipe;
  }

  update(id: string, input: UpdateRecipeInput): Recipe {
    const existing = this.findOne(id);
    const updated = { ...existing, ...input };
    this.recipes.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    if (!this.recipes.has(id)) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    return this.recipes.delete(id);
  }
}
```

## Build the Resolver

The resolver connects GraphQL operations to the service.

```typescript
// src/recipe/recipe.resolver.ts
// GraphQL resolver that maps queries and mutations to service methods
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Recipe } from './models/recipe.model';
import { RecipeService } from './recipe.service';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { UpdateRecipeInput } from './dto/update-recipe.input';
import { PaginationArgs } from './dto/pagination.args';

@Resolver(() => Recipe)
export class RecipeResolver {
  constructor(private readonly recipeService: RecipeService) {}

  @Query(() => [Recipe], { description: 'Get a paginated list of recipes' })
  recipes(@Args() { offset, limit }: PaginationArgs): Recipe[] {
    return this.recipeService.findAll(offset, limit);
  }

  @Query(() => Recipe, { description: 'Get a single recipe by ID' })
  recipe(@Args('id', { type: () => ID }) id: string): Recipe {
    return this.recipeService.findOne(id);
  }

  @Mutation(() => Recipe, { description: 'Create a new recipe' })
  createRecipe(@Args('input') input: CreateRecipeInput): Recipe {
    return this.recipeService.create(input);
  }

  @Mutation(() => Recipe, { description: 'Update an existing recipe' })
  updateRecipe(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateRecipeInput,
  ): Recipe {
    return this.recipeService.update(id, input);
  }

  @Mutation(() => Boolean, { description: 'Delete a recipe by ID' })
  removeRecipe(@Args('id', { type: () => ID }) id: string): boolean {
    return this.recipeService.remove(id);
  }
}
```

## Create the Module

```typescript
// src/recipe/recipe.module.ts
// Feature module that bundles the recipe resolver and service
import { Module } from '@nestjs/common';
import { RecipeResolver } from './recipe.resolver';
import { RecipeService } from './recipe.service';

@Module({
  providers: [RecipeResolver, RecipeService],
})
export class RecipeModule {}
```

## Containerize the Application

```dockerfile
# Dockerfile for the NestJS GraphQL API
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

## Deploy to Azure Container Apps

```bash
# Create a Container Apps environment
az containerapp env create \
  --name recipe-env \
  --resource-group recipe-rg \
  --location eastus

# Build and push the image
az acr build --registry myrecipeacr --image recipe-graphql:v1 .

# Deploy the container app
az containerapp create \
  --name recipe-graphql-api \
  --resource-group recipe-rg \
  --environment recipe-env \
  --image myrecipeacr.azurecr.io/recipe-graphql:v1 \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi

# Configure autoscaling based on HTTP requests
az containerapp update \
  --name recipe-graphql-api \
  --resource-group recipe-rg \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

## Testing the Deployed API

Once deployed, you can access the GraphQL playground at the Container App's URL.

```graphql
mutation {
  createRecipe(input: {
    title: "Pasta Carbonara"
    description: "Classic Italian pasta dish"
    ingredients: ["spaghetti", "eggs", "pecorino", "guanciale", "black pepper"]
    cookingTime: 25
  }) {
    id
    title
    createdAt
  }
}
```

## Summary

NestJS and GraphQL are a powerful combination. The code-first approach eliminates schema drift, TypeScript decorators keep the code clean, and the module system keeps things organized as the project grows. Azure Container Apps provides a managed hosting platform with built-in autoscaling, so you do not need to manage Kubernetes directly. The autoscaling rules we configured mean the API scales up during traffic spikes and scales back down during quiet periods, keeping costs in check. This architecture works well for medium to large GraphQL APIs that need the structure and maintainability that NestJS provides.
