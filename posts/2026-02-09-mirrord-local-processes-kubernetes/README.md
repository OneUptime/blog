# How to Configure Mirrord for Running Local Processes in the Context of Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Development, Mirrord, DevOps, Local Development

Description: Configure Mirrord to run local applications with the full context of your Kubernetes cluster, accessing remote services, volumes, and environment variables without deploying containers.

---

Testing microservices locally while connecting to remote dependencies in Kubernetes has always been challenging. You either mock all external services or deploy every code change to the cluster. Mirrord solves this by running your local process as if it were inside a Kubernetes pod.

Mirrord intercepts network calls, file system access, and environment variables, transparently routing them to and from your Kubernetes cluster. This guide shows you how to configure Mirrord for different scenarios and integrate it into your development workflow.

## Understanding Mirrord Architecture

Mirrord consists of two components:

- A layer that wraps your local process, intercepting system calls
- An agent deployed to your Kubernetes cluster that handles remote operations

When you run a process with Mirrord, network requests can go to cluster services, environment variables come from pod configuration, and file reads can access mounted volumes. Your local process thinks it's running inside Kubernetes.

## Installing Mirrord

Install the Mirrord CLI:

```bash
# macOS
brew install metalbear-co/mirrord/mirrord

# Linux
curl -fsSL https://raw.githubusercontent.com/metalbear-co/mirrord/main/scripts/install.sh | bash

# Verify installation
mirrord --version
```

Install the VS Code extension for IDE integration:

```bash
code --install-extension metalbear.mirrord
```

## Basic Mirrord Usage

Run a local process with Mirrord:

```bash
# Run with default target (first pod in default namespace)
mirrord exec node app.js

# Target specific deployment
mirrord exec --target deployment/api node app.js

# Target specific pod
mirrord exec --target pod/api-7f8c9d-abc123 node app.js

# Target with namespace
mirrord exec --target deployment/api --namespace production node app.js
```

The local process now has access to:
- Services running in the cluster
- Environment variables from the target pod
- ConfigMaps and Secrets mounted in the pod
- Network policies applied to the pod

## Configuring Mirrord with Configuration Files

Create a mirrord configuration file for reusable settings:

```json
// .mirrord/mirrord.json
{
  "target": {
    "path": "deployment/api",
    "namespace": "development"
  },
  "feature": {
    "network": {
      "incoming": "steal",
      "outgoing": true,
      "dns": true
    },
    "fs": {
      "mode": "local",
      "read_write": [
        "/tmp",
        "/var/log"
      ],
      "read_only": [
        "/etc/config"
      ]
    },
    "env": {
      "include": "DATABASE_*;REDIS_*;API_KEY",
      "exclude": "LOCAL_*"
    }
  },
  "operator": false,
  "kubeconfig": "~/.kube/config"
}
```

Use the configuration:

```bash
mirrord exec --config-file .mirrord/mirrord.json node app.js
```

## Network Configuration Modes

Mirrord offers different network interception modes:

### Steal Mode - Redirect Traffic to Local Process

```json
{
  "feature": {
    "network": {
      "incoming": "steal"
    }
  }
}
```

All incoming traffic to the pod goes to your local process. The remote pod receives no traffic.

### Mirror Mode - Duplicate Traffic

```json
{
  "feature": {
    "network": {
      "incoming": "mirror"
    }
  }
}
```

Incoming traffic is duplicated. Both the remote pod and your local process receive requests.

### Off Mode - No Incoming Traffic

```json
{
  "feature": {
    "network": {
      "incoming": "off"
    }
  }
}
```

Remote pod continues receiving traffic normally. Use this when you only need outgoing connections.

## File System Configuration

Control which file system operations go to the cluster:

```json
{
  "feature": {
    "fs": {
      "mode": "local",
      "read_write": [
        "/app/uploads",
        "/tmp"
      ],
      "read_only": [
        "/etc/config",
        "/var/secrets"
      ],
      "local": [
        "/app/src",
        "/app/node_modules"
      ]
    }
  }
}
```

Modes:
- `local`: File operations use local file system (default)
- `remote`: File operations go to the cluster
- `localwithoverrides`: Local by default, with specific remote overrides

## Environment Variable Filtering

Selectively import environment variables:

```json
{
  "feature": {
    "env": {
      "include": "DATABASE_URL;REDIS_HOST;API_*",
      "exclude": "DEBUG;LOCAL_*",
      "override": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      }
    }
  }
}
```

This configuration:
- Imports `DATABASE_URL`, `REDIS_HOST`, and all vars starting with `API_`
- Excludes `DEBUG` and all vars starting with `LOCAL_`
- Overrides specific values locally

## IDE Integration

Configure VS Code launch.json for debugging with Mirrord:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug with Mirrord",
      "program": "${workspaceFolder}/src/index.js",
      "runtimeExecutable": "mirrord",
      "runtimeArgs": [
        "exec",
        "--config-file",
        ".mirrord/mirrord.json",
        "--"
      ],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

