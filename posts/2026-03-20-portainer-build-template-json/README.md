# How to Build a Custom Template Definition JSON File for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, JSON, DevOps

Description: Learn how to build a well-structured Portainer template definition JSON file from scratch to create a complete custom template catalog.

## Introduction

The Portainer template catalog is driven entirely by a JSON definition file. Understanding the documented structure of this file lets you build rich, full-featured templates with variables, volumes, networks, labels, and more. This guide is a practical reference for building template definition JSON files.

## Top-Level Structure

```json
{
  "version": "2",
  "templates": []
}
```

The examples below use Portainer's documented v2 app template format, so the top-level `version` field is `"2"`.

## Template Types

| `type` value | Description |
|-------------|-------------|
| `1` | Container template (single Docker container) |
| `2` | Swarm stack template |
| `3` | Compose stack template |

## Container Template (Type 1)

Example container template:

```json
{
  "type": 1,
  "title": "PostgreSQL",
  "description": "The world's most advanced open-source relational database",
  "categories": ["database"],
  "platform": "linux",
  "logo": "https://portainer-io-assets.sfo2.digitaloceanspaces.com/logos/postgres.png",
  "image": "postgres:15-alpine",
  "hostname": "postgres",
  "restart_policy": "unless-stopped",
  "ports": [
    "5432/tcp"
  ],
  "volumes": [
    {
      "container": "/var/lib/postgresql/data",
      "bind": "/data/postgres"
    }
  ],
  "env": [
    {
      "name": "POSTGRES_DB",
      "label": "Database name",
      "description": "Name of the default database to create",
      "default": "mydb"
    },
    {
      "name": "POSTGRES_USER",
      "label": "Database user",
      "description": "Username for the default database",
      "default": "postgres"
    },
    {
      "name": "POSTGRES_PASSWORD",
      "label": "Database password",
      "description": "Password for the database user (required)"
    }
  ],
  "labels": [
    {
      "name": "com.example.role",
      "value": "database"
    }
  ],
  "network": "bridge"
}
```

## Compose Stack Template (Type 3)

Example Compose stack template using a repository:

```json
{
  "type": 3,
  "title": "WordPress with MySQL",
  "description": "WordPress content management system with MySQL 8 database",
  "categories": ["CMS", "blog", "website"],
  "platform": "linux",
  "logo": "https://portainer-io-assets.sfo2.digitaloceanspaces.com/logos/wordpress.png",
  "note": "This template deploys WordPress with a MySQL database. Ensure port 80 is not in use.",
  "repository": {
    "url": "https://github.com/myorg/portainer-templates",
    "stackfile": "stacks/wordpress/docker-compose.yml"
  },
  "env": [
    {
      "name": "WORDPRESS_PORT",
      "label": "WordPress port",
      "description": "Host port to expose WordPress on",
      "default": "80"
    },
    {
      "name": "MYSQL_ROOT_PASSWORD",
      "label": "MySQL root password",
      "description": "Root password for MySQL - keep this secure!"
    },
    {
      "name": "MYSQL_PASSWORD",
      "label": "WordPress DB password",
      "description": "Password for the WordPress database user"
    },
    {
      "name": "MYSQL_DATABASE",
      "label": "Database name",
      "default": "wordpress"
    },
    {
      "name": "MYSQL_USER",
      "label": "Database user",
      "default": "wordpress"
    }
  ]
}
```

## Field Reference

The tables below cover the most commonly used fields in Portainer's documented schema.

### Common Fields (All Types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | integer | Yes | Template type (`1` = container, `2` = Swarm stack, `3` = Compose stack) |
| `title` | string | Yes | Display name in Portainer UI |
| `description` | string | Yes | Short description |
| `categories` | array | No | Category tags for filtering |
| `platform` | string | No | `linux` or `windows` |
| `logo` | string | No | URL to template logo image |
| `note` | string | No | Additional notes shown before deploy |
| `env` | array | No | Template variable definitions |

### Container-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `image` | string | Docker image to deploy |
| `hostname` | string | Container hostname |
| `ports` | array | Port mappings (`"8080/tcp"`, `"53/udp"`) |
| `volumes` | array | Volume mount configurations |
| `labels` | array | Docker labels |
| `network` | string | Default network |
| `restart_policy` | string | `no`, `always`, `unless-stopped`, `on-failure` |
| `privileged` | boolean | Run in privileged mode |
| `interactive` | boolean | Run with stdin open |

### Stack-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `repository.url` | string | Public Git repository URL |
| `repository.stackfile` | string | Path to the stack file in the repository |

## Environment Variable Definition

```json
{
  "name": "VARIABLE_NAME",
  "label": "Human label",
  "description": "Explains...",
  "default": "default-value",
  "preset": false,
  "select": [
    {
      "text": "Production",
      "value": "production",
      "default": true
    },
    {
      "text": "Development",
      "value": "development"
    }
  ]
}
```

Field descriptions:
- `name`: Environment variable name (required)
- `label`: Display label in UI (required unless `select` is present)
- `description`: Tooltip description (optional)
- `default`: Default value (optional)
- `preset`: If true, hidden from user with preset default
- `select`: Dropdown options (optional)

## Complete Example: Multi-Template File

```json
{
  "version": "2",
  "templates": [
    {
      "type": 1,
      "title": "Redis",
      "description": "In-memory data structure store",
      "categories": ["database", "cache"],
      "platform": "linux",
      "image": "redis:7-alpine",
      "ports": ["6379/tcp"],
      "volumes": [
        { "container": "/data" }
      ],
      "command": "redis-server --appendonly yes",
      "restart_policy": "unless-stopped"
    },
    {
      "type": 1,
      "title": "MySQL",
      "description": "MySQL 8 relational database",
      "categories": ["database"],
      "platform": "linux",
      "image": "mysql:8.0",
      "ports": ["3306/tcp"],
      "volumes": [
        { "container": "/var/lib/mysql" }
      ],
      "env": [
        { "name": "MYSQL_ROOT_PASSWORD", "label": "Root password" },
        { "name": "MYSQL_DATABASE", "label": "Default database", "default": "mydb" }
      ],
      "restart_policy": "unless-stopped"
    }
  ]
}
```

## Validating Your JSON File

```bash
# Validate JSON syntax

python3 -m json.tool templates.json > /dev/null && echo "Valid JSON"

# Check required fields are present
python3 << 'EOF'
import json

with open('templates.json') as f:
    data = json.load(f)

for i, t in enumerate(data['templates']):
    errors = []
    if 'title' not in t: errors.append('missing title')
    if 'description' not in t: errors.append('missing description')
    if 'type' not in t: errors.append('missing type')
    if t.get('type') == 1 and 'image' not in t: errors.append('container missing image')
    if t.get('type') in (2, 3) and 'repository' not in t: errors.append('stack missing repository')

    if errors:
        print(f"Template {i} ({t.get('title','unknown')}): {', '.join(errors)}")
    else:
        print(f"Template {i} ({t.get('title')}): OK")
EOF
```

## Conclusion

Building a Portainer template JSON file gives you complete control over your application catalog. By understanding the documented field patterns - container vs stack templates, environment variable definitions, port mappings, and volume configurations - you can create rich, user-friendly templates that deploy complex applications with just a few inputs. Start with simple templates and gradually add complexity as your catalog grows.
