# How to Set Up Amplify Hosting for a Next.js App

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, Next.js, Hosting, SSR

Description: Learn how to deploy a Next.js application with AWS Amplify Hosting, including SSR support, ISR, environment variables, custom domains, and handling Next.js-specific build configurations.

---

Next.js apps are more complex to host than plain React SPAs because they have server-side rendering, API routes, middleware, and incremental static regeneration. Most hosting platforms treat them as static sites and miss these features. Amplify Hosting has native Next.js support that handles SSR and ISR correctly, deploying your app across Lambda@Edge and CloudFront.

Let's set up a Next.js deployment on Amplify that takes advantage of all these features.

## Amplify's Next.js Support

Amplify detects Next.js projects automatically and deploys them differently than static sites:

- **Static pages** get served from CloudFront's CDN
- **SSR pages** run on Lambda@Edge at CloudFront edge locations
- **API routes** run on Lambda
- **ISR (Incremental Static Regeneration)** works with background revalidation
- **Middleware** runs at the edge
- **Image Optimization** works with Next.js Image component

```mermaid
graph LR
    A[Next.js App] --> B[Amplify Build]
    B --> C[Static Assets]
    B --> D[SSR Functions]
    B --> E[API Routes]
    C --> F[CloudFront CDN]
    D --> G[Lambda@Edge]
    E --> H[Lambda]
    F --> I[Users]
    G --> I
    H --> I
```

## Connecting Your Repository

The fastest way is through the Amplify console, but here's the CLI approach.

Set up the Amplify app:

```bash
# Create the Amplify app with your Next.js repo
aws amplify create-app \
    --name my-nextjs-app \
    --repository https://github.com/yourname/my-nextjs-app \
    --access-token $GITHUB_TOKEN \
    --platform WEB_COMPUTE  # Important: WEB_COMPUTE for SSR support

# Create the main branch
aws amplify create-branch \
    --app-id $APP_ID \
    --branch-name main \
    --enable-auto-build \
    --framework 'Next.js - SSR'

# Start the first build
aws amplify start-job \
    --app-id $APP_ID \
    --branch-name main \
    --job-type RELEASE
```

The `WEB_COMPUTE` platform type is essential. Without it, Amplify treats your app as a static site and SSR won't work.

## Build Configuration

Create or update the `amplify.yml` in your project root.

Here's an optimized build spec for Next.js:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - node_modules/**/*
```

For monorepo setups where Next.js is in a subdirectory:

```yaml
version: 1
appRoot: apps/web
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - node_modules/**/*
```

## Environment Variables

Next.js environment variables have specific naming conventions that affect how Amplify handles them.

Configure environment variables:

```bash
# Server-side env vars (not exposed to the browser)
aws amplify update-branch \
    --app-id $APP_ID \
    --branch-name main \
    --environment-variables \
        DATABASE_URL=postgresql://user:pass@host/db,API_SECRET=your-secret-here

# Client-side env vars (must start with NEXT_PUBLIC_)
aws amplify update-branch \
    --app-id $APP_ID \
    --branch-name main \
    --environment-variables \
        NEXT_PUBLIC_API_URL=https://api.example.com,NEXT_PUBLIC_APP_NAME=MyApp
```

For secrets that shouldn't be visible in the console, use AWS Systems Manager Parameter Store:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        # Fetch secrets from Parameter Store
        - export DATABASE_URL=$(aws ssm get-parameter --name /myapp/prod/database-url --with-decryption --query Parameter.Value --output text)
    build:
      commands:
        - npm run build
```

## Custom Domain Configuration

Set up your custom domain with SSL:

```bash
# Add custom domain
aws amplify create-domain-association \
    --app-id $APP_ID \
    --domain-name example.com \
    --sub-domain-settings \
        prefix='',branchName='main' \
        prefix='www',branchName='main'
```

If you're using Route 53, the DNS records are configured automatically. For other DNS providers, Amplify provides the CNAME records you need to add.

## Handling Next.js Features

### Image Optimization

Next.js Image Optimization works out of the box with Amplify. Just use the `next/image` component normally:

```jsx
import Image from 'next/image';

export default function Hero() {
    return (
        <Image
            src="/hero.jpg"
            alt="Hero image"
            width={1200}
            height={600}
            priority
        />
    );
}
```

Amplify handles the image processing at the edge. You don't need to configure an external image loader.

### ISR (Incremental Static Regeneration)

ISR works with Amplify's compute platform. Pages with `revalidate` will regenerate in the background:

```typescript
// app/products/[id]/page.tsx
export const revalidate = 60; // Revalidate every 60 seconds

export default async function ProductPage({ params }) {
    const product = await fetch(`https://api.example.com/products/${params.id}`);
    const data = await product.json();

    return (
        <div>
            <h1>{data.name}</h1>
            <p>{data.description}</p>
        </div>
    );
}
```

### API Routes

API routes are deployed as Lambda functions:

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    const users = await fetchUsersFromDB();
    return NextResponse.json({ users });
}

export async function POST(request: Request) {
    const body = await request.json();
    const newUser = await createUser(body);
    return NextResponse.json(newUser, { status: 201 });
}
```

### Middleware

Next.js middleware runs at the edge on Amplify:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for auth cookie
    const token = request.cookies.get('auth_token');

    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

## Branch Previews

Enable preview deployments for pull requests:

```bash
# Enable auto branch creation for feature branches
aws amplify update-app \
    --app-id $APP_ID \
    --enable-branch-auto-build

# Enable PR previews
aws amplify update-app \
    --app-id $APP_ID \
    --auto-branch-creation-config '{
        "enableAutoBuild": true,
        "enablePullRequestPreview": true,
        "environmentVariables": {
            "NEXT_PUBLIC_API_URL": "https://staging-api.example.com"
        }
    }'
```

Each PR gets its own preview URL where you can test changes before merging.

## Performance Optimization

Optimize your Next.js app for Amplify:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Output optimization
    output: 'standalone',

    // Image optimization
    images: {
        formats: ['image/avif', 'image/webp'],
    },

    // Headers for caching
    async headers() {
        return [
            {
                source: '/:all*(svg|jpg|png|webp|avif)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
```

## Troubleshooting Common Issues

**Build fails with memory errors**: Increase the Node.js memory limit in your build spec:

```yaml
build:
  commands:
    - NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

**SSR returns 500 errors**: Check the Amplify compute logs. Go to the Amplify console, select your app, and check the "Hosting compute" logs for Lambda errors.

**Environment variables not available at runtime**: Make sure you're using `NEXT_PUBLIC_` prefix for client-side variables. Server-side variables need to be set through Amplify, not just in `.env` files.

For React SPAs, see [setting up Amplify Hosting for a React app](https://oneuptime.com/blog/post/2026-02-12-amplify-hosting-react-app/view). And for authentication integration, check out [implementing Cognito Authentication in Next.js](https://oneuptime.com/blog/post/2026-02-12-cognito-authentication-nextjs/view).

## Wrapping Up

Amplify Hosting has evolved into a solid option for Next.js deployments, especially if you're already in the AWS ecosystem. SSR, ISR, API routes, and middleware all work correctly with the WEB_COMPUTE platform. The CI/CD pipeline is automatic, preview deployments help your team review changes, and the CDN ensures fast delivery worldwide. Just make sure you're using the compute platform (not static), and configure your build spec and environment variables correctly.
