# How to Use TypeScript with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, TypeScript, JavaScript, Backend, Development

Description: Set up TypeScript in Node.js projects with proper configuration, type definitions, Express integration, and build workflows for production deployment.

---

TypeScript adds static typing to JavaScript, catching bugs at compile time rather than runtime. For Node.js applications, this means fewer production errors and better tooling support. Here is how to set it up properly.

## Basic Setup

Initialize a new project with TypeScript:

```bash
mkdir my-project && cd my-project
npm init -y
npm install typescript ts-node @types/node --save-dev
npx tsc --init
```

This creates a `tsconfig.json` file. Modify it for Node.js:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Key options explained:

| Option | Purpose |
|--------|---------|
| target | JavaScript version to compile to |
| module | Module system (commonjs for Node.js) |
| outDir | Where compiled JS files go |
| rootDir | Where TypeScript source files are |
| strict | Enable all strict type checking |
| esModuleInterop | Better CommonJS/ESM compatibility |
| sourceMap | Generate source maps for debugging |

## Project Structure

```
my-project/
  src/
    index.ts
    routes/
      users.ts
    services/
      userService.ts
    types/
      index.ts
  dist/           # Compiled output (git ignored)
  package.json
  tsconfig.json
```

Update package.json scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "dev:watch": "ts-node-dev --respawn src/index.ts"
  }
}
```

Install ts-node-dev for development with auto-reload:

```bash
npm install ts-node-dev --save-dev
```

## Basic TypeScript with Node.js

Create your first TypeScript file:

```typescript
// src/index.ts
import http from 'http';

const PORT: number = parseInt(process.env.PORT || '3000');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello from TypeScript!' }));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## Express with TypeScript

Install Express and its type definitions:

```bash
npm install express
npm install @types/express --save-dev
```

```typescript
// src/index.ts
import express, { Application, Request, Response, NextFunction } from 'express';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic route
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello TypeScript!' });
});

// Route with params
app.get('/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({ userId: id });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## Custom Type Definitions

Define types for your application:

```typescript
// src/types/index.ts

// User interface
export interface User {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
    role: UserRole;
}

// Enum for user roles
export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    GUEST = 'guest'
}

// Type for creating a user (without auto-generated fields)
export type CreateUserDTO = Omit<User, 'id' | 'createdAt'>;

// Type for updating a user (all fields optional)
export type UpdateUserDTO = Partial<CreateUserDTO>;

// API response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
```

Use types in your code:

```typescript
// src/services/userService.ts
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../types';

let users: User[] = [];
let nextId = 1;

export const userService = {
    findAll(): User[] {
        return users;
    },

    findById(id: number): User | undefined {
        return users.find(user => user.id === id);
    },

    create(data: CreateUserDTO): User {
        const user: User = {
            id: nextId++,
            name: data.name,
            email: data.email,
            role: data.role,
            createdAt: new Date()
        };
        users.push(user);
        return user;
    },

    update(id: number, data: UpdateUserDTO): User | undefined {
        const user = this.findById(id);
        if (!user) return undefined;

        if (data.name) user.name = data.name;
        if (data.email) user.email = data.email;
        if (data.role) user.role = data.role;

        return user;
    },

    delete(id: number): boolean {
        const index = users.findIndex(user => user.id === id);
        if (index === -1) return false;
        users.splice(index, 1);
        return true;
    }
};
```

## Extending Express Types

Add custom properties to Request:

```typescript
// src/types/express.d.ts
import { User } from './index';

declare global {
    namespace Express {
        interface Request {
            user?: User;
            requestId?: string;
        }
    }
}

export {};
```

Now you can use `req.user` in your routes:

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../types';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Simulate authentication
    req.user = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.USER,
        createdAt: new Date()
    };
    next();
};

// src/routes/profile.ts
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/profile', authMiddleware, (req: Request, res: Response) => {
    // TypeScript knows req.user exists after auth middleware
    res.json({ user: req.user });
});

export default router;
```

## Generic Response Handler

Create typed response utilities:

```typescript
// src/utils/response.ts
import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export function sendSuccess<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    message?: string
): void {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message
    };
    res.status(statusCode).json(response);
}

export function sendError(
    res: Response,
    error: string,
    statusCode: number = 500
): void {
    const response: ApiResponse<null> = {
        success: false,
        error
    };
    res.status(statusCode).json(response);
}

export function sendPaginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
): void {
    const response: PaginatedResponse<T> = {
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
    res.json(response);
}
```

## Environment Variables

Type your environment variables:

```typescript
// src/config/env.ts
interface EnvConfig {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    LOG_LEVEL: string;
}

function getEnvVar(key: string, required: boolean = true): string {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value || '';
}

export const config: EnvConfig = {
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    PORT: parseInt(getEnvVar('PORT', false) || '3000'),
    DATABASE_URL: getEnvVar('DATABASE_URL'),
    JWT_SECRET: getEnvVar('JWT_SECRET'),
    LOG_LEVEL: getEnvVar('LOG_LEVEL', false) || 'info'
};
```

## Async Route Handler

Create a typed async wrapper:

```typescript
// src/utils/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Usage
import { asyncHandler } from '../utils/asyncHandler';

router.get('/users', asyncHandler(async (req, res) => {
    const users = await userService.findAll();
    sendSuccess(res, users);
}));
```

## Database Integration with Types

Example with a typed database layer:

```typescript
// src/repositories/userRepository.ts
import { User, CreateUserDTO, UpdateUserDTO } from '../types';

// Interface for the repository
interface IUserRepository {
    findAll(): Promise<User[]>;
    findById(id: number): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(data: CreateUserDTO): Promise<User>;
    update(id: number, data: UpdateUserDTO): Promise<User | null>;
    delete(id: number): Promise<boolean>;
}

// In-memory implementation
export class InMemoryUserRepository implements IUserRepository {
    private users: User[] = [];
    private nextId = 1;

    async findAll(): Promise<User[]> {
        return this.users;
    }

    async findById(id: number): Promise<User | null> {
        return this.users.find(u => u.id === id) || null;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.users.find(u => u.email === email) || null;
    }

    async create(data: CreateUserDTO): Promise<User> {
        const user: User = {
            id: this.nextId++,
            ...data,
            createdAt: new Date()
        };
        this.users.push(user);
        return user;
    }

    async update(id: number, data: UpdateUserDTO): Promise<User | null> {
        const user = await this.findById(id);
        if (!user) return null;
        Object.assign(user, data);
        return user;
    }

    async delete(id: number): Promise<boolean> {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return false;
        this.users.splice(index, 1);
        return true;
    }
}
```

## Build for Production

Compile TypeScript and run:

```bash
# Build
npm run build

# Production start
NODE_ENV=production npm start
```

Your Dockerfile can use multi-stage builds:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

## Summary

TypeScript transforms Node.js development by catching errors at compile time and providing excellent IDE support. Set up strict mode, define types for your domain objects, extend Express types when needed, and use typed utilities for common operations. The initial setup takes time, but the payoff in code quality and maintainability is worth it.
