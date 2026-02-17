# How to Use Prisma with Azure SQL Database in a TypeScript Node.js Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prisma, Azure SQL, TypeScript, Node.js, ORM, Database, Microsoft SQL Server

Description: Set up Prisma ORM with Azure SQL Database in a TypeScript Node.js application for type-safe access to Microsoft SQL Server.

---

Prisma is known for its PostgreSQL and MySQL support, but it works with Microsoft SQL Server too. If your organization runs on Azure SQL Database, you can use Prisma's type-safe client, declarative schema, and migration system against it. The experience is mostly the same as with PostgreSQL, with a few SQL Server-specific differences in schema syntax and data types. This guide walks through the full setup with Azure SQL Database.

## Prerequisites

- Node.js 18 or later
- Azure CLI installed and authenticated
- An Azure account
- Basic TypeScript and SQL Server knowledge

## Provisioning Azure SQL Database

```bash
# Create a resource group
az group create --name prisma-sql-rg --location eastus

# Create a SQL Server
az sql server create \
  --name prisma-sql-server \
  --resource-group prisma-sql-rg \
  --location eastus \
  --admin-user sqladmin \
  --admin-password SecureP@ss123!

# Create a database
az sql db create \
  --name PrismaApp \
  --resource-group prisma-sql-rg \
  --server prisma-sql-server \
  --edition Basic

# Allow your IP through the firewall
az sql server firewall-rule create \
  --resource-group prisma-sql-rg \
  --server prisma-sql-server \
  --name dev-access \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

## Project Setup

```bash
# Create the project
mkdir prisma-azure-sql && cd prisma-azure-sql
npm init -y

# Install dependencies
npm install prisma --save-dev
npm install @prisma/client
npm install express dotenv
npm install --save-dev typescript @types/express @types/node ts-node

# Initialize TypeScript
npx tsc --init

# Initialize Prisma with SQL Server
npx prisma init --datasource-provider sqlserver
```

Configure the `.env` file with your Azure SQL connection string:

```env
# Azure SQL Database connection string for Prisma
DATABASE_URL="sqlserver://prisma-sql-server.database.windows.net:1433;database=PrismaApp;user=sqladmin;password=SecureP@ss123!;encrypt=true;trustServerCertificate=false"
```

Note the Prisma SQL Server connection string format. It uses semicolons to separate parameters, which is different from the PostgreSQL format.

## Defining the Prisma Schema

Open `prisma/schema.prisma` and define your models. SQL Server has some specific type mappings:

```prisma
// prisma/schema.prisma - Schema for Azure SQL Database
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

// Employee directory model
model Employee {
  id          Int       @id @default(autoincrement())
  firstName   String    @db.NVarChar(100)
  lastName    String    @db.NVarChar(100)
  email       String    @unique @db.NVarChar(200)
  jobTitle    String?   @db.NVarChar(150)
  department  Department @relation(fields: [departmentId], references: [id])
  departmentId Int
  hireDate    DateTime  @db.Date
  salary      Decimal   @db.Decimal(12, 2)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  skills      EmployeeSkill[]

  @@index([departmentId])
  @@index([lastName, firstName])
}

// Department model
model Department {
  id          Int        @id @default(autoincrement())
  name        String     @unique @db.NVarChar(100)
  description String?    @db.NVarChar(500)
  managerId   Int?
  budget      Decimal?   @db.Decimal(15, 2)
  employees   Employee[]
  createdAt   DateTime   @default(now())
}

// Skills catalog
model Skill {
  id          Int             @id @default(autoincrement())
  name        String          @unique @db.NVarChar(100)
  category    String          @db.NVarChar(50)
  employees   EmployeeSkill[]

  @@index([category])
}

// Many-to-many relationship between employees and skills
model EmployeeSkill {
  id          Int      @id @default(autoincrement())
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId  Int
  skill       Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  skillId     Int
  proficiency String   @db.NVarChar(20) // beginner, intermediate, expert
  acquiredAt  DateTime @default(now())

  @@unique([employeeId, skillId])
}
```

A few things to notice about the SQL Server schema:

- Use `@db.NVarChar` instead of just `String` when you need Unicode support (which you usually do)
- Use `@db.Decimal(precision, scale)` for monetary values
- Use `@db.Date` for date-only columns
- SQL Server auto-increment uses `@default(autoincrement())` just like PostgreSQL

## Running Migrations

```bash
# Create and apply the initial migration
npx prisma migrate dev --name init

# Check the migration status
npx prisma migrate status
```

Prisma generates SQL Server-specific DDL. You can inspect the generated SQL in `prisma/migrations/`.

## Building the Express API

Create an Express application that uses the Prisma client:

```typescript
// src/index.ts - Express API with Prisma and Azure SQL
import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Prisma with logging in development
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
});

// --- Employee endpoints ---

