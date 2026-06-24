# How to Use MongoDB with AdonisJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AdonisJS, Node.js

Description: Integrate MongoDB with AdonisJS using the Lucid MongoDB provider or Mongoose, with models, migrations, and query examples for a REST API.

---

## Setting Up AdonisJS with MongoDB

AdonisJS is a full-featured MVC framework for Node.js. While it uses Lucid ORM with SQL databases by default, you can integrate MongoDB using Mongoose directly.

## Using Mongoose with AdonisJS

Install Mongoose in your AdonisJS project:

```bash
npm install mongoose
```

Create a MongoDB service provider at `providers/mongo_provider.ts`:

```typescript
import type { ApplicationService } from '@adonisjs/core/types'
import mongoose from 'mongoose'

export default class MongoProvider {
  constructor(protected app: ApplicationService) {}

  public async boot() {
    const uri = this.app.config.get('database.mongo.uri')
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })
    console.log('MongoDB connected')
  }

  public async shutdown() {
    await mongoose.disconnect()
  }
}
```

Register it in `adonisrc.ts`:

```typescript
providers: [
  () => import('./providers/mongo_provider.js'),
]
```

## Defining a Mongoose Model

Create `app/models/user.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.model<IUser>('User', UserSchema)
```

## Controller with MongoDB

Create `app/controllers/users_controller.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { User } from '#models/user'

export default class UsersController {
  public async index({ response }: HttpContext) {
    const users = await User.find({}).select('name email createdAt').lean()
    return response.ok(users)
  }

  public async store({ request, response }: HttpContext) {
    const { name, email } = request.only(['name', 'email'])

    const existing = await User.findOne({ email })
    if (existing) {
      return response.conflict({ message: 'Email already registered' })
    }

    const user = await User.create({ name, email })
    return response.created(user)
  }

  public async show({ params, response }: HttpContext) {
    const user = await User.findById(params.id).lean()
    if (!user) return response.notFound({ message: 'User not found' })
    return response.ok(user)
  }

  public async destroy({ params, response }: HttpContext) {
    await User.findByIdAndDelete(params.id)
    return response.noContent()
  }
}
```

## Routes

In `start/routes.ts`:

```typescript
import router from '@adonisjs/core/services/router'

const UsersController = () => import('#controllers/users_controller')

router.group(() => {
  router.get('/', [UsersController, 'index'])
  router.post('/', [UsersController, 'store'])
  router.get('/:id', [UsersController, 'show'])
  router.delete('/:id', [UsersController, 'destroy'])
}).prefix('/api/users')
```

## Configuration

Add MongoDB URI to `config/database.ts`:

```typescript
import env from '#start/env'

export default {
  mongo: {
    uri: env.get('MONGO_URI'),
  },
}
```

Add `MONGO_URI` to the env validation in `start/env.ts`:

```typescript
MONGO_URI: Env.schema.string(),
```

In `.env`:

```text
MONGO_URI=mongodb://localhost:27017/myapp
```

## Summary

AdonisJS integrates with MongoDB cleanly through Mongoose as a service provider. Register a custom provider to handle connection lifecycle, define Mongoose models for schema validation, and use standard controller patterns for CRUD operations. This approach keeps MongoDB concerns separate from AdonisJS routing and middleware, giving you the structure of AdonisJS with MongoDB's flexible document model.
