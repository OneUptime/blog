# How to Use Fresh Framework with Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Fresh, Framework, SSR

Description: A comprehensive guide to building modern web applications with the Fresh framework and Deno, covering islands architecture, file-based routing, SSR, and best practices.

---

The Fresh framework is a next-generation web framework built specifically for Deno. It embraces modern web development principles with zero configuration, TypeScript support out of the box, and an innovative islands architecture that delivers exceptional performance. In this guide, we will explore everything you need to know to build production-ready applications with Fresh.

## What is Fresh?

Fresh is a full-stack web framework designed for Deno that takes a unique approach to building web applications. Unlike traditional frameworks that ship large JavaScript bundles to the client, Fresh renders pages on the server by default and only sends JavaScript to the browser when absolutely necessary. This approach results in faster page loads, better SEO, and improved user experience.

Key features of Fresh include:

- **Zero configuration**: Fresh works out of the box with sensible defaults
- **TypeScript-first**: Full TypeScript support without additional setup
- **Islands architecture**: Interactive components are isolated "islands" in a sea of static HTML
- **File-based routing**: Routes are automatically created based on your file structure
- **Just-in-time rendering**: Pages are rendered on demand, not at build time
- **No build step**: Fresh compiles TypeScript on the fly during development

## Setting Up Your First Fresh Project

Getting started with Fresh is straightforward. You need Deno installed on your system (version 1.25 or later is recommended).

Create a new Fresh project using the official initialization command:

```bash
deno run -A -r https://fresh.deno.dev my-fresh-app
```

This command creates a new directory with the following structure:

```
my-fresh-app/
├── components/
│   └── Button.tsx
├── islands/
│   └── Counter.tsx
├── routes/
│   ├── _app.tsx
│   ├── api/
│   │   └── joke.ts
│   └── index.tsx
├── static/
│   ├── favicon.ico
│   ├── logo.svg
│   └── styles.css
├── deno.json
├── dev.ts
├── fresh.gen.ts
├── main.ts
└── README.md
```

Start the development server to see your application running:

```bash
deno task start
```

Your Fresh application is now running at `http://localhost:8000`.

## Understanding File-Based Routing

Fresh uses a file-based routing system where the file structure in the `routes/` directory directly maps to URL paths. This approach eliminates the need for manual route configuration and makes your application's structure intuitive.

Here is a basic route that renders a simple page:

```typescript
// routes/index.tsx
export default function Home() {
  return (
    <div>
      <h1>Welcome to Fresh</h1>
      <p>This is the home page of your application.</p>
    </div>
  );
}
```

### Dynamic Routes

Fresh supports dynamic route segments using square brackets. This is useful for pages that need to handle variable URL parameters.

Create a dynamic route that captures a user ID from the URL:

```typescript
// routes/users/[id].tsx
import { PageProps } from "$fresh/server.ts";

export default function UserPage(props: PageProps) {
  const { id } = props.params;
  
  return (
    <div>
      <h1>User Profile</h1>
      <p>Viewing user with ID: {id}</p>
    </div>
  );
}
```

### Catch-All Routes

For routes that need to match multiple path segments, use the spread syntax with double brackets:

```typescript
// routes/docs/[...slug].tsx
import { PageProps } from "$fresh/server.ts";

export default function DocsPage(props: PageProps) {
  const { slug } = props.params;
  const pathSegments = slug.split("/");
  
  return (
    <div>
      <h1>Documentation</h1>
      <p>Path: {pathSegments.join(" > ")}</p>
    </div>
  );
}
```

## The Islands Architecture

The islands architecture is Fresh's most distinctive feature. In this model, your pages are mostly static HTML rendered on the server, with small "islands" of interactivity where needed. This approach significantly reduces the amount of JavaScript sent to the browser.

### Creating Your First Island

Islands are placed in the `islands/` directory and are the only components that include client-side JavaScript:

```typescript
// islands/Counter.tsx
import { useState } from "preact/hooks";

interface CounterProps {
  start?: number;
}

export default function Counter({ start = 0 }: CounterProps) {
  const [count, setCount] = useState(start);

  return (
    <div class="counter">
      <p>Current count: {count}</p>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

Use the island in a route by importing it directly:

```typescript
// routes/counter.tsx
import Counter from "../islands/Counter.tsx";