// List employees with filtering and pagination
app.get('/api/employees', async (req, res) => {
  const {
    department,
    active,
    search,
    page = '1',
    size = '20',
    sortBy = 'lastName',
    sortOrder = 'asc',
  } = req.query;

  // Build the where clause dynamically
  const where: Prisma.EmployeeWhereInput = {
    ...(department && { department: { name: String(department) } }),
    ...(active !== undefined && { isActive: active === 'true' }),
    ...(search && {
      OR: [
        { firstName: { contains: String(search) } },
        { lastName: { contains: String(search) } },
        { email: { contains: String(search) } },
      ],
    }),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        department: { select: { name: true } },
        skills: { include: { skill: true } },
      },
      orderBy: { [String(sortBy)]: sortOrder === 'desc' ? 'desc' : 'asc' },
      skip: (parseInt(String(page)) - 1) * parseInt(String(size)),
      take: parseInt(String(size)),
    }),
    prisma.employee.count({ where }),
  ]);

  res.json({
    data: employees,
    pagination: {
      total,
      page: parseInt(String(page)),
      size: parseInt(String(size)),
      totalPages: Math.ceil(total / parseInt(String(size))),
    },
  });
});

// Create a new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { firstName, lastName, email, jobTitle, departmentId, hireDate, salary, skillIds } = req.body;

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        jobTitle,
        departmentId,
        hireDate: new Date(hireDate),
        salary: new Prisma.Decimal(salary),
        // Create skill associations if provided
        ...(skillIds && {
          skills: {
            create: skillIds.map((skillId: number) => ({
              skillId,
              proficiency: 'beginner',
            })),
          },
        }),
      },
      include: {
        department: true,
        skills: { include: { skill: true } },
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      department: true,
      skills: {
        include: { skill: true },
        orderBy: { skill: { name: 'asc' } },
      },
    },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json(employee);
});

// --- Department endpoints ---

// List departments with employee counts
app.get('/api/departments', async (req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      _count: { select: { employees: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json(departments);
});

// Department statistics
app.get('/api/departments/stats', async (req, res) => {
  const stats = await prisma.department.findMany({
    select: {
      name: true,
      budget: true,
      _count: { select: { employees: true } },
      employees: {
        select: { salary: true },
      },
    },
  });

  const result = stats.map((dept) => ({
    name: dept.name,
    budget: dept.budget,
    employeeCount: dept._count.employees,
    avgSalary:
      dept.employees.length > 0
        ? dept.employees.reduce((sum, e) => sum + Number(e.salary), 0) / dept.employees.length
        : 0,
  }));

  res.json(result);
});

// --- Skills endpoints ---

// Bulk update employee skills using a transaction
app.put('/api/employees/:id/skills', async (req, res) => {
  const employeeId = parseInt(req.params.id);
  const { skills } = req.body; // Array of { skillId, proficiency }

  try {
    // Use a transaction to replace all skills atomically
    const result = await prisma.$transaction(async (tx) => {
      // Remove existing skills
      await tx.employeeSkill.deleteMany({
        where: { employeeId },
      });

      // Add new skills
      await tx.employeeSkill.createMany({
        data: skills.map((s: { skillId: number; proficiency: string }) => ({
          employeeId,
          skillId: s.skillId,
          proficiency: s.proficiency,
        })),
      });

      // Return the updated employee with skills
      return tx.employee.findUnique({
        where: { id: employeeId },
        include: { skills: { include: { skill: true } } },
      });
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update skills' });
  }
});

// Health check
app.get('/api/health', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Clean up on shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

## SQL Server-Specific Features

Prisma supports some SQL Server-specific features through raw queries:

```typescript
// Using raw SQL for SQL Server specific features
// Full-text search (requires a full-text index on the table)
const searchResults = await prisma.$queryRaw`
  SELECT * FROM employees
  WHERE CONTAINS((firstName, lastName), ${searchTerm})
`;

// Common Table Expressions (CTEs) for recursive queries
const hierarchy = await prisma.$queryRaw`
  WITH DeptHierarchy AS (
    SELECT id, name, managerId, 0 AS level
    FROM departments
    WHERE managerId IS NULL
    UNION ALL
    SELECT d.id, d.name, d.managerId, h.level + 1
    FROM departments d
    INNER JOIN DeptHierarchy h ON d.managerId = h.id
  )
  SELECT * FROM DeptHierarchy ORDER BY level, name
`;
```

## Connection Configuration

Azure SQL Database has connection limits based on the tier. Configure Prisma's connection pool accordingly:

```env
# Limit connections for the Basic tier (max 30)
DATABASE_URL="sqlserver://server.database.windows.net:1433;database=PrismaApp;user=sqladmin;password=SecureP@ss123!;encrypt=true;connection_limit=10;pool_timeout=20"
```

## Wrapping Up

Prisma works well with Azure SQL Database once you understand the SQL Server-specific schema syntax. The `@db.NVarChar` and `@db.Decimal` type annotations ensure your columns use the right SQL Server types, and the rest of the Prisma experience - migrations, type-safe queries, relations - works the same as with PostgreSQL. The Express API shown here demonstrates pagination, filtering, transactions, and error handling patterns that apply to any production application. For teams that use Microsoft's database stack but want modern ORM tooling, Prisma with Azure SQL is a practical choice.
