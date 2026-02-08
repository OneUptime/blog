# How to Build a Docker Desktop Extension

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Desktop, Extensions, Docker SDK, React, DevOps

Description: Step-by-step guide to building a Docker Desktop extension with a React frontend and Go backend service.

---

Docker Desktop Extensions let you add custom functionality directly into the Docker Desktop UI. You can build tools for log viewing, security scanning, monitoring, database management, or anything else your team needs during container development. Extensions run as containers with a React-based frontend that integrates into the Docker Desktop sidebar.

This guide walks through building a Docker Desktop extension from scratch, covering the extension SDK, frontend development, backend services, and publishing to the marketplace.

## Prerequisites

You need Docker Desktop 4.8 or later and the Docker Extensions CLI plugin.

```bash
# Verify Docker Desktop version
docker version --format '{{.Client.Version}}'

# Install the Docker Extensions CLI (if not already included)
docker extension install docker/extensions-sdk

# Verify the extensions CLI is available
docker extension version
```

You also need Node.js 18+ for the frontend and optionally Go for a backend service.

## Scaffolding a New Extension

Use the Docker Extensions CLI to generate the project structure.

```bash
# Create a new extension project
docker extension init my-docker-extension

# Navigate into the project
cd my-docker-extension
```

The generated structure looks like this:

```
my-docker-extension/
  Dockerfile          # Builds the extension container
  metadata.json       # Extension metadata and configuration
  docker-compose.yaml # Optional backend services
  ui/                 # React frontend
    src/
    package.json
  backend/            # Optional backend service (Go)
    main.go
    go.mod
```

## Understanding the Extension Metadata

The `metadata.json` file defines your extension's identity and capabilities.

```json
{
  "icon": "docker.svg",
  "ui": {
    "dashboard-tab": {
      "title": "My Extension",
      "root": "/ui",
      "src": "index.html"
    }
  },
  "vm": {
    "image": "${DESKTOP_PLUGIN_IMAGE}",
    "composefile": "docker-compose.yaml"
  },
  "host": {
    "binaries": [
      {
        "darwin": [{ "path": "/darwin/myctl" }],
        "linux": [{ "path": "/linux/myctl" }],
        "windows": [{ "path": "/windows/myctl.exe" }]
      }
    ]
  }
}
```

The `ui` section tells Docker Desktop where to find your frontend. The `vm` section defines backend services that run in Docker's VM. The `host` section allows bundling CLI tools that run directly on the host machine.

## Building the Frontend

The frontend uses React with the Docker Desktop Extension SDK for interacting with Docker.

```bash
# Navigate to the UI directory and install dependencies
cd ui
npm install @docker/extension-api-client-types
npm install @mui/material @emotion/react @emotion/styled
```

Create the main extension component.

```tsx
// ui/src/App.tsx - Main extension component
import React, { useEffect, useState } from 'react';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

// Initialize the Docker Desktop client
const ddClient = createDockerDesktopClient();

interface ContainerInfo {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
}

export function App() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch running containers using the Docker Desktop API
  const fetchContainers = async () => {
    setLoading(true);
    try {
      const result = await ddClient.docker.listContainers({ all: true });
      setContainers(result as ContainerInfo[]);
    } catch (error) {
      ddClient.desktopUI.toast.error('Failed to fetch containers');
    }
    setLoading(false);
  };

  // Fetch containers on component mount
  useEffect(() => {
    fetchContainers();
  }, []);

  // Stop a container by ID
  const stopContainer = async (containerId: string) => {
    try {
      await ddClient.docker.cli.exec('stop', [containerId]);
      ddClient.desktopUI.toast.success('Container stopped');
      fetchContainers(); // Refresh the list
    } catch (error) {
      ddClient.desktopUI.toast.error('Failed to stop container');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Container Manager
      </Typography>
      <Button variant="contained" onClick={fetchContainers} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh'}
      </Button>
      <Paper sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {containers.map((container) => (
              <TableRow key={container.Id}>
                <TableCell>{container.Names[0]?.replace('/', '')}</TableCell>
                <TableCell>{container.Image}</TableCell>
                <TableCell>{container.State}</TableCell>
                <TableCell>{container.Status}</TableCell>
                <TableCell>
                  {container.State === 'running' && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => stopContainer(container.Id)}
                    >
                      Stop
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
```

## Building a Backend Service

For operations that need persistent state or complex processing, add a backend service in Go.

