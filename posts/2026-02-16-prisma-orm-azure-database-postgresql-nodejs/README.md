# How to Use Prisma ORM with Azure Database for PostgreSQL in a Node.js Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prisma, Azure, PostgreSQL, Node.js, ORM, Database, TypeScript

Description: Learn how to set up and use Prisma ORM with Azure Database for PostgreSQL in a Node.js application for type-safe database access.

---

If you have spent any real time building Node.js applications backed by relational databases, you know that writing raw SQL quickly becomes tedious. ORMs help, but many of them come with their own headaches - bloated APIs, loose typing, and migrations that feel like black magic. Prisma takes a different approach. It gives you a declarative schema, auto-generated types, and a query client that actually feels good to use. Pair it with Azure Database for PostgreSQL and you get a managed, scalable database that you do not have to babysit.

This post walks through the full setup: provisioning the Azure database, configuring Prisma, defining a schema, running migrations, and writing queries in a Node.js application.

## Prerequisites

Before you start, make sure you have the following ready:

- An Azure account with an active subscription
- Node.js 18 or later installed on your machine
- The Azure CLI installed and authenticated
- Basic familiarity with TypeScript and PostgreSQL

## Provisioning Azure Database for PostgreSQL

Azure offers a flexible server option for PostgreSQL that gives you control over configuration without the overhead of managing infrastructure. You can provision one through the Azure portal, but the CLI is faster.

Here is how to create a resource group and a PostgreSQL flexible server:

```bash
# Create a resource group in East US
az group create --name prisma-demo-rg --location eastus

# Create a PostgreSQL flexible server with basic tier
az postgres flexible-server create \
  --resource-group prisma-demo-rg \
  --name prisma-pg-server \
  --location eastus \
  --admin-user adminuser \
  --admin-password YourSecurePassword123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15
```

After the server is created, you need to allow your local IP through the firewall:

```bash
# Allow your current IP address to connect
az postgres flexible-server firewall-rule create \
  --resource-group prisma-demo-rg \
  --name prisma-pg-server \
  --rule-name allow-local \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

For production, you would restrict that range to specific IPs or use a virtual network. The wide-open range here is strictly for development.

## Setting Up the Node.js Project

Create a new project and install the dependencies:

```bash
# Initialize the project and install Prisma
mkdir prisma-azure-demo && cd prisma-azure-demo
npm init -y
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

This creates a `prisma` directory with a `schema.prisma` file and a `.env` file. Open the `.env` file and set your connection string:

```env
# Connection string for Azure PostgreSQL flexible server
DATABASE_URL="postgresql://adminuser:YourSecurePassword123!@prisma-pg-server.postgres.database.azure.com:5432/prisma_demo?sslmode=require"
```

The `sslmode=require` part is important. Azure enforces SSL connections by default, and Prisma respects this parameter.

## Defining the Prisma Schema

Open `prisma/schema.prisma` and define your data model. Here is a practical example for a project management application:

```prisma
// Prisma schema for a project management app
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Users who own and participate in projects
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  role      Role      @default(MEMBER)
  projects  Project[] @relation("ProjectOwner")
  tasks     Task[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

// Projects that contain tasks
model Project {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  status      ProjectStatus @default(ACTIVE)
  owner       User      @relation("ProjectOwner", fields: [ownerId], references: [id])
  ownerId     Int
  tasks       Task[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Individual tasks within a project
model Task {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  priority    Priority  @default(MEDIUM)
  completed   Boolean   @default(false)
  project     Project   @relation(fields: [projectId], references: [id])
  projectId   Int
  assignee    User?     @relation(fields: [assigneeId], references: [id])
  assigneeId  Int?
  dueDate     DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Enums for type safety
enum Role {
  ADMIN
  MEMBER
  VIEWER
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
  COMPLETED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

Prisma schemas are readable. Each model maps to a table, and the relations are explicit. The enums become actual PostgreSQL enum types in the database.

## Running Migrations

With the schema defined, generate and run the migration:

```bash
# Create and apply the migration
npx prisma migrate dev --name init
```

This command does three things: it generates the SQL migration files, applies them to your Azure PostgreSQL database, and regenerates the Prisma Client. You can inspect the generated SQL in the `prisma/migrations` directory to see exactly what Prisma is doing.

## Writing Queries

Create an `index.ts` file and start writing queries. Here is a complete example that demonstrates common operations:

```typescript
// index.ts - Main application file demonstrating Prisma queries
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // Log queries in development for debugging
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  // Create a user
  const user = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      role: 'ADMIN',
    },
  });
  console.log('Created user:', user);

  // Create a project with nested task creation
  const project = await prisma.project.create({
    data: {
      title: 'Website Redesign',
      description: 'Complete overhaul of the marketing site',
      ownerId: user.id,
      tasks: {
        create: [
          {
            title: 'Design mockups',
            priority: 'HIGH',
            assigneeId: user.id,
            dueDate: new Date('2026-03-15'),
          },
          {
            title: 'Implement header component',
            priority: 'MEDIUM',
            assigneeId: user.id,
          },
          {
            title: 'Write content for landing page',
            priority: 'LOW',
          },
        ],
      },
    },
    // Include related records in the response
    include: {
      tasks: true,
      owner: true,
    },
  });
  console.log('Created project with tasks:', JSON.stringify(project, null, 2));

  // Query with filtering and sorting
  const highPriorityTasks = await prisma.task.findMany({
    where: {
      priority: 'HIGH',
      completed: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      project: true,
      assignee: true,
    },
  });
  console.log('High priority tasks:', highPriorityTasks);

  // Update a task
  const updatedTask = await prisma.task.update({
    where: { id: highPriorityTasks[0].id },
    data: { completed: true },
  });
  console.log('Marked task as completed:', updatedTask);

  // Aggregation query
  const taskStats = await prisma.task.groupBy({
    by: ['priority'],
    _count: { id: true },
    _avg: { id: true },
  });
  console.log('Task statistics by priority:', taskStats);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect when the app shuts down
    await prisma.$disconnect();
  });
