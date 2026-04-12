# How to Use MongoDB with Blitz.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Blitz.js, Full-Stack

Description: Connect MongoDB to a Blitz.js application using Prisma's MongoDB connector, defining models, queries, and mutations for a type-safe full-stack app.

---

## Blitz.js and MongoDB

Blitz.js is a full-stack React framework built on Next.js that uses Prisma as its database layer. Prisma's MongoDB connector lets you use MongoDB with full type safety and Blitz's query/mutation pattern, giving you a Zero-API approach where server functions are called directly from React components.

## Project Setup

```bash
npx blitz new my-app
cd my-app
```

Update `.env`:

```text
DATABASE_URL="mongodb://localhost:27017/blitzapp?directConnection=true"
```

## Prisma Schema

Edit `db/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model Task {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  title       String
  description String?
  completed   Boolean  @default(false)
  priority    Int      @default(0)
  userId      String   @db.ObjectId
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model User {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  email     String    @unique
  name      String?
  tasks     Task[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

```bash
npx blitz prisma db push
```

## Creating Queries

Blitz queries are server functions called from the client. Create `src/tasks/queries/getTasks.ts`:

```typescript
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetTasks = z.object({
  userId: z.string(),
  completed: z.boolean().optional(),
})

export default resolver.pipe(
  resolver.zod(GetTasks),
  resolver.authorize(),
  async ({ userId, completed }) => {
    const tasks = await db.task.findMany({
      where: {
        userId,
        ...(completed !== undefined && { completed }),
      },
      orderBy: [
        { completed: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    return tasks
  }
)
```

## Creating Mutations

Create `src/tasks/mutations/createTask.ts`:

```typescript
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const CreateTask = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(5).default(0),
})

export default resolver.pipe(
  resolver.zod(CreateTask),
  resolver.authorize(),
  async (input, ctx) => {
    return db.task.create({
      data: {
        ...input,
        userId: ctx.session.userId,
      },
    })
  }
)
```

## Using in a React Component

```typescript
import { useQuery, useMutation } from "@blitzjs/rpc"
import getTasks from "src/tasks/queries/getTasks"
import createTask from "src/tasks/mutations/createTask"

export default function TaskList({ userId }: { userId: string }) {
  const [tasks] = useQuery(getTasks, { userId })
  const [createTaskMutation] = useMutation(createTask)

  const handleCreate = async () => {
    await createTaskMutation({
      title: "New task",
      priority: 1,
    })
  }

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  )
}
```

## Summary

Blitz.js with MongoDB uses Prisma as the abstraction layer, giving you type-safe queries and mutations that work directly with MongoDB's document model. Define your schema with MongoDB-specific ObjectId annotations, use Blitz's resolver pipeline for validation and authorization, and call server functions directly from React components without writing REST or GraphQL endpoints. This tight integration makes Blitz a productive choice for MongoDB-backed full-stack applications.