export default function CounterPage() {
  return (
    <div>
      <h1>Interactive Counter</h1>
      <p>This page demonstrates the islands architecture.</p>
      <Counter start={5} />
    </div>
  );
}
```

### Static Components vs Islands

Regular components in the `components/` directory are rendered on the server and do not include any client-side JavaScript:

```typescript
// components/Header.tsx
interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </nav>
      <h1>{title}</h1>
    </header>
  );
}
```

This component renders as pure HTML with zero JavaScript overhead.

## Server-Side Rendering and Data Fetching

Fresh provides a powerful handler system for fetching data on the server before rendering pages. This ensures that your pages are fully populated when they reach the browser.

### Using Handlers for Data Fetching

Define a handler function alongside your page component to fetch data:

```typescript
// routes/posts/index.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface Post {
  id: number;
  title: string;
  excerpt: string;
}

export const handler: Handlers<Post[]> = {
  async GET(_req, ctx) {
    const response = await fetch("https://api.example.com/posts");
    const posts: Post[] = await response.json();
    return ctx.render(posts);
  },
};

export default function PostsPage(props: PageProps<Post[]>) {
  const posts = props.data;

  return (
    <div>
      <h1>Blog Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <a href={`/posts/${post.id}`}>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Handling Different HTTP Methods

Handlers can respond to various HTTP methods, making it easy to build full-featured applications:

```typescript
// routes/api/messages.ts
import { Handlers } from "$fresh/server.ts";

interface Message {
  id: string;
  content: string;
  createdAt: string;
}

const messages: Message[] = [];

export const handler: Handlers = {
  GET(_req, _ctx) {
    return new Response(JSON.stringify(messages), {
      headers: { "Content-Type": "application/json" },
    });
  },

  async POST(req, _ctx) {
    const body = await req.json();
    const message: Message = {
      id: crypto.randomUUID(),
      content: body.content,
      createdAt: new Date().toISOString(),
    };
    messages.push(message);
    
    return new Response(JSON.stringify(message), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

## Working with Forms

Fresh makes handling forms straightforward with its handler system. You can process form submissions entirely on the server without any client-side JavaScript.

Create a contact form with server-side validation and processing:

```typescript
// routes/contact.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface FormData {
  name?: string;
  email?: string;
  message?: string;
  errors?: Record<string, string>;
  success?: boolean;
}

export const handler: Handlers<FormData> = {
  GET(_req, ctx) {
    return ctx.render({});
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const name = form.get("name")?.toString() || "";
    const email = form.get("email")?.toString() || "";
    const message = form.get("message")?.toString() || "";

    const errors: Record<string, string> = {};

    if (!name || name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    if (!email || !email.includes("@")) {
      errors.email = "Please enter a valid email address";
    }
    if (!message || message.length < 10) {
      errors.message = "Message must be at least 10 characters";
    }

    if (Object.keys(errors).length > 0) {
      return ctx.render({ name, email, message, errors });
    }

    // Process the form submission (save to database, send email, etc.)
    console.log("Form submitted:", { name, email, message });

    return ctx.render({ success: true });
  },
};

export default function ContactPage(props: PageProps<FormData>) {
  const { name, email, message, errors, success } = props.data;

  if (success) {
    return (
      <div>
        <h1>Thank You!</h1>
        <p>Your message has been sent successfully.</p>
        <a href="/">Return to Home</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Contact Us</h1>
      <form method="POST">
        <div>
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={name || ""}
          />
          {errors?.name && <span class="error">{errors.name}</span>}
        </div>

        <div>
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email || ""}
          />
          {errors?.email && <span class="error">{errors.email}</span>}
        </div>

        <div>
          <label for="message">Message</label>
          <textarea
            id="message"
            name="message"
            rows={5}
          >{message || ""}</textarea>
          {errors?.message && <span class="error">{errors.message}</span>}
        </div>

        <button type="submit">Send Message</button>
      </form>
    </div>
  );
}
```

## Implementing Middleware

Middleware in Fresh allows you to intercept requests before they reach your routes. This is useful for authentication, logging, adding headers, and other cross-cutting concerns.

### Creating Global Middleware

Create a middleware file in the routes directory to apply it to all routes:

```typescript
// routes/_middleware.ts
import { FreshContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: FreshContext) {
  const start = Date.now();
  
  // Add custom headers to all responses
  const response = await ctx.next();
  const duration = Date.now() - start;
  
  // Log request details
  console.log(`${req.method} ${req.url} - ${response.status} (${duration}ms)`);
  
  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  
  return response;
}
```

### Route-Specific Middleware

You can also create middleware for specific route groups by placing the middleware file in a subdirectory:

```typescript
// routes/admin/_middleware.ts
import { FreshContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: FreshContext) {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const token = authHeader.substring(7);
  
  // Validate token (implement your own validation logic)
  const isValid = await validateToken(token);
  
  if (!isValid) {
    return new Response("Invalid token", { status: 403 });
  }
  
  // Continue to the route handler
  return ctx.next();
}

async function validateToken(token: string): Promise<boolean> {
  // Implement your token validation logic here
  return token.length > 0;
}
```

## Styling with Tailwind CSS

Fresh has excellent support for Tailwind CSS. The framework includes a built-in Tailwind plugin that makes integration seamless.

### Setting Up Tailwind

Update your `deno.json` to include the Tailwind plugin configuration:

```json
{
  "tasks": {
    "start": "deno run -A --watch=static/,routes/ dev.ts"
  },
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@1.6.0/",
    "preact": "https://esm.sh/preact@10.19.2",
    "preact/": "https://esm.sh/preact@10.19.2/",
    "tailwindcss": "npm:tailwindcss@3.4.0",
    "tailwindcss/plugin": "npm:tailwindcss@3.4.0/plugin.js"
  }
}
```

Create a Tailwind configuration file at the project root:

```typescript
// tailwind.config.ts
import { type Config } from "tailwindcss";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Using Tailwind Classes

Now you can use Tailwind classes in your components:

```typescript
// components/Card.tsx
interface CardProps {
  title: string;
  description: string;
  imageUrl?: string;
}

export default function Card({ title, description, imageUrl }: CardProps) {
  return (
    <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          class="w-full h-48 object-cover"
        />
      )}
      <div class="p-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p class="text-gray-600 leading-relaxed">
          {description}
        </p>
        <button class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
          Learn More
        </button>
      </div>
    </div>
  );
}
```

### Creating a Responsive Layout

Build a responsive layout component using Tailwind:

```typescript
// routes/_app.tsx
import { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Fresh App</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="min-h-screen bg-gray-50">
        <nav class="bg-white shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <a href="/" class="text-xl font-bold text-primary-600">
                Fresh App
              </a>
              <div class="hidden md:flex space-x-8">
                <a href="/" class="text-gray-700 hover:text-primary-600">
                  Home
                </a>
                <a href="/about" class="text-gray-700 hover:text-primary-600">
                  About
                </a>
                <a href="/contact" class="text-gray-700 hover:text-primary-600">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Component />
        </main>
        <footer class="bg-gray-800 text-white mt-auto">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p class="text-center text-gray-400">
              Built with Fresh and Deno
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
```

## Best Practices Summary

When building applications with Fresh, keep these best practices in mind:

1. **Minimize islands**: Only create islands for components that truly need interactivity. Every island adds JavaScript to your bundle.

2. **Use handlers for data fetching**: Fetch data on the server using handlers instead of making API calls from islands. This improves performance and SEO.

3. **Leverage TypeScript**: Fresh is built for TypeScript. Use strong typing for props, handlers, and data structures to catch errors early.

4. **Keep routes organized**: Use nested directories to group related routes. This keeps your codebase maintainable as it grows.

5. **Use middleware wisely**: Apply authentication and common logic in middleware rather than duplicating code across handlers.

6. **Optimize images**: Place static assets in the `static/` directory and use appropriate image formats and sizes.

7. **Handle errors gracefully**: Create custom error pages for 404 and 500 errors to provide a better user experience:

```typescript
// routes/_404.tsx
export default function NotFoundPage() {
  return (
    <div class="text-center py-20">
      <h1 class="text-4xl font-bold text-gray-900">404</h1>
      <p class="mt-4 text-gray-600">Page not found</p>
      <a href="/" class="mt-8 inline-block text-primary-600 hover:underline">
        Go back home
      </a>
    </div>
  );
}
```

8. **Test your handlers**: Write unit tests for your data fetching logic and form validation.

9. **Use environment variables**: Store sensitive configuration in environment variables and access them using `Deno.env.get()`.

10. **Deploy efficiently**: Fresh works great with Deno Deploy for serverless deployment with edge computing capabilities.

## Conclusion

Fresh represents a refreshing approach to web development that prioritizes performance and developer experience. By embracing server-side rendering with selective hydration through islands, Fresh delivers fast-loading pages while maintaining the interactivity users expect.

The framework's tight integration with Deno means you get TypeScript support, modern JavaScript features, and a secure runtime without complex configuration. The file-based routing system keeps your project organized, and the handler pattern makes data fetching intuitive.

Whether you are building a simple marketing site or a complex web application, Fresh provides the tools you need while keeping your JavaScript payload minimal. As the web continues to evolve toward better performance and user experience, frameworks like Fresh are leading the way.

Start experimenting with Fresh today and discover how enjoyable server-side rendering can be when combined with modern tooling and thoughtful architecture. The combination of Deno's security-first approach and Fresh's islands architecture creates a powerful foundation for your next web project.
