# How to Containerize a Perl Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Perl, Containerization, DevOps, Web Development, Legacy Applications

Description: Step-by-step guide to containerizing Perl applications with Docker, including CPAN dependency management, Mojolicious apps, and production best practices.

---

Perl powers a surprising amount of critical infrastructure. From legacy systems to modern web applications built with Mojolicious or Dancer2, Perl remains a practical choice for many teams. Docker gives you a consistent way to package these applications regardless of the host system's Perl version or installed modules. This guide covers everything from basic containerization to production-ready builds.

## Prerequisites

You need Docker installed on your machine. Familiarity with Perl, CPAN, and basic web frameworks is helpful but not strictly required. We will build a complete example from scratch.

## Creating a Sample Perl Web Application

Let's build a small web application with Mojolicious, one of Perl's modern web frameworks.

Create the application file:

```perl
#!/usr/bin/env perl
# app.pl - a simple Mojolicious web application
use Mojolicious::Lite -signatures;

# Root route returns a greeting
get '/' => sub ($c) {
    $c->render(text => 'Hello from Perl in Docker!');
};

# Health check endpoint for container orchestration
get '/health' => sub ($c) {
    $c->render(json => { status => 'ok', uptime => time() - $^T });
};

# API endpoint demonstrating JSON response
get '/api/info' => sub ($c) {
    $c->render(json => {
        language => 'Perl',
        version  => $^V->stringify,
        pid      => $$,
    });
};

app->start;
```

Create a `cpanfile` to declare dependencies:

```perl
# cpanfile - declares CPAN module dependencies
requires 'Mojolicious', '9.33';
requires 'DBI', '1.643';
requires 'JSON::XS', '4.03';
```

## Basic Dockerfile

Start with a simple Dockerfile:

```dockerfile
# Basic Perl Dockerfile using the official Perl image
FROM perl:5.38

WORKDIR /app

# Install cpanminus for dependency management
RUN cpanm App::cpanminus --notest

# Copy and install dependencies first for layer caching
COPY cpanfile /app/
RUN cpanm --installdeps --notest .

# Copy application source
COPY . /app

EXPOSE 3000

# Start the Mojolicious app in production mode
CMD ["perl", "app.pl", "daemon", "-l", "http://*:3000"]
```

Build and run:

```bash
# Build the Docker image
docker build -t perl-app:basic .

# Run the container
docker run -d -p 3000:3000 perl-app:basic
```

This works, but the image is large because it includes the full Perl development toolchain.

## Multi-Stage Build for Smaller Images

Perl modules with XS (C extensions) need compilation tools during build but not at runtime. A multi-stage build handles this cleanly.

```dockerfile
# Stage 1: Build dependencies with full toolchain
FROM perl:5.38 AS builder

WORKDIR /app

RUN cpanm App::cpanminus --notest

# Install dependencies into a local directory
COPY cpanfile /app/
RUN cpanm --installdeps --notest -l /app/local .

# Copy application source
COPY . /app

# Stage 2: Slim runtime image
FROM perl:5.38-slim

WORKDIR /app

# Install only runtime system libraries (no compiler)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libssl3 \
    libmariadb3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the locally installed modules and app from builder
COPY --from=builder /app /app

# Tell Perl where to find the local modules
ENV PERL5LIB=/app/local/lib/perl5
ENV PATH=/app/local/bin:$PATH

# Run as non-root
RUN useradd -m appuser
USER appuser

EXPOSE 3000

CMD ["perl", "app.pl", "daemon", "-l", "http://*:3000"]
```

This cuts the image size roughly in half by removing gcc, make, and other build tools from the final image.

## Managing CPAN Dependencies

CPAN dependency management can be tricky in Docker. Here are some tips.

Pin your module versions in the `cpanfile`:

```perl
# cpanfile with pinned versions for reproducible builds
requires 'Mojolicious', '== 9.33';
requires 'DBI', '== 1.643';
requires 'DBD::mysql', '== 4.050';
requires 'JSON::XS', '== 4.03';
requires 'Try::Tiny', '== 0.31';
```

For faster builds, use `--notest` with cpanminus. Tests are valuable during development but slow down Docker builds significantly:

```bash
# Install dependencies without running test suites
cpanm --installdeps --notest .
```

If you need a private CPAN mirror or custom modules, you can configure cpanminus accordingly:

