# How to Use MongoDB with SvelteKit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, SvelteKit, Server, Loader, Mongoose

Description: Learn how to integrate MongoDB into a SvelteKit application using server-side load functions and form actions with a cached database connection.

---

## Introduction

SvelteKit's `+page.server.ts` and `+server.ts` files run exclusively on the server, making them the right place to query MongoDB. A cached connection helper prevents connection pool exhaustion across requests, and SvelteKit's `load` functions and form actions provide clean patterns for reads and writes.

## Installation

```bash
npm install mongoose
```

## Connection Helper

```typescript
// src/lib/server/db.ts
import mongoose from 'mongoose';
import { MONGODB_URI } from '$env/static/private';

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected || mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
  connected = true;
}
```

## Model

```typescript
// src/lib/server/models/product.ts
import { Schema, model, models } from 'mongoose';

export interface IProduct {
  _id:      string;
  name:     string;
  price:    number;
  category: string;
}

const schema = new Schema<IProduct>({
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  category: { type: String, required: true },
});

export const Product = models.Product ?? model<IProduct>('Product', schema);
```

## Server Load Function

```typescript
// src/routes/products/+page.server.ts
import type { PageServerLoad } from './$types';
import { connectDB }  from '$lib/server/db';
import { Product }    from '$lib/server/models/product';

export const load: PageServerLoad = async () => {
  await connectDB();
  const products = await Product.find({}).sort({ price: 1 }).lean();
  return { products: JSON.parse(JSON.stringify(products)) };
};
```

## Page Component

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<h1>Products</h1>
<ul>
  {#each data.products as product}
    <li>{product.name} - ${product.price}</li>
  {/each}
</ul>
```

## Form Action for Creating Documents

```typescript
// src/routes/products/new/+page.server.ts
import type { Actions } from './$types';
import { redirect }     from '@sveltejs/kit';
import { connectDB }    from '$lib/server/db';
import { Product }      from '$lib/server/models/product';

export const actions: Actions = {
  default: async ({ request }) => {
    await connectDB();
    const data     = await request.formData();
    await Product.create({
      name:     data.get('name')     as string,
      price:    Number(data.get('price')),
      category: data.get('category') as string,
    });
    redirect(303, '/products');
  },
};
```

```svelte
<!-- src/routes/products/new/+page.svelte -->
<form method="POST">
  <input name="name"     placeholder="Name"     required />
  <input name="price"    placeholder="Price"    type="number" required />
  <input name="category" placeholder="Category" required />
  <button type="submit">Add Product</button>
</form>
```

## Summary

SvelteKit integrates with MongoDB through server-only modules (`+page.server.ts`). Use a cached `connectDB()` function, define Mongoose models with the `models.X ?? model(...)` guard, and return plain objects from `load` after `JSON.parse(JSON.stringify(...))` to strip Mongoose document metadata before serialization.
