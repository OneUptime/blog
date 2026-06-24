# How to Use Template Variables with Mustache Syntax in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Mustache, DevOps

Description: Learn how to use Mustache syntax to create dynamic, configurable template variables in Portainer custom templates.

## Introduction

Portainer's custom templates support Mustache-style variable placeholders, enabling you to create parameterized templates that prompt users for configuration at deploy time. This guide covers the variable syntax Portainer supports, best practices for template variables, and real-world examples.

## Prerequisites

- Portainer BE with custom templates access (template variables are a Business Edition feature)
- Basic understanding of YAML and Docker Compose
- A template to parameterize

## Mustache Syntax Basics

Portainer uses Mustache-style variables in custom templates:

```yaml
# Basic variable substitution

{{ variable_name }}

# Variable used inline in a string
  - APP_URL=https://{{ domain }}/api
```

**Key rules:**
- Use `{{ variable_name }}` to reference a template variable
- Variable names are case-sensitive
- Use simple names such as `db_password`, `wordpress_port`, or `image_tag`
- Configure default values in Portainer's **Variables** section, not inline in the template

## Basic Variable Examples

### Simple String Variable

```yaml
services:
  app:
    image: myapp:{{ version }}
    # User provides: version (for example, "1.2.3" or "latest")
```

### Variable with Default

```yaml
services:
  web:
    ports:
      - "{{ port }}:80"
    # Set the defaultValue for `port` to "8080" in Portainer's Variables section
```

### Multiple Variables in One Line

```yaml
services:
  db:
    image: postgres:{{ postgres_version }}-{{ postgres_variant }}
    # You can set defaultValue entries for these variables in Portainer's Variables section
```

## Common Variable Patterns

### Port Mapping

```yaml
services:
  frontend:
    ports:
      - "{{ frontend_port }}:80"
      - "{{ frontend_ssl_port }}:443"

  api:
    ports:
      - "{{ api_port }}:3000"
```

### Environment Variables

```yaml
services:
  app:
    environment:
      # Required (no default)
      - DB_PASSWORD={{ db_password }}
      - SECRET_KEY={{ secret_key }}
      # Optional values can have defaults configured in the Variables section
      - LOG_LEVEL={{ log_level }}
      - MAX_CONNECTIONS={{ max_connections }}
      - DEBUG={{ debug }}
```

### Image Configuration

```yaml
services:
  app:
    image: {{ registry }}/{{ image_name }}:{{ image_tag }}
```

### Volume Paths

```yaml
services:
  app:
    volumes:
      - "{{ data_dir }}:/data"
      - "{{ config_dir }}:/config"
```

Resource Limits

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: "{{ memory_limit }}"
          cpus: "{{ cpu_limit }}"
```

## Complete Example Template

Here is a fully parameterized WordPress stack template. Configure default values for optional variables such as `wordpress_version`, `wordpress_port`, `db_user`, and `db_name` in Portainer's **Variables** section:

```yaml
version: "3.8"

services:
  wordpress:
    image: wordpress:{{ wordpress_version }}
    ports:
      - "{{ wordpress_port }}:80"
    environment:
      WORDPRESS_DB_HOST: database
      WORDPRESS_DB_USER: {{ db_user }}
      WORDPRESS_DB_PASSWORD: {{ db_password }}
      WORDPRESS_DB_NAME: {{ db_name }}
      WORDPRESS_TABLE_PREFIX: {{ table_prefix }}
    volumes:
      - wordpress-data:/var/www/html
    depends_on:
      - database
    restart: unless-stopped

  database:
    image: mysql:{{ mysql_version }}
    environment:
      MYSQL_DATABASE: {{ db_name }}
      MYSQL_USER: {{ db_user }}
      MYSQL_PASSWORD: {{ db_password }}
      MYSQL_ROOT_PASSWORD: {{ db_root_password }}
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped

volumes:
  wordpress-data:
  mysql-data:
```

## Defining Variables in Portainer

For each template variable, add a corresponding entry in the **Variables** section when creating the template:

```json
[
  {
    "name": "db_password",
    "label": "Database password",
    "description": "MySQL password for WordPress user (required)"
  },
  {
    "name": "db_root_password",
    "label": "MySQL root password",
    "description": "MySQL root user password (required)"
  },
  {
    "name": "wordpress_port",
    "label": "WordPress port",
    "description": "Host port for WordPress",
    "defaultValue": "80"
  },
  {
    "name": "db_name",
    "label": "Database name",
    "description": "Name of the WordPress database",
    "defaultValue": "wordpress"
  }
]
```

## Variable Validation Behavior

- Variables without a `defaultValue` are treated as **required** in the Portainer UI
- The deploy button may be disabled until required variables are filled in
- Variables with defaults are pre-populated with their default values in the input field

## Tips and Best Practices

1. **Always use defaults for optional settings** to make templates more user-friendly
2. **Never set defaults for passwords** - force users to provide their own
3. **Use descriptive labels** - "MySQL root password" is clearer than "root_pw"
4. **Avoid complex logic** - Portainer's custom template variable UI is designed around simple value substitution; keep variables simple
5. **Test substitution** - mentally substitute test values to verify YAML remains valid

## Known Limitations

- Portainer's custom template documentation covers variable substitution with `{{ variable_name }}`
- Default values are configured in Portainer's **Variables** section, not inline in the template
- Keep template variables simple and verify the rendered Compose output before deploying

Stick to `{{ variable_name }}` and configure defaults in the **Variables** section for reliable results.

## Conclusion

Template variables are the key to creating flexible, reusable Portainer templates. By parameterizing ports, passwords, image versions, and configuration values, you create templates that work across environments without modification. Keep your variables simple, provide defaults for optional settings in the **Variables** section, and clearly label required fields for the best user experience.
