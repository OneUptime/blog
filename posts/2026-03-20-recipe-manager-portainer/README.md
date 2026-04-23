# How to Self-Host a Recipe Manager with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Mealie, Recipes, Home Lab, Productivity

Description: Deploy Mealie as a self-hosted recipe manager with meal planning and shopping lists using Portainer.

## Introduction

Mealie is a self-hosted recipe manager that lets you store recipes, plan meals for the week, and generate shopping lists. You can import recipes from hundreds of supported recipe websites with a single URL, organize them by category, and share with family members. This guide covers deploying Mealie using Portainer.

## Prerequisites

- Portainer installed and running
- Enough RAM to allocate about 1GB to the container (recommended)
- A reverse proxy for external access (optional)

## Step 1: Deploy Mealie Stack

```yaml
# docker-compose.yml - Mealie Recipe Manager

networks:
  recipes_network:
    driver: bridge

volumes:
  mealie_data:
  mealie_db:

services:
  # PostgreSQL database (recommended for multi-user setups)
  mealie_db:
    image: postgres:15-alpine
    container_name: mealie_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=mealie
      - POSTGRES_USER=mealie
      - POSTGRES_PASSWORD=secure_db_password
    volumes:
      - mealie_db:/var/lib/postgresql/data
    networks:
      - recipes_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mealie"]
      interval: 10s
      retries: 5

  # Mealie application
  mealie:
    image: ghcr.io/mealie-recipes/mealie:v3.16.0
    container_name: mealie
    restart: unless-stopped
    depends_on:
      mealie_db:
        condition: service_healthy
    ports:
      - "9000:9000"
    environment:
      # Database connection
      - DB_ENGINE=postgres
      - POSTGRES_SERVER=mealie_db
      - POSTGRES_PORT=5432
      - POSTGRES_USER=mealie
      - POSTGRES_PASSWORD=secure_db_password
      - POSTGRES_DB=mealie

      # Application settings
      - BASE_URL=https://recipes.yourdomain.com
      - DEFAULT_GROUP=Home
      # First login credentials (change them immediately after signing in)
      # Username: changeme@example.com
      # Password: MyPassword

      # Security settings
      - TOKEN_TIME=48
      - ALLOW_SIGNUP=false

      # SMTP configuration
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_FROM_EMAIL=noreply@yourdomain.com
      - SMTP_FROM_NAME=Mealie
      - SMTP_AUTH_STRATEGY=TLS
      - SMTP_USER=your-email@gmail.com
      - SMTP_PASSWORD=your-app-password

      # Timezone
      - TZ=America/New_York
    volumes:
      - mealie_data:/app/data
    networks:
      - recipes_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mealie.rule=Host(`recipes.yourdomain.com`)"
      - "traefik.http.routers.mealie.entrypoints=websecure"
      - "traefik.http.routers.mealie.tls.certresolver=letsencrypt"
      - "traefik.http.services.mealie.loadbalancer.server.port=9000"
```

## Step 2: Simple Deployment (SQLite)

For a single-user setup, SQLite is sufficient:

```yaml
# docker-compose.yml - Mealie with SQLite (simple)
volumes:
  mealie_data:

services:
  mealie:
    image: ghcr.io/mealie-recipes/mealie:v3.16.0
    container_name: mealie
    restart: unless-stopped
    ports:
      - "9000:9000"
    environment:
      - ALLOW_SIGNUP=false
      # First login credentials (change them immediately after signing in)
      # Username: changeme@example.com
      # Password: MyPassword
      - BASE_URL=http://your-server-ip:9000
      - TZ=America/New_York
    volumes:
      - mealie_data:/app/data
```

## Step 3: Import Recipes

### Import from URL

The easiest way to add recipes is by URL:

1. Click **Create Recipe** > **Import from URL**
2. Paste a supported recipe URL (AllRecipes, Food Network, NYT Cooking, etc.)
3. Mealie imports the recipe data when the site is supported
4. Review and save

```bash
# Import via Mealie API
curl -X POST "https://recipes.yourdomain.com/api/recipes/create/url" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.allrecipes.com/recipe/12345/chicken-tikka-masala/"}'
```

### Import from Other Apps

Mealie supports migrations from several apps, including Nextcloud Cookbooks and Paprika, from the `/group/migrations` page. If you already have a compatible export archive, you can upload it through the API:

```bash
# Import to Mealie via API
curl -X POST "https://recipes.yourdomain.com/api/recipes/create/zip" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "archive=@/path/to/recipes.zip"
```

## Step 4: Set Up Meal Planning

### Weekly Meal Plan via API

```bash
# Add recipe to meal plan for next Monday
MONDAY=$(date -d "next monday" +%Y-%m-%d)

curl -X POST "https://recipes.yourdomain.com/api/households/mealplans" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$MONDAY\",
    \"entryType\": \"dinner\",
    \"recipeId\": \"recipe-uuid-here\",
    \"title\": \"Chicken Tikka Masala\",
    \"text\": \"\"
  }"
```

### Generate Shopping List

```bash
# Create a shopping list for the week
curl -X POST "https://recipes.yourdomain.com/api/households/shopping/lists" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Weekly Shopping"}'

# Add a planned recipe's ingredients to the shopping list
curl -X POST "https://recipes.yourdomain.com/api/households/shopping/lists/LIST_ID/recipe" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "recipeId": "recipe-uuid-here",
      "recipeIncrementQuantity": 1
    }
  ]'
```

## Step 5: Mobile PWA Setup

Mealie includes a Progressive Web App (PWA):

1. Open your Mealie URL in a mobile browser over HTTPS
2. Use the browser's **Install App** or **Add to Home Screen** option
3. Log in with your credentials
4. Browse recipes and shopping lists on mobile

## Step 6: Bulk Import Recipe URLs

Mealie can import from hundreds of recipe sites. To submit multiple URLs at once:

```bash
# Import multiple recipe URLs
curl -X POST "https://recipes.yourdomain.com/api/recipes/create/url/bulk" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imports": [
      {"url": "https://www.seriouseats.com/recipe-url"},
      {"url": "https://www.bonappetit.com/another-recipe"}
    ]
  }'
```

## Step 7: Backup Your Recipe Collection

```bash
#!/bin/bash
# backup-mealie.sh
# PostgreSQL deployment backup example
# If you're using SQLite, stop the container and back up /app/data instead.
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/mealie"
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
docker exec mealie_db pg_dump -U mealie mealie | \
  gzip > "$BACKUP_DIR/mealie_db_$DATE.sql.gz"

# Backup Mealie application data (images, assets, logs)
tar -czf "$BACKUP_DIR/mealie_data_$DATE.tar.gz" \
  $(docker volume inspect mealie_data -f '{{ .Mountpoint }}')

# Rotate (keep 30 days)
find "$BACKUP_DIR" -mtime +30 -delete
echo "Mealie backup: $DATE"
```

## Conclusion

You now have a beautiful self-hosted recipe manager running in Docker through Portainer. Mealie makes it easy to build and organize your recipe collection by importing from supported recipe sites, plan your weekly meals, and generate shopping lists. The PWA keeps your recipe collection accessible in the kitchen. Use Portainer to keep Mealie updated and monitor its resource usage over time.
