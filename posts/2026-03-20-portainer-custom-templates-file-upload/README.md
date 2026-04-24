# How to Create Custom Templates via File Upload in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, DevOps

Description: Learn how to create Portainer custom templates by uploading Docker Compose files directly from your local machine.

## Introduction

File upload is the simplest way to create a Portainer custom template when you have a Docker Compose file on your local machine. It is ideal for one-off templates, migrating existing Compose files into Portainer's template catalog, or quickly sharing configurations without setting up a Git repository. This guide walks through the process.

## Prerequisites

- Portainer CE or BE installed
- Portainer Business Edition if you want configurable template variables
- A valid Docker Compose file on your local machine
- A Portainer account with permission to create custom templates

## Step 1: Prepare Your Compose File

Before uploading, ensure your Compose file is ready for templating. If you're using Portainer Business Edition, replace hardcoded values with Mustache variables for anything that should be configurable:

```yaml
# Before: hardcoded values

services:
  app:
    image: myapp:1.2.3
    ports:
      - "8080:8080"
    environment:
      - DB_PASSWORD=supersecret123
      - APP_DOMAIN=myapp.example.com

# After: parameterized with Mustache variables
services:
  app:
    image: "myapp:{{ version }}"
    ports:
      - "{{ port }}:8080"
    environment:
      DB_PASSWORD: "{{ db_password }}"
      APP_DOMAIN: "{{ domain }}"
```

Set any default values when you define the template variables in Portainer.

Save this as a `.yml` file locally (e.g., `myapp-template.yml`).

## Step 2: Navigate to Custom Template Creation

1. Open Portainer and select your environment
2. Expand **Templates** and click **Custom**
3. Click **Add Custom Template**
4. Select **Upload** as the build method

## Step 3: Fill in Template Metadata

```text
Title:       My Application
Description: Deploys My Application with configurable settings
Note:        Internal app template for the team  (optional)

Platform:    Linux
Type:        Standalone / Podman
Logo:        https://mycompany.com/logo.png  (optional)
```

## Step 4: Upload the Compose File

1. Click **Select a file**
2. Select your `myapp-template.yml` file
3. Confirm the selected filename appears in the upload field

## Step 5: Confirm the Selected File

After upload, Portainer shows the selected filename in the upload field. The **Upload** build method does not load the Compose file into the web editor during template creation.

If you need to review or modify the file inline before saving, use **Web editor** instead, or edit the custom template after creating it.

## Step 6: Add Variable Definitions

If you're using Portainer Business Edition, click **Add variable** for each Mustache variable in your Compose file:

### version variable

```text
Name:        version
Label:       Application version
Description: Docker image tag to deploy
Default:     latest
```

### port variable

```text
Name:        port
Label:       Application port
Description: Host port to expose the application
Default:     8080
```

### db_password variable

```text
Name:        db_password
Label:       Database password
Description: Password for the application database (required)
Default:     (leave empty to make required)
```

### domain variable

```text
Name:        domain
Label:       Application domain
Description: Domain name for the application
Default:     localhost
```

## Step 7: Create the Template

1. Verify all metadata, the selected file, and variables
2. Click **Create custom template**
3. Portainer saves the template for future deployments

## Step 8: Verify and Test

1. Go to **Templates > Custom**
2. Find your uploaded template
3. Click it to open the deployment form
4. Fill in a stack name and any test variable values, then click **Deploy the stack**
5. Verify the deployment succeeds

## Real-World Example: Uploading a Complete Application Stack

Here is an example Compose file to upload and convert to a template:

```yaml
# webapp-template.yml

services:
  frontend:
    image: "nginx:{{ nginx_version }}"
    ports:
      - "{{ frontend_port }}:80"
    restart: unless-stopped

  backend:
    image: "{{ backend_image }}:{{ backend_tag }}"
    environment:
      DATABASE_URL: "postgresql://{{ db_user }}:{{ db_password }}@postgres:5432/{{ db_name }}"
      SECRET_KEY: "{{ secret_key }}"
      DEBUG: "{{ debug }}"
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: "postgres:{{ postgres_version }}"
    environment:
      POSTGRES_DB: "{{ db_name }}"
      POSTGRES_USER: "{{ db_user }}"
      POSTGRES_PASSWORD: "{{ db_password }}"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
```

## Limitations of File Upload Method

- No automatic sync with the source file (changes must be re-uploaded or edited in the web editor)
- No version history within Portainer
- For frequently updated templates, prefer the Git repository method

## Migration from Existing Compose Files

The file upload method is perfect for migrating existing Docker Compose deployments into Portainer templates:

1. Locate your existing `docker-compose.yml`
2. If you're using Portainer BE, replace environment-specific values with Mustache variables
3. Upload to Portainer as a custom template
4. Retire or archive the old hardcoded Compose file after verifying the template works

## Conclusion

File upload template creation is the quickest way to get a local Compose file into Portainer's template catalog. It works well for one-time imports and small teams. For ongoing template maintenance and multi-instance deployments, consider migrating to Git-backed templates for version control and easier updates.
