# How to Configure an npm Repository in Artifact Registry for Node.js Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, npm, Node.js, Package Management, DevOps

Description: Set up a private npm registry in Google Artifact Registry for hosting and managing your internal Node.js packages with GCP authentication.

---

Hosting private npm packages in Artifact Registry is a solid alternative to paid npm plans or running your own Verdaccio instance. You get a fully managed registry that integrates with GCP IAM, works with standard npm and yarn commands, and requires zero infrastructure maintenance.

I have set this up for several Node.js teams, and once the initial configuration is done, it feels just like using the public npm registry. Here is the full setup process.

## Creating the npm Repository

Start by enabling the API and creating the repository:

```bash
# Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com --project=my-project

# Create an npm repository
gcloud artifacts repositories create my-npm-repo \
  --repository-format=npm \
  --location=us-central1 \
  --description="Private npm packages for internal use" \
  --project=my-project
```

## Configuring npm Authentication

npm needs to authenticate with Artifact Registry to publish and install private packages. There are a couple of ways to do this.

### Method 1: Using gcloud as a Credential Helper

The simplest approach for local development:

```bash
# Print the npm configuration snippet
gcloud artifacts print-settings npm \
  --repository=my-npm-repo \
  --location=us-central1 \
  --project=my-project \
  --scope=@my-org
```

This outputs an .npmrc configuration. Copy it to your project's .npmrc file or your user-level ~/.npmrc file.

The output looks something like this:

```ini
# .npmrc - Artifact Registry configuration
@my-org:registry=https://us-central1-npm.pkg.dev/my-project/my-npm-repo/
//us-central1-npm.pkg.dev/my-project/my-npm-repo/:always-auth=true
```

Now set up the authentication token:

```bash
# Generate a token and add it to .npmrc
npx google-artifactregistry-auth
```

This command reads your Application Default Credentials and writes an auth token to your .npmrc file.

### Method 2: Using the google-artifactregistry-auth Helper

Install the auth helper globally and use it to keep tokens fresh:

```bash
# Install the auth helper
npm install -g google-artifactregistry-auth

# Run it to refresh credentials in your .npmrc
npx google-artifactregistry-auth --repo-config=.npmrc
```

You can add this to your package.json scripts so it runs before install:

```json
{
  "name": "@my-org/my-app",
  "version": "1.0.0",
  "scripts": {
    "preinstall": "npx google-artifactregistry-auth --repo-config=.npmrc",
    "build": "tsc",
    "test": "jest"
  }
}
```

### Method 3: Access Token Authentication

For CI/CD systems, generate a token directly:

```bash
# Get an access token and configure npm
TOKEN=$(gcloud auth print-access-token)

# Set the registry and token
npm config set @my-org:registry https://us-central1-npm.pkg.dev/my-project/my-npm-repo/
npm config set //us-central1-npm.pkg.dev/my-project/my-npm-repo/:_authToken $TOKEN
```

## Setting Up the .npmrc File

Here is a complete .npmrc configuration for a project that uses both public npm packages and private packages from Artifact Registry:

```ini
# .npmrc - Complete configuration
# Scoped packages from Artifact Registry
@my-org:registry=https://us-central1-npm.pkg.dev/my-project/my-npm-repo/
//us-central1-npm.pkg.dev/my-project/my-npm-repo/:always-auth=true

# Public packages still come from the default npm registry
registry=https://registry.npmjs.org/
```

The `@my-org` scope means any package with the `@my-org/` prefix will be fetched from Artifact Registry, while everything else comes from the public npm registry.

## Publishing a Package

Prepare your package for publishing. Make sure your package.json uses the correct scope:

```json
{
  "name": "@my-org/shared-utils",
  "version": "1.0.0",
  "description": "Shared utility functions",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/"
  ],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "publishConfig": {
    "registry": "https://us-central1-npm.pkg.dev/my-project/my-npm-repo/"
  }
}
```

The `publishConfig.registry` field tells npm where to publish this package.

Now publish:

```bash
# Make sure credentials are fresh
npx google-artifactregistry-auth

# Publish the package
npm publish
```

## Installing Private Packages

Once published, other projects can install the package:

```bash
# Install a private package from Artifact Registry
npm install @my-org/shared-utils
```

As long as the .npmrc is configured correctly and the user has read access, this works just like installing any npm package.

## Using with Yarn

Yarn works with Artifact Registry too. The .npmrc configuration is the same for Yarn 1.x. For Yarn 2+ (Berry), you need a slightly different setup:

```yaml
# .yarnrc.yml - Yarn Berry configuration for Artifact Registry
npmScopes:
  my-org:
    npmRegistryServer: "https://us-central1-npm.pkg.dev/my-project/my-npm-repo/"
    npmAuthToken: "${NPM_AUTH_TOKEN}"
    npmAlwaysAuth: true
```

Set the token as an environment variable:

```bash
# Set the auth token for Yarn Berry
export NPM_AUTH_TOKEN=$(gcloud auth print-access-token)
yarn install
```

## Integrating with Cloud Build

Publishing npm packages from Cloud Build is straightforward:

```yaml
# cloudbuild.yaml - Build and publish an npm package
steps:
  # Install dependencies
  - name: 'node:18'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Configure npm to use Artifact Registry
        cat > .npmrc << 'NPMRC'
        @my-org:registry=https://us-central1-npm.pkg.dev/$PROJECT_ID/my-npm-repo/
        //us-central1-npm.pkg.dev/$PROJECT_ID/my-npm-repo/:always-auth=true
        NPMRC

        # Get auth token using the Cloud Build service account
        npx google-artifactregistry-auth

        # Install, test, and publish
        npm ci
        npm test
        npm publish
```

Make sure the Cloud Build service account has the `roles/artifactregistry.writer` role.

## Listing and Managing Packages

Browse packages from the command line:

```bash
# List all npm packages in the repository
gcloud artifacts packages list \
  --repository=my-npm-repo \
  --location=us-central1 \
  --project=my-project

# List versions of a specific package
gcloud artifacts versions list \
  --package=@my-org/shared-utils \
  --repository=my-npm-repo \
  --location=us-central1 \
  --project=my-project

# Delete a specific version
gcloud artifacts versions delete 1.0.0 \
  --package=@my-org/shared-utils \
  --repository=my-npm-repo \
  --location=us-central1 \
  --project=my-project
```

## Setting Up IAM Permissions

Control who can read and write packages:

```bash
# Grant read access to all developers
gcloud artifacts repositories add-iam-policy-binding my-npm-repo \
  --location=us-central1 \
  --member="group:developers@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project

# Grant write access to the platform team
gcloud artifacts repositories add-iam-policy-binding my-npm-repo \
  --location=us-central1 \
  --member="group:platform-team@example.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project
```

## Wrapping Up

Hosting npm packages in Artifact Registry gives your team a private, secure registry that integrates naturally with GCP. The setup involves creating the repository, configuring .npmrc with the correct registry URL and authentication, and using scoped packages to keep public and private packages separate. Once configured, publishing and installing packages works exactly like using the public npm registry, just with better access control and no monthly subscription fee.
