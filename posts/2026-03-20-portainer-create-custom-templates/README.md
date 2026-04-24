# How to Create Custom Templates in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Custom Templates, DevOps

Description: Learn the different ways to create custom templates in Portainer for reusable container and stack deployments.

## Introduction

Portainer's Custom Templates feature lets you build your own catalog of reusable deployment configurations. Whether you have a standard application stack, an internal tool, or a frequently-used container configuration, custom templates save time and ensure consistency across deployments. This guide provides an overview of all custom template creation methods.

## Prerequisites

- Portainer CE or BE installed
- Permissions to create and manage templates in your Portainer environment
- Basic understanding of Docker Compose

## Custom Template Types

For Docker environments, Portainer custom templates use two stack types:

| Type | Description | Use Case |
|------|-------------|----------|
| **Standalone / Podman** | Compose deployment to a standalone Docker or Podman environment | Single-service or multi-service apps |
| **Swarm** | Docker Swarm stack deployment | Swarm services and multi-node apps |

## Creation Methods Overview

Portainer provides three ways to create custom templates:

1. **Web editor** - Write or paste the template directly in the browser
2. **Git repository** - Point to a Compose file in a Git repo
3. **File upload** - Upload a local Compose file

## Step 1: Navigate to Custom Templates

1. Select your environment in Portainer
2. Click **Templates** in the sidebar
3. Click **Custom**
4. Click **Add Custom Template**

## Step 2: Fill in Template Metadata

Regardless of creation method, templates use the same core metadata:

```text
Title:       My Application Stack     # Display name in catalog
Description: Deploys my app with...   # Short description
Note:        Internal staging stack   # Optional extra context

Platform:    Linux                    # Linux or Windows
Type:        Standalone / Podman      # Standalone / Podman or Swarm
Logo:        https://...              # Optional logo image URL
```

## Step 3: Choose a Creation Method

### Method 1: Web Editor

Write your Compose file directly in the browser. Best for quick templates or testing.

- Paste an existing Compose file
- Use the built-in YAML editor with syntax highlighting
- In Portainer BE, add Mustache variables for user inputs: `{{ variable_name }}`

### Method 2: Git Repository

Link to a Compose file in a Git repository. Best for version-controlled templates.

- Enter the repository URL
- Set the repository reference (for example, `main`)
- Specify the Compose path within the repo
- Add credentials if the repo is private

### Method 3: File Upload

Upload a Compose file from your local machine. Best for one-time imports.

- Choose the **Upload** build method and click **Select file**
- Select your Compose file
- The file contents load into the editor for review

## Step 4: Add Template Variables

In Portainer Business Edition, variables let template users customize deployments. Use Mustache syntax:

```yaml
# In the Compose file, use variables like:

services:
  app:
    image: "{{ image_name }}:{{ image_tag }}"
    ports:
      - "{{ app_port }}:8080"
    environment:
      - DB_PASSWORD={{ db_password }}
      - APP_SECRET={{ app_secret }}
```

For each variable, define it in the **Variables** section:

```json
{
  "name": "app_port",
  "label": "Application port",
  "description": "Host port to expose the application on",
  "defaultValue": "8080"
}
```

## Step 5: Save the Template

1. Review all fields
2. Click **Create custom template**
3. The template appears in the **Custom templates** catalog

## Step 6: Use the Template

1. Go to **Templates > Custom**
2. Find your template
3. Click it to expand the configuration panel
4. Fill in variable values
5. Click **Deploy the stack**

## Managing Custom Templates

### Edit a Template

1. Click **Edit** on the template card
2. Modify the Compose file or metadata
3. Click **Update custom template**

Note: Editing a template does not affect already-deployed stacks.

### Delete a Template

Click **Delete** on the template card. Deployed stacks are not affected.

## Template Best Practices

```yaml
# Good template: parameterize changeable values
# Set defaults for optional variables in Portainer's Variables definition UI
services:
  web:
    image: "{{ image }}:{{ tag }}"
    ports:
      - "{{ port }}:80"
    environment:
      - DB_HOST={{ db_host }}
      - DB_PASSWORD={{ db_password }}   # Required, no default
    restart: unless-stopped
```

- Set sensible defaults for optional variables in the Variables definition UI
- Make passwords and secrets required (no default)
- Document variables with clear labels and descriptions

## Sharing Templates Across Teams

In Portainer Business Edition, templates can be shared with specific teams or made globally available to all users in an environment.

## Conclusion

Custom templates in Portainer are a powerful way to standardize and speed up application deployments. By creating reusable templates for your most common workloads, you reduce configuration errors and make it easy for team members to deploy services correctly every time. Choose the creation method that fits your workflow - web editor for quick iteration, Git for versioned templates, or file upload for one-time imports.
