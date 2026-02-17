# How to Build a Full-Stack Angular Application with Azure Cosmos DB and Azure Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Angular, Azure, Cosmos DB, Azure Functions, Full-Stack, TypeScript, Serverless

Description: Build a full-stack Angular application backed by Azure Cosmos DB and Azure Functions for a scalable serverless architecture.

---

Angular, Azure Functions, and Cosmos DB form a stack where each technology handles what it is best at. Angular provides a structured frontend framework with dependency injection, observables, and a powerful CLI. Azure Functions gives you serverless compute that scales automatically. Cosmos DB provides a globally distributed database with guaranteed low latency. Together, they let you build applications that can grow from a handful of users to millions without redesigning the architecture.

This guide builds a recipe management application using all three technologies.

## Prerequisites

- Node.js 18 or later
- Angular CLI (`npm i -g @angular/cli`)
- Azure Functions Core Tools v4
- Azure CLI installed and authenticated
- An Azure account

## Setting Up Cosmos DB

```bash
# Create resources
az group create --name recipe-app-rg --location eastus

# Create Cosmos DB account
az cosmosdb create \
  --name recipe-cosmos-db \
  --resource-group recipe-app-rg \
  --locations regionName=eastus failoverPriority=0 \
  --default-consistency-level Session

# Create the database and container
az cosmosdb sql database create \
  --account-name recipe-cosmos-db \
  --resource-group recipe-app-rg \
  --name RecipeDB

az cosmosdb sql container create \
  --account-name recipe-cosmos-db \
  --resource-group recipe-app-rg \
  --database-name RecipeDB \
  --name recipes \
  --partition-key-path "/cuisine" \
  --throughput 400
```

## Project Structure

```
recipe-app/
  client/       # Angular frontend
  api/          # Azure Functions backend
```

```bash
# Create the Angular frontend
ng new client --routing --style=scss --skip-git
# Create the Azure Functions API
mkdir api && cd api && func init --typescript
```

## Building the Azure Functions API

Install the Cosmos DB SDK in the functions project:

```bash
cd api && npm install @azure/cosmos dotenv
```

Create the database configuration:

```typescript
// api/src/cosmos.ts - Cosmos DB client configuration
import { CosmosClient, Container } from '@azure/cosmos';

// Initialize the Cosmos client with connection settings
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const database = client.database('RecipeDB');
const recipesContainer: Container = database.container('recipes');

export { recipesContainer };
```

Build the API functions:

