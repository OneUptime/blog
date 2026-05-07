# How to Run Ghost Blog in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Ghost, Blog, CMS, Node.js

Description: Learn how to run Ghost blog platform in a Podman container with persistent content, custom themes, and a MySQL backend.

---

> Ghost in Podman delivers a modern, Node.js-based publishing platform in a rootless container with persistent content and customizable themes.

Ghost is a powerful, open-source blogging and publishing platform built on Node.js. It provides a clean writing experience, built-in SEO, and a flexible theme system. Running Ghost in a Podman container gives you an isolated, portable blog instance that is easy to set up, back up, and upgrade. This guide covers basic setup, persistent storage, MySQL backend, and custom theme development.

---

## Pulling the Ghost Image

Download the official Ghost 5 image.

```bash
# Pull the Ghost 5 image

podman pull docker.io/library/ghost:5

# Verify the image
podman images | grep ghost
```

## Running a Basic Ghost Container

Start Ghost with the built-in SQLite database.

```bash
# Run Ghost in detached mode
podman run -d \
  --name my-ghost \
  -p 2368:2368 \
  -e NODE_ENV=development \
  -e url=http://localhost:2368 \
  ghost:5

# Check the container is running
podman ps

# Wait for Ghost to initialize
sleep 10

# Verify Ghost is responding
curl -s http://localhost:2368 | head -5

# Access Ghost
echo "Blog: http://localhost:2368"
echo "Admin: http://localhost:2368/ghost"
```

## Persistent Content Storage

Use volumes to preserve your blog content and configuration.

```bash
# Create a volume for Ghost content
podman volume create ghost-content

# Run Ghost with persistent storage
podman run -d \
  --name ghost-persistent \
  -p 2369:2368 \
  -e NODE_ENV=development \
  -e url=http://localhost:2369 \
  -v ghost-content:/var/lib/ghost/content:Z \
  ghost:5

# Verify the volume
podman volume inspect ghost-content
```

## Running Ghost with MySQL

Set up Ghost with a MySQL backend for better performance and scalability.

```bash
# Create a pod for Ghost and MySQL
podman pod create \
  --name ghost-pod \
  -p 2370:2368

# Create a volume for MySQL data
podman volume create ghost-mysql-data

# Run MySQL in the pod
podman run -d \
  --pod ghost-pod \
  --name ghost-db \
  -e MYSQL_ROOT_PASSWORD=root-secret \
  -e MYSQL_DATABASE=ghost \
  -e MYSQL_USER=ghost \
  -e MYSQL_PASSWORD=ghost-secret \
  -v ghost-mysql-data:/var/lib/mysql:Z \
  mysql:8.0

# Wait for MySQL to initialize
sleep 15

# Run Ghost connected to MySQL
podman run -d \
  --pod ghost-pod \
  --name ghost-app \
  -e NODE_ENV=production \
  -e url=http://localhost:2370 \
  -e database__client=mysql \
  -e database__connection__host=127.0.0.1 \
  -e database__connection__port=3306 \
  -e database__connection__user=ghost \
  -e database__connection__password=ghost-secret \
  -e database__connection__database=ghost \
  -v ghost-content:/var/lib/ghost/content:Z \
  ghost:5

# Wait for Ghost to start
sleep 15

# Verify Ghost is running with MySQL
curl -s http://localhost:2370 | head -5
```

## Custom Ghost Configuration

Configure Ghost with additional environment variables.

```bash
# Run Ghost with mail and other settings configured
podman run -d \
  --name ghost-configured \
  -p 2371:2368 \
  -e NODE_ENV=production \
  -e url=http://localhost:2371 \
  -e mail__transport=SMTP \
  -e mail__options__host=smtp.example.com \
  -e mail__options__port=587 \
  -e mail__options__auth__user=ghost@example.com \
  -e mail__options__auth__pass=mail-secret \
  -e privacy__useUpdateCheck=false \
  -e privacy__useGravatar=false \
  -v ghost-content:/var/lib/ghost/content:Z \
  ghost:5
```

## Custom Theme Development

Mount a local directory for developing custom Ghost themes.

```bash
# Create a directory for your custom theme
mkdir -p ~/ghost-themes/my-theme

# Create a basic theme package.json
cat > ~/ghost-themes/my-theme/package.json <<'EOF'
{
  "name": "my-podman-theme",
  "description": "A custom Ghost theme developed in Podman",
  "version": "1.0.0",
  "engines": {
    "ghost": ">=5.0.0"
  },
  "author": {
    "name": "Developer"
  }
}
EOF

# Create the default template
cat > ~/ghost-themes/my-theme/default.hbs <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{meta_title}}</title>
    {{ghost_head}}
</head>
<body>
    <header>
        <h1><a href="{{@site.url}}">{{@site.title}}</a></h1>
    </header>
    <main>
        {{{body}}}
    </main>
    <footer>
        <p>Powered by Ghost on Podman</p>
    </footer>
    {{ghost_foot}}
</body>
</html>
EOF

# Create the index template
cat > ~/ghost-themes/my-theme/index.hbs <<'EOF'
{{!< default}}
{{#foreach posts}}
<article>
    <h2><a href="{{url}}">{{title}}</a></h2>
    <p>{{excerpt words="30"}}</p>
    <time>{{date format="MMMM DD, YYYY"}}</time>
</article>
{{/foreach}}

{{pagination}}
EOF

# Create the post template
cat > ~/ghost-themes/my-theme/post.hbs <<'EOF'
{{!< default}}
{{#post}}
<article>
    <h1>{{title}}</h1>
    <time>{{date format="MMMM DD, YYYY"}}</time>
    <section>
        {{content}}
    </section>
</article>
{{/post}}
EOF

# Run Ghost with the custom theme directory mounted
podman run -d \
  --name ghost-dev \
  -p 2372:2368 \
  -e NODE_ENV=development \
  -e url=http://localhost:2372 \
  -v ~/ghost-themes:/var/lib/ghost/content/themes:Z \
  ghost:5
```

## Using the Ghost Content API

Interact with Ghost programmatically through its API.

```bash
# The Content API requires an API key (create one in Ghost Admin > Integrations)
# Once configured, you can query posts:
# curl -s "http://localhost:2368/ghost/api/content/posts/?key=YOUR_CONTENT_API_KEY"

# Check basic Ghost site information
curl -s http://localhost:2368/ghost/api/admin/site/ | python3 -m json.tool
```

## Managing the Containers

Common management operations.

```bash
# View Ghost logs
podman logs my-ghost

# Restart Ghost to pick up theme changes
podman restart ghost-dev

# Stop and start
podman stop my-ghost
podman start my-ghost

# Remove standalone containers
podman rm -f my-ghost ghost-persistent ghost-configured ghost-dev

# Remove the pod
podman pod rm -f ghost-pod

# Clean up volumes
podman volume rm ghost-content ghost-mysql-data
```

## Summary

Running Ghost in a Podman container provides a modern publishing platform with a clean writing experience and flexible deployment options. The built-in SQLite database works well for development, while a MySQL backend supports production workloads. Named volumes preserve your content, images, and themes across restarts. Mounting a local theme directory enables live development with instant feedback. Podman pods simplify the networking between Ghost and its database. The rootless container execution adds security to your blogging infrastructure.
