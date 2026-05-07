# How to Develop Podman Desktop Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Extension, Plugin Development, TypeScript

Description: Learn how to develop custom extensions for Podman Desktop to add new features, integrations, and workflows to the container management interface.

---

> Building your own Podman Desktop extension lets you integrate custom tools, automate workflows, and share new capabilities with the Podman community.

Podman Desktop extensions can be written in TypeScript or JavaScript and packaged as OCI images. The extension API provides hooks into the container lifecycle, UI components, and Kubernetes operations. This guide walks you through creating a basic extension from scratch, packaging it, and testing it in Podman Desktop.

---

## Extension Architecture

Podman Desktop extensions follow a standard structure:

```bash
# Create the extension project directory

mkdir my-podman-extension
cd my-podman-extension

# Initialize a Node.js project
npm init -y

# Install development dependencies
npm install --save-dev @podman-desktop/api typescript @types/node
```

The key files in an extension are:

- `package.json` - Extension metadata and contribution points
- `src/extension.ts` - Main entry point with activate/deactivate functions
- `Containerfile` - Packages the extension as an OCI image
- `icon.png` - Extension icon referenced by the metadata

## Setting Up the Project

Configure the TypeScript and package settings:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

Update your `package.json` with extension metadata:

```json
{
  "name": "my-podman-extension",
  "displayName": "My Custom Extension",
  "description": "A custom extension for Podman Desktop",
  "version": "1.0.0",
  "icon": "icon.png",
  "publisher": "myusername",
  "engines": {
    "podman-desktop": ">=1.0.0"
  },
  "main": "./dist/extension.js",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "contributes": {
    "commands": [
      {
        "command": "my-extension.hello",
        "title": "My Extension: Say Hello"
      }
    ]
  }
}
```

## Writing the Extension Code

Create the main extension entry point:

```typescript
// src/extension.ts
import * as podmanDesktopAPI from '@podman-desktop/api';

// Called when the extension is activated
export async function activate(
  extensionContext: podmanDesktopAPI.ExtensionContext
): Promise<void> {
  console.log('My extension is now active');

  // Register a command that users can invoke
  const helloCommand = podmanDesktopAPI.commands.registerCommand(
    'my-extension.hello',
    async () => {
      // Show a notification to the user
      await podmanDesktopAPI.window.showInformationMessage(
        'Hello from my Podman Desktop extension!'
      );
    }
  );

  // Add the command to the extension context for cleanup
  extensionContext.subscriptions.push(helloCommand);

  // Register a status bar item
  const statusBarItem = podmanDesktopAPI.window.createStatusBarItem();
  statusBarItem.text = 'My Extension';
  statusBarItem.command = 'my-extension.hello';
  statusBarItem.show();
  extensionContext.subscriptions.push(statusBarItem);
}

// Called when the extension is deactivated
export async function deactivate(): Promise<void> {
  console.log('My extension is deactivated');
}
```

## Adding Container Event Listeners

Extensions can react to container lifecycle events:

```typescript
// src/container-monitor.ts
import * as podmanDesktopAPI from '@podman-desktop/api';

export function registerContainerMonitor(
  context: podmanDesktopAPI.ExtensionContext
): void {
  // Listen for container start events
  const onStart = podmanDesktopAPI.containerEngine.onEvent((event) => {
    if (event.type === 'container' && event.status === 'start') {
      console.log(`Container started: ${event.id}`);
    }
  });

  context.subscriptions.push(onStart);
}
```

## Packaging the Extension as an OCI Image

Create a Containerfile to package the extension:

```dockerfile
# Containerfile
FROM scratch

# Add the required Podman Desktop extension metadata
LABEL org.opencontainers.image.title="My Custom Extension" \
      org.opencontainers.image.description="A custom extension for Podman Desktop" \
      org.opencontainers.image.vendor="podman-desktop" \
      io.podman-desktop.api.version=">= 1.0.0"

# Copy the extension metadata
COPY package.json /extension/package.json

# Copy the compiled JavaScript
COPY dist/ /extension/dist/

# Copy any additional resources
COPY icon.png /extension/icon.png
```

```bash
# Build the TypeScript code
npm run build

# Build the OCI image
podman build -t ghcr.io/myuser/my-podman-extension:latest .

# Test the image
podman inspect ghcr.io/myuser/my-podman-extension:latest
```

## Testing the Extension Locally

Install your extension in Podman Desktop for testing:

1. Open Podman Desktop and go to **Extensions**.
2. Click **Install custom...**.
3. Enter the local image reference: `ghcr.io/myuser/my-podman-extension:latest`.
4. Click **Install** to load the extension.
5. Verify the extension appears in the installed list.

You can also test during development by using the watch mode:

```bash
# Watch for changes and rebuild automatically
npm run watch
```

To load the local folder while you iterate, enable development mode in **Settings > Preferences > Extensions**, then go to **Extensions > Local Extensions** and click **Add a local folder extension...**.

## Publishing the Extension

Push your extension to an OCI registry:

```bash
# Log into your registry
podman login ghcr.io

# Push the extension image
podman push ghcr.io/myuser/my-podman-extension:latest

# Tag with a version number
podman tag ghcr.io/myuser/my-podman-extension:latest \
  ghcr.io/myuser/my-podman-extension:v1.0.0
podman push ghcr.io/myuser/my-podman-extension:v1.0.0
```

## Debugging Extensions

Troubleshoot extension issues during development:

```bash
# Check Podman Desktop logs for extension output
# Open Help > Troubleshooting, then select the Logs tab.

# Use the Developer Tools in Podman Desktop
# View > Toggle Developer Tools (Ctrl+Shift+I)
```

## Summary

Developing Podman Desktop extensions allows you to customize and extend the container management experience. Using TypeScript and the Podman Desktop API, you can add commands, react to container events, and create UI elements. Packaging extensions as OCI images makes distribution straightforward through any container registry. The extension ecosystem enables the community to share tools and integrations that enhance the Podman Desktop workflow.