```typescript
// api/src/functions/recipes.ts - Recipe CRUD API
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { recipesContainer } from '../cosmos';
import { SqlQuerySpec } from '@azure/cosmos';

// Define the recipe interface
interface Recipe {
  id: string;
  title: string;
  cuisine: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

// GET /api/recipes - List recipes with optional filtering
app.http('getRecipes', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'recipes',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const cuisine = request.query.get('cuisine');
    const difficulty = request.query.get('difficulty');
    const search = request.query.get('search');

    // Build the query dynamically
    let queryText = 'SELECT * FROM c WHERE 1=1';
    const parameters: Array<{ name: string; value: string }> = [];

    if (cuisine) {
      queryText += ' AND c.cuisine = @cuisine';
      parameters.push({ name: '@cuisine', value: cuisine });
    }
    if (difficulty) {
      queryText += ' AND c.difficulty = @difficulty';
      parameters.push({ name: '@difficulty', value: difficulty });
    }
    if (search) {
      queryText += ' AND CONTAINS(LOWER(c.title), LOWER(@search))';
      parameters.push({ name: '@search', value: search });
    }

    queryText += ' ORDER BY c.createdAt DESC';

    const querySpec: SqlQuerySpec = { query: queryText, parameters };

    const { resources } = await recipesContainer.items
      .query<Recipe>(querySpec, { enableCrossPartitionQuery: true })
      .fetchAll();

    return { jsonBody: resources };
  },
});

// GET /api/recipes/:id - Get a single recipe
app.http('getRecipe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'recipes/{id}',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const id = request.params.id;
    const cuisine = request.query.get('cuisine');

    if (!cuisine) {
      // Cross-partition read if cuisine is not provided
      const querySpec: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }],
      };
      const { resources } = await recipesContainer.items
        .query<Recipe>(querySpec, { enableCrossPartitionQuery: true })
        .fetchAll();

      if (resources.length === 0) {
        return { status: 404, jsonBody: { error: 'Recipe not found' } };
      }
      return { jsonBody: resources[0] };
    }

    // Point read with partition key for optimal performance
    const { resource } = await recipesContainer.item(id!, cuisine).read<Recipe>();
    if (!resource) {
      return { status: 404, jsonBody: { error: 'Recipe not found' } };
    }
    return { jsonBody: resource };
  },
});

// POST /api/recipes - Create a new recipe
app.http('createRecipe', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'recipes',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await request.json()) as Partial<Recipe>;

    if (!body.title || !body.cuisine || !body.ingredients || !body.instructions) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields' },
      };
    }

    const recipe: Recipe = {
      id: Date.now().toString(),
      title: body.title,
      cuisine: body.cuisine,
      description: body.description || '',
      ingredients: body.ingredients,
      instructions: body.instructions,
      prepTime: body.prepTime || 0,
      cookTime: body.cookTime || 0,
      servings: body.servings || 4,
      difficulty: body.difficulty || 'medium',
      createdAt: new Date().toISOString(),
    };

    const { resource } = await recipesContainer.items.create(recipe);
    return { status: 201, jsonBody: resource };
  },
});

// DELETE /api/recipes/:id - Delete a recipe
app.http('deleteRecipe', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'recipes/{id}',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const id = request.params.id;
    const cuisine = request.query.get('cuisine');

    if (!cuisine) {
      return { status: 400, jsonBody: { error: 'Cuisine parameter required for deletion' } };
    }

    await recipesContainer.item(id!, cuisine).delete();
    return { status: 204 };
  },
});

// GET /api/recipes/cuisines - Get distinct cuisines
app.http('getCuisines', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'cuisines',
  handler: async (): Promise<HttpResponseInit> => {
    const { resources } = await recipesContainer.items
      .query<{ cuisine: string }>({
        query: 'SELECT DISTINCT VALUE c.cuisine FROM c',
      })
      .fetchAll();

    return { jsonBody: resources };
  },
});
```

## Building the Angular Frontend

Create the recipe service:

```typescript
// client/src/app/services/recipe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Recipe {
  id: string;
  title: string;
  cuisine: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private apiUrl = '/api/recipes';

  constructor(private http: HttpClient) {}

  // Get all recipes with optional filters
  getRecipes(filters?: { cuisine?: string; difficulty?: string; search?: string }): Observable<Recipe[]> {
    let params = new HttpParams();
    if (filters?.cuisine) params = params.set('cuisine', filters.cuisine);
    if (filters?.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters?.search) params = params.set('search', filters.search);

    return this.http.get<Recipe[]>(this.apiUrl, { params });
  }

  // Get a single recipe by ID
  getRecipe(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.apiUrl}/${id}`);
  }

  // Create a new recipe
  createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>): Observable<Recipe> {
    return this.http.post<Recipe>(this.apiUrl, recipe);
  }

  // Delete a recipe
  deleteRecipe(id: string, cuisine: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}?cuisine=${cuisine}`);
  }

  // Get available cuisines
  getCuisines(): Observable<string[]> {
    return this.http.get<string[]>('/api/cuisines');
  }
}
```

Build the recipe list component:

