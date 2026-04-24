# How to Deploy a Container from a Template in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Container, DevOps

Description: Step-by-step guide to deploying a single container using Portainer's built-in and custom application templates.

## Introduction

Container templates in Portainer provide a fast path to deploying single-container applications without needing to know all the Docker run flags. Templates pre-configure image names, port mappings, environment variables, and volumes, so you only need to fill in the specifics for your environment. This guide walks through deploying a container from a template.

## Prerequisites

- Portainer CE or BE installed
- A Docker standalone environment connected to Portainer
- Basic understanding of Docker container concepts

## What Makes a Container Template

A container template element in Portainer can define:

```json
{
  "type": 1,
  "title": "Nginx",
  "description": "High performance web server",
  "categories": ["webserver"],
  "platform": "linux",
  "logo": "https://portainer-io-assets.sfo2.digitaloceanspaces.com/logos/nginx.png",
  "image": "nginx:latest",
  "ports": ["80/tcp", "443/tcp"],
  "volumes": [
    { "container": "/usr/share/nginx/html" },
    { "container": "/etc/nginx" }
  ],
  "restart_policy": "unless-stopped"
}
```

Type `1` is a container template, type `2` is a Swarm stack template, and type `3` is a Compose stack template.

## Step 1: Open Application Templates

1. In Portainer, select your Docker environment
2. In the left navigation, expand **Templates** and click **Application**
3. The application templates page loads showing the available templates

## Step 2: Filter to Container Templates

To see only container templates:

- Use the **Type** dropdown to display only container templates
- Use the search to find your desired app

## Step 3: Select Your Template

Click on the template you want to deploy. Portainer opens the deployment form for that template.

For this example, we will deploy **MySQL**:

```text
Template: MySQL
```

## Step 4: Configure the Container

Fill in the configuration fields:

### Basic Settings

```text
Name:     my-mysql          # Unique container name on this host
```

### Port Mappings

```text
3306 → 3306    # Map MySQL port (change host port if needed)
```

### Environment Variables

The exact environment variables depend on the template source. Portainer's official MySQL template prompts for:

```text
MYSQL_ROOT_PASSWORD:  [enter-secure-password]
```

### Volume Configuration

```text
/data/mysql → /var/lib/mysql    # Bind-mount host storage into the container
```

You can also map a named volume instead of a bind mount.

### Network

```text
Network: bridge    # Default; or select a custom network
```

### Restart Policy

```text
Restart policy: Unless stopped    # Restart unless manually stopped
```

## Step 5: Advanced Options (Optional)

Expand the **Show advanced options** section for:

- **Labels** - Add Docker labels for organization or proxy routing
- **CPU limit** - Constrain CPU usage
- **Memory limit** - Set memory limits (e.g., 512m)
- **Privileged mode** - Run with extended privileges (use with caution)

```text
Memory limit: 512m
CPU limit:    0.5
```

## Step 6: Deploy the Container

1. Review all settings
2. Click **Deploy the container**
3. Portainer pulls the image (if not already cached) and creates the container
4. The new container appears in the **Containers** list

## Step 7: Verify the Deployment

1. Find your container in the **Containers** list (it should show **Running**)
2. Click the container name to view details
3. Check the **Logs** tab for startup messages:

```text
2024-01-15T10:00:00 [Note] MySQL init process done. Ready for start up.
2024-01-15T10:00:01 [Note] mysqld: ready for connections.
```

4. Test connectivity:

```bash
# Open a MySQL client inside the container

docker exec -it my-mysql mysql -u root -p

# Or test the published port from the host
mysql -h 127.0.0.1 -P 3306 -u root -p
```

## Modifying After Deployment

Container templates create a standard Docker container. You can:

- Restart via the **Containers** list (click the play/stop icons)
- Edit environment variables via **Container details > Duplicate/Edit**
- Update the image by pulling a new version and recreating

## Creating Your Own Container Template

You can create your own app template source for reuse:

1. Create a JSON file that contains your template definitions
2. Host the JSON file somewhere the Portainer Server instance can access over HTTP
3. In Portainer, go to **Settings** and set the **App Templates** URL, or start Portainer with the `--templates` flag
4. Refresh **Templates > Application** and deploy from the new template

## Conclusion

Deploying containers from templates in Portainer simplifies the process of launching well-known applications. Templates handle the complexity of Docker configuration, letting you focus on the values specific to your environment. Once comfortable with the built-in templates, consider building custom templates to standardize deployments across your team.
