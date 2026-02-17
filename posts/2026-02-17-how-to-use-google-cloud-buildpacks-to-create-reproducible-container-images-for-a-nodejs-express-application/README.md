# How to Use Google Cloud Buildpacks to Create Reproducible Container Images for a Node.js Express Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Buildpacks, Node.js, Express, Container, Cloud Run, Reproducible Builds

Description: Learn how to use Google Cloud Buildpacks to create reproducible container images for Node.js Express applications without writing a Dockerfile.

---

Reproducible builds are builds that produce the same output given the same input, every time. In the container world, this means that building the same source code should produce an image with the same digest. This is important for security auditing, compliance, and debugging. When something goes wrong in production, you need to know exactly what code is running and be able to recreate it.

Google Cloud Buildpacks make reproducible builds easier for Node.js applications. They provide a standardized build process that handles dependency installation, application packaging, and image creation. No Dockerfile means no variation in build instructions across developers.

## Why Buildpacks for Reproducibility

With Dockerfiles, small differences in how developers write their build instructions can produce different images from the same source code. Different base image tags, different layer ordering, different build tools - all of these introduce variability.

Buildpacks standardize the build process. Every build:
- Uses the same base image and build tools
- Installs dependencies the same way
- Structures the image layers identically
- Produces consistent metadata

## Setting Up an Express Application

Here is a straightforward Express application.

```javascript
// src/index.js - Express server with structured logging
const express = require('express');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Request logging in JSON format for Cloud Logging
app.use(morgan('combined'));

// Parse JSON request bodies
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'express-buildpacks-demo',
        version: process.env.npm_package_version || '1.0.0',
        node_version: process.version
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});

// Sample API endpoints
app.get('/api/users', (req, res) => {
    res.json({
        users: [
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' }
        ]
    });
});

app.post('/api/users', (req, res) => {
    const { name, email } = req.body;
    // In a real app, this would save to a database
    res.status(201).json({ id: 3, name, email });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
```

The `package.json` needs to specify the Node.js version and the start script.

```json
{
  "name": "express-buildpacks-demo",
  "version": "1.0.0",
  "description": "Express app built with Google Cloud Buildpacks",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest"
  },
  "engines": {
    "node": "20.x"
  },
  "dependencies": {
    "express": "^4.18.2",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

The `engines.node` field is important. Buildpacks uses it to determine which Node.js version to install. Pinning this ensures consistent Node.js versions across builds.

## Building with Buildpacks Locally

Install the pack CLI and build.

```bash
# Build using Google Cloud Buildpacks
pack build express-demo \
    --builder=gcr.io/buildpacks/builder:v1

# Run the image locally
docker run -p 8080:8080 express-demo
```

Buildpacks detects the `package.json`, identifies it as a Node.js application, installs the correct Node.js version, runs `npm install`, and configures the image to use `npm start` as the entrypoint.

## Ensuring Reproducibility

Several factors contribute to reproducible builds.

### Pin Your Dependencies

Use `package-lock.json` and make sure it is committed to your repository. Buildpacks runs `npm ci` (which uses the lockfile) rather than `npm install` when a lockfile is present.

```bash
# Generate a fresh lockfile
npm install

# Commit it
git add package-lock.json
git commit -m "Update lockfile"
```

### Pin the Builder Version

Instead of using `gcr.io/buildpacks/builder:v1` (which is a moving tag), use a specific digest.

```bash
# Get the current digest
docker inspect gcr.io/buildpacks/builder:v1 --format='{{index .RepoDigests 0}}'

# Use the digest in builds
pack build express-demo \
    --builder=gcr.io/buildpacks/builder@sha256:abc123...
```

### Use the Same Build Environment

For team builds, use Cloud Build to ensure everyone builds on the same infrastructure.

```yaml
# cloudbuild.yaml - Reproducible build with Cloud Build
steps:
  - name: 'gcr.io/k8s-skaffold/pack'
    args:
      - 'build'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/express-demo:$SHORT_SHA'
      - '--builder=gcr.io/buildpacks/builder:v1'
      - '--env=BP_NODE_RUN_SCRIPTS=false'
      - '--publish'