```go
// backend/main.go - Backend service for the extension
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os/exec"
	"strings"
)

// ContainerStats holds resource usage data for a container
type ContainerStats struct {
	Name     string `json:"name"`
	CPU      string `json:"cpu"`
	Memory   string `json:"memory"`
	NetIO    string `json:"netIO"`
	BlockIO  string `json:"blockIO"`
}

func main() {
	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Container stats endpoint
	http.HandleFunc("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		// Run docker stats to get container resource usage
		cmd := exec.Command("docker", "stats", "--no-stream",
			"--format", "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}}")
		output, err := cmd.Output()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var stats []ContainerStats
		lines := strings.Split(strings.TrimSpace(string(output)), "\n")
		for _, line := range lines {
			parts := strings.Split(line, ",")
			if len(parts) == 5 {
				stats = append(stats, ContainerStats{
					Name:    parts[0],
					CPU:     parts[1],
					Memory:  parts[2],
					NetIO:   parts[3],
					BlockIO: parts[4],
				})
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	})

	log.Println("Backend service starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Define the backend service in Docker Compose.

```yaml
# docker-compose.yaml - Backend service definition
services:
  backend:
    build:
      context: backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    volumes:
      # Mount the Docker socket so the backend can interact with Docker
      - /var/run/docker.sock:/var/run/docker.sock
```

## Writing the Extension Dockerfile

The Dockerfile builds both the frontend and backend, then packages everything together.

```dockerfile
# Dockerfile - Multi-stage build for the Docker Desktop extension

# Stage 1: Build the React frontend
FROM node:20-alpine AS ui-builder
WORKDIR /app
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Stage 2: Build the Go backend
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /backend main.go

# Stage 3: Final extension image
FROM alpine:3.19
LABEL org.opencontainers.image.title="My Docker Extension" \
      org.opencontainers.image.description="A custom Docker Desktop extension" \
      org.opencontainers.image.vendor="Your Name" \
      com.docker.desktop.extension.api.version="0.3.4"

# Copy the extension metadata
COPY metadata.json .
COPY docker.svg .

# Copy the built frontend
COPY --from=ui-builder /app/dist /ui

# Copy the built backend
COPY --from=backend-builder /backend /backend

# Start the backend service
CMD ["/backend"]
```

## Calling the Backend from the Frontend

Connect your React frontend to the backend service using the Docker Desktop extension SDK.

```tsx
// ui/src/api.ts - Backend API client
import { createDockerDesktopClient } from '@docker/extension-api-client';

const ddClient = createDockerDesktopClient();

// Call the backend service running in Docker's VM
export async function fetchStats() {
  const response = await ddClient.extension.vm?.service?.get('/api/stats');
  return response;
}

// Execute Docker CLI commands directly
export async function getContainerLogs(containerId: string): Promise<string> {
  const result = await ddClient.docker.cli.exec('logs', [
    '--tail', '100',
    containerId,
  ]);
  return result.stdout;
}

// Show a native file dialog
export async function selectFile(): Promise<string> {
  const result = await ddClient.desktopUI.dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
  });
  return result.filePaths?.[0] || '';
}
```

## Building and Installing the Extension

Build and install your extension locally for development.

```bash
# Build the extension image
docker build -t my-docker-extension:latest .

# Install the extension in Docker Desktop
docker extension install my-docker-extension:latest

# After making changes, update the installed extension
docker extension update my-docker-extension:latest

# Enable hot-reload for frontend development
docker extension dev ui-source my-docker-extension:latest http://localhost:3000

# Start the frontend dev server
cd ui && npm run dev
```

With hot-reload enabled, changes to your React code appear immediately in Docker Desktop without rebuilding the image.

## Debugging the Extension

Use Chrome DevTools to debug the frontend.

```bash
# Open Chrome DevTools for the extension UI
docker extension dev debug my-docker-extension:latest
```

For backend debugging, check the logs.

```bash
# View backend service logs
docker extension logs my-docker-extension:latest
```

## Publishing to the Marketplace

When your extension is ready, validate it and publish to the Docker Extensions Marketplace.

```bash
# Validate the extension meets marketplace requirements
docker extension validate my-docker-extension:latest

# Tag and push to Docker Hub
docker tag my-docker-extension:latest yourdockerhubuser/my-docker-extension:1.0.0
docker push yourdockerhubuser/my-docker-extension:1.0.0
```

Then submit your extension through the Docker Extensions Marketplace portal. Docker reviews submissions for quality, security, and adherence to their guidelines.

Building Docker Desktop extensions gives you a way to integrate your custom tooling directly into the development workflow. The combination of a React frontend with full Docker API access makes it possible to build rich, interactive tools that every developer on your team benefits from.