For JetBrains IDEs, create a run configuration:

```xml
<!-- .idea/runConfigurations/Mirrord_API.xml -->
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Mirrord API" type="NodeJSConfigurationType">
    <node-interpreter>mirrord</node-interpreter>
    <node-parameters>exec --config-file .mirrord/mirrord.json --</node-parameters>
    <working-dir>$PROJECT_DIR$</working-dir>
    <js-file>src/index.js</js-file>
    <method v="2" />
  </configuration>
</component>
```

## Advanced Scenarios

### Testing with Production Data

Access production databases safely:

```json
{
  "target": {
    "path": "deployment/api",
    "namespace": "production"
  },
  "feature": {
    "network": {
      "incoming": "off",
      "outgoing": true
    },
    "env": {
      "include": "DATABASE_URL",
      "override": {
        "DATABASE_READONLY": "true"
      }
    }
  }
}
```

This lets you query production data without affecting the running service.

### Multi-Service Development

Run multiple local processes in the same cluster context:

```bash
# Terminal 1: API service
mirrord exec --target deployment/api --config .mirrord/api.json npm start

# Terminal 2: Worker service
mirrord exec --target deployment/worker --config .mirrord/worker.json npm run worker

# Terminal 3: Frontend (accessing cluster services)
mirrord exec --target deployment/frontend --config .mirrord/frontend.json npm run dev
```

### Testing Service Mesh Integration

Work with Istio or Linkerd without local mesh components:

```json
{
  "target": {
    "path": "deployment/api",
    "namespace": "production"
  },
  "feature": {
    "network": {
      "incoming": "mirror",
      "outgoing": true,
      "dns": true
    }
  },
  "operator": true
}
```

Your local process automatically gets mesh identity and mTLS.

## Creating Development Profiles

Build different configurations for different scenarios:

```json
// .mirrord/local-only.json
{
  "feature": {
    "network": {
      "incoming": "off",
      "outgoing": false
    },
    "fs": {
      "mode": "local"
    },
    "env": {
      "include": "none"
    }
  }
}
```

```json
// .mirrord/full-cluster.json
{
  "feature": {
    "network": {
      "incoming": "steal",
      "outgoing": true
    },
    "fs": {
      "mode": "remote"
    },
    "env": {
      "include": "*"
    }
  }
}
```

```json
// .mirrord/staging.json
{
  "target": {
    "namespace": "staging"
  },
  "feature": {
    "network": {
      "incoming": "mirror",
      "outgoing": true
    }
  }
}
```

Use with npm scripts:

```json
{
  "scripts": {
    "dev": "mirrord exec --config .mirrord/local-only.json node src/index.js",
    "dev:cluster": "mirrord exec --config .mirrord/full-cluster.json node src/index.js",
    "dev:staging": "mirrord exec --config .mirrord/staging.json node src/index.js"
  }
}
```

## Debugging Connection Issues

Enable debug logging:

```bash
MIRRORD_LOG_LEVEL=trace mirrord exec --target deployment/api node app.js
```

Common issues and solutions:

**Cannot connect to cluster:**
```bash
# Verify kubectl access
kubectl get pods

# Check Mirrord agent deployment
kubectl get pods -n mirrord

# Verify RBAC permissions
kubectl auth can-i create pods --subresource=exec
```

**Network traffic not intercepted:**
```json
{
  "feature": {
    "network": {
      "incoming": "steal",
      "dns": true
    }
  }
}
```

**File system access fails:**
```json
{
  "feature": {
    "fs": {
      "mode": "local",
      "read_only": ["/etc"]
    }
  }
}
```

## Performance Considerations

Mirrord adds latency for remote operations. Optimize with local overrides:

```json
{
  "feature": {
    "fs": {
      "mode": "local",
      "read_only": [
        "/etc/ssl",
        "/usr/share/zoneinfo"
      ]
    },
    "network": {
      "incoming": "mirror",
      "outgoing": {
        "tcp": true,
        "udp": true,
        "filter": {
          "local": [
            "3000-3999",
            "5432"
          ]
        }
      }
    }
  }
}
```

This keeps frequently accessed files local and routes only necessary network traffic.

## Team Collaboration

Share Mirrord configurations in your repository:

```bash
.mirrord/
├── mirrord.json          # Default config
├── development.json      # Dev cluster
├── staging.json          # Staging cluster
├── production-ro.json    # Read-only prod access
└── README.md            # Usage instructions
```

Document usage in your project README:

```markdown
## Development with Mirrord

Run locally with cluster context:

\`\`\`bash
# Development cluster (default)
npm run dev:mirrord

# Staging cluster
mirrord exec --config .mirrord/staging.json npm start

# Production (read-only)
mirrord exec --config .mirrord/production-ro.json npm start
\`\`\`
```

Mirrord eliminates the complexity of mocking remote services during local development. Your code runs on your machine but operates as if it were deployed in Kubernetes, accessing real services, configurations, and networking.
