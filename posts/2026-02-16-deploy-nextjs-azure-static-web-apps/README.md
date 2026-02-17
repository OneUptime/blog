# How to Deploy a Next.js Application to Azure Static Web Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Next.js, Azure, Static Web Apps, Deployment, React, CI/CD, GitHub Actions

Description: Deploy a Next.js application to Azure Static Web Apps with automatic CI/CD through GitHub Actions and API routes support.

---

Azure Static Web Apps is a hosting service built for modern web frameworks. It gives you global CDN distribution, free SSL certificates, automatic CI/CD from GitHub, and a built-in API backend powered by Azure Functions. Next.js works well on this platform, especially for static and hybrid rendering scenarios where some pages are pre-rendered at build time and others are generated on demand.

This guide covers deploying a Next.js application from scratch, including configuring the build, setting up routes, adding an API, and handling environment variables.

## Prerequisites

- Node.js 18 or later
- A GitHub account
- An Azure account
- Azure CLI installed
- Basic familiarity with Next.js

## Creating the Next.js Application

Start with a fresh Next.js project:

```bash
# Create a new Next.js app with TypeScript
npx create-next-app@latest my-nextjs-swa --typescript --tailwind --app --src-dir

cd my-nextjs-swa
```

Add a few pages to make the deployment meaningful. Here is a simple home page:

```typescript
// src/app/page.tsx - Home page component
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">My Next.js App on Azure</h1>
      <p className="text-lg text-gray-600">
        Deployed to Azure Static Web Apps with automatic CI/CD.
      </p>
    </main>
  );
}
```

Add a dynamic page that demonstrates server-side rendering:

```typescript
// src/app/posts/[id]/page.tsx - Dynamic post page
interface Post {
  id: number;
  title: string;
  body: string;
}

// Generate static paths at build time for known IDs
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }, { id: '3' }];
}

// Fetch post data at build time
async function getPost(id: string): Promise<Post> {
  const res = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${id}`,
    { next: { revalidate: 3600 } } // Cache for 1 hour
  );
  return res.json();
}

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await getPost(params.id);

  return (
    <article className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-700 leading-relaxed">{post.body}</p>
    </article>
  );
}
```

## Configuring Next.js for Static Export

Azure Static Web Apps works best with Next.js when you use static export. Update your `next.config.js`:

```javascript
// next.config.js - Configure Next.js for Azure Static Web Apps
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Disable image optimization since Azure SWA does not support it natively
  images: {
    unoptimized: true,
  },
  // Trailing slashes help with Azure SWA routing
  trailingSlash: true,
};

module.exports = nextConfig;
```

The `output: 'export'` setting tells Next.js to generate a fully static site. All pages are rendered at build time and output as HTML files.

## Pushing to GitHub

Initialize a git repository and push to GitHub:

```bash
# Initialize the repo and push to GitHub
git init
git add .
git commit -m "Initial Next.js application"
gh repo create my-nextjs-swa --public --push --source .
```

## Creating the Azure Static Web App

You can create the Static Web App through the Azure CLI, linking it directly to your GitHub repository:

```bash
# Create a resource group
az group create --name nextjs-swa-rg --location eastus

# Create the Static Web App linked to your GitHub repo
az staticwebapp create \
  --name my-nextjs-swa \
  --resource-group nextjs-swa-rg \
  --source https://github.com/YOUR_USERNAME/my-nextjs-swa \
  --location eastus \
  --branch main \
  --app-location "/" \
  --output-location "out" \
  --login-with-github
```

This command does several things at once: it creates the Azure resource, connects to your GitHub repository, and sets up a GitHub Actions workflow that builds and deploys your application on every push.

## Understanding the GitHub Actions Workflow

Azure automatically creates a workflow file at `.github/workflows/azure-static-web-apps-*.yml`. Here is what a typical one looks like, with some useful customizations:

```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4

      # Cache node_modules for faster builds
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          # App source code path
          app_location: "/"
          # API source code path (optional)
          api_location: "api"
          # Build output directory
          output_location: "out"
        env:
          # Pass environment variables needed at build time
          NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}

  # Close pull request job cleans up staging environments
  close_pull_request:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request
    steps:
      - name: Close Pull Request
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

One great feature of Azure Static Web Apps is staging environments. Every pull request gets its own deployment with a unique URL, so you can preview changes before merging.

## Adding an API Backend

Azure Static Web Apps can host Azure Functions as an integrated API. Create an API directory:

```bash
# Create the API directory and initialize
mkdir api && cd api
npm init -y
npm install
```

Add a simple API function:

```javascript
// api/src/functions/hello.js - Simple API endpoint
const { app } = require('@azure/functions');

// Register an HTTP-triggered function
app.http('hello', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const name = request.query.get('name') || 'World';

    return {
      jsonBody: {
        message: `Hello, ${name}!`,
        timestamp: new Date().toISOString(),
      },
    };
  },
});
```

The API is automatically available at `/api/hello` in your deployed application. No CORS configuration needed since it runs on the same domain.

## Custom Routing

Azure Static Web Apps supports a configuration file for custom routing rules:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/_next/*", "/images/*"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/404.html"
    }
  },
  "globalHeaders": {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'"
  }
}
```

Save this as `staticwebapp.config.json` in the root of your project.

## Environment Variables

For build-time variables (prefixed with `NEXT_PUBLIC_`), set them in your GitHub Actions workflow or repository secrets. For runtime variables used by the API, configure them through the Azure CLI:

```bash
# Set application settings for the API
az staticwebapp appsettings set \
  --name my-nextjs-swa \
  --resource-group nextjs-swa-rg \
  --setting-names \
    DATABASE_URL="your-database-connection-string" \
    API_KEY="your-secret-key"
```

## Custom Domain

Add a custom domain to your Static Web App:

```bash
# Add a custom domain
az staticwebapp hostname set \
  --name my-nextjs-swa \
  --resource-group nextjs-swa-rg \
  --hostname www.yourdomain.com
```

You will need to add a CNAME record pointing your domain to the Azure Static Web Apps URL. SSL is provisioned automatically.

## Monitoring and Analytics

Azure Static Web Apps integrates with Application Insights for monitoring:

```bash
# Link Application Insights
az staticwebapp appsettings set \
  --name my-nextjs-swa \
  --resource-group nextjs-swa-rg \
  --setting-names \
    APPINSIGHTS_INSTRUMENTATIONKEY="your-key"
```

## Build Optimization

For faster deployments, optimize your Next.js build:

```javascript
// next.config.js - Optimized for Azure SWA
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // Generate source maps only in development
  productionBrowserSourceMaps: false,
  // Minimize bundle size
  swcMinify: true,
};
```

## Wrapping Up

Azure Static Web Apps is a solid choice for hosting Next.js applications, especially when you use static export. You get global CDN distribution, automatic CI/CD from GitHub, staging environments for pull requests, and an integrated API backend, all without managing any infrastructure. The free tier is generous enough for most small to medium projects, and the Standard tier adds custom authentication providers and larger API functions. Push your code to GitHub, let the workflow run, and your application is live in minutes.