```typescript
// client/src/app/components/recipe-list/recipe-list.component.ts
import { Component, OnInit } from '@angular/core';
import { RecipeService, Recipe } from '../../services/recipe.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-recipe-list',
  template: `
    <div class="recipe-list">
      <h1>Recipe Book</h1>

      <div class="filters">
        <input type="text" placeholder="Search recipes..." (input)="onSearch($event)" />
        <select (change)="onCuisineFilter($event)">
          <option value="">All Cuisines</option>
          <option *ngFor="let c of cuisines" [value]="c">{{ c }}</option>
        </select>
        <select (change)="onDifficultyFilter($event)">
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div class="recipe-grid">
        <div *ngFor="let recipe of recipes" class="recipe-card">
          <h3>{{ recipe.title }}</h3>
          <p class="cuisine">{{ recipe.cuisine }}</p>
          <p>{{ recipe.description }}</p>
          <div class="meta">
            <span>Prep: {{ recipe.prepTime }}min</span>
            <span>Cook: {{ recipe.cookTime }}min</span>
            <span>Serves: {{ recipe.servings }}</span>
            <span class="difficulty" [ngClass]="recipe.difficulty">{{ recipe.difficulty }}</span>
          </div>
          <div class="ingredients">
            <strong>Ingredients ({{ recipe.ingredients.length }}):</strong>
            <ul>
              <li *ngFor="let ing of recipe.ingredients.slice(0, 3)">{{ ing }}</li>
              <li *ngIf="recipe.ingredients.length > 3">
                and {{ recipe.ingredients.length - 3 }} more...
              </li>
            </ul>
          </div>
          <button class="delete-btn" (click)="deleteRecipe(recipe)">Delete</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">Loading recipes...</div>
      <div *ngIf="!loading && recipes.length === 0" class="empty">
        No recipes found. Try adjusting your filters.
      </div>
    </div>
  `,
})
export class RecipeListComponent implements OnInit {
  recipes: Recipe[] = [];
  cuisines: string[] = [];
  loading = true;

  private searchTerms = new Subject<string>();
  private currentFilters = { cuisine: '', difficulty: '', search: '' };

  constructor(private recipeService: RecipeService) {}

  ngOnInit() {
    this.loadRecipes();
    this.loadCuisines();

    // Debounced search
    this.searchTerms.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      this.currentFilters.search = term;
      this.loadRecipes();
    });
  }

  loadRecipes() {
    this.loading = true;
    this.recipeService.getRecipes(this.currentFilters).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load recipes:', err);
        this.loading = false;
      },
    });
  }

  loadCuisines() {
    this.recipeService.getCuisines().subscribe({
      next: (cuisines) => (this.cuisines = cuisines),
    });
  }

  onSearch(event: Event) {
    this.searchTerms.next((event.target as HTMLInputElement).value);
  }

  onCuisineFilter(event: Event) {
    this.currentFilters.cuisine = (event.target as HTMLSelectElement).value;
    this.loadRecipes();
  }

  onDifficultyFilter(event: Event) {
    this.currentFilters.difficulty = (event.target as HTMLSelectElement).value;
    this.loadRecipes();
  }

  deleteRecipe(recipe: Recipe) {
    this.recipeService.deleteRecipe(recipe.id, recipe.cuisine).subscribe({
      next: () => {
        this.recipes = this.recipes.filter((r) => r.id !== recipe.id);
      },
    });
  }
}
```

## Deployment

Deploy both parts to Azure:

```bash
# Deploy Azure Functions
cd api
func azure functionapp publish recipe-api-functions

# Build and deploy Angular
cd client
ng build --configuration production
# Deploy the dist output to Azure Static Web Apps or Blob Storage
```

## Wrapping Up

This stack gives you a full-stack application with clear separation of concerns. Angular handles the UI with its structured component model and RxJS-based data flow. Azure Functions handles business logic and data access without the overhead of managing servers. Cosmos DB stores your data with guaranteed low latency and global distribution when you need it. The combination scales from development to production without major architectural changes, and the serverless backend means you only pay for the compute time you actually use.