```

## Deploying to Cloud Run

The simplest path to deployment.

```bash
# Deploy directly from source
gcloud run deploy express-demo \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --memory=256Mi
```

Or deploy the pre-built image.

```bash
# Deploy the pre-built image
gcloud run deploy express-demo \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/express-demo:v1 \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated
```

## Customizing the Build with Environment Variables

Buildpacks accepts environment variables to control the build process.

```bash
# Build with custom environment variables
pack build express-demo \
    --builder=gcr.io/buildpacks/builder:v1 \
    --env GOOGLE_RUNTIME_VERSION=20.11.0 \
    --env GOOGLE_NODEJS_VERSION=20.11.0 \
    --env NODE_ENV=production \
    --env BP_NODE_RUN_SCRIPTS=false
```

Key environment variables:
- `GOOGLE_RUNTIME_VERSION`: Pin the exact Node.js version
- `GOOGLE_NODEJS_VERSION`: Alternative way to set Node.js version
- `NODE_ENV`: Set to `production` to skip devDependency installation
- `BP_NODE_RUN_SCRIPTS`: Disable lifecycle scripts for faster builds

## Using project.toml for Configuration

Instead of passing environment variables on every build, create a `project.toml`.

```toml
# project.toml - Buildpack configuration
[project]
id = "express-buildpacks-demo"
version = "1.0.0"

[[build.env]]
name = "GOOGLE_RUNTIME_VERSION"
value = "20.11.0"

[[build.env]]
name = "NODE_ENV"
value = "production"

[build]
exclude = [
    "*.md",
    ".git",
    ".env*",
    "test/",
    "coverage/",
    ".github/",
    "docker-compose*.yml"
]
```

## Verifying Build Reproducibility

To verify that builds are reproducible, build twice and compare the digests.

```bash
# Build twice
pack build express-demo:build1 --builder=gcr.io/buildpacks/builder:v1
pack build express-demo:build2 --builder=gcr.io/buildpacks/builder:v1

# Compare the image IDs
docker inspect express-demo:build1 --format='{{.Id}}'
docker inspect express-demo:build2 --format='{{.Id}}'
```

If both digests match, your builds are reproducible.

## Inspecting the Built Image

You can inspect what Buildpacks created.

```bash
# View the image structure
pack inspect express-demo

# Check the bill of materials (SBOM)
pack sbom download express-demo --output-dir ./sbom
```

The SBOM (Software Bill of Materials) lists every package installed in the image. This is valuable for security scanning and compliance.

## Handling Native Modules

If your Express application uses native modules (like sharp, bcrypt, or sqlite3), Buildpacks handles the compilation automatically. It installs the necessary build tools during the build phase and removes them from the final image.

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "sharp": "^0.33.1",
    "bcrypt": "^5.1.1"
  }
}
```

No additional configuration needed. Buildpacks detects the native modules and ensures the correct build tools are available.

## Cloud Build Trigger for Continuous Deployment

Set up a trigger that builds and deploys on every push to main.

```bash
# Create a Cloud Build trigger
gcloud builds triggers create github \
    --name="express-deploy" \
    --repo-owner="my-org" \
    --repo-name="express-demo" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml"
```

```yaml
# cloudbuild.yaml - Build with Buildpacks and deploy to Cloud Run
steps:
  - name: 'gcr.io/k8s-skaffold/pack'
    args:
      - 'build'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/express-demo:$SHORT_SHA'
      - '--builder=gcr.io/buildpacks/builder:v1'
      - '--publish'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'express-demo'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/express-demo:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
```

## Wrapping Up

Google Cloud Buildpacks provide a standardized, reproducible way to containerize Node.js Express applications. By eliminating the Dockerfile, you remove a source of build variability. Combined with pinned dependency versions, a consistent builder image, and Cloud Build for the build environment, you get container images that are the same every time. This reproducibility is valuable for security auditing, debugging production issues, and maintaining confidence in what is running in your cluster.
