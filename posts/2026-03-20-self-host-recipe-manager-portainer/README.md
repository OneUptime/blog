# How to Self-Host a Recipe Manager with Portainer - Self Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Mealie, Recipe Manager, Self-Hosting, Docker, Home Server

Description: Learn how to self-host Mealie, a modern recipe manager and meal planner, via Portainer with persistent storage and user authentication.

---

Mealie is a popular self-hosted recipe manager with a clean interface, meal planning, shopping lists, and API access. Portainer makes deploying and managing it simple.

## Compose Stack

```yaml
services:
  mealie:
    image: ghcr.io/mealie-recipes/mealie:latest
    restart: unless-stopped
    ports:
      - "9925:9000"
    environment:
      # Security settings
      ALLOW_SIGNUP: "true"         # Set to false after creating your account
      BASE_URL: http://localhost:9925
      # SMTP for email notifications (optional)
      SMTP_HOST: smtp.example.com
      SMTP_PORT: 587
      SMTP_AUTH_STRATEGY: TLS
      SMTP_FROM_EMAIL: noreply@example.com
      SMTP_USER: user@example.com
      SMTP_PASSWORD: change-me
      # Performance settings
      UVICORN_WORKERS: 2
      # Timezone
      TZ: America/New_York
    volumes:
      - mealie_data:/app/data

volumes:
  mealie_data:
    name: mealie_data
```

The default credentials after first launch are:
- Email: `changeme@example.com`
- Password: `MyPassword`

Change these immediately after first login.

## Volumes and Data

```bash
# Mealie stores SQLite deployments under /app/data:

# /app/data/           - Database, recipe assets/images, and UI-created backups
# /app/data/mealie.log - Application log

# Stop Mealie first, then back up the named volume
docker run --rm -v mealie_data:/data:ro alpine tar czf - -C /data . > mealie-backup.tar.gz
```

## Importing Recipes

Mealie supports importing recipes from supported URLs automatically. Paste a supported recipe URL from the web and Mealie extracts ingredients, instructions, and images automatically.

You can also import through the API:

```bash
# Via the API
TOKEN="your-api-token"
curl -X POST "http://localhost:9925/api/recipes/create/url" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.foodnetwork.com/your-recipe"}'
```

## Meal Planning

Mealie includes a weekly meal planner. Navigate to **Meal Planner** in the sidebar to assign recipes to days of the week and generate a shopping list.

## Monitoring

Use OneUptime to monitor `http://<host>:9925/api/app/about`. Mealie returns general application information when running correctly. Alert on any downtime to keep your recipe collection accessible.