```

Every query is fully typed. If you try to pass an invalid field name or the wrong type for a value, TypeScript catches it at compile time. This is one of the biggest advantages Prisma has over other ORMs.

## Handling Connection Pooling

Azure PostgreSQL has connection limits that depend on your tier. The Burstable B1ms tier supports around 50 connections. Prisma manages a connection pool internally, but you should configure it to avoid exhausting the limit:

```env
# Limit Prisma to 10 connections in the pool
DATABASE_URL="postgresql://adminuser:YourSecurePassword123!@prisma-pg-server.postgres.database.azure.com:5432/prisma_demo?sslmode=require&connection_limit=10&pool_timeout=20"
```

For serverless environments like Azure Functions, consider using Prisma Accelerate or PgBouncer as a connection pooler sitting between your application and the database.

## Using Prisma Studio for Debugging

Prisma ships with a visual database browser called Prisma Studio. It connects through your existing configuration and lets you view and edit data directly:

```bash
# Launch Prisma Studio in your browser
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can browse tables, filter records, and make quick edits. It is surprisingly useful during development when you want to verify that your mutations are doing what you expect.

## SSL Configuration for Azure

Azure enforces SSL on all PostgreSQL connections. If you run into certificate validation issues, you can download the Azure root certificate and reference it in your connection:

```env
# Explicit SSL certificate path if needed
DATABASE_URL="postgresql://adminuser:YourSecurePassword123!@prisma-pg-server.postgres.database.azure.com:5432/prisma_demo?sslmode=verify-full&sslcert=/path/to/DigiCertGlobalRootCA.crt.pem"
```

Most of the time, `sslmode=require` is sufficient. The `verify-full` mode adds certificate validation, which is recommended for production workloads where you want to confirm you are actually talking to the Azure server and not a man-in-the-middle.

## Performance Tips

A few things that will save you time and headaches when running Prisma against Azure PostgreSQL:

First, use `select` to limit the fields returned when you do not need the entire record. This reduces data transfer between Azure and your application.

```typescript
// Only fetch the fields you actually need
const userEmails = await prisma.user.findMany({
  select: {
    email: true,
    name: true,
  },
});
```

Second, use transactions for operations that need to be atomic:

```typescript
// Atomic transaction for creating a project and its first task
const [project, task] = await prisma.$transaction([
  prisma.project.create({
    data: { title: 'New Project', ownerId: 1 },
  }),
  prisma.task.create({
    data: { title: 'Initial setup', projectId: 1, priority: 'HIGH' },
  }),
]);
```

Third, add indexes to your schema for fields you query frequently:

```prisma
// Add an index on fields used in WHERE clauses
model Task {
  // ... fields
  @@index([priority, completed])
  @@index([projectId])
}
```

## Wrapping Up

Prisma and Azure Database for PostgreSQL make a solid combination for Node.js applications. The type-safe client catches bugs before they reach production, the migration system keeps your schema under version control, and Azure handles the operational burden of running PostgreSQL. The setup takes about thirty minutes from start to finish, and once it is running, you spend your time writing application logic instead of fighting your database layer.

If you want to take this further, look into Prisma middleware for logging and soft deletes, or explore Azure Private Link to put your database connection on a private network. Both are worth the effort for production deployments.
