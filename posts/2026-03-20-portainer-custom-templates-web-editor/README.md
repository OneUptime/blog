# How to Create Custom Templates from the Web Editor in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Web Editor, DevOps

Description: Learn how to create and save custom Portainer templates directly from the browser-based web editor.

## Introduction

The Portainer web editor is the quickest way to create custom templates. You write or paste a Compose file directly in the browser, add template variables, and save it to your custom template catalog. This guide covers the complete process of creating templates via the web editor.

## Prerequisites

- Portainer BE installed
- Access to a Docker environment in Portainer
- A Compose file you want to templatize

## Step 1: Open the Custom Template Creator

1. Log in to Portainer
2. Open your Docker environment
3. Expand **Templates** in the left sidebar
4. Click **Custom**
5. Click **Add Custom Template**
6. Select **Web editor** as the build method

## Step 2: Fill in Template Information

Complete the metadata section:

```text
Title:       Monitoring Stack
Description: Prometheus and Grafana monitoring stack

Platform:    Linux
Type:        Standalone / Podman
Logo:        https://raw.githubusercontent.com/grafana/grafana/main/public/img/grafana_icon.svg
```

## Step 3: Write the Compose File in the Editor

Paste your Compose file into the web editor:

```yaml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "{{ prometheus_port }}:9090"
    volumes:
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=30d"
      - "--web.enable-lifecycle"
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana
    ports:
      - "{{ grafana_port }}:3000"
    environment:
      GF_SECURITY_ADMIN_USER: "admin"
      GF_SECURITY_ADMIN_PASSWORD: "{{ admin_password }}"
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

## Step 4: Add Variables to the Template

With the web editor method, Portainer detects the variable names from the template. In the **Variables definition** section, fill in the label, description, and default value for each detected variable:

### Variable: admin_password (Required)

```text
Name:          admin_password
Label:         Grafana admin password
Description:   Password for the Grafana admin user
Default value: leave blank
```

### Variable: prometheus_port (Optional)

```text
Name:          prometheus_port
Label:         Prometheus port
Description:   Host port for Prometheus UI
Default value: 9090
```

### Variable: grafana_port (Optional)

```text
Name:          grafana_port
Label:         Grafana port
Description:   Host port for Grafana UI
Default value: 3000
```

When a variable has no default value, Portainer treats it as required at deploy time.

## Step 5: Use Mustache Variable Syntax

Portainer custom templates use Mustache syntax for template variables:

```yaml
# Basic variable substitution

image: "myapp:{{ version }}"

# Variable used in a port mapping
ports:
  - "{{ port }}:8080"

# Variable used in a string
environment:
  APP_URL: "https://{{ domain }}.example.com"

# Variable in a volume path
volumes:
  - "{{ data_dir }}:/app/data"
```

**Note:** Set default values in the **Variables definition** section rather than in the Compose file itself.

## Step 6: Preview the Resolved Template

Before saving, you can mentally verify by substituting test values into your variables to ensure the Compose file would be valid YAML.

For example, with `admin_password=secret123` and `grafana_port=3001`:

```yaml
# Expected resolved output (for verification)
grafana:
  ports:
    - "3001:3000"
  environment:
    GF_SECURITY_ADMIN_PASSWORD: "secret123"
```

## Step 7: Save the Template

1. Review all fields and the Compose file
2. Click **Create custom template**
3. The template is saved and appears in the **Custom templates** catalog

## Step 8: Test the Template

1. Click on your newly created template
2. The variable fields appear with their labels and defaults
3. Fill in the required values (those without defaults)
4. Click **Deploy the stack**
5. Verify the stack deploys successfully

## Editing an Existing Template

1. Go to **Templates > Custom**
2. Click **Edit** next to your template
3. Modify the Compose file or variables
4. Save changes

## Tips for Web Editor Templates

- Use default values in the **Variables definition** section to make templates user-friendly
- Test your Compose file without variables first, then add parameterization
- Keep variable names short and descriptive
- Group related variables logically in the template form

## Conclusion

The Portainer web editor makes it easy to create custom templates directly in the browser. For quick templates and iteration, it is the fastest approach. As your templates mature, consider moving them to a Git repository for version control and team collaboration.