```dockerfile
# Use a custom CPAN mirror for faster installs
RUN cpanm --mirror https://cpan.metacpan.org --mirror-only --installdeps --notest .
```

## The .dockerignore File

Prevent unnecessary files from entering the build context:

```text
# .dockerignore - keep the build context lean
.git/
local/
*.bak
*.swp
blib/
_build/
Build
Makefile
MYMETA.*
README.md
```

## Docker Compose for Development

Set up a comfortable development environment:

```yaml
# docker-compose.yml - development environment with live reload
version: "3.8"
services:
  app:
    build:
      context: .
      target: builder
    ports:
      - "3000:3000"
    volumes:
      - ./lib:/app/lib
      - ./app.pl:/app/app.pl
    environment:
      - MOJO_MODE=development
      - MOJO_LOG_LEVEL=debug
    command: ["perl", "app.pl", "daemon", "-l", "http://*:3000"]

  database:
    image: mariadb:11
    environment:
      MARIADB_ROOT_PASSWORD: devpassword
      MARIADB_DATABASE: perlapp
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
```

Mojolicious has built-in file watching with the `morbo` development server:

```bash
# Use morbo for automatic reloading during development
docker compose exec app morbo app.pl -l http://*:3000
```

## Handling Perl's Carton for Dependency Locking

Carton is Perl's answer to Bundler (Ruby) or npm (Node.js). It locks exact dependency versions.

```dockerfile
# Using Carton for reproducible dependency installation
FROM perl:5.38 AS builder

WORKDIR /app

RUN cpanm Carton --notest

# Copy dependency files
COPY cpanfile cpanfile.snapshot /app/

# Install exact locked versions
RUN carton install --deployment

COPY . /app

FROM perl:5.38-slim

WORKDIR /app

COPY --from=builder /app /app

ENV PERL5LIB=/app/local/lib/perl5
EXPOSE 3000

CMD ["perl", "app.pl", "daemon", "-l", "http://*:3000"]
```

Generate the `cpanfile.snapshot` locally before building:

```bash
# Generate the dependency lockfile
carton install
git add cpanfile.snapshot
```

## Health Checks

Add a Docker health check:

```dockerfile
# Check the /health endpoint every 30 seconds
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD perl -MHTTP::Tiny -e 'exit(HTTP::Tiny->new->get("http://localhost:3000/health")->{success} ? 0 : 1)'
```

This uses Perl's built-in HTTP::Tiny module, so no extra dependencies are needed in the runtime image.

## Running Legacy CGI Applications

If you are containerizing older Perl CGI scripts, you can use Apache with mod_perl or mod_cgi:

```dockerfile
# Dockerfile for legacy CGI Perl applications
FROM perl:5.38

RUN apt-get update && \
    apt-get install -y apache2 libapache2-mod-perl2 && \
    rm -rf /var/lib/apt/lists/*

# Enable CGI module
RUN a2enmod cgid

# Copy CGI scripts
COPY cgi-bin/ /usr/lib/cgi-bin/
RUN chmod +x /usr/lib/cgi-bin/*.pl

# Copy Apache configuration
COPY apache-config.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 80

CMD ["apache2ctl", "-D", "FOREGROUND"]
```

This approach works well for gradual modernization, where you containerize legacy CGI apps first and refactor them later.

## Performance Tuning

Mojolicious supports prefork mode for production workloads:

```bash
# Start with prefork server for production, 4 worker processes
docker run -d -p 3000:3000 perl-app:latest \
  perl app.pl prefork -l http://*:3000 -w 4 -c 2
```

Set memory limits on the container:

```bash
# Run with memory constraints
docker run -d -p 3000:3000 -m 256m --memory-swap 256m perl-app:latest
```

## Monitoring in Production

After deploying your containerized Perl application, set up monitoring for the `/health` endpoint. [OneUptime](https://oneuptime.com) can monitor your application's availability and alert you when something goes wrong, which is especially important for legacy Perl services that may behave unpredictably under load.

## Summary

Containerizing Perl applications requires attention to CPAN dependency management, but the patterns are straightforward once you understand them. Multi-stage builds keep images small by separating build tools from the runtime. Carton provides reproducible dependency locking. For legacy CGI applications, Apache-based containers offer a pragmatic migration path. Whether you are running modern Mojolicious services or decades-old CGI scripts, Docker gives you a consistent deployment target.
